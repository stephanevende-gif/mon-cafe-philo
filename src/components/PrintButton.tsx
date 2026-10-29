"use client";

export function PrintButton({ label = "Imprimer ma fiche de travail" }: { label?: string }) {
  return (
    <button type="button" className="btn primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}
