/**
 * Deterministic receipt parser. Takes OCR output ({ text, lines }, from
 * lib/ocr.js) and returns amount/date/shop, each with a HIGH/MEDIUM/LOW
 * confidence tier derived from label strength, OCR confidence, plausibility,
 * and whether competing values exist. No field is ever guessed at HIGH/MEDIUM
 * without real signal — anything genuinely ambiguous comes back LOW so the
 * caller blanks it rather than inventing a number.
 */

const AMOUNT_LABELS = [
  { re: /\bGRAND\s*TOTAL\b/i, weight: 1.0 },
  { re: /\bTOTAL\s*AMOUNT\b/i, weight: 1.0 },
  { re: /\bAMOUNT\s*DUE\b/i, weight: 1.0 },
  { re: /\bNET\s*TOTAL\b/i, weight: 1.0 },
  { re: /\bPAYABLE\b/i, weight: 0.95 },
  { re: /\bTOTAL\b/i, weight: 0.8 },
];

const AMOUNT_EXCLUDE_LINE =
  /\bSUB\s*-?\s*TOTAL\b|\bVAT\b|\bTAX\b|\bDISCOUNT\b|\bINVOICE\b|\bRECEIPT\s*(NO|NUMBER|#)\b|\bPHONE\b|\bTRANSACTION\b|\bTXN\b/i;

const DATE_LABEL_RE = /\b(DATE|DATED|BILL\s*DATE|INVOICE\s*DATE|TXN\s*DATE)\b/i;

const SHOP_EXCLUDE_RE =
  /\b(PHONE|TEL|MOBILE|INVOICE|RECEIPT|CASHIER|SERVED\s*BY|TABLE|BILL\s*NO|VAT\s*REG|TIN|ROAD|STREET|AVENUE|BLOCK|SECTOR|DATE|TOTAL|SUBTOTAL|THANK\s*YOU)\b/i;

const PHONE_RE = /\b0?1[0-9]{9,10}\b|\+?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,5}\b/;

function scoreToTier(score) {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function normalizeAmountToken(raw) {
  const cleaned = raw.replace(/[৳,]/g, "").trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function extractAmountsFromLine(line) {
  const matches = [...line.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)];
  return matches.map((m) => normalizeAmountToken(m[0])).filter((n) => n !== null);
}

function looksLikePhoneOrId(raw) {
  const digitsOnly = raw.replace(/[^\d]/g, "");
  return digitsOnly.length >= 7 && !raw.includes(".") && !raw.includes(",");
}

export function extractAmount(lines) {
  const candidates = [];

  for (let i = 0; i < lines.length; i += 1) {
    const { text, confidence } = lines[i];
    if (AMOUNT_EXCLUDE_LINE.test(text)) continue;

    for (const { re, weight } of AMOUNT_LABELS) {
      if (!re.test(text)) continue;
      let nums = extractAmountsFromLine(text);
      if (nums.length === 0 && lines[i + 1] && !AMOUNT_EXCLUDE_LINE.test(lines[i + 1].text)) {
        nums = extractAmountsFromLine(lines[i + 1].text);
      }
      if (nums.length > 0) {
        candidates.push({ value: Math.max(...nums), weight, confidence, lineIndex: i });
      }
      break;
    }
  }

  if (candidates.length === 0) {
    const fallback = [];
    for (const { text, confidence } of lines) {
      if (AMOUNT_EXCLUDE_LINE.test(text)) continue;
      const matches = [...text.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)];
      for (const m of matches) {
        if (looksLikePhoneOrId(m[0])) continue;
        const value = normalizeAmountToken(m[0]);
        if (value !== null && value > 0 && value < 10000000) {
          fallback.push({ value, confidence });
        }
      }
    }
    if (fallback.length === 0) return { value: null, tier: "low" };
    const best = [...fallback].sort((a, b) => b.value - a.value)[0];
    // No trustworthy label found at all — always require manual verification.
    return { value: best.value, tier: "low" };
  }

  const maxWeight = Math.max(...candidates.map((c) => c.weight));
  const topCandidates = candidates.filter((c) => c.weight === maxWeight);
  const chosen = topCandidates[topCandidates.length - 1];

  const distinctValues = new Set(topCandidates.map((c) => c.value));
  const hasCompeting = distinctValues.size > 1;

  const labelScore = chosen.weight;
  const ocrScore = Math.min(1, Math.max(0, chosen.confidence / 100));
  const plausible = chosen.value > 0 && chosen.value < 10000000;
  const plausibilityScore = plausible ? 1 : 0.3;
  const competingPenalty = hasCompeting ? 0.35 : 0;

  const score = labelScore * 0.5 + ocrScore * 0.3 + plausibilityScore * 0.2 - competingPenalty;

  return { value: chosen.value, tier: scoreToTier(score) };
}

