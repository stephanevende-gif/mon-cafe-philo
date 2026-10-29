import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/db";
import type { Sheet } from "@/db/schema";
import { isDay, parisDay } from "./dates";
import { getPublishedSheet, getSheetOfTheDay, sheetForReader } from "./sheets";
import { currentUser } from "./auth";

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
    const [found, user] = await Promise.all([getSheetOfTheDay(db, today), currentUser()]);
    const sheet = found && user ? await sheetForReader(db, user.id, found.sheet, today) : found?.sheet ?? null;
    return { sheet, day: today, base: "", isToday: true, fallback: !!found?.fallback };
  }
  if (!isDay(dayParam) || dayParam > today) notFound();
  const sheet = await getPublishedSheet(db, dayParam);
  if (!sheet) notFound();
  return { sheet, day: dayParam, base: `/question/${dayParam}`, isToday: dayParam === today, fallback: false };
}
