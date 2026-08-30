import { useRef, useState } from "react";
import Button from "./ui/Button";
import { resizeImageIfNeeded, runOCR } from "../lib/ocr";
import { parseReceipt } from "../lib/receiptParser";

const FRIENDLY_ERROR = "Couldn't read this receipt.";

const STEPS = [
  { key: "image", label: "Image loaded" },
  { key: "text", label: "Reading text" },
  { key: "amount", label: "Finding amount" },
  { key: "date", label: "Finding date" },
  { key: "shop", label: "Finding shop" },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function StepList({ activeIndex }) {
  return (
    <ul className="text-sm text-stone-600 space-y-2 text-left w-full max-w-[220px] mx-auto">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={
                done
                  ? "text-emerald-600"
                  : active
                  ? "text-stone-900"
                  : "text-stone-300"
              }
            >
              {done ? "✓" : active ? "●" : "○"}
            </span>
            <span className={done || active ? "text-stone-700" : "text-stone-400"}>{step.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ReceiptScanner({ onExtracted, onManualFallback }) {
  const [step, setStep] = useState("idle"); // idle | reading | error
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState(FRIENDLY_ERROR);
  const [lastFile, setLastFile] = useState(null);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      setErrorMessage("Please upload a receipt image.");
      setStep("error");
      return;
    }

    setLastFile(file);
    setStep("reading");
    setStepIndex(0);

    try {
      const optimized = await resizeImageIfNeeded(file);
      setStepIndex(1);

      const ocrResult = await runOCR(optimized, (status) => {
        if (status === "reading") setStepIndex(1);
      });

      if (!ocrResult.text || !ocrResult.text.trim()) {
        setErrorMessage(FRIENDLY_ERROR);
        setStep("error");
        return;
      }

      const parsed = parseReceipt(ocrResult);

      // Reveal each field in sequence — the work is already done, this just
      // keeps the checklist legible instead of jumping straight to the end.
      setStepIndex(2);
      await wait(200);
      setStepIndex(3);
      await wait(200);
      setStepIndex(4);
      await wait(200);

      onExtracted(parsed);
    } catch {
      setErrorMessage(FRIENDLY_ERROR);
      setStep("error");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    processFile(file);
  }

  function retry() {
    if (lastFile) {
      processFile(lastFile);
    } else {
      setStep("idle");
    }
  }

  if (step === "reading") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-10 animate-fade-in">
        <div className="h-10 w-10 rounded-full border-2 border-stone-200 border-t-emerald-600 animate-spin" />
        <p className="text-stone-700 font-medium">Reading receipt…</p>
        <StepList activeIndex={stepIndex} />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-8 animate-fade-in">
        <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
          !
        </div>
        <p className="text-stone-700 font-medium">
          {errorMessage}
          <br />
          You can enter the expense manually.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" shape="pill" onClick={retry}>
            Retry
          </Button>
          <Button shape="pill" onClick={onManualFallback}>
            Enter manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 py-10 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
      >
        <span className="text-3xl" aria-hidden="true">📷</span>
        <span className="font-medium text-stone-800">Scan receipt</span>
        <span className="text-sm text-stone-500">Upload a receipt photo</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-3 text-stone-500 text-xs">
        <div className="h-px bg-stone-200 flex-1" />
        or enter manually
        <div className="h-px bg-stone-200 flex-1" />
      </div>
      <button
        onClick={onManualFallback}
        className="w-full text-center text-sm font-medium text-stone-700 hover:text-stone-900 py-2"
      >
        Enter expense manually
      </button>
    </div>
  );
}
