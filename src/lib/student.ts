// Les Shorts d'un étudiant ou d'un élève ne donnent pas de fiche. C'est la présentation de l'intervenant qui le dit
// (« Anne Lepage est étudiante en CPGE »), dans sa fiche ou dans la description du Short.
// Un « ancien élève de l'École normale » n'est pas concerné.
// Le même motif sert en JavaScript et en SQL (opérateur ~*).
export const STUDENT_PATTERN = "est (actuellement )?(une? )?(étudiante?|élève|lycéenne?)[ ,.]";

const STUDENT = new RegExp(STUDENT_PATTERN, "i");

export const isStudent = (qualification: string | null | undefined) => !!qualification && STUDENT.test(qualification);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function studentSpeaker(p: { fullName?: string | null; qualification?: string | null; description?: string | null }): boolean {
  if (isStudent(p.qualification)) return true;
  if (!p.fullName?.trim() || !p.description) return false;
  return new RegExp(`${escape(p.fullName.trim())}\\s+${STUDENT_PATTERN}`, "i").test(p.description);
}
