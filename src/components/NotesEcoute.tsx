"use client";

import { useEffect, useRef, useState } from "react";
import { saveListeningNote } from "@/app/actions/notebook";
import type { ListeningNote } from "@/db/schema";

// Bloc-notes d'écoute, à côté de la conférence : l'auditeur relève la thèse, les arguments, un exemple ou une objection.
// Les notes s'enregistrent d'elles-mêmes dans le carnet, quelques instants après la frappe.

const FIELDS: { key: keyof ListeningNote; label: string; placeholder: string; rows: number }[] = [
  { key: "these", label: "La thèse de l'auteur", placeholder: "Que soutient-il ? En une phrase.", rows: 2 },
  { key: "arguments", label: "Ses arguments", placeholder: "Pourquoi le soutient-il ? Notez les étapes du raisonnement.", rows: 5 },
  { key: "exemples", label: "Exemples et objections", placeholder: "Un exemple qu'il donne, ou ce que vous lui répondriez.", rows: 3 },
];

type Status = "idle" | "saving" | "saved" | "error";

export function NotesEcoute({ sheetId, initial }: { sheetId: string; initial: ListeningNote }) {
  const [notes, setNotes] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const dirty = useRef(false);
  const latest = useRef(notes);
  latest.current = notes;

  const save = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    try {
      const { these, arguments: args, exemples } = latest.current;
      const r = await saveListeningNote(sheetId, { these, arguments: args, exemples });
      if (r.ok) setStatus("saved");
      else {
        setStatus("error");
        setError(r.error);
      }
    } catch {
      dirty.current = true;
      setStatus("error");
      setError("Enregistrement impossible pour l'instant : vos notes restent affichées, réessayez.");
    }
  };

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  return (
    <form className="notes-ecoute" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="entete">
        <span className="eyebrow">Mes notes d&apos;écoute</span>
        <span className={`etat ${status}`} role="status" aria-live="polite">
          {status === "saving" ? "Enregistrement…" : status === "saved" ? "Enregistré dans votre carnet" : status === "error" ? error : "Visible de vous seul"}
        </span>
      </div>
      {FIELDS.map((f) => (
        <label key={f.key}>
          {f.label}
          <textarea
            name={f.key}
            rows={f.rows}
            maxLength={4000}
            placeholder={f.placeholder}
            value={notes[f.key]}
            onChange={(e) => {
              dirty.current = true;
              setNotes({ ...notes, [f.key]: e.target.value });
            }}
            onBlur={() => void save()}
          />
        </label>
      ))}
    </form>
  );
}
