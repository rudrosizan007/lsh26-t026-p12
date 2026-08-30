import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

const DISPLAY_MS = 1300;
const FADE_MS = 400;

/**
 * Shown once, ever, on a person's very first visit — App.jsx gates this on a
 * localStorage flag so refreshes and later sessions skip straight to the app.
 */
export default function SplashScreen({ onDone }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), DISPLAY_MS);
    const doneTimer = setTimeout(onDone, DISPLAY_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-[#fafaf9] transition-opacity ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-label="Loading Pennywise"
    >
      <img src={logo} alt="Pennywise" className="h-24 w-24 sm:h-28 sm:w-28 animate-splash-pop" />
      <p className="text-2xl font-semibold text-stone-900 tracking-tight animate-fade-in">Pennywise</p>
      <p className="text-sm text-stone-500 animate-fade-in">Know where your salary is going.</p>
    </div>
  );
}
