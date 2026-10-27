import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { drawPortrait } from "@/lib/portrait";

describe("Portrait dessiné", () => {
  it("transforme une image en dessin noir et blanc carré", async () => {
    const photo = await sharp({ create: { width: 640, height: 360, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg().toBuffer();
    const url = await drawPortrait(photo);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    const img = sharp(Buffer.from(url.split(",")[1], "base64"));
    const meta = await img.metadata();
    expect(meta.width).toBe(meta.height);
    const { data } = await img.raw().toBuffer({ resolveWithObject: true });
    expect(new Set(data).size).toBeLessThanOrEqual(2 * (meta.channels ?? 1));
  });
});
