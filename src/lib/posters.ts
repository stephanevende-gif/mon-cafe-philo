import sharp from "sharp";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { speakers, videos } from "@/db/schema";

// Image d'attente des lecteurs vidéo : on ne montre jamais un écran noir avant le clic.
// L'image est téléchargée une fois depuis YouTube, réduite et gardée dans l'application (JPEG en data URL) :
// le lecteur n'envoie toujours aucune requête à YouTube avant que l'on clique.
// - Conférence : la vignette publiée par la chaîne.
// - Short : l'image la plus flatteuse de l'auteur parmi trois moments de la vidéo (la vignette d'un Short est
//   souvent un carton de titre, sans l'auteur).

const thumb = (id: string, name: string) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${name}.jpg`;

async function download(url: string, fetchImpl: typeof fetch): Promise<Buffer | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const image = Buffer.from(await res.arrayBuffer());
    // YouTube renvoie une petite image grise quand une taille n'existe pas.
    const { width = 0 } = await sharp(image).metadata();
    return width >= 320 ? image : null;
  } catch {
    return null;
  }
}

async function firstOf(urls: string[], fetchImpl: typeof fetch): Promise<Buffer | null> {
  for (const url of urls) {
    const image = await download(url, fetchImpl);
    if (image) return image;
  }
  return null;
}

const dataUrl = (jpeg: Buffer) => `data:image/jpeg;base64,${jpeg.toString("base64")}`;

// Vignette 16:9 de la conférence (les plus petites tailles sont en 4:3, avec des bandes noires : on recadre).
export async function lecturePoster(youtubeId: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const image = await firstOf(["maxresdefault", "sddefault", "hqdefault"].map((n) => thumb(youtubeId, n)), fetchImpl);
  if (!image) return null;
  const { width = 0, height = 0 } = await sharp(image).metadata();
  const h = Math.min(height, Math.round((width * 9) / 16));
  const jpeg = await sharp(image)
    .extract({ left: 0, top: Math.round((height - h) / 2), width, height: h })
    .resize(640, 360, { fit: "cover", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return dataUrl(jpeg);
}

// Les trois moments d'un Short que YouTube met à disposition (au quart, à la moitié, aux trois quarts),
// recadrés sur la bande verticale de la vidéo.
export async function shortFrames(youtubeId: string, fetchImpl: typeof fetch = fetch): Promise<Buffer[]> {
  const frames: Buffer[] = [];
  for (const n of [1, 2, 3]) {
    const image = await firstOf([thumb(youtubeId, `sd${n}`), thumb(youtubeId, `hq${n}`)], fetchImpl);
    if (image) frames.push(await verticalStrip(image));
  }
  return frames;
}

export async function verticalStrip(image: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(image).metadata();
  const strip = Math.min(width, Math.round((height * 9) / 16));
  return sharp(image)
    .extract({ left: Math.round((width - strip) / 2), top: 0, width: strip, height })
    .resize(360, 640, { fit: "cover", withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

// Choisit l'image du Short : son numéro (à partir de 0), NO_AUTHOR si aucune ne montre l'auteur,
// ou null sans avis possible (on prend alors l'image du milieu de la vidéo).
export const NO_AUTHOR = -1;
export type ChooseFrame = (frames: Buffer[]) => Promise<number | null>;

// Quand aucune image du Short ne montre l'auteur (images d'illustration, couverture de livre…),
// on montre son portrait, s'il en a un dans l'application.
export async function shortPoster(
  youtubeId: string,
  choose: ChooseFrame | null,
  fetchImpl: typeof fetch = fetch,
  portrait: string | null = null,
): Promise<string | null> {
  const frames = await shortFrames(youtubeId, fetchImpl);
  if (frames.length === 0) return portrait;
  let pick: number | null = null;
  if (choose) {
    try {
      pick = await choose(frames);
    } catch {
      pick = null;
    }
  }
  if (pick === NO_AUTHOR && portrait) return portrait;
  const index = pick !== null && pick >= 0 && pick < frames.length ? pick : Math.floor((frames.length - 1) / 2);
  return dataUrl(frames[index]);
}

// Complète les images d'attente qui manquent pour ces vidéos. Une image déjà choisie n'est jamais remplacée.
export async function fillPosters(
  db: Db,
  videoIds: string[],
  opts: { choose?: ChooseFrame | null; fetchImpl?: typeof fetch } = {},
): Promise<{ filled: number; missing: string[] }> {
  const report = { filled: 0, missing: [] as string[] };
  if (videoIds.length === 0) return report;
  const rows = await db
    .select({ id: videos.id, youtubeId: videos.youtubeId, kind: videos.kind, portrait: speakers.portrait })
    .from(videos)
    .leftJoin(speakers, eq(speakers.id, videos.speakerId))
    .where(and(inArray(videos.id, videoIds), isNull(videos.poster)));
  for (const v of rows) {
    const poster =
      v.kind === "short"
        ? await shortPoster(v.youtubeId, opts.choose ?? null, opts.fetchImpl, v.portrait)
        : await lecturePoster(v.youtubeId, opts.fetchImpl);
    if (!poster) {
      report.missing.push(v.youtubeId);
      continue;
    }
    await db.update(videos).set({ poster }).where(and(eq(videos.id, v.id), isNull(videos.poster)));
    report.filled++;
  }
  return report;
}

// Choix de l'équipe dans l'administration : une image précise du Short (0, 1 ou 2), ou un nouveau choix de l'IA.
export async function replaceShortPoster(
  db: Db,
  videoId: string,
  choice: number | ChooseFrame,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const video = await db.query.videos.findFirst({ where: eq(videos.id, videoId) });
  if (!video || video.kind !== "short") return false;
  const speaker = video.speakerId ? await db.query.speakers.findFirst({ where: eq(speakers.id, video.speakerId) }) : null;
  const poster = await shortPoster(video.youtubeId, typeof choice === "number" ? async () => choice : choice, fetchImpl, speaker?.portrait ?? null);
  if (!poster) return false;
  await db.update(videos).set({ poster }).where(eq(videos.id, videoId));
  return true;
}
