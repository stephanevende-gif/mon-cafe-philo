import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/db";
import type { Sheet } from "@/db/schema";
import { isDay, parisDay } from "./dates";
import { getPublishedSheet, getSheetOfTheDay } from "./sheets";

export interface JourneyContext {
  sheet: Sheet | null;
  day: string;
  base: string;
  isToday: boolean;
  fallback: boolean;
}

// Sans jour : la question du jour (ou la fiche de secours). Avec un jour : une archive.
export async function resolveJourney(dayParam?: string): Promise<JourneyContext> {
  const today = parisDay();
  if (!dayParam) {
    const found = await getSheetOfTheDay(db, today);
    return { sheet: found?.sheet ?? null, day: today, base: "", isToday: true, fallback: !!found?.fallback };
  }
  if (!isDay(dayParam) || dayParam > today) notFound();
  const sheet = await getPublishedSheet(db, dayParam);
  if (!sheet) notFound();
  return { sheet, day: dayParam, base: `/question/${dayParam}`, isToday: dayParam === today, fallback: false };
}
