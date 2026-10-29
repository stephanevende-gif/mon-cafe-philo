import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sheets, type Sheet } from "@/db/schema";

// Version de test adressée à quelques collègues : seules ces questions, validées, sont ouvertes aux lecteurs.
// La première tient lieu de question du jour, la seconde s'ouvre depuis l'accueil.
// Liste vide : fonctionnement normal (question du jour tirée au sort, archives complètes).
export const TEST_SHEET_IDS = [
  "11421fdb-5d01-42e5-b854-d7930e6a786c", // Jean-Luc Nativelle : « Confier nos jugements aux machines… »
  "424bbe7c-a46a-4b2b-a2bc-92511b13a3db", // Jean-Marie Frey : Short « Quand le hasard joue aux dés avec nos existences… »
];

// Les questions de la version de test, dans l'ordre de la liste ; vide hors version de test.
export async function testSheets(): Promise<Sheet[]> {
  if (!TEST_SHEET_IDS.length) return [];
  const rows = await db.select().from(sheets).where(and(inArray(sheets.id, TEST_SHEET_IDS), eq(sheets.status, "validee")));
  return TEST_SHEET_IDS.map((id) => rows.find((r) => r.id === id)).filter((s): s is Sheet => !!s);
}

export const isTestSheet = (s: { id: string; replayOf: string | null }) => TEST_SHEET_IDS.includes(s.replayOf ?? s.id);
