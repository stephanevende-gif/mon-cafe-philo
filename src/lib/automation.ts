import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { sheets, syncRuns, videos } from "@/db/schema";
import { addDays, parisDay } from "./dates";
import { getVideos, linkedVideoIds, listPlaylist, type Fetch } from "./youtube-api";
import type { SheetProposal } from "./ai";

export const DEFAULT_PLAYLIST = "PL2d4vA4vfs79RPBnT3PFdOjyXaWPdquGv";
const SHORT_MAX = 180;
const LECTURE_MIN = 180;
const NO_REPEAT_DAYS = 60;
const DIVERSITY_DAYS = 7;

export interface SyncOptions {
  apiKey: string;
  playlistId?: string;
  fetchImpl?: Fetch;
  now?: Date;
  propose?: (input: { title: string; description: string }) => Promise<SheetProposal | null>;
}

export interface SyncReport {
  newShorts: number;
  scheduled: string[];
  queued: number;
  lecturesFound: number;
  skipped: string[];
}

async function logRun<T>(db: Db, kind: "youtube" | "planification", fn: () => Promise<T>, describe: (r: T) => string): Promise<T> {
  const [run] = await db.insert(syncRuns).values({ kind }).returning({ id: syncRuns.id });
  try {
    const result = await fn();
    await db.update(syncRuns).set({ finishedAt: new Date(), ok: true, summary: describe(result) }).where(eq(syncRuns.id, run.id));
    return result;
  } catch (e) {
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), ok: false, error: String((e as Error).message ?? e).slice(0, 2000) })
      .where(eq(syncRuns.id, run.id));
    throw e;
  }
}

// Détecte les nouveaux Shorts de la playlist et prépare une fiche à vérifier pour chacun.
// Un Short publié le jour J est programmé le jour J+1 ; s'il en paraît plusieurs le même jour,
// le plus récent est programmé et les autres rejoignent la file éditoriale.
export function syncPlaylist(db: Db, opts: SyncOptions): Promise<SyncReport> {
  return logRun(db, "youtube", () => doSync(db, opts), describeSync);
}

function describeSync(r: SyncReport): string {
  if (r.newShorts === 0) return "Aucun nouveau Short.";
  const parts = [`${r.newShorts} nouveau(x) Short(s)`];
  if (r.scheduled.length) parts.push(`programmé(s) : ${r.scheduled.join(", ")}`);
  if (r.queued) parts.push(`${r.queued} en file éditoriale`);
  parts.push(`${r.lecturesFound} conférence(s) repérée(s)`);
  if (r.skipped.length) parts.push(`ignoré(s) : ${r.skipped.join(" ; ")}`);
  return parts.join(" · ");
}

