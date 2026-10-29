import { and, eq, inArray, isNull, like, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { sheets, speakers, videos, type Reading } from "@/db/schema";

// Transfert des brouillons IA d'une base de travail vers la base en ligne.
// Les fiches gardent le même identifiant d'une base à l'autre (la base en ligne vient de l'instantané).
// Une fiche en ligne n'est complétée que si personne n'y a touché : jamais rédigée, non validée,
// et sa question est encore le texte d'attente « [Question à rédiger] … ».

export interface DraftedSheet {
  id: string;
  title: string | null;
  theme: string;
  question: string;
  synthesis: string | null;
  problem: string | null;
  solutionQuestion: string | null;
  readings: Reading[] | null;
  editorialNotes: string | null;
}

export interface DraftedSpeaker {
  id: string;
  fullName: string;
  qualification: string;
  qualificationSource: string | null;
  photoUrl: string | null;
  portrait: string | null;
  profileUrl: string | null;
}

export interface DraftBundle {
  sheets: DraftedSheet[];
  speakers: DraftedSpeaker[];
  videoSpeakers: { videoId: string; speakerId: string }[];
}

const PLACEHOLDER = "[Question à rédiger]%";

export async function exportDrafts(db: Db): Promise<DraftBundle> {
  const drafted = await db
    .select({
      id: sheets.id,
      title: sheets.title,
      theme: sheets.theme,
      question: sheets.question,
      synthesis: sheets.synthesis,
      problem: sheets.problem,
      solutionQuestion: sheets.solutionQuestion,
      readings: sheets.readings,
      editorialNotes: sheets.editorialNotes,
    })
    .from(sheets)
    .where(and(eq(sheets.aiDrafted, true), ne(sheets.status, "validee")));
  const people = await db
    .select({
      id: speakers.id,
      fullName: speakers.fullName,
      qualification: speakers.qualification,
      qualificationSource: speakers.qualificationSource,
      photoUrl: speakers.photoUrl,
      portrait: speakers.portrait,
      profileUrl: speakers.profileUrl,
    })
    .from(speakers);
  const links = await db.select({ videoId: videos.id, speakerId: videos.speakerId }).from(videos);
  return {
    sheets: drafted,
    speakers: people,
    videoSpeakers: links.filter((l): l is { videoId: string; speakerId: string } => !!l.speakerId),
  };
}

export async function applyDrafts(db: Db, bundle: DraftBundle): Promise<{ sheets: number; speakers: number; videos: number }> {
  const report = { sheets: 0, speakers: 0, videos: 0 };

  // Intervenants : un nom déjà connu en ligne garde sa fiche ; les autres sont ajoutés.
  const known = await db.select({ id: speakers.id, fullName: speakers.fullName }).from(speakers);
  const byName = new Map(known.map((s) => [s.fullName.toLowerCase(), s.id]));
  const idMap = new Map<string, string>();
  for (const s of bundle.speakers) {
    const existing = byName.get(s.fullName.toLowerCase());
    if (existing) {
      idMap.set(s.id, existing);
      continue;
    }
    await db.insert(speakers).values(s).onConflictDoNothing();
    byName.set(s.fullName.toLowerCase(), s.id);
    idMap.set(s.id, s.id);
    report.speakers++;
  }

  // Vidéos : seul un auteur manquant est renseigné.
  for (const l of bundle.videoSpeakers) {
    const speakerId = idMap.get(l.speakerId);
    if (!speakerId) continue;
    const done = await db
      .update(videos)
      .set({ speakerId })
      .where(and(eq(videos.id, l.videoId), isNull(videos.speakerId)))
      .returning({ id: videos.id });
    report.videos += done.length;
  }

  // Fiches : uniquement celles qui attendent encore leur rédaction.
  const ids = bundle.sheets.map((s) => s.id);
  if (ids.length === 0) return report;
  const waiting = await db
    .select({ id: sheets.id })
    .from(sheets)
    .where(and(inArray(sheets.id, ids), eq(sheets.aiDrafted, false), ne(sheets.status, "validee"), like(sheets.question, PLACEHOLDER)));
  const open = new Set(waiting.map((w) => w.id));
  for (const { id, ...fields } of bundle.sheets) {
    if (!open.has(id)) continue;
    const done = await db
      .update(sheets)
      .set({ ...fields, aiDrafted: true, updatedAt: new Date() })
      .where(and(eq(sheets.id, id), eq(sheets.aiDrafted, false), ne(sheets.status, "validee"), like(sheets.question, PLACEHOLDER)))
      .returning({ id: sheets.id });
    report.sheets += done.length;
  }
  return report;
}
