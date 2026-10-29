import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { sheets, type PressArticle } from "@/db/schema";
import type { ArticleSearch } from "./ai";

// Sites où l'IA cherche les articles : presse et revues en ligne librement accessibles, écrites par des chercheurs
// ou publiées par des institutions publiques. Le Monde diplomatique et Radio France refusent l'outil de recherche.
export const PRESS_DOMAINS = [
  "theconversation.com",
  "laviedesidees.fr",
  "lejournal.cnrs.fr",
  "vie-publique.fr",
  "journals.openedition.org",
];

const MAX = { title: 300, source: 120, author: 120, side: 200, description: 700 } as const;

function allowedUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "");
    if (!PRESS_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return null;
    // Un document à télécharger ou une page de liste n'est pas un article.
    if (/\.pdf$/i.test(u.pathname) || u.pathname === "/" || u.pathname === "/fr" || u.pathname.includes("spip.php")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const clip = (s: string | null | undefined, n: number) => (s ?? "").trim().replace(/\s+/g, " ").slice(0, n);

// Certification : un article n'est gardé que s'il est complet, sur un site autorisé, effectivement trouvé par la recherche,
// lu en entier par l'IA (l'outil de lecture l'a réellement récupéré) et librement accessible ; les deux articles
// doivent défendre deux branches différentes.
export function cleanArticles(found: ArticleSearch): PressArticle[] {
  const norm = (list: string[]) => new Set(list.map((u) => allowedUrl(u)).filter(Boolean));
  const seen = norm(found.seenUrls);
  const read = norm(found.readUrls);
  const list: PressArticle[] = [];
  for (const a of found.articles) {
    const url = allowedUrl(a.url);
    if (!url || !a.readInFull || !seen.has(url) || !read.has(url) || list.some((x) => x.url === url)) continue;
    const item: PressArticle = {
      title: clip(a.title, MAX.title),
      source: clip(a.source, MAX.source),
      url,
      side: clip(a.side, MAX.side),
      description: clip(a.description, MAX.description),
    };
    if (!item.title || !item.source || !item.side || !item.description) continue;
    const author = clip(a.author, MAX.author);
    if (author) item.author = author;
    if (a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date.trim())) item.date = a.date.trim();
    list.push(item);
  }
  if (list.length < 2 || list[0].side.toLowerCase() === list[1].side.toLowerCase()) return [];
  return list.slice(0, 2);
}

// Saisie de l'équipe dans l'administration : deux articles au plus, tout champ obligatoire rempli.
export function cleanTypedArticles(items: Partial<Record<keyof PressArticle, string>>[]): PressArticle[] {
  const out: PressArticle[] = [];
  for (const a of items) {
    const url = a.url?.trim() ?? "";
    let ok = false;
    try {
      ok = new URL(url).protocol === "https:";
    } catch {}
    const item: PressArticle = {
      title: clip(a.title, MAX.title),
      source: clip(a.source, MAX.source),
      url,
      side: clip(a.side, MAX.side),
      description: clip(a.description, MAX.description),
    };
    if (!ok || !item.title || !item.source || !item.side || !item.description) continue;
    const author = clip(a.author, MAX.author);
    if (author) item.author = author;
    if (a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date.trim())) item.date = a.date.trim();
    out.push(item);
  }
  return out.slice(0, 2);
}

export type ProposeArticles = (input: { question: string; problem: string | null }, domains: string[]) => Promise<ArticleSearch | null>;

// Cherche les deux articles des fiches désignées qui n'en ont pas encore. Les articles sont certifiés par la lecture
// automatique (voir cleanArticles) : ils peuvent compléter une fiche déjà validée. Depuis la page d'une fiche,
// un éditeur peut en demander d'autres : les articles trouvés remplacent alors les anciens.
export async function fillArticles(
  db: Db,
  sheetIds: string[],
  propose: ProposeArticles,
  opts: { replace?: boolean } = {},
): Promise<{ done: number; failed: string[] }> {
  let done = 0;
  const failed: string[] = [];
  for (const id of sheetIds) {
    const sheet = await db.query.sheets.findFirst({ where: eq(sheets.id, id) });
    if (!sheet || (sheet.pressArticles && !opts.replace) || sheet.question.startsWith("[Question à rédiger]")) continue;
    try {
      const found = await propose({ question: sheet.question, problem: sheet.problem }, PRESS_DOMAINS);
      const articles = found ? cleanArticles(found) : [];
      if (articles.length < 2) {
        failed.push(sheet.question);
        continue;
      }
      const r = await db
        .update(sheets)
        .set({ pressArticles: articles, updatedAt: new Date() })
        .where(opts.replace ? eq(sheets.id, id) : and(eq(sheets.id, id), isNull(sheets.pressArticles)))
        .returning({ id: sheets.id });
      done += r.length;
    } catch {
      failed.push(sheet.question);
    }
  }
  return { done, failed };
}
