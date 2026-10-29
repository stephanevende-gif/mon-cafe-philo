import Link from "next/link";

export type Stage = "pense" | "donc" | "suis";

const STEPS: { key: Stage; label: string; hint: string; suffix: string }[] = [
  { key: "pense", label: "Je pense", hint: "la question", suffix: "" },
  { key: "donc", label: "Donc ?", hint: "la piste", suffix: "/donc" },
  { key: "suis", label: "Je suis", hint: "mon carnet", suffix: "/je-suis" },
];

// base : "" pour la question du jour, "/question/AAAA-MM-JJ" pour une archive.
export function Steps({ base, current }: { base: string; current: Stage }) {
  const href = (suffix: string) => (base + suffix) || "/je-pense";
  return (
    <>
      <nav className="steps-nav" aria-label="Parcours">
        {STEPS.map((s) => (
          <Link key={s.key} href={href(s.suffix)} aria-current={s.key === current ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
      </nav>
      <nav className="tabbar" aria-label="Parcours">
        {STEPS.map((s) => (
          <Link key={s.key} href={href(s.suffix)} aria-current={s.key === current ? "page" : undefined}>
            {s.label}
            <i>{s.hint}</i>
          </Link>
        ))}
      </nav>
    </>
  );
}
