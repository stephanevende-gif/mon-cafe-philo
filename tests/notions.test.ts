import { describe, expect, it } from "vitest";
import { NOTIONS, formatNotions, notionsOf } from "@/lib/notions";

describe("Notions du programme de terminale", () => {
  it("compte les 17 notions de la voie générale", () => {
    expect(NOTIONS).toHaveLength(17);
  });

  it("garde au plus trois notions, dans l'ordre du programme", () => {
    expect(formatNotions(["la vérité", "la technique", "l'art", "le temps"])).toBe("l'art, la technique, le temps");
    expect(formatNotions(["courage"])).toBe("");
  });

  it("retrouve les notions d'un thème enregistré", () => {
    expect(notionsOf("la technique, la liberté, le travail")).toEqual(["la technique", "la liberté", "le travail"]);
    expect(notionsOf("technique")).toEqual([]);
  });
});
