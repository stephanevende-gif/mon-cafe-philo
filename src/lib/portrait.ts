import sharp from "sharp";

// Portrait de l'auteur : une vraie photo, sans retouche artistique.
// Priorité à la photo de sa fiche auteur des Éditions M-Éditer ; à défaut, une photo choisie par l'équipe
// ou l'image d'un de ses Shorts. La photo est recadrée, réduite et gardée dans l'application (JPEG en data URL),
// pour ne pas dépendre d'un autre site à l'affichage.

const WIDTH = 480;
const HEIGHT = 560;

export async function storePortrait(image: Buffer): Promise<string> {
  const jpeg = await sharp(image)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: "cover", position: sharp.strategy.attention, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

// Image d'un Short : la vidéo verticale occupe la bande centrale ; on garde le haut de cette bande (le visage),
// sous le bandeau de titre et au-dessus des sous-titres.
export async function shortFace(image: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(image).metadata();
  const strip = Math.round((height * 9) / 16);
  const side = Math.round(strip * 0.82);
  const top = Math.round(height * 0.12);
  return sharp(image)
    .extract({ left: Math.round((width - side) / 2), top, width: side, height: Math.min(Math.round(side * 1.15), height - top) })
    .toBuffer();
}

// Télécharge la photo et la prépare ; ne renvoie rien en cas d'échec.
export async function portraitFromUrl(url: string, fetchImpl: typeof fetch = fetch, opts: { short?: boolean } = {}): Promise<string | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const image = Buffer.from(await res.arrayBuffer());
    return await storePortrait(opts.short ? await shortFace(image) : image);
  } catch {
    return null;
  }
}
