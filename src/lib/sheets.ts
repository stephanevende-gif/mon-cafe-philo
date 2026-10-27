import { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { NOTIONS, NOTION_SEPARATOR, notionsOf } from "./notions";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db";
import { books, sheets, speakers, videos, type Book, type Sheet, type Speaker, type Video } from "@/db/schema";

export interface SheetDetails {
  sheet: Sheet;
  short: (Video & { speaker: Speaker | null }) | null;
  lecture: (Video & { speaker: Speaker | null }) | null;
  book: Book | null;
}

export async function getPublishedSheet(db: Db, day: string): Promise<Sheet | null> {
  const row = await db.query.sheets.findFirst({ where: and(eq(sheets.day, day), eq(sheets.status, "validee")) });
  return row ?? null;
}

// Petit hachage stable : tous les lecteurs voient la même fiche de secours le même jour.
function dayHash(day: string): number {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export async function getSheetOfTheDay(db: Db, day: string): Promise<{ sheet: Sheet; fallback: boolean } | null> {
  const sheet = await getPublishedSheet(db, day);
  if (sheet) return { sheet, fallback: false };
  const backups = await db
    .select()
    .from(sheets)
    .where(and(eq(sheets.isBackup, true), eq(sheets.status, "validee")))
    .orderBy(asc(sheets.id));
  if (backups.length === 0) return null;
  return { sheet: backups[dayHash(day) % backups.length], fallback: true };
}

export async function getSheetById(db: Db, id: string): Promise<Sheet | null> {
  return (await db.query.sheets.findFirst({ where: eq(sheets.id, id) })) ?? null;
}

async function videoWithSpeaker(db: Db, id: string | null) {
  if (!id) return null;
  const rows = await db
    .select({ video: videos, speaker: speakers })
    .from(videos)
    .leftJoin(speakers, eq(speakers.id, videos.speakerId))
    .where(eq(videos.id, id))
    .limit(1);
  return rows[0] ? { ...rows[0].video, speaker: rows[0].speaker } : null;
}

export async function getSheetDetails(db: Db, sheet: Sheet): Promise<SheetDetails> {
  const [short, lecture, book] = await Promise.all([
    videoWithSpeaker(db, sheet.shortVideoId),
    videoWithSpeaker(db, sheet.lectureVideoId),
    sheet.bookId ? db.query.books.findFirst({ where: eq(books.id, sheet.bookId) }) : Promise.resolve(undefined),
  ]);
  return { sheet, short, lecture, book: book ?? null };
}

// La mention d'authenticité n'apparaît que si chaque maillon a été vérifié.
export function authenticityConfirmed(d: SheetDetails): boolean {
  return !!(d.sheet.authenticityVerifiedAt && d.short?.speaker?.verifiedAt);
}

export interface ArchiveFilters {
  q?: string;
  theme?: string;
  speaker?: string;
  from?: string;
  to?: string;
}

export async function searchArchives(db: Db, filters: ArchiveFilters, today: string) {
  const shortVideo = alias(videos, "short_video");
  const conds = [eq(sheets.status, "validee"), isNotNull(sheets.day), lte(sheets.day, today), isNull(sheets.replayOf)];
  // Une fiche porte jusqu'à trois notions : le filtre retient celles qui contiennent la notion choisie.
  if (filters.theme) conds.push(sql`${filters.theme} = any(string_to_array(${sheets.theme}, ${NOTION_SEPARATOR}))`);
  if (filters.from) conds.push(gte(sheets.day, filters.from));
  if (filters.to) conds.push(lte(sheets.day, filters.to));
  if (filters.speaker) conds.push(eq(speakers.id, filters.speaker));
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conds.push(
      or(
        ilike(sheets.question, like),
        ilike(sheets.theme, like),
        ilike(sheets.synthesis, like),
        ilike(speakers.fullName, like),
      )!,
    );
  }
  return db
    .select({
      id: sheets.id,
      day: sheets.day,
      theme: sheets.theme,
      question: sheets.question,
      speakerName: speakers.fullName,
    })
    .from(sheets)
    .leftJoin(shortVideo, eq(shortVideo.id, sheets.shortVideoId))
    .leftJoin(speakers, eq(speakers.id, shortVideo.speakerId))
    .where(and(...conds))
    .orderBy(desc(sheets.day))
    .limit(200);
}

export async function archiveFacets(db: Db, today: string) {
  const themes = await db
    .selectDistinct({ theme: sheets.theme })
    .from(sheets)
    .where(and(eq(sheets.status, "validee"), lte(sheets.day, today)))
    .orderBy(asc(sheets.theme));
  const people = await db
    .selectDistinct({ id: speakers.id, name: speakers.fullName })
    .from(speakers)
    .innerJoin(videos, eq(videos.speakerId, speakers.id))
    .innerJoin(sheets, eq(sheets.shortVideoId, videos.id))
    .where(and(eq(sheets.status, "validee"), lte(sheets.day, today)))
    .orderBy(asc(speakers.fullName));
  const used = new Set(themes.flatMap((t) => notionsOf(t.theme)));
  return { themes: NOTIONS.filter((n) => used.has(n)), people };
}

