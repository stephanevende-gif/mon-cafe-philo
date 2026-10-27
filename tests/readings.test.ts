import { describe, expect, it } from "vitest";
import { cleanReadings } from "../src/lib/readings";

describe("lectures conseillées", () => {
  it("garde trois lectures complètes au plus, sans espaces superflus", () => {
    const r = (n: number) => ({ philosopher: ` P${n} `, book: `L${n}`, description: "Deux phrases." });
    const out = cleanReadings([r(1), { philosopher: "P", book: "", description: "Sans livre." }, r(2), r(3), r(4)]);
    expect(out).toEqual([1, 2, 3].map((n) => ({ philosopher: `P${n}`, book: `L${n}`, description: "Deux phrases." })));
  });
});
