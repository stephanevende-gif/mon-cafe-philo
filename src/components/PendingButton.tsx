"use client";

import { useFormStatus } from "react-dom";

// Bouton d'une action longue (IA, synchronisation) : pendant le traitement, il se désactive et dit d'attendre,
// pour qu'on ne croie pas qu'il ne répond pas.
export function PendingButton({ children, pending, className = "btn primary" }: { children: React.ReactNode; pending: string; className?: string }) {
  const status = useFormStatus();
  return (
    <>
      <button className={className} type="submit" disabled={status.pending} aria-busy={status.pending}>
        {status.pending ? pending : children}
      </button>
      {status.pending && <span className="hint" role="status"> Ne fermez pas la page.</span>}
    </>
  );
}
