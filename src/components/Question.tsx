import { Fragment } from "react";

// Garde entiers les mots composés (« peuvent-elles ») : la question ne se coupe jamais sur un trait d'union.
export function Question({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\S*-\S*)/).map((part, i) =>
        part.includes("-") ? <span key={i} style={{ whiteSpace: "nowrap" }}>{part}</span> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
