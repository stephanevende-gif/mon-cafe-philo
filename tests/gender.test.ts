import { describe, expect, it } from "vitest";
import { genderFromBio } from "@/lib/gender";

describe("intervenante ou intervenant", () => {
  it("ne conclut que d'après la grammaire de la présentation", () => {
    expect(genderFromBio("Nadia Taïbi est agrégée et docteure en philosophie.")).toBe("femme");
    expect(genderFromBio("Julie est à la fois docteur en philosophie et danseuse professionnelle.")).toBe("femme");
    expect(genderFromBio("David est né en 1980 à Angers. Agrégé de philosophie, il enseigne au lycée.")).toBe("homme");
    // « docteur » ou « professeur » seuls ne disent rien : beaucoup de femmes gardent ces titres.
    expect(genderFromBio("Camille est professeur et docteur en philosophie.")).toBeNull();
    expect(genderFromBio("Présentation à compléter : la description YouTube ne présente pas l'auteur.")).toBeNull();
    expect(genderFromBio(null)).toBeNull();
  });
});
