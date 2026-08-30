import { createWorker } from "tesseract.js";

const MAX_DIMENSION = 1800;

/**
 * Downscales very large camera photos before OCR. Large phone photos (4000px+)
 * slow Tesseract down for no accuracy benefit once text is legible.
 * Falls back to the original file on any failure — this is an optimization,
 * never a requirement for OCR to proceed.
 */
export async function resizeImageIfNeeded(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
      bitmap.close?.();
      return file;
    }

    const scale = MAX_DIMENSION / Math.max(width, height);
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

/**
 * Tesseract's worker/core/language files are self-hosted under /public/tesseract
 * so receipt scanning works with no external API and no CDN dependency at demo time.
 */
const TESSERACT_OPTIONS = {
  workerPath: "/tesseract/worker.min.js",
  corePath: "/tesseract/tesseract-core-lstm.wasm.js",
  langPath: "/tesseract",
};

function flattenLines(blocks) {
  const lines = [];
  for (const block of blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        const text = (line.text || "").replace(/\n+$/, "");
        if (text.trim()) {
          lines.push({ text, confidence: line.confidence ?? 0 });
        }
      }
    }
  }
  return lines;
}

/**
 * Runs OCR on an image and returns plain text plus per-line confidence
 * (0-100, Tesseract's own estimate) for the deterministic receipt parser to
 * use as one signal among several. onStatus receives 'loading' | 'reading'.
 */
export async function runOCR(image, onStatus) {
  const worker = await createWorker("eng", 1, {
    ...TESSERACT_OPTIONS,
    logger: (m) => {
      if (m.status === "recognizing text") onStatus?.("reading");
      else onStatus?.("loading");
    },
  });

  try {
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
    return {
      text: data.text || "",
      lines: flattenLines(data.blocks),
      overallConfidence: data.confidence ?? 0,
    };
  } finally {
    await worker.terminate();
  }
}