async function doSync(db: Db, opts: SyncOptions): Promise<SyncReport> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? new Date();
  const today = parisDay(now);
  const report: SyncReport = { newShorts: 0, scheduled: [], queued: 0, lecturesFound: 0, skipped: [] };

  const entries = await listPlaylist(fetchImpl, opts.apiKey, opts.playlistId ?? DEFAULT_PLAYLIST);
  if (entries.length === 0) return report;
  const known = new Set(
    (await db.select({ y: videos.youtubeId }).from(videos).where(inArray(videos.youtubeId, entries.map((e) => e.videoId)))).map((r) => r.y),
  );
  const fresh = entries.filter((e) => !known.has(e.videoId));
  if (fresh.length === 0) return report;

  const infos = await getVideos(fetchImpl, opts.apiKey, fresh.map((e) => e.videoId));
  const shorts = infos.filter((v) => {
    if (v.durationSeconds != null && v.durationSeconds < SHORT_MAX) return true;
    report.skipped.push(`« ${v.title} » dure plus de 3 minutes`);
    return false;
  });

  // Conférences longues : seulement celles citées dans la description, de la même chaîne, de plus de 3 minutes (conférence complète ou extrait).
  const candidates = [...new Set(shorts.flatMap((s) => linkedVideoIds(s.description, s.id)))];
  const linked = new Map((candidates.length ? await getVideos(fetchImpl, opts.apiKey, candidates) : []).map((v) => [v.id, v]));

  // Ordre chronologique, pour que le plus récent de chaque jour soit retenu.
  shorts.sort((a, b) => (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0));
  const latestByDay = new Map<string, string>();
  for (const s of shorts) if (s.publishedAt) latestByDay.set(parisDay(s.publishedAt), s.id);

  for (const s of shorts) {
    const [short] = await db
      .insert(videos)
      .values({
        youtubeId: s.id,
        kind: "short",
        title: s.title,
        description: s.description,
        durationSeconds: s.durationSeconds,
        publishedAt: s.publishedAt,
        channelId: s.channelId,
        detectedAt: now,
      })
      .onConflictDoNothing()
      .returning();
    if (!short) continue;
    report.newShorts++;

    let lectureId: string | null = null;
    const lecture = linkedVideoIds(s.description, s.id)
      .map((id) => linked.get(id))
      .find((v) => v && v.channelId === s.channelId && (v.durationSeconds ?? 0) > LECTURE_MIN);
    if (lecture) {
      const existing = await db.query.videos.findFirst({ where: eq(videos.youtubeId, lecture.id) });
      const row =
        existing ??
        (
          await db
            .insert(videos)
            .values({
              youtubeId: lecture.id,
              kind: "conference",
              title: lecture.title,
              description: lecture.description,
              durationSeconds: lecture.durationSeconds,
              publishedAt: lecture.publishedAt,
              channelId: lecture.channelId,
              detectedAt: now,
            })
            .returning()
        )[0];
      if (row.kind === "conference") {
        lectureId = row.id;
        report.lecturesFound++;
      }
    }

    let proposal: SheetProposal | null = null;
    if (opts.propose) {
      try {
        proposal = await opts.propose({ title: s.title, description: s.description });
      } catch (e) {
        report.skipped.push(`proposition IA indisponible pour « ${s.title} » (${(e as Error).message})`);
      }
    }

    // J+1, s'il est encore à venir et libre ; sinon file éditoriale.
    let day: string | null = null;
    if (s.publishedAt && latestByDay.get(parisDay(s.publishedAt)) === s.id) {
      const target = addDays(parisDay(s.publishedAt), 1);
      if (target >= today && !(await db.query.sheets.findFirst({ where: eq(sheets.day, target) }))) day = target;
    }

    const notes = [
      ...proposalNotes(proposal),
      lecture ? null : "Aucune conférence de la chaîne n'est citée dans la description : à rechercher.",
      "Intervenant à identifier et à vérifier.",
    ].filter(Boolean);

    await db.insert(sheets).values({
      day,
      ...proposalFields(proposal, s.title),
      shortVideoId: short.id,
      lectureVideoId: lectureId,
      status: "a_verifier",
      aiDrafted: !!proposal,
      sources: [
        `Short : https://www.youtube.com/watch?v=${s.id}`,
        lecture ? `Conférence citée dans la description : https://www.youtube.com/watch?v=${lecture.id}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      editorialNotes: notes.join("\n"),
    });
    if (day) report.scheduled.push(day);
    else report.queued++;
  }
  return report;
}

const AI_NOTE = "Thème, question et synthèse proposés par un outil d'IA à partir de la description du Short : à vérifier avant validation.";
const TODO_NOTE = "Thème, question et synthèse à rédiger.";

function proposalNotes(p: SheetProposal | null): string[] {
  if (!p) return [TODO_NOTE];
  return [AI_NOTE, ...(p.missing ? [`Informations manquantes signalées : ${p.missing}`] : [])];
}

function proposalFields(p: SheetProposal | null, title: string) {
  return {
    theme: p?.theme?.toLowerCase().slice(0, 80) || "à définir",
    question: p?.question?.slice(0, 300) || `[Question à rédiger] ${title}`.slice(0, 300),
    synthesis: p?.synthesis?.slice(0, 700) ?? null,
  };
}

export interface DraftReport {
  drafted: number;
  failed: string[];
}

// Demande à l'IA un brouillon (thème, question, synthèse) pour des fiches déjà importées et jamais rédigées.
// Une fiche validée ou déjà proposée par l'IA n'est jamais modifiée ; la fiche reste « à vérifier ».
export async function draftWithAi(
  db: Db,
  propose: NonNullable<SyncOptions["propose"]>,
  opts: { sheetIds?: string[]; limit?: number } = {},
): Promise<DraftReport> {
  const report: DraftReport = { drafted: 0, failed: [] };
  const rows = await db
    .select({ sheet: sheets, title: videos.title, description: videos.description })
    .from(sheets)
    .innerJoin(videos, eq(videos.id, sheets.shortVideoId))
    .where(
      and(
        ne(sheets.status, "validee"),
        eq(sheets.aiDrafted, false),
        opts.sheetIds ? inArray(sheets.id, opts.sheetIds) : eq(sheets.status, "a_verifier"),
      ),
    )
    .orderBy(desc(videos.publishedAt))
    .limit(opts.limit ?? 10);

  for (const { sheet, title, description } of rows) {
    let proposal: SheetProposal | null;
    try {
      proposal = await propose({ title, description: description ?? "" });
    } catch (e) {
      report.failed.push(`« ${title} » (${(e as Error).message})`);
      continue;
    }
    if (!proposal) {
      report.failed.push(`« ${title} » (aucune proposition)`);
      continue;
    }
    const kept = (sheet.editorialNotes ?? "").split("\n").filter((l) => l && l !== TODO_NOTE);
    await db
      .update(sheets)
      .set({
        ...proposalFields(proposal, title),
        aiDrafted: true,
        editorialNotes: [...proposalNotes(proposal), ...kept].join("\n"),
        updatedAt: new Date(),
      })
      .where(and(eq(sheets.id, sheet.id), eq(sheets.aiDrafted, false), ne(sheets.status, "validee")));
    report.drafted++;
  }
  return report;
}

// ---------- programmation quotidienne ----------

export interface PlanResult {
  day: string;
  action: "deja_prete" | "rediffusion" | "aucune";
  sheetId?: string;
  movedToQueue?: string;
}

function seeded(day: string): () => number {
  let h = 2166136261;
  for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return h / 2 ** 32;
  };
}

// Garantit qu'une fiche validée est prête pour le jour donné. Sans nouveau Short validé,
// une fiche déjà validée est rediffusée, en évitant les répétitions rapprochées et en variant thèmes et intervenants.
export function planDay(db: Db, day: string): Promise<PlanResult> {
  return logRun(db, "planification", () => doPlan(db, day), (r) =>
    r.action === "deja_prete" ? `${r.day} : fiche validée prête.` : r.action === "rediffusion" ? `${r.day} : rediffusion programmée${r.movedToQueue ? " (fiche non validée replacée en file)" : ""}.` : `${r.day} : aucune fiche disponible, la fiche de secours sera servie.`,
  );
}

async function doPlan(db: Db, day: string): Promise<PlanResult> {
  const current = await db.query.sheets.findFirst({ where: eq(sheets.day, day) });
  if (current?.status === "validee") return { day, action: "deja_prete", sheetId: current.id };

  let movedToQueue: string | undefined;
  if (current) {
    // Une fiche encore à vérifier ne peut pas être publiée : elle retourne dans la file.
    await db.update(sheets).set({ day: null, updatedAt: new Date() }).where(eq(sheets.id, current.id));
    movedToQueue = current.id;
  }

  const since = addDays(day, -NO_REPEAT_DAYS);
  const recent = await db
    .select({ id: sheets.id, replayOf: sheets.replayOf, theme: sheets.theme, day: sheets.day, shortVideoId: sheets.shortVideoId })
    .from(sheets)
    .where(and(isNotNull(sheets.day), gte(sheets.day, since), lt(sheets.day, day)));
  const recentRoots = new Set(recent.map((r) => r.replayOf ?? r.id));
  const weekStart = addDays(day, -DIVERSITY_DAYS);
  const lastWeek = recent.filter((r) => r.day! >= weekStart);
  const weekThemes = new Set(lastWeek.map((r) => r.theme));
  const weekShorts = lastWeek.map((r) => r.shortVideoId).filter((x): x is string => !!x);
  const weekSpeakers = new Set(
    weekShorts.length
      ? (await db.select({ s: videos.speakerId }).from(videos).where(inArray(videos.id, weekShorts))).map((r) => r.s).filter(Boolean)
      : [],
  );

  // Candidats : fiches originales validées, avec un Short, déjà publiées au moins une fois.
  const pool = await db
    .select({ sheet: sheets, speakerId: videos.speakerId })
    .from(sheets)
    .innerJoin(videos, eq(videos.id, sheets.shortVideoId))
    .where(and(eq(sheets.status, "validee"), isNull(sheets.replayOf), isNotNull(sheets.day), lt(sheets.day, day)))
    .orderBy(desc(sheets.day));
  const fresh = pool.filter((c) => !recentRoots.has(c.sheet.id));
  if (fresh.length === 0) return { day, action: "aucune", movedToQueue };

  const score = (c: (typeof fresh)[number]) =>
    (weekThemes.has(c.sheet.theme) ? 0 : 2) + (c.speakerId && weekSpeakers.has(c.speakerId) ? 0 : 1);
  const best = Math.max(...fresh.map(score));
  const top = fresh.filter((c) => score(c) === best);
  const pick = top[Math.floor(seeded(day)() * top.length)].sheet;

  const [replay] = await db
    .insert(sheets)
    .values({
      day,
      theme: pick.theme,
      question: pick.question,
      synthesis: pick.synthesis,
      shortVideoId: pick.shortVideoId,
      lectureVideoId: pick.lectureVideoId,
      bookId: pick.bookId,
      status: "validee",
      authenticityVerifiedAt: pick.authenticityVerifiedAt,
      authenticityVerifiedBy: pick.authenticityVerifiedBy,
      sources: pick.sources,
      aiDrafted: pick.aiDrafted,
      replayOf: pick.id,
      editorialNotes: `Rediffusion automatique de la fiche du ${pick.day}.`,
    })
    .returning({ id: sheets.id });
  return { day, action: "rediffusion", sheetId: replay.id, movedToQueue };
}

// Tâche programmée complète : synchronisation (si la clé est configurée) puis programmation d'aujourd'hui et de demain.
export async function runScheduledTasks(db: Db, opts: Omit<SyncOptions, "apiKey"> & { apiKey?: string }) {
  const now = opts.now ?? new Date();
  const out: { sync?: SyncReport; syncError?: string; plans: PlanResult[] } = { plans: [] };
  if (opts.apiKey) {
    try {
      out.sync = await syncPlaylist(db, { ...opts, apiKey: opts.apiKey, now });
    } catch (e) {
      // L'échec de la synchronisation n'empêche jamais la fiche du jour.
      out.syncError = (e as Error).message;
    }
  }
  const today = parisDay(now);
  out.plans.push(await planDay(db, today));
  out.plans.push(await planDay(db, addDays(today, 1)));
  return out;
}
