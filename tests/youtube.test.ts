import { describe, expect, it } from "vitest";
import { parseDuration, parseYouTubeId } from "@/lib/youtube";

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
});
