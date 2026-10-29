import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { books } from "@/db/schema";

// Catalogue complet des Éditions M-Éditer, lu sur la boutique en ligne (pages /produits?page=…) :
// titre, sous-titre, auteurs, ISBN, couverture et lien, tels que le site les donne, sans réécriture.

const SITE = "https://m-editer.izibookstore.com";
const MAX_PAGES = 60;

export interface CatalogueBook {
  title: string;
  subtitle: string | null;
  author: string;
  isbn: string | null;
  url: string;
  cover: string | null;
}

const decode = (s: string) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

export function booksFromCataloguePage(html: string): CatalogueBook[] {
  const out: CatalogueBook[] = [];
  for (const block of html.split(/<div class="product text-center/).slice(1)) {
    const link = block.match(/<span class='p-i-t'>\s*<a href="(\/produit\/[^"]+)">([^<]+)<\/a>/);
    if (!link) continue;
    const url = `${SITE}${link[1]}`;
    if (out.some((b) => b.url === url)) continue;
    const authors = [...(block.match(/<p class='p-i-a'>([\s\S]*?)<\/p>/)?.[1] ?? "").matchAll(/<a href="\/auteur\/[^"]+">([^<]+)<\/a>/g)].map((m) => decode(m[1]));
    const subtitle = block.match(/<small class='p-i-s'>([^<]*)<\/small>/)?.[1];
    // Couverture « medium » (256 px) prise dans le srcset, présent même quand l'image se charge à la demande.
    const srcset = block.match(/class="[^"]*product_picture[^"]*"[^>]*?\ssrcset="([^"]+)"/)?.[1] ?? "";
    const cover = srcset.split(",").map((c) => c.trim().split(/\s+/)[0]).find((u) => u.includes("/medium/"))?.replace(/&#39;/g, "'");
    out.push({
      title: decode(link[2]),
      subtitle: subtitle ? decode(subtitle) || null : null,
      author: authors.join(", ") || "Éditions M-Éditer",
      isbn: block.match(/data-ean13="(\d{10,13})"/)?.[1] ?? null,
      url,
      cover: cover?.startsWith(`${SITE}/`) ? cover : null,
    });
  }
  return out;
}

// Lit toutes les pages du catalogue ; s'arrête à la première page vide ou sans livre nouveau.
export async function fetchCatalogue(fetchImpl: typeof fetch = fetch): Promise<CatalogueBook[]> {
  const all = new Map<string, CatalogueBook>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchImpl(`${SITE}/produits?page=${page}`, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) break;
    const found = booksFromCataloguePage(await res.text());
    const before = all.size;
    for (const b of found) all.set(b.url, b);
    if (!found.length || all.size === before) break;
  }
  return [...all.values()];
}

// Ajoute au tableau des livres ceux du catalogue qui n'y sont pas encore (reconnus par leur lien, ou par
// leur titre pour les livres saisis à la main sans lien). Un livre déjà présent garde sa couverture et sa présentation.
export async function importCatalogue(db: Db, fetchImpl: typeof fetch = fetch): Promise<{ added: number; linked: number; total: number }> {
  const list = await fetchCatalogue(fetchImpl);
  let added = 0;
  let linked = 0;
  for (const b of list) {
    const known = await db.query.books.findFirst({ where: eq(books.catalogueUrl, b.url) });
    if (known) continue;
    const manual = await db.query.books.findFirst({ where: sql`${books.catalogueUrl} is null and lower(${books.title}) = lower(${b.title})` });
    if (manual) {
      await db
        .update(books)
        .set({ catalogueUrl: b.url, isbn: manual.isbn ?? b.isbn, subtitle: manual.subtitle ?? b.subtitle, coverUrl: manual.coverUrl ?? b.cover })
        .where(eq(books.id, manual.id));
      linked++;
      continue;
    }
    await db.insert(books).values({ title: b.title, subtitle: b.subtitle, author: b.author, isbn: b.isbn, catalogueUrl: b.url, coverUrl: b.cover });
    added++;
  }
  return { added, linked, total: list.length };
}
