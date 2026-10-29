"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { addEntry } from "@/lib/notebook";
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
  // Après la première réflexion, la page s'ouvre sur l'invitation à poursuivre.
  redirect(`${back}?message=enregistre${stage === "je_pense" ? "#relance" : ""}`);
}
