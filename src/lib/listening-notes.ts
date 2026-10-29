import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { listeningNotes, type ListeningNote } from "@/db/schema";

export const MAX_NOTE_LENGTH = 4000;
export const EMPTY_NOTE: ListeningNote = { these: "", arguments: "", exemples: "", probleme: "" };
const KEYS = ["these", "arguments", "exemples", "probleme"] as const;

// Garde seulement les rubriques connues reçues, en texte, à la longueur permise.
export function cleanNote(input: Partial<Record<keyof ListeningNote, unknown>>): Partial<ListeningNote> {
  const out: Partial<ListeningNote> = {};
  for (const k of KEYS) if (typeof input[k] === "string") out[k] = (input[k] as string).slice(0, MAX_NOTE_LENGTH);
  return out;
}

export const isEmptyNote = (n: ListeningNote) => !n.these.trim() && !n.arguments.trim() && !n.exemples.trim();

export async function getNote(db: Db, userId: string, sheetId: string): Promise<ListeningNote | null> {
  const row = await db.query.listeningNotes.findFirst({
    where: and(eq(listeningNotes.userId, userId), eq(listeningNotes.sheetId, sheetId)),
  });
  return row ? { ...EMPTY_NOTE, ...row.notes } : null;
}

// Une seule note par lecteur et par fiche : les rubriques reçues remplacent les anciennes, les autres restent.
export async function saveNote(db: Db, userId: string, sheetId: string, input: Partial<Record<keyof ListeningNote, unknown>>) {
  const part = cleanNote(input);
  await db
    .insert(listeningNotes)
    .values({ userId, sheetId, notes: { ...EMPTY_NOTE, ...part } })
    .onConflictDoUpdate({
      target: [listeningNotes.userId, listeningNotes.sheetId],
      set: { notes: sql`${listeningNotes.notes} || ${JSON.stringify(part)}::jsonb`, updatedAt: new Date() },
    });
  return part;
}
