import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { findCover } from "../src/lib/covers";

const reading = { philosopher: "Henri Bergson", book: "La Pensée et le mouvant", description: "Deux phrases." };

function fakeFetch(docs: unknown[], image: Buffer | null) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    if (url.includes("search.json")) return new Response(JSON.stringify({ docs }));
    return image ? new Response(new Uint8Array(image)) : new Response("", { status: 404 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("couvertures des livres conseillés", () => {
  it("garde la couverture d'un livre du même auteur", async () => {
    const png = await sharp({ create: { width: 300, height: 450, channels: 3, background: "#943e37" } }).png().toBuffer();
    const { f, calls } = fakeFetch([{ title: "La pensée et le mouvant", author_name: ["Henri Bergson"], cover_i: 42 }], png);
    const cover = await findCover(reading, f);
    expect(cover).toMatch(/^data:image\/jpeg;base64,/);
    expect(calls.at(-1)).toContain("/b/id/42-L.jpg");
  });

  it("n'invente rien quand l'auteur ne correspond pas ou qu'il n'y a pas d'image", async () => {
    expect(await findCover(reading, fakeFetch([{ author_name: ["Autre Personne"], cover_i: 7 }], null).f)).toBeNull();
    expect(await findCover(reading, fakeFetch([{ author_name: ["Henri Bergson"], cover_i: 7 }], null).f)).toBeNull();
  });

  it("laisse l'IA écarter toutes les éditions qui ne conviennent pas", async () => {
    const png = await sharp({ create: { width: 300, height: 450, channels: 3, background: "#943e37" } }).png().toBuffer();
    const docs = [{ author_name: ["Henri Bergson"], cover_i: 1 }, { author_name: ["Henri Bergson"], cover_i: 2 }];
    expect(await findCover(reading, fakeFetch(docs, png).f, async () => null)).toBeNull();
    let seen = 0;
    const cover = await findCover(reading, fakeFetch(docs, png).f, async (covers) => ((seen = covers.length), 1));
    expect(seen).toBe(2);
    expect(cover).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("sans édition française illustrée, cherche sous le titre original et accepte une édition étrangère", async () => {
    const png = await sharp({ create: { width: 300, height: 450, channels: 3, background: "#943e37" } }).png().toBuffer();
    const popper = { philosopher: "Karl Popper", book: "Misère de l'historicisme", description: "Deux phrases." };
    const calls: string[] = [];
    const f = (async (url: string) => {
      calls.push(url);
      if (url.includes("search.json")) {
        const docs = url.includes("Poverty") ? [{ title: "The Poverty of Historicism", author_name: ["Karl Popper"], cover_i: 9 }] : [];
        return new Response(JSON.stringify({ docs }));
      }
      return new Response(new Uint8Array(png));
    }) as unknown as typeof fetch;
    let foreignSeen: boolean | null = null;
    const cover = await findCover(popper, f, async (_c, _r, foreign) => ((foreignSeen = foreign), 0), async () => "The Poverty of Historicism");
    expect(cover).toMatch(/^data:image\/jpeg;base64,/);
    expect(foreignSeen).toBe(true);
    expect(calls.some((u) => u.includes("/b/id/9-L.jpg"))).toBe(true);
  });
});
