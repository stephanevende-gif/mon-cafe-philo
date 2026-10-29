import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { notebookEntries, sheets } from "@/db/schema";

// Toutes les fiches qu'un lecteur a travaillées, de la plus récemment reprise à la plus ancienne.
export async function listWorkedSheets(db: Db, userId: string) {
  const last = sql<Date>`max(${notebookEntries.createdAt})`;
  return db
    .select({
      id: sheets.id,
      question: sheets.question,
      theme: sheets.theme,
      versions: sql<number>`count(*)::int`,
      firstAt: sql<Date>`min(${notebookEntries.createdAt})`,
      lastAt: last,
    })
    .from(notebookEntries)
    .innerJoin(sheets, eq(sheets.id, notebookEntries.sheetId))
    .where(eq(notebookEntries.userId, userId))
    .groupBy(sheets.id)
    .orderBy(desc(last));
}
