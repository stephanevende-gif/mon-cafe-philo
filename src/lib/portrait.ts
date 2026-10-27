import sharp from "sharp";

// Portrait dessiné au crayon, rehaussé à l'encre, sur papier blanc, tiré d'une image des vidéos de la chaîne :
// gris doux du graphite, traits plus noirs sur les contours, hachures légères dans les ombres,
// et bords laissés « non finis » qui se fondent dans le blanc.
// Le résultat est une image PNG en niveaux de gris (data URL) prête à être affichée.

const SIZE = 480;

export async function drawPortrait(image: Buffer): Promise<string> {
  const base = sharp(image).resize(SIZE, SIZE, { fit: "cover", position: sharp.strategy.attention }).grayscale().normalise();
  const gray = await base.clone().sharpen({ sigma: 1.2 }).raw().toBuffer();
  // Négatif flouté : sert au « fondu-densité » qui donne l'aspect graphite.
  const blurredNegative = await base.clone().negate({ alpha: false }).blur(9).raw().toBuffer();
  // Ombres adoucies pour placer les hachures.
  const soft = await base.clone().blur(3).raw().toBuffer();
  // Texture de traits de crayon : bruit étiré en diagonale.
  const noise = Buffer.alloc(SIZE * SIZE);
  let seed = 12345;
  for (let i = 0; i < noise.length; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    noise[i] = seed >>> 24;
  }
  const k = 15;
  const kernel = Array.from({ length: k * k }, (_, i) => (Math.floor(i / k) === k - 1 - (i % k) ? 1 : 0));
  const strokes = await sharp(noise, { raw: { width: SIZE, height: SIZE, channels: 1 } })
    .convolve({ width: k, height: k, kernel })
    .normalise()
    .raw()
    .toBuffer();
  // Bruit à grande échelle : contour irrégulier de la zone dessinée.
  const patches = await sharp(noise, { raw: { width: SIZE, height: SIZE, channels: 1 } }).blur(18).normalise().raw().toBuffer();

  const w = SIZE;
  const at = (buf: Buffer, x: number, y: number) => buf[Math.min(w - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const out = Buffer.alloc(w * w);
  const c = w / 2;

  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // 1. Crayon : fondu-densité du gris par son négatif flouté.
      let v = Math.min(255, (gray[i] * 255) / (256 - blurredNegative[i]));
      // Modelé : on garde les valeurs de l'image (ombres, volumes), éclaircies comme un graphite sur papier.
      const tone = Math.pow(gray[i] / 255, 0.85);
      v *= 0.38 + 0.62 * tone;
      // 2. Encre : traits noirs là où le contraste est fort.
      const gx = at(soft, x + 1, y) - at(soft, x - 1, y);
      const gy = at(soft, x, y + 1) - at(soft, x, y - 1);
      const edge = Math.min(1, Math.max(0, (Math.hypot(gx, gy) - 14) / 34));
      v *= 1 - 0.85 * edge;
      // 3. Hachures au crayon dans les ombres, plus marquées quand c'est sombre.
      const shade = Math.max(0, (150 - soft[i]) / 150);
      v *= 1 - shade * 0.35 * (strokes[i] / 255);
      // 4. Bords non finis : le dessin se perd dans le papier, de façon irrégulière.
      const r = Math.hypot(x - c, (y - c) * 0.85) / c + (patches[i] / 255 - 0.5) * 0.3 + (strokes[i] / 255 - 0.5) * 0.08;
      const fade = Math.min(1, Math.max(0, (r - 0.5) / 0.32));
      v = v + (255 - v) * fade;
      out[i] = Math.round(Math.max(0, Math.min(255, v)));
    }
  }

  const png = await sharp(out, { raw: { width: w, height: w, channels: 1 } }).linear(1.08, -10).toColourspace("b-w").png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

// Télécharge l'image (vignette YouTube) et la dessine ; ne renvoie rien en cas d'échec.
// Image d'un Short : la vidéo verticale occupe la bande centrale ; on garde le haut de cette bande (le visage),
// sous le bandeau de titre et au-dessus des sous-titres.
export async function shortFace(image: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(image).metadata();
  const strip = Math.round((height * 9) / 16);
  const side = Math.round(strip * 0.82);
  return sharp(image)
    .extract({ left: Math.round((width - side) / 2), top: Math.round(height * 0.12), width: side, height: Math.min(side, height - Math.round(height * 0.12)) })
    .toBuffer();
}

export async function drawPortraitFromUrl(url: string, fetchImpl: typeof fetch = fetch, opts: { short?: boolean } = {}): Promise<string | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const image = Buffer.from(await res.arrayBuffer());
    return await drawPortrait(opts.short ? await shortFace(image) : image);
  } catch {
    return null;
  }
}
