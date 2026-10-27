import sharp from "sharp";
import type { AuthorBook } from "@/db/schema";

// Bibliographie de l'auteur de la vidéo aux Éditions M-Éditer : ses livres tels que la boutique en ligne
// les présente (titre, couverture, présentation). La présentation reprend les deux premières phrases du site,
// sans réécriture. Le lien mène à la page du livre sur le site des Éditions.

const SITE = "https://m-editer.izibookstore.com";
export const MAX_BOOKS = 3;

export interface ListedBook {
  title: string;
  url: string;
  authors: number;
}

const decode = (s: string) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// Livres listés sur la fiche auteur, dans l'ordre du site, avec le nombre d'auteurs de chacun.
export function booksFromAuthorPage(html: string): ListedBook[] {
  const books: ListedBook[] = [];
  const blocks = html.split(/<div class="product text-center/).slice(1);
  for (const block of blocks) {
    const href = block.match(/<span class='p-i-t'>\s*<a href="(\/produit\/[^"]+)">([^<]+)<\/a>/);
    if (!href) continue;
    const authors = block.match(/<p class='p-i-a'>([\s\S]*?)<\/p>/)?.[1].match(/\/auteur\//g)?.length ?? 1;
    const url = `${SITE}${href[1]}`;
    if (books.some((b) => b.url === url)) continue;
    books.push({ title: decode(href[2]).replace(/\s+/g, " ").trim(), url, authors });
  }
  return books;
}

// Les deux premières phrases d'un texte, au plus 420 caractères.
export function twoSentences(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const parts = clean.split(/(?<=[.!?…])\s+(?=[«"A-ZÀ-ÖØ-Þ])/);
  let out = parts.slice(0, 2).join(" ");
  if (out.length > 420) out = parts[0].length <= 420 ? parts[0] : `${parts[0].slice(0, 417).replace(/\s+\S*$/, "")}…`;
  return out;
}

// Présentation et couverture d'un livre, lues dans la page produit (données structurées schema.org).
export function detailsFromBookPage(html: string): { description: string | null; image: string | null } {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data: { "@type"?: string; description?: string; image?: string | string[] };
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (data["@type"] !== "Product") continue;
    const text = decode((data.description ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const image = Array.isArray(data.image) ? data.image[0] : data.image;
    return { description: text ? twoSentences(text) : null, image: image ? new URL(image, SITE).toString() : null };
  }
  return { description: null, image: null };
}

async function getText(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(25_000) });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch {
      // nouvel essai
    }
  }
  return null;
}

async function coverFrom(url: string, fetchImpl: typeof fetch): Promise<string | undefined> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return undefined;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(240, 360, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}

// Choisit, parmi les livres de l'auteur, ceux qui éclairent le mieux la question (numéros à partir de 0).
export type ChooseBooks = (question: string, titles: string[]) => Promise<number[] | null>;

// Jusqu'à trois livres de l'auteur : d'abord ses livres personnels, puis les ouvrages collectifs.
export async function authorBibliography(
  profileUrl: string,
  question: string,
  opts: { fetchImpl?: typeof fetch; choose?: ChooseBooks | null } = {},
): Promise<AuthorBook[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  if (!profileUrl.startsWith(`${SITE}/auteur/`)) return [];
  const page = await getText(profileUrl, fetchImpl);
  if (!page) return [];
  const listed = booksFromAuthorPage(page);
  const own = listed.filter((b) => b.authors === 1);
  const pool = own.length >= MAX_BOOKS ? own : [...own, ...listed.filter((b) => b.authors > 1)];
  let picked = pool.slice(0, MAX_BOOKS);
  if (opts.choose && pool.length > MAX_BOOKS) {
    try {
      const idx = await opts.choose(question, pool.map((b) => b.title));
      const chosen = [...new Set(idx ?? [])].filter((i) => i >= 0 && i < pool.length).slice(0, MAX_BOOKS);
      if (chosen.length) picked = chosen.map((i) => pool[i]);
    } catch {
      // ordre du site
    }
  }
  const out: AuthorBook[] = [];
  for (const b of picked) {
    const html = await getText(b.url, fetchImpl);
    const { description, image } = html ? detailsFromBookPage(html) : { description: null, image: null };
    const cover = image ? await coverFrom(image, fetchImpl) : undefined;
    out.push({ title: b.title, url: b.url, description: description ?? "", ...(cover ? { cover } : {}) });
  }
  return out;
}
