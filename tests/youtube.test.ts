import { describe, expect, it } from "vitest";
import { cleanTitle, parseDuration, parseYouTubeId } from "@/lib/youtube";

describe("YouTube", () => {
  it("reconnaît les différentes formes d'adresse", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=7poiVNwW8ho&list=PL2d4vA4vfs79RPBnT3PFdOjyXaWPdquGv")).toBe("7poiVNwW8ho");
    expect(parseYouTubeId("https://youtu.be/7poiVNwW8ho")).toBe("7poiVNwW8ho");
    expect(parseYouTubeId("https://www.youtube.com/shorts/7poiVNwW8ho")).toBe("7poiVNwW8ho");
    expect(parseYouTubeId("7poiVNwW8ho")).toBe("7poiVNwW8ho");
    expect(parseYouTubeId("https://exemple.fr/watch?v=7poiVNwW8ho")).toBeNull();
  });
  it("lit les durées", () => {
    expect(parseDuration("2:41")).toBe(161);
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(parseDuration("abc")).toBeNull();
  });

  it("retire les hashtags et les emojis des titres affichés", () => {
    expect(cleanTitle("Quand l'éthique devient violente #philosophie #morale #réflexion")).toBe("Quand l'éthique devient violente");
    expect(cleanTitle("L'imperfection humaine est-elle en danger ? 📉 #philosophie #IA #humanité")).toBe("L'imperfection humaine est-elle en danger ?");
    expect(cleanTitle("L'ennemi révèle qui vous êtes vraiment #Schmitt #identité")).toBe("L'ennemi révèle qui vous êtes vraiment");
    expect(cleanTitle("Ricœur — De la disproportion à la médiation")).toBe("Ricœur — De la disproportion à la médiation");
    expect(cleanTitle("#philosophie")).toBe("#philosophie");
  });
});
