import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { applyDrafts, exportDrafts } from "@/lib/draft-transfer";
import { sheets, speakers, videos } from "@/db/schema";
import { testDb } from "./helpers";

const byIdAfter = (rows: (typeof sheets.$inferSelect)[], id: string) => rows.find((r) => r.id === id);

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(async () => ctx.close());

describe("transfert des brouillons IA vers la base en ligne", () => {
  it("complète seulement les fiches auxquelles personne n'a touché", async () => {
    const { db } = ctx;
    const [v1, v2, v3] = await db
      .insert(videos)
      .values(["shortTRANS1", "shortTRANS2", "shortTRANS3"].map((youtubeId) => ({ youtubeId, kind: "short" as const, title: youtubeId })))
      .returning();
    const [waiting, edited, validated] = await db
      .insert(sheets)
      .values([
        { theme: "à définir", question: "[Question à rédiger] Short 1", shortVideoId: v1.id, status: "a_verifier" as const },
        { theme: "la liberté", question: "Question écrite par l'équipe ?", shortVideoId: v2.id, status: "a_verifier" as const },
        { theme: "à définir", question: "[Question à rédiger] Short 3", shortVideoId: v3.id, status: "validee" as const },
      ])
      .returning();

    const bundle = {
      sheets: [waiting, edited, validated].map((s) => ({
        id: s.id,
        title: "Titre IA",
        theme: "la liberté, la technique",
        question: "Question IA ?",
        synthesis: null,
        problem: "Problème IA",
        solutionQuestion: null,
        readings: null,
        editorialNotes: "Proposé par l'IA",
      })),
      speakers: [
        { id: "00000000-0000-4000-8000-000000000001", fullName: "Auteur Nouveau", qualification: "Philosophe.", qualificationSource: null, photoUrl: null, portrait: null, profileUrl: null },
      ],
      videoSpeakers: [{ videoId: v1.id, speakerId: "00000000-0000-4000-8000-000000000001" }],
      articles: [waiting, validated].map((s) => ({
        id: s.id,
        pressArticles: [{ title: "Article", source: "The Conversation", url: "https://theconversation.com/a-1", side: "Oui", description: "Deux phrases." }],
      })),
    };

    const report = await applyDrafts(db, bundle);
    expect(report).toEqual({ sheets: 1, speakers: 1, videos: 1, articles: 2 });
    expect(byIdAfter(await db.select().from(sheets), edited.id)?.pressArticles).toBeNull();

    const after = await db.select().from(sheets);
    const byId = new Map(after.map((s) => [s.id, s]));
    expect(byId.get(waiting.id)).toMatchObject({ question: "Question IA ?", theme: "la liberté, la technique", aiDrafted: true, status: "a_verifier" });
    expect(byId.get(edited.id)?.question).toBe("Question écrite par l'équipe ?");
    expect(byId.get(validated.id)?.question).toBe("[Question à rédiger] Short 3");
    const v = await db.query.videos.findFirst({ where: eq(videos.id, v1.id) });
    expect(v?.speakerId).toBe("00000000-0000-4000-8000-000000000001");

    // Un second passage ne change plus rien, et l'export reprend la fiche rédigée.
    expect(await applyDrafts(db, bundle)).toEqual({ sheets: 0, speakers: 0, videos: 0, articles: 0 });
    const out = await exportDrafts(db);
    expect(out.sheets.map((s) => s.id)).toEqual([waiting.id]);
    expect(out.speakers.map((s) => s.fullName)).toEqual(["Auteur Nouveau"]);
    expect(out.articles?.map((a) => a.id).sort()).toEqual([waiting.id, validated.id].sort());
    expect(await db.select().from(speakers)).toHaveLength(1);
  });
});
