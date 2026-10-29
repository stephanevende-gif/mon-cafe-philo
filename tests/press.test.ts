import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { checkArticles, cleanArticles, fillArticles } from "@/lib/press";
import { sheets } from "@/db/schema";
import { testDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(async () => ctx.close());

const art = (url: string, side: string) => ({ url, title: `Titre ${side}`, source: "The Conversation", author: null, date: "2025-03-01", side, description: "Ce qu'il soutient. Ce qu'il ne voit pas.", readInFull: true });

describe("articles de presse", () => {
  it("ne garde que des articles réellement trouvés, sur un site autorisé, et de camps opposés", () => {
    const a = art("https://theconversation.com/le-travail-libere-1", "Le travail libère");
    const b = art("https://laviedesidees.fr/Le-travail-aliene", "Le travail aliène");
    const seenUrls = [a.url, b.url, "https://journals.openedition.org/x/1"];
    const readUrls = [a.url, b.url];
    expect(cleanArticles({ articles: [a, b], seenUrls, readUrls }).map((x) => x.url)).toEqual([a.url, b.url]);
    // Article non lu en entier, ou réservé aux abonnés : refusé.
    expect(cleanArticles({ articles: [a, b], seenUrls, readUrls: [a.url] })).toEqual([]);
    expect(cleanArticles({ articles: [a, { ...b, readInFull: false }], seenUrls, readUrls })).toEqual([]);
    // Adresse jamais lue par l'outil de lecture (inventée ou inaccessible) : refusée, donc moins de deux articles.
    expect(cleanArticles({ articles: [a, art("https://theconversation.com/invente-2", "Le travail aliène")], seenUrls, readUrls: [...readUrls, "https://exemple.org/b", "https://www.vie-publique.fr/files/r.pdf"] })).toEqual([]);
    // La même page lue avec ou sans « www », barre finale, paramètres ou version « amp » : acceptée.
    expect(cleanArticles({ articles: [a, b], seenUrls, readUrls: ["https://theconversation.com/amp/le-travail-libere-1?utm_source=x", "https://www.laviedesidees.fr/Le-travail-aliene/"] }).length).toBe(2);
    // Site non autorisé, PDF, ou deux articles du même camp : refusés.
    expect(cleanArticles({ articles: [a, art("https://exemple.org/b", "Le travail aliène")], seenUrls: [...seenUrls, "https://exemple.org/b"], readUrls: [...readUrls, "https://exemple.org/b"] })).toEqual([]);
    expect(cleanArticles({ articles: [a, art("https://www.vie-publique.fr/files/r.pdf", "Le travail aliène")], seenUrls: [...seenUrls, "https://www.vie-publique.fr/files/r.pdf"], readUrls: [...readUrls, "https://www.vie-publique.fr/files/r.pdf"] })).toEqual([]);
    // Le motif du refus est donné à l'administration.
    expect(checkArticles({ articles: [a, b], seenUrls, readUrls: [a.url] }).reason).toBe("2 proposé(s), 1 page(s) lue(s) ; refus : page non lue par l'outil de lecture");
    expect(cleanArticles({ articles: [a, { ...b, side: "le travail libère" }], seenUrls, readUrls: [...readUrls, "https://theconversation.com/invente-2", "https://exemple.org/b", "https://www.vie-publique.fr/files/r.pdf"] })).toEqual([]);
  });

  it("complète les fiches rédigées, validées ou non, et laisse les fiches à rédiger", async () => {
    const [todo, done] = await ctx.db
      .insert(sheets)
      .values([
        { theme: "le travail", question: "Le travail libère-t-il ou aliène-t-il ?", status: "a_verifier" as const },
        { theme: "le travail", question: "[Question à rédiger] Short", status: "a_verifier" as const },
      ])
      .returning();
    const a = art("https://theconversation.com/oui-1", "Oui");
    const b = art("https://theconversation.com/non-2", "Non");
    const propose = async () => ({ articles: [a, b], seenUrls: [a.url, b.url], readUrls: [a.url, b.url] });
    expect(await fillArticles(ctx.db, [todo.id, done.id], propose)).toEqual({ done: 1, failed: [], reasons: [] });
    const after = await ctx.db.query.sheets.findFirst({ where: eq(sheets.id, todo.id) });
    expect(after?.pressArticles).toEqual([
      { url: a.url, title: "Titre Oui", source: "The Conversation", date: "2025-03-01", side: "Oui", description: a.description },
      { url: b.url, title: "Titre Non", source: "The Conversation", date: "2025-03-01", side: "Non", description: b.description },
    ]);
    expect((await ctx.db.query.sheets.findFirst({ where: eq(sheets.id, done.id) }))?.pressArticles).toBeNull();
    // Un échec donne son motif.
    const refuse = async () => ({ articles: [a, b], seenUrls: [a.url, b.url], readUrls: [] });
    expect(await fillArticles(ctx.db, [todo.id], refuse, { replace: true })).toEqual({ done: 0, failed: [todo.question], reasons: ["2 proposé(s), 0 page(s) lue(s) ; refus : page non lue par l'outil de lecture, page non lue par l'outil de lecture"] });
    // Rien à chercher une seconde fois.
    expect(await fillArticles(ctx.db, [todo.id], propose)).toEqual({ done: 0, failed: [], reasons: [] });
  });
});
