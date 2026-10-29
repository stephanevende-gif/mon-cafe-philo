"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { currentAccess, currentUser, requireUser } from "@/lib/auth";
import { addEntry } from "@/lib/notebook";
import { saveNote } from "@/lib/listening-notes";
import { getSheetById } from "@/lib/sheets";
import { hitLimit } from "@/lib/rate-limit";

function safeReturn(path: FormDataEntryValue | null): string {
  const p = typeof path === "string" ? path : "/";
  // Seuls les chemins internes sont acceptés.
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

export async function saveReflection(formData: FormData) {
  const back = safeReturn(formData.get("retour"));
  const user = await requireUser(back);
  const access = await currentAccess();
  if (!access?.active) redirect(`${back}?message=acces`);
  const sheetId = String(formData.get("fiche") ?? "");
  const etape = formData.get("etape");
  const stage = etape === "je_suis" ? "je_suis" : etape === "donc" ? "donc" : "je_pense";
  const body = String(formData.get("texte") ?? "");
  const sheet = /^[0-9a-f-]{36}$/.test(sheetId) ? await getSheetById(db, sheetId) : null;
  if (!sheet || sheet.status !== "validee") redirect(back);
  if (!body.trim()) redirect(`${back}?message=vide`);
  if (await hitLimit(db, `carnet:${user.id}`, 30, 60 * 60 * 1000)) redirect(`${back}?message=trop`);
  await addEntry(db, user.id, sheet.id, stage, body);
  revalidatePath(back);
  // Après la première réflexion et après la version 2, la page s'ouvre sur l'invitation à poursuivre.
  redirect(`${back}?message=enregistre${stage === "je_suis" ? "" : "#relance"}`);
}

// Notes d'écoute, enregistrées au fil de la frappe depuis la page « Donc ? ».
export async function saveListeningNote(sheetId: string, input: { these?: unknown; arguments?: unknown; exemples?: unknown }) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Connectez-vous pour garder vos notes." };
  if (!(await currentAccess())?.active) return { ok: false as const, error: "Votre accès a pris fin : vos notes ne sont plus enregistrées." };
  const sheet = /^[0-9a-f-]{36}$/.test(sheetId) ? await getSheetById(db, sheetId) : null;
  if (!sheet || sheet.status !== "validee") return { ok: false as const, error: "Fiche introuvable." };
  if (await hitLimit(db, `notes:${user.id}`, 600, 60 * 60 * 1000)) return { ok: false as const, error: "Trop d'enregistrements : réessayez dans un moment." };
  await saveNote(db, user.id, sheet.id, input);
  return { ok: true as const };
}

// Exercice de « Je suis » : le lecteur pose lui-même le problème avant de découvrir celui de la fiche.
export async function saveProblemAttempt(formData: FormData) {
  const back = safeReturn(formData.get("retour"));
  const user = await requireUser(back);
  if (!(await currentAccess())?.active) redirect(`${back}?message=acces`);
  const sheetId = String(formData.get("fiche") ?? "");
  const body = String(formData.get("texte") ?? "").trim();
  const sheet = /^[0-9a-f-]{36}$/.test(sheetId) ? await getSheetById(db, sheetId) : null;
  if (!sheet || sheet.status !== "validee") redirect(back);
  if (!body) redirect(`${back}?message=vide#probleme`);
  if (await hitLimit(db, `carnet:${user.id}`, 30, 60 * 60 * 1000)) redirect(`${back}?message=trop#probleme`);
  await saveNote(db, user.id, sheet.id, { probleme: body });
  revalidatePath(back);
  redirect(`${back}?message=probleme#probleme`);
}
