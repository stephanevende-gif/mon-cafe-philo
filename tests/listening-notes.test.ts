import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanNote, getNote, isEmptyNote, MAX_NOTE_LENGTH, saveNote } from "@/lib/listening-notes";
import { sheets, users } from "@/db/schema";
import { testDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(async () => ctx.close());

describe("notes d'écoute", () => {
  it("garde les trois rubriques, en texte, à la longueur permise", () => {
    const n = cleanNote({ these: "x".repeat(MAX_NOTE_LENGTH + 10), arguments: 42, autre: "ignoré" } as never);
    expect(n.these).toHaveLength(MAX_NOTE_LENGTH);
    expect(n).toEqual({ these: n.these });
    expect(isEmptyNote({ these: " ", arguments: "", exemples: "\n" })).toBe(true);
  });

  it("une seule note par lecteur et par fiche, remplacée à chaque enregistrement", async () => {
    const [u] = await ctx.db.insert(users).values({ email: "notes@example.org", passwordHash: "x", displayName: "Lecteur" }).returning();
    const [s] = await ctx.db.insert(sheets).values({ theme: "la liberté", question: "Q ?", status: "validee" }).returning();
    expect(await getNote(ctx.db, u.id, s.id)).toBeNull();
    await saveNote(ctx.db, u.id, s.id, { these: "Première thèse" });
    await saveNote(ctx.db, u.id, s.id, { these: "Thèse corrigée", arguments: "Parce que…" });
    expect(await getNote(ctx.db, u.id, s.id)).toEqual({ these: "Thèse corrigée", arguments: "Parce que…", exemples: "", probleme: "" });
    // L'essai de problème s'ajoute sans effacer les notes d'écoute, et l'inverse.
    await saveNote(ctx.db, u.id, s.id, { probleme: "Mon problème" });
    await saveNote(ctx.db, u.id, s.id, { these: "T", arguments: "A", exemples: "E" });
    expect(await getNote(ctx.db, u.id, s.id)).toEqual({ these: "T", arguments: "A", exemples: "E", probleme: "Mon problème" });
  });
});
