import sharp from "sharp";
import type { Reading } from "@/db/schema";

// Couverture d'un livre conseillé : celle qu'Open Library associe au titre et à l'auteur, de préférence
// d'une édition française. Elle est réduite et gardée dans l'application (JPEG en data URL).
// Si aucune couverture n'est trouvée, le livre reste sans image : on n'en fabrique jamais.

const WIDTH = 240;
const HEIGHT = 360;

type Doc = { title?: string; author_name?: string[]; cover_i?: number };

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Le livre trouvé doit bien être de cet auteur (même nom de famille).
function sameAuthor(doc: Doc, philosopher: string): boolean {
  const last = normalize(philosopher).split(" ").pop() ?? "";
  return !!last && (doc.author_name ?? []).some((a) => normalize(a).split(" ").includes(last));
}

async function search(r: Reading, fetchImpl: typeof fetch, french: boolean): Promise<number | null> {
  const params = new URLSearchParams({ title: r.book, author: r.philosopher, fields: "title,author_name,cover_i", limit: "5" });
  if (french) params.set("language", "fre");
  const res = await fetchImpl(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) return null;
  const { docs = [] } = (await res.json()) as { docs?: Doc[] };
  return docs.find((d) => d.cover_i && sameAuthor(d, r.philosopher))?.cover_i ?? null;
}

export async function storeCover(image: Buffer): Promise<string> {
  const jpeg = await sharp(image).resize(WIDTH, HEIGHT, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

// Renvoie la couverture prête à afficher, ou null.
export async function findCover(r: Reading, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const id = (await search(r, fetchImpl, true)) ?? (await search(r, fetchImpl, false));
    if (!id) return null;
    const res = await fetchImpl(`https://covers.openlibrary.org/b/id/${id}-L.jpg?default=false`);
    if (!res.ok) return null;
    return await storeCover(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

// Ajoute une couverture aux lectures qui n'en ont pas encore.
export async function withCovers(list: Reading[], fetchImpl: typeof fetch = fetch): Promise<Reading[]> {
  return Promise.all(list.map(async (r) => (r.cover ? r : { ...r, cover: (await findCover(r, fetchImpl)) ?? undefined })));
}
