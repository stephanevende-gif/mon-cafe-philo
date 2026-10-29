// Femme ou homme, seulement quand la présentation publiée le dit par sa grammaire (« Elle enseigne », « docteure »,
// « agrégée »…). Jamais d'après le prénom : sans indice clair, la réponse reste inconnue et l'équipe la renseigne.
export type Gender = "femme" | "homme";

const words = (list: string[]) => new RegExp(`(?<![\\p{L}])(${list.join("|")})(?![\\p{L}])`, "iu");
// Les formes féminines sont décisives. Côté masculin, « docteur » ou « professeur » ne suffisent pas
// (beaucoup de femmes gardent ces titres) : seuls comptent le pronom et les accords.
const FEM = words(["elle", "docteure", "professeure", "chercheuse", "agrégée", "diplômée", "née", "étudiante", "enseignante", "directrice", "conférencière", "traductrice", "danseuse", "assistante", "ancienne", "maîtresse de conférences"]);
const MASC = words(["il", "agrégé", "diplômé", "né", "étudiant", "ancien"]);

export function genderFromBio(bio: string | null | undefined): Gender | null {
  if (!bio || bio.startsWith("Présentation à compléter")) return null;
  const text = bio.replace(/[’']/g, " ");
  const f = FEM.test(text);
  const m = MASC.test(text);
  if (f && !m) return "femme";
  if (m && !f) return "homme";
  return null;
}
