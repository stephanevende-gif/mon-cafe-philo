import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { storePortrait } from "@/lib/portrait";

describe("Portrait de l'auteur", () => {
  it("garde la vraie photo, en couleur, recadrée et réduite (JPEG)", async () => {
    const photo = await sharp({ create: { width: 1280, height: 720, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg().toBuffer();
    const url = await storePortrait(photo);
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
    const meta = await sharp(Buffer.from(url.split(",")[1], "base64")).metadata();
    expect([meta.width, meta.height]).toEqual([480, 560]);
    const small = await storePortrait(await sharp({ create: { width: 130, height: 150, channels: 3, background: "#888" } }).jpeg().toBuffer());
    expect((await sharp(Buffer.from(small.split(",")[1], "base64")).metadata()).width).toBeLessThanOrEqual(130);
    expect(meta.channels).toBe(3);
  });
});
