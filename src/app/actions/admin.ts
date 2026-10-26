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

export async function saveSheet(fd: FormData) {
  const editor = await requireEditor();
  const id = uuid(fd, "id");
  const back = id ? `/admin/fiches/${id}` : "/admin/fiches/nouvelle";
  const day = str(fd, "jour", 10);
  if (day && !isDay(day)) fail(back, "La date est invalide.");
  const theme = str(fd, "theme", 80)?.toLowerCase();
  const question = str(fd, "question", 300);
  if (!theme || !question) fail(back, "Le thème et la question sont obligatoires.");
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

  const values = {
    day,
    theme,
    question,
    synthesis,
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
  const qualification = str(fd, "qualification", 300);
  if (!fullName || !qualification) fail("/admin/intervenants", "Le nom et la qualification sont obligatoires.");
  const verified = fd.get("verifie") === "on";
  const qualificationSource = httpsUrl(str(fd, "source", 500));
  if (verified && !qualificationSource) fail("/admin/intervenants", "Indiquez la source qui permet de vérifier la qualification.");
  const previous = id ? await db.query.speakers.findFirst({ where: eq(speakers.id, id) }) : null;
  const values = {
    fullName,
    qualification,
    qualificationSource,
    photoUrl: httpsUrl(str(fd, "photo", 500)),
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
  const { aiEnabled, proposeSheet } = await import("@/lib/ai");
  const r = await runScheduledTasks(db, {
    apiKey: process.env.YOUTUBE_API_KEY,
    playlistId: process.env.YOUTUBE_PLAYLIST_ID || undefined,
    propose: aiEnabled() ? proposeSheet : undefined,
  });
  revalidatePath("/admin", "layout");
  const parts: string[] = [];
  if (!process.env.YOUTUBE_API_KEY) parts.push("Clé YouTube manquante : seule la programmation a été faite.");
  else if (r.syncError) parts.push(`Lecture de la playlist impossible : ${r.syncError}`);
  else if (r.sync) parts.push(`${r.sync.newShorts} nouveau(x) Short(s), ${r.sync.queued} en file.`);
  parts.push(...r.plans.map((p) => `${p.day} : ${p.action === "deja_prete" ? "fiche validée prête" : p.action === "rediffusion" ? "rediffusion programmée" : "fiche de secours"}.`));
  redirect(`/admin/synchronisation?message=${encodeURIComponent(parts.join(" "))}`);
}
