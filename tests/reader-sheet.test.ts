import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addEntry } from "@/lib/notebook";
import { sheetForReader } from "@/lib/sheets";
import { notebookEntries, sheets, users, videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { testDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(async () => ctx.close());

describe("fiche du jour d'un lecteur qui l'a déjà travaillée", () => {
  it("propose une fiche validée jamais travaillée, la même toute la journée", async () => {
    const { db } = ctx;
    const [u] = await db.insert(users).values({ email: "deuxieme@example.org", passwordHash: "x", displayName: "Fidèle" }).returning();
    const made: (typeof sheets.$inferSelect)[] = [];
    for (const theme of ["la liberté", "la justice", "le travail"]) {
      const [v] = await db.insert(videos).values({ youtubeId: `lecteur${made.length}AAA`, kind: "short", title: theme }).returning();
      const [s] = await db.insert(sheets).values({ theme, question: `Q ${theme}`, shortVideoId: v.id, status: "validee", day: `2025-11-0${made.length + 1}` }).returning();
      made.push(s);
    }
    const [liberte, justice, travail] = made;
    // Un an plus tard, la fiche « liberté » revient en rediffusion.
    const [replay] = await db.insert(sheets).values({ theme: liberte.theme, question: liberte.question, shortVideoId: liberte.shortVideoId, status: "validee", day: "2026-11-02", replayOf: liberte.id }).returning();

    // Un nouveau lecteur reçoit la fiche du jour.
    expect((await sheetForReader(db, u.id, replay, "2026-11-02")).id).toBe(replay.id);

    // Le lecteur de l'an dernier a travaillé « liberté » et « justice » : il reçoit « travail ».
    await addEntry(db, u.id, liberte.id, "je_pense", "Ma pensée de l'an dernier.");
    await addEntry(db, u.id, justice.id, "je_pense", "Autre pensée.");
    await db.update(notebookEntries).set({ createdAt: new Date("2025-11-02T10:00:00Z") }).where(eq(notebookEntries.userId, u.id));
    const got = await sheetForReader(db, u.id, replay, "2026-11-02");
    expect(got.id).toBe(travail.id);

    // Écrire aujourd'hui sur la fiche reçue ne la fait pas changer.
    const today = await addEntry(db, u.id, travail.id, "je_pense", "Pensée du jour.");
    await db.update(notebookEntries).set({ createdAt: new Date("2026-11-02T09:00:00Z") }).where(eq(notebookEntries.id, today!.id));
    expect((await sheetForReader(db, u.id, replay, "2026-11-02")).id).toBe(travail.id);

    // Tout a été travaillé : la fiche du jour reste servie.
    expect((await sheetForReader(db, u.id, replay, "2026-11-03")).id).toBe(replay.id);
  });
});
