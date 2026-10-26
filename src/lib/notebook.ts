import { and, asc, eq, max } from "drizzle-orm";
import type { Db } from "@/db";
import { notebookEntries } from "@/db/schema";

export const MAX_ENTRY_LENGTH = 8000;

// Chaque enregistrement crée une nouvelle version : rien n'est écrasé,
// pour que l'évolution de la pensée reste visible.
export async function addEntry(
  db: Db,
  userId: string,
  sheetId: string,
  stage: "je_pense" | "je_suis",
  body: string,
) {
  const text = body.trim().slice(0, MAX_ENTRY_LENGTH);
  if (!text) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [{ v }] = await db
      .select({ v: max(notebookEntries.version) })
      .from(notebookEntries)
      .where(and(eq(notebookEntries.userId, userId), eq(notebookEntries.sheetId, sheetId)));
    try {
      const [row] = await db
        .insert(notebookEntries)
        .values({ userId, sheetId, stage, body: text, version: (v ?? 0) + 1 })
        .returning();
      return row;
    } catch (e) {
      // Deux enregistrements simultanés : on retente avec le numéro suivant.
      if ((e as { code?: string }).code !== "23505" && (e as { cause?: { code?: string } }).cause?.code !== "23505") throw e;
    }
  }
  throw new Error("Impossible d'enregistrer la version.");
}

export async function listEntries(db: Db, userId: string, sheetId: string) {
  return db
    .select()
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, userId), eq(notebookEntries.sheetId, sheetId)))
    .orderBy(asc(notebookEntries.version));
}
