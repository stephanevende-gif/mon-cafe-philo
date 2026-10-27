import sharp from "sharp";

// Portrait dessiné en noir et blanc, à la manière des illustrations de presse :
// contours à l'encre et ombres en hachures, tiré d'une image des vidéos de la chaîne.
// Le résultat est une image PNG (data URL) prête à être affichée.

const SIZE = 420;
const INK = 24; // presque noir

export async function drawPortrait(image: Buffer): Promise<string> {
  const { data, info } = await sharp(image)
    .resize(SIZE, SIZE, { fit: "cover", position: sharp.strategy.attention })
    .grayscale()
    .normalise()
    .blur(0.9)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const at = (x: number, y: number) => data[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const out = Buffer.alloc(w * h, 255);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = at(x, y);
      // Contours (Sobel).
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const edge = Math.hypot(gx, gy) > 170;
      // Hachures : plus l'image est sombre, plus les traits sont serrés et croisés.
      const d1 = (x + y) % 6 === 0;
      const d2 = (x - y + 6 * h) % 6 === 0;
      const d3 = (x + y) % 3 === 0;
      const ink = edge || (v < 165 && d1) || (v < 105 && d2) || (v < 50 && d3) || v < 18;
      if (ink) out[y * w + x] = INK;
    }
  }

  const png = await sharp(out, { raw: { width: w, height: h, channels: 1 } }).png({ palette: true, colours: 2 }).toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

// Télécharge l'image (vignette YouTube) et la dessine ; ne renvoie rien en cas d'échec.
export async function drawPortraitFromUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    return await drawPortrait(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}
