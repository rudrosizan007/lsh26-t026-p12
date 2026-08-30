const MAX_MONTHS = 600;

function roundHalfUp(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

/**
 * Splits a limited monthlyAvailable surplus across pockets. If total requested
 * contributions exceed what the forecast leaves available, every pocket's
 * contribution is scaled down proportionally rather than letting pockets
 * compete for the same money independently (build brief section 26/28).
 */
export function calculateEffectiveContributions(pockets, monthlyAvailable) {
  const safeAvailable = Number.isFinite(monthlyAvailable) ? Math.max(0, monthlyAvailable) : 0;
  const active = pockets.filter(
    (p) => p.target > 0 && p.currentBalance < p.target && p.monthlyContribution > 0
  );
  const totalRequested = sum(active.map((p) => p.monthlyContribution));
  const scaled = totalRequested > safeAvailable && totalRequested > 0;

  const effectiveByPocketId = new Map();
  for (const p of pockets) {
    if (!active.includes(p)) {
      effectiveByPocketId.set(p.id, 0);
      continue;
    }
    effectiveByPocketId.set(
      p.id,
      scaled ? (p.monthlyContribution * safeAvailable) / totalRequested : p.monthlyContribution
    );
  }

  return { effectiveByPocketId, totalRequested, scaled, monthlyAvailable: safeAvailable };
}

/**
 * Month-by-month DPS-style simulation. Never derives a completion date from
 * target / contribution directly — the date always comes out of this loop
 * (build brief section 26).
 */
export function calculatePocketProjection(pocket, effectiveContribution, annualRatePercent, today, monthlyAvailable) {
  if (!Number.isFinite(pocket.target) || pocket.target <= 0) {
    return { status: "invalid-target" };
  }
  if (pocket.currentBalance >= pocket.target) {
    return { status: "reached", finalBalance: pocket.currentBalance };
  }
  if (!Number.isFinite(pocket.monthlyContribution) || pocket.monthlyContribution <= 0) {
    return { status: "no-contribution" };
  }
  if (!Number.isFinite(monthlyAvailable) || monthlyAvailable <= 0) {
    return { status: "no-surplus" };
  }
  if (!Number.isFinite(effectiveContribution) || effectiveContribution <= 0) {
    return { status: "no-contribution" };
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  let balance = pocket.currentBalance;
  let totalContributed = 0;
  let totalInterest = 0;
  let months = 0;

  while (balance < pocket.target && months < MAX_MONTHS) {
    balance = roundHalfUp(balance + effectiveContribution);
    totalContributed += effectiveContribution;
    const interest = roundHalfUp(balance * monthlyRate);
    balance = roundHalfUp(balance + interest);
    totalInterest += interest;
    months += 1;
  }

  if (balance < pocket.target) {
    return { status: "too-long", months: MAX_MONTHS };
  }

  const completionDate = new Date(today.getFullYear(), today.getMonth() + months - 1, 1);

  return {
    status: "ok",
    completionDate,
    months,
    totalContributed,
    interestEarned: totalInterest,
    finalBalance: balance,
  };
}

export function projectAllPockets(pockets, projectedLeftover, annualRatePercent, today) {
  const monthlyAvailable = Number.isFinite(projectedLeftover) ? Math.max(0, projectedLeftover) : 0;
  const { effectiveByPocketId, totalRequested, scaled } = calculateEffectiveContributions(
    pockets,
    monthlyAvailable
  );

  const projections = pockets.map((p) => {
    const effectiveContribution = effectiveByPocketId.get(p.id) || 0;
    const projection = calculatePocketProjection(
      p,
      effectiveContribution,
      annualRatePercent,
      today,
      monthlyAvailable
    );
    return { pocket: p, effectiveContribution, projection };
  });

  return { projections, monthlyAvailable, totalRequested, scaled };
}
