"use client";

import { useState } from "react";

// Un mot à éclaircir pendant l'écoute ou la rédaction : sa définition s'ouvre au CNRTL (Centre national de ressources
// textuelles et lexicales), dans un nouvel onglet, sans quitter l'application.

export const cnrtlUrl = (word: string) => `https://www.cnrtl.fr/definition/${encodeURIComponent(word.trim().toLowerCase())}`;

export function Dictionnaire() {
  const [word, setWord] = useState("");
  return (
    <form
      className="dictionnaire"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (word.trim()) window.open(cnrtlUrl(word), "_blank", "noopener,noreferrer");
      }}
    >
      <label htmlFor="mot-cnrtl">Un mot à éclaircir ?</label>
      <div className="row">
        <input id="mot-cnrtl" type="search" value={word} onChange={(e) => setWord(e.target.value)} placeholder="Ex. : contingence" maxLength={60} autoComplete="off" />
        <button className="btn small" type="submit">Définition</button>
      </div>
      <span className="hint">Dictionnaire du CNRTL, ouvert dans un nouvel onglet.</span>
    </form>
  );
}
