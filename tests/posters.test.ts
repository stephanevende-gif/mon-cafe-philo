import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { NO_AUTHOR, lecturePoster, shortPoster } from "../src/lib/posters";

const jpeg = (width: number, height: number, background: string) =>
  sharp({ create: { width, height, channels: 3, background } }).jpeg().toBuffer();

function fakeFetch(images: Record<string, Buffer>) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    const name = url.split("/").pop()!.replace(".jpg", "");
    return images[name] ? new Response(new Uint8Array(images[name])) : new Response("", { status: 404 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("images d'attente des lecteurs", () => {
  it("prend la vignette de la conférence, en 16:9", async () => {
    const { f } = fakeFetch({ hqdefault: await jpeg(480, 360, "#1e224a") });
    const poster = await lecturePoster("abc", f);
    expect(poster).toMatch(/^data:image\/jpeg;base64,/);
    const meta = await sharp(Buffer.from(poster!.split(",")[1], "base64")).metadata();
    expect(meta.width! / meta.height!).toBeCloseTo(16 / 9, 1);
  });

  it("garde l'image du Short choisie, en vertical, et l'image du milieu sans avis", async () => {
    const { f } = fakeFetch({ sd1: await jpeg(640, 480, "#ff0000"), sd2: await jpeg(640, 480, "#00ff00"), sd3: await jpeg(640, 480, "#0000ff") });
    const color = async (poster: string | null) => {
      const { data } = await sharp(Buffer.from(poster!.split(",")[1], "base64")).raw().toBuffer({ resolveWithObject: true });
      return [data[0], data[1], data[2]].map((c) => (c > 128 ? 1 : 0)).join("");
    };
    expect(await color(await shortPoster("abc", async () => 2, f))).toBe("001");
    expect(await color(await shortPoster("abc", null, f))).toBe("010");
    expect(await color(await shortPoster("abc", async () => { throw new Error("hors ligne"); }, f))).toBe("010");
  });

  it("montre le portrait de l'auteur quand aucune image du Short ne le montre", async () => {
    const { f } = fakeFetch({ sd1: await jpeg(640, 480, "#ff0000"), sd2: await jpeg(640, 480, "#00ff00") });
    expect(await shortPoster("abc", async () => NO_AUTHOR, f, "data:image/jpeg;base64,portrait")).toBe("data:image/jpeg;base64,portrait");
    expect(await shortPoster("abc", async () => NO_AUTHOR, f, null)).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("ne fabrique rien sans image YouTube", async () => {
    expect(await lecturePoster("abc", fakeFetch({}).f)).toBeNull();
    expect(await shortPoster("abc", null, fakeFetch({}).f)).toBeNull();
  });
});
