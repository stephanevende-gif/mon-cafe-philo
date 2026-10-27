// Les 17 notions du programme officiel de philosophie de terminale, voie générale
// (arrêté du 19 juillet 2019, BO spécial n° 8 du 25 juillet 2019).
export const NOTIONS = [
  "l'art",
  "le bonheur",
  "la conscience",
  "le devoir",
  "l'État",
  "l'inconscient",
  "la justice",
  "le langage",
  "la liberté",
  "la nature",
  "la raison",
  "la religion",
  "la science",
  "la technique",
  "le temps",
  "le travail",
  "la vérité",
] as const;

export type Notion = (typeof NOTIONS)[number];

// Le thème d'une fiche est la liste de ses notions (trois au plus), séparées par des virgules.
export const NOTION_SEPARATOR = ", ";

export function isNotion(s: string): s is Notion {
  return (NOTIONS as readonly string[]).includes(s);
}

export function notionsOf(theme: string): Notion[] {
  return theme.split(NOTION_SEPARATOR).map((s) => s.trim()).filter(isNotion);
}

export function formatNotions(notions: readonly string[]): string {
  return NOTIONS.filter((n) => notions.includes(n)).slice(0, 3).join(NOTION_SEPARATOR);
}
