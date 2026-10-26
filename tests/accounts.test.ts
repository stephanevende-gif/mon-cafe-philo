import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAccess } from "@/lib/access";
import {
  checkCredentials,
  createEmailToken,
  createSession,
  registerUser,
  resetPassword,
  userForSession,
  verifyEmail,
} from "@/lib/accounts";
import { addEntry, listEntries } from "@/lib/notebook";
import { getSheetOfTheDay } from "@/lib/sheets";
import { sheets } from "@/db/schema";
import { testDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(() => ctx.close());

describe("comptes", () => {
  it("inscrit, ouvre l'essai, vérifie l'e-mail et refuse un doublon", async () => {
    const r = await registerUser(ctx.db, { email: " Lea@Exemple.fr ", password: "un mot de passe long", displayName: "Léa" });
    if ("error" in r) throw new Error(r.error);
    expect(r.user.email).toBe("lea@exemple.fr");
    expect((await getAccess(ctx.db, r.user.id)).active).toBe(true);
    expect(await verifyEmail(ctx.db, r.verificationToken)).toBe(true);
    expect(await verifyEmail(ctx.db, r.verificationToken)).toBe(false);
    expect(await registerUser(ctx.db, { email: "lea@exemple.fr", password: "x".repeat(12), displayName: "L" })).toEqual({
      error: "email_pris",
    });
  });

  it("connecte avec le bon mot de passe et ferme les sessions après réinitialisation", async () => {
    expect(await checkCredentials(ctx.db, "lea@exemple.fr", "mauvais")).toBeNull();
    const user = await checkCredentials(ctx.db, "LEA@exemple.fr", "un mot de passe long");
    expect(user).not.toBeNull();
    const { token } = await createSession(ctx.db, user!.id);
    expect((await userForSession(ctx.db, token))?.id).toBe(user!.id);
    const reset = await createEmailToken(ctx.db, user!.id, "reinitialisation", 3600000);
    expect(await resetPassword(ctx.db, reset, "nouveau mot de passe")).toBe(true);
    expect(await userForSession(ctx.db, token)).toBeNull();
    expect(await checkCredentials(ctx.db, "lea@exemple.fr", "nouveau mot de passe")).not.toBeNull();
  });
});

describe("carnet et fiche du jour", () => {
  it("numérote les versions sans écraser les précédentes", async () => {
    const user = await checkCredentials(ctx.db, "lea@exemple.fr", "nouveau mot de passe");
    const [sheet] = await ctx.db
      .insert(sheets)
      .values({ day: "2026-10-26", theme: "technique", question: "Les machines peuvent-elles penser ?", status: "validee" })
      .returning();
    await Promise.all([
      addEntry(ctx.db, user!.id, sheet.id, "je_pense", "Première idée"),
      addEntry(ctx.db, user!.id, sheet.id, "je_suis", "Deuxième idée"),
    ]);
    expect(await addEntry(ctx.db, user!.id, sheet.id, "je_suis", "   ")).toBeNull();
    const entries = await listEntries(ctx.db, user!.id, sheet.id);
    expect(entries.map((e) => e.version)).toEqual([1, 2]);
  });

  it("sert la fiche du jour, sinon une fiche de secours identique pour tous", async () => {
    expect((await getSheetOfTheDay(ctx.db, "2026-10-26"))?.fallback).toBe(false);
    expect(await getSheetOfTheDay(ctx.db, "2026-10-27")).toBeNull();
    await ctx.db.insert(sheets).values([
      { theme: "liberté", question: "Peut-on être libre sans obéir ?", status: "validee", isBackup: true },
      { theme: "bonheur", question: "Peut-on apprendre à être heureux ?", status: "validee", isBackup: true },
      { theme: "vérité", question: "Brouillon", status: "brouillon", isBackup: true },
    ]);
    const a = await getSheetOfTheDay(ctx.db, "2026-10-27");
    const b = await getSheetOfTheDay(ctx.db, "2026-10-27");
    expect(a?.fallback).toBe(true);
    expect(a?.sheet.id).toBe(b?.sheet.id);
    expect(a?.sheet.status).toBe("validee");
  });
});
