import { describe, expect, it } from "vitest";
import { isStudent, studentSpeaker } from "@/lib/student";

describe("isStudent", () => {
  it("reconnaît un étudiant ou une élève d'après sa présentation", () => {
    expect(isStudent("Maxence Körner est étudiant en Khâgne au Lycée Clemenceau de Nantes.")).toBe(true);
    expect(isStudent("Anne Lepage est étudiante en CPGE au lycée Clemenceau, à Nantes.")).toBe(true);
    expect(isStudent("Malo Fourmont est actuellement élève en khâgne.")).toBe(true);
  });
  it("ne retient ni les anciens élèves ni les enseignants", () => {
    expect(isStudent("Thibaut Gress est ancien élève de l'Ecole Normale Supérieure, agrégé et docteur en Philosophie.")).toBe(false);
    expect(isStudent("Il enseigne aux étudiants de l'Université d'Angers.")).toBe(false);
    expect(isStudent("agrégé de philosophie et normalien-étudiant de l'ENS Paris.")).toBe(false);
    expect(isStudent(null)).toBe(false);
  });
});

describe("studentSpeaker", () => {
  it("lit aussi la description du Short, pour l'intervenant seulement", () => {
    const description = "Un débat sur le Conseil constitutionnel.\n\nMalo Fourmont est étudiant en khâgne au Lycée Guist'hau de Nantes.";
    expect(studentSpeaker({ fullName: "Malo Fourmont", qualification: "Présentation à compléter", description })).toBe(true);
    expect(studentSpeaker({ fullName: "Denis Moreau", qualification: "Professeur de philosophie.", description })).toBe(false);
  });
});
