"use client";

import { useEffect, useState } from "react";

type Choix = "auto" | "light" | "dark";
const LIBELLES: Record<Choix, string> = { auto: "Thème : auto", light: "Thème : clair", dark: "Thème : sombre" };
const SUIVANT: Record<Choix, Choix> = { auto: "dark", dark: "light", light: "auto" };

// Bouton à trois positions : réglage de l'appareil (auto), clair, sombre. Le choix reste sur l'appareil.
export function ThemeToggle() {
  const [choix, setChoix] = useState<Choix>("auto");
  useEffect(() => {
    try {
      const v = localStorage.getItem("theme");
      if (v === "light" || v === "dark") setChoix(v);
    } catch {}
  }, []);
  function changer() {
    const n = SUIVANT[choix];
    setChoix(n);
    try {
      if (n === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", n);
    } catch {}
    if (n === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", n);
  }
  return (
    <button type="button" className="theme-toggle" onClick={changer} aria-label={`${LIBELLES[choix]}. Changer le thème`}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill={choix === "dark" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" />
        {choix === "auto" && <path d="M8 1.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" />}
      </svg>
      <span className="theme-label">{choix === "dark" ? " Sombre" : choix === "light" ? " Clair" : " Auto"}</span>
    </button>
  );
}

// Appliqué avant l'affichage, pour éviter un éclair blanc au chargement.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
