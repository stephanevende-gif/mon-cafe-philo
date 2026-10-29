import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/db";
import type { Sheet } from "@/db/schema";
import { isDay, parisDay } from "./dates";
import { getPublishedSheet, getSheetById, getSheetOfTheDay, sheetForReader } from "./sheets";
import { currentUser } from "./auth";
import { isTestSheet, testSheets } from "./test-version";

export interface JourneyContext {
  sheet: Sheet | null;
  day: string;
  base: string;
  isToday: boolean;
  fallback: boolean;
}

// Sans jour : la question du jour (ou la fiche de secours), remplacée pour un lecteur qui l'a déjà travaillée. Avec un jour : une archive.
export async function resolveJourney(dayParam?: string): Promise<JourneyContext> {
  const today = parisDay();
  if (!dayParam) {
    // Version de test : la première question de test tient lieu de question du jour.
    const [first] = await testSheets();
    if (first) return { sheet: first, day: today, base: "", isToday: true, fallback: false };
    const [found, user] = await Promise.all([getSheetOfTheDay(db, today), currentUser()]);
    const sheet = found && user ? await sheetForReader(db, user.id, found.sheet, today) : found?.sheet ?? null;
    return { sheet, day: today, base: "", isToday: true, fallback: !!found?.fallback };
  }
  if (!isDay(dayParam) || dayParam > today) notFound();
  const sheet = await getPublishedSheet(db, dayParam);
  if (!sheet || ((await testSheets()).length && !isTestSheet(sheet))) notFound();
  return { sheet, day: dayParam, base: `/question/${dayParam}`, isToday: dayParam === today, fallback: false };
}

// Une fiche retrouvée depuis « Mes fiches », par son identifiant : utile pour une fiche reçue à la place de celle du jour.
export async function resolveSheetJourney(id: string): Promise<JourneyContext> {
  const sheet = /^[0-9a-f-]{36}$/.test(id) ? await getSheetById(db, id) : null;
  if (!sheet || sheet.status !== "validee") notFound();
  if ((await testSheets()).length && !isTestSheet(sheet)) notFound();
  const today = parisDay();
  const day = sheet.day && sheet.day <= today ? sheet.day : today;
  return { sheet, day, base: `/mes-fiches/${id}`, isToday: false, fallback: false };
}
