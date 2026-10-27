import sharp from "sharp";
import type { Reading } from "@/db/schema";

// Couverture d'un livre conseillé : celle qu'Open Library associe au titre et à l'auteur, de préférence
// d'une édition française. Elle est réduite et gardée dans l'application (JPEG en data URL).
// Si aucune couverture n'est trouvée, le livre reste sans image : on n'en fabrique jamais.
// Quand plusieurs éditions existent, l'IA écarte les adaptations (manga, jeunesse), les éditions étrangères
// et les exemplaires abîmés, et retient la plus sobre ; sans IA, la première édition française trouvée.

const WIDTH = 240;
const HEIGHT = 360;

type Doc = { title?: string; author_name?: string[]; cover_i?: number };

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Noms sous lesquels le catalogue range les auteurs anciens.
const ALIASES: Record<string, string[]> = {
  platon: ["plato"],
  aristote: ["aristotle", "aristoteles"],
  epictete: ["epictetus"],
  "marc aurele": ["aurelius"],
  seneque: ["seneca"],
  epicure: ["epicurus"],
  lucrece: ["lucretius"],
};

// Le livre trouvé doit bien être de cet auteur (même nom de famille, ou son nom dans le catalogue).
function sameAuthor(doc: Doc, philosopher: string): boolean {
  const name = normalize(philosopher);
  const last = name.split(" ").pop() ?? "";
  const names = [last, ...(ALIASES[name] ?? [])].filter(Boolean);
  return (doc.author_name ?? []).some((a) => normalize(a).split(" ").some((w) => names.includes(w)));
}

// Open Library répond parfois lentement ou coupe la connexion : on réessaie avant de conclure qu'il n'y a rien.
async function patient(fetchImpl: typeof fetch, url: string, tries = 3): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(25_000) });
      if (res.ok || res.status === 404) return res;
    } catch {
      // nouvel essai
    }
  }
  return null;
}

async function search(r: Reading, fetchImpl: typeof fetch, french: boolean): Promise<number[]> {
  const params = new URLSearchParams({ title: r.book, author: r.philosopher, fields: "title,author_name,cover_i", limit: "10" });
  if (french) params.set("language", "fre");
  const res = await patient(fetchImpl, `https://openlibrary.org/search.json?${params}`);
  if (!res?.ok) return [];
  const { docs = [] } = (await res.json()) as { docs?: Doc[] };
  return docs.filter((d) => d.cover_i && sameAuthor(d, r.philosopher)).map((d) => d.cover_i!);
}

export async function storeCover(image: Buffer): Promise<string> {
  const jpeg = await sharp(image).resize(WIDTH, HEIGHT, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

// Choisit parmi les couvertures candidates : son numéro (à partir de 0), ou null si aucune ne convient.
export type ChooseCover = (covers: Buffer[], r: Reading) => Promise<number | null>;

const CANDIDATES = 5;

async function download(id: number, fetchImpl: typeof fetch): Promise<Buffer | null> {
  const res = await patient(fetchImpl, `https://covers.openlibrary.org/b/id/${id}-L.jpg?default=false`);
  return res?.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

// Renvoie la couverture prête à afficher, ou null.
export async function findCover(r: Reading, fetchImpl: typeof fetch = fetch, choose: ChooseCover | null = null): Promise<string | null> {
  try {
    const french = await search(r, fetchImpl, true);
    const ids = [...new Set([...french, ...(french.length >= CANDIDATES ? [] : await search(r, fetchImpl, false))])];
    if (!choose) {
      for (const id of ids) {
        const image = await download(id, fetchImpl);
        if (image) return await storeCover(image);
      }
      return null;
    }
    const images: Buffer[] = [];
    for (const id of ids.slice(0, CANDIDATES * 2)) {
      if (images.length === CANDIDATES) break;
      const image = await download(id, fetchImpl);
      if (image) images.push(await storeCover(image).then((u) => Buffer.from(u.split(",")[1], "base64")));
    }
    if (!images.length) return null;
    const pick = await choose(images, r);
    return pick !== null && pick >= 0 && pick < images.length ? `data:image/jpeg;base64,${images[pick].toString("base64")}` : null;
  } catch {
    return null;
  }
}

// Ajoute une couverture aux lectures qui n'en ont pas encore.
export async function withCovers(list: Reading[], fetchImpl: typeof fetch = fetch, choose: ChooseCover | null = null): Promise<Reading[]> {
  return Promise.all(list.map(async (r) => (r.cover ? r : { ...r, cover: (await findCover(r, fetchImpl, choose)) ?? undefined })));
}
