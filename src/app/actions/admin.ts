"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { books, sessions, sheets, speakers, users, videos } from "@/db/schema";
import { grantAccess } from "@/lib/access";
import { requireAdmin, requireEditor } from "@/lib/auth";
import { isDay } from "@/lib/dates";
import { parseDuration, parseYouTubeId } from "@/lib/youtube";
import { formatNotions, isNotion } from "@/lib/notions";
import { portraitFromUrl } from "@/lib/portrait";
import { cleanReadings, keepCovers } from "@/lib/readings";
import { withCovers } from "@/lib/covers";
import { fillPosters, replaceShortPoster } from "@/lib/posters";

const UUID = /^[0-9a-f-]{36}$/;

function str(fd: FormData, key: string, max = 4000): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

function uuid(fd: FormData, key: string): string | null {
  const v = str(fd, key, 40);
  return v && UUID.test(v) ? v : null;
}

function httpsUrl(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("/")) return v;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}message=${encodeURIComponent(message)}`);
}

// ---------- fiches ----------

// Les trois lectures conseillées du formulaire : une lecture incomplète est ignorée.
function readingsFrom(fd: FormData) {
  const list = [1, 2, 3].map((i) => ({
    philosopher: String(fd.get(`lecture${i}_philosophe`) ?? ""),
    book: String(fd.get(`lecture${i}_livre`) ?? ""),
    description: String(fd.get(`lecture${i}_descriptif`) ?? ""),
    part: String(fd.get(`lecture${i}_partie`) ?? ""),
  }));
  const clean = cleanReadings(list);
  return clean.length ? clean : null;
}

export async function saveSheet(fd: FormData) {
  const editor = await requireEditor();
  const id = uuid(fd, "id");
  const back = id ? `/admin/fiches/${id}` : "/admin/fiches/nouvelle";
  const day = str(fd, "jour", 10);
  if (day && !isDay(day)) fail(back, "La date est invalide.");
  const title = str(fd, "titre", 200);
  const notions = fd.getAll("notion").map(String).filter(isNotion);
  if (notions.length > 3) fail(back, "Choisissez trois notions au plus.");
  const theme = formatNotions(notions);
  const question = str(fd, "question", 300);
  if (!theme || !question) fail(back, "Le thème (au moins une notion) et la question sont obligatoires.");
  const status = (["brouillon", "a_verifier", "validee"] as const).find((s) => s === fd.get("statut")) ?? "brouillon";
  const shortVideoId = uuid(fd, "short");
  const lectureVideoId = uuid(fd, "conference");
  const synthesis = str(fd, "synthese", 700);
  if (status === "validee" && !synthesis) fail(back, "Une fiche validée doit avoir sa synthèse en deux phrases.");

  // La mention d'authenticité exige un Short dont l'intervenant a été vérifié.
  let authenticityVerifiedAt: Date | null = null;
  let authenticityVerifiedBy: string | null = null;
  if (fd.get("authenticite") === "on") {
    const short = shortVideoId ? await db.query.videos.findFirst({ where: eq(videos.id, shortVideoId) }) : null;
    const speaker = short?.speakerId ? await db.query.speakers.findFirst({ where: eq(speakers.id, short.speakerId) }) : null;
    if (!speaker?.verifiedAt) fail(back, "Impossible de certifier l'authenticité : l'intervenant du Short n'est pas vérifié.");
    const previous = id ? await db.query.sheets.findFirst({ where: eq(sheets.id, id) }) : null;
    authenticityVerifiedAt = previous?.authenticityVerifiedAt ?? new Date();
    authenticityVerifiedBy = previous?.authenticityVerifiedBy ?? editor.id;
  }

  // Les couvertures déjà trouvées sont gardées ; un livre nouveau reçoit la sienne s'il en existe une.
  const before = id ? await db.query.sheets.findFirst({ where: eq(sheets.id, id) }) : null;
  const typed = readingsFrom(fd);
  const readings = typed ? await withCovers(keepCovers(typed, before?.readings), fetch, await coverChooser()) : null;

  const values = {
    day,
    title,
    theme,
    question,
    synthesis,
    problem: str(fd, "probleme", 700),
    solutionQuestion: str(fd, "solution", 700),
    readings,
    shortVideoId,
    lectureVideoId,
    bookId: uuid(fd, "livre"),
    status,
    isBackup: fd.get("secours") === "on",
    authenticityVerifiedAt,
    authenticityVerifiedBy,
    sources: str(fd, "sources", 1000),
    editorialNotes: str(fd, "notes", 2000),
    updatedAt: new Date(),
  };
  // Images d'attente des lecteurs : jamais d'écran noir avant le clic.
  await fillPosters(db, [shortVideoId, lectureVideoId].filter((v): v is string => !!v), { choose: await frameChooser() });
  try {
    if (id) {
      await db.update(sheets).set(values).where(eq(sheets.id, id));
      revalidatePath("/", "layout");
      redirect(`/admin/fiches/${id}?message=sauve`);
    }
    const [row] = await db.insert(sheets).values(values).returning({ id: sheets.id });
    redirect(`/admin/fiches/${row.id}?message=sauve`);
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") fail(back, "Une autre fiche est déjà programmée ce jour-là.");
    throw e;
  }
}

async function coverChooser() {
  const { aiEnabled, chooseBookCover } = await import("@/lib/ai");
  return aiEnabled() ? (covers: Buffer[], r: { philosopher: string; book: string }) => chooseBookCover(covers, r) : null;
}

async function frameChooser() {
  const { aiEnabled, chooseFlatteringFrame } = await import("@/lib/ai");
  return aiEnabled() ? (frames: Buffer[]) => chooseFlatteringFrame(frames) : null;
}

// Image d'attente du Short : l'une des trois images de la vidéo, ou un nouveau choix de l'IA.
export async function chooseShortPoster(fd: FormData) {
  await requireEditor();
  const id = uuid(fd, "id");
  const videoId = uuid(fd, "video");
  if (!id || !videoId) fail("/admin/fiches", "Fiche introuvable.");
  const back = `/admin/fiches/${id}`;
  const image = String(fd.get("image") ?? "");
  const chooser = await frameChooser();
  const choice = ["1", "2", "3"].includes(image) ? Number(image) - 1 : chooser;
  if (choice === null) fail(back, "Assistance IA désactivée : choisissez l'image 1, 2 ou 3.");
  if (!(await replaceShortPoster(db, videoId, choice))) fail(back, "Image du Short introuvable sur YouTube.");
  revalidatePath("/", "layout");
  redirect(`${back}?message=sauve`);
}

export async function deleteSheet(fd: FormData) {
  await requireEditor();
  const id = uuid(fd, "id");
  if (id) await db.delete(sheets).where(eq(sheets.id, id));
  redirect("/admin/fiches");
}

// ---------- intervenants ----------

export async function saveSpeaker(fd: FormData) {
  const editor = await requireEditor();
  const id = uuid(fd, "id");
  const fullName = str(fd, "nom", 120);
  const qualification = str(fd, "qualification", 1000);
  if (!fullName || !qualification) fail("/admin/intervenants", "Le nom et la qualification sont obligatoires.");
  const verified = fd.get("verifie") === "on";
  const qualificationSource = httpsUrl(str(fd, "source", 500));
  if (verified && !qualificationSource) fail("/admin/intervenants", "Indiquez la source qui permet de vérifier la qualification.");
  const previous = id ? await db.query.speakers.findFirst({ where: eq(speakers.id, id) }) : null;
  const photoUrl = httpsUrl(str(fd, "photo", 500));
  // Le portrait (photo recadrée gardée dans l'application) est refait quand la photo change (ou à la demande).
  const redraw = photoUrl && (photoUrl !== previous?.photoUrl || !previous?.portrait || fd.get("reprendre") === "on");
  const values = {
    fullName,
    qualification,
    qualificationSource,
    photoUrl,
    portrait: !photoUrl ? null : redraw ? await portraitFromUrl(photoUrl) : previous?.portrait ?? null,
    profileUrl: httpsUrl(str(fd, "presentation", 500)?.replace(/^http:\/\//, "https://") ?? null),
    verifiedAt: verified ? previous?.verifiedAt ?? new Date() : null,
    verifiedBy: verified ? previous?.verifiedBy ?? editor.id : null,
  };
  if (id) await db.update(speakers).set(values).where(eq(speakers.id, id));
  else await db.insert(speakers).values(values);
  redirect("/admin/intervenants?message=sauve");
}

// ---------- vidéos ----------

export async function saveVideo(fd: FormData) {
  await requireEditor();
  const id = uuid(fd, "id");
  const youtubeId = parseYouTubeId(str(fd, "youtube", 300) ?? "");
  const title = str(fd, "titre", 300);
  if (!youtubeId || !title) fail("/admin/videos", "L'adresse YouTube et le titre sont obligatoires.");
  const kind = fd.get("type") === "conference" ? "conference" : "short";
  const durationSeconds = parseDuration(str(fd, "duree", 10) ?? "");
  if (durationSeconds != null) {
    if (kind === "short" && durationSeconds >= 180) fail("/admin/videos", "Un Short doit durer moins de trois minutes.");
    if (kind === "conference" && durationSeconds <= 180) fail("/admin/videos", "Une conférence doit durer plus de trois minutes.");
  }
  const published = str(fd, "publiee", 10);
  const values = {
    youtubeId,
    kind,
    title,
    speakerId: uuid(fd, "intervenant"),
    durationSeconds,
    publishedAt: published && isDay(published) ? new Date(`${published}T12:00:00Z`) : null,
    description: str(fd, "description", 5000),
  } as const;
  try {
    if (id) await db.update(videos).set(values).where(eq(videos.id, id));
    else await db.insert(videos).values(values);
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") fail("/admin/videos", "Cette vidéo est déjà enregistrée.");
    throw e;
  }
  redirect("/admin/videos?message=sauve");
}

// ---------- livres ----------

export async function saveBook(fd: FormData) {
  await requireEditor();
  const id = uuid(fd, "id");
  const title = str(fd, "titre", 300);
  const author = str(fd, "auteur", 200);
  if (!title || !author) fail("/admin/livres", "Le titre et l'auteur sont obligatoires.");
  const values = {
    title,
    author,
    subtitle: str(fd, "soustitre", 300),
    isbn: str(fd, "isbn", 20),
    catalogueUrl: httpsUrl(str(fd, "fiche", 500)),
    coverUrl: httpsUrl(str(fd, "couverture", 500)),
    summary: str(fd, "presentation", 1200),
  };
  if (id) await db.update(books).set(values).where(eq(books.id, id));
  else await db.insert(books).values(values);
  redirect("/admin/livres?message=sauve");
}

// ---------- utilisateurs (administrateurs seulement) ----------

export async function adminGrant(fd: FormData) {
  await requireAdmin();
  const id = uuid(fd, "id");
  const days = Number(fd.get("jours"));
  if (!id || !Number.isInteger(days) || days < 1 || days > 1000) fail("/admin/utilisateurs", "Nombre de jours invalide.");
  await grantAccess(db, id, { kind: "attribution", days, note: str(fd, "note", 300) ?? undefined });
  redirect("/admin/utilisateurs?message=sauve");
}

export async function adminSuspend(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid(fd, "id");
  if (!id || id === admin.id) fail("/admin/utilisateurs", "Action impossible sur ce compte.");
  const suspend = fd.get("action") === "suspendre";
  await db
    .update(users)
    .set({ suspendedAt: suspend ? new Date() : null, suspensionReason: suspend ? str(fd, "motif", 500) : null })
    .where(eq(users.id, id));
  if (suspend) await db.delete(sessions).where(eq(sessions.userId, id));
  redirect("/admin/utilisateurs?message=sauve");
}

export async function adminRole(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid(fd, "id");
  const role = (["membre", "editeur", "admin"] as const).find((r) => r === fd.get("role"));
  if (!id || !role || id === admin.id) fail("/admin/utilisateurs", "Action impossible sur ce compte.");
  await db.update(users).set({ role }).where(eq(users.id, id));
  redirect("/admin/utilisateurs?message=sauve");
}

// ---------- synchronisation ----------

export async function syncNow() {
  await requireEditor();
  const { runScheduledTasks } = await import("@/lib/automation");
  const { aiEnabled, chooseFlatteringFrame, proposeSheet } = await import("@/lib/ai");
  const r = await runScheduledTasks(db, {
    apiKey: process.env.YOUTUBE_API_KEY,
    playlistId: process.env.YOUTUBE_PLAYLIST_ID || undefined,
    propose: aiEnabled() ? proposeSheet : undefined,
    chooseFrame: aiEnabled() ? (frames) => chooseFlatteringFrame(frames) : undefined,
  });
  revalidatePath("/admin", "layout");
  const parts: string[] = [];
  if (!process.env.YOUTUBE_API_KEY) parts.push("Clé YouTube manquante : seule la programmation a été faite.");
  else if (r.syncError) parts.push(`Lecture de la playlist impossible : ${r.syncError}`);
  else if (r.sync) parts.push(`${r.sync.newShorts} nouveau(x) Short(s), ${r.sync.queued} en file.`);
  parts.push(...r.plans.map((p) => `${p.day} : ${p.action === "deja_prete" ? "fiche validée prête" : p.action === "rediffusion" ? "rediffusion programmée" : "fiche de secours"}.`));
  redirect(`/admin/synchronisation?message=${encodeURIComponent(parts.join(" "))}`);
}

// ---------- assistance IA ----------

export async function draftSheetsWithAi(fd: FormData) {
  await requireEditor();
  const id = uuid(fd, "id");
  const back = id ? `/admin/fiches/${id}` : "/admin/synchronisation";
  const { aiEnabled, proposeSheet } = await import("@/lib/ai");
  if (!aiEnabled()) fail(back, "Assistance IA désactivée : la clé Anthropic n'est pas configurée.");
  const { draftWithAi } = await import("@/lib/automation");
  const r = await draftWithAi(db, (input) => proposeSheet(input), id ? { sheetIds: [id], limit: 1 } : { limit: 10 });
  revalidatePath("/admin", "layout");
  const parts = [`${r.drafted} brouillon(s) proposé(s) par l'IA, à relire avant validation.`];
  if (r.failed.length) parts.push(`Sans proposition : ${r.failed.join(" ; ")}`);
  redirect(`${back}?message=${encodeURIComponent(parts.join(" "))}`);
}