function toISODate(yRaw, mRaw, dRaw) {
  let y = Number(yRaw);
  const m = Number(mRaw);
  const d = Number(dRaw);
  if (y < 100) y += y < 50 ? 2000 : 1900;
  if (m < 1 || m > 12) return null;
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d < 1 || d > daysInMonth) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function findDateMatches(text) {
  const results = [];
  const isoRe = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  const dmyRe = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g;

  let m = isoRe.exec(text);
  while (m) {
    const iso = toISODate(m[1], m[2], m[3]);
    if (iso) results.push({ iso, index: m.index, raw: m[0] });
    m = isoRe.exec(text);
  }
  m = dmyRe.exec(text);
  while (m) {
    const iso = toISODate(m[3], m[2], m[1]);
    if (iso) results.push({ iso, index: m.index, raw: m[0] });
    m = dmyRe.exec(text);
  }
  return results.sort((a, b) => a.index - b.index);
}

export function extractDate(lines, fullText) {
  const matches = findDateMatches(fullText);
  if (matches.length === 0) return { value: null, tier: "low" };

  const first = matches[0];
  const uniqueValues = new Set(matches.map((mm) => mm.iso));
  const lineMatch = lines.find((l) => l.text.includes(first.raw));
  const lineConfidence = lineMatch ? lineMatch.confidence : 60;
  const hasLabel = lineMatch ? DATE_LABEL_RE.test(lineMatch.text) : false;

  const today = new Date();
  const parsed = new Date(`${first.iso}T00:00:00`);
  const withinRange =
    parsed <= new Date(today.getTime() + 86400000) &&
    parsed >= new Date(today.getFullYear() - 3, 0, 1);

  let score = 0.5;
  score += hasLabel ? 0.25 : 0;
  score += uniqueValues.size === 1 ? 0.15 : -0.2;
  score += Math.min(1, Math.max(0, lineConfidence / 100)) * 0.15;
  score += withinRange ? 0 : -0.3;

  return { value: first.iso, tier: scoreToTier(score) };
}

export function extractShop(lines) {
  const candidateLines = lines.slice(0, 6);

  for (let i = 0; i < candidateLines.length; i += 1) {
    const { text, confidence } = candidateLines[i];
    const trimmed = text.trim();
    if (trimmed.length < 2 || trimmed.length > 40) continue;
    if (SHOP_EXCLUDE_RE.test(trimmed)) continue;
    if (PHONE_RE.test(trimmed)) continue;
    if (findDateMatches(trimmed).length > 0) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (!/[a-zA-Z]/.test(trimmed)) continue;

    const letterRatio = (trimmed.match(/[a-zA-Z]/g) || []).length / trimmed.length;
    let score = 0.4;
    score += i === 0 ? 0.3 : Math.max(0, 0.25 - i * 0.05);
    score += Math.min(1, Math.max(0, confidence / 100)) * 0.2;
    score += letterRatio > 0.6 ? 0.1 : 0;

    return { value: trimmed, tier: scoreToTier(score) };
  }

  return { value: null, tier: "low" };
}

export function parseReceipt({ text, lines }) {
  return {
    amount: extractAmount(lines),
    date: extractDate(lines, text),
    shop: extractShop(lines),
  };
}
