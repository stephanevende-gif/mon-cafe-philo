import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { accessPeriods, listeningNotes, notebookEntries, sheets } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Droit à la portabilité (RGPD, art. 20) : toutes les données liées au compte.
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/connexion?suite=/compte", process.env.APP_URL ?? "http://localhost:3000"));
  const [carnet, acces, notesEcoute] = await Promise.all([
    db
      .select({
        question: sheets.question,
        jour: sheets.day,
        version: notebookEntries.version,
        etape: notebookEntries.stage,
        texte: notebookEntries.body,
        ecritLe: notebookEntries.createdAt,
      })
      .from(notebookEntries)
      .innerJoin(sheets, eq(sheets.id, notebookEntries.sheetId))
      .where(eq(notebookEntries.userId, user.id))
      .orderBy(asc(notebookEntries.createdAt)),
    db.select({ type: accessPeriods.kind, debut: accessPeriods.startsAt, fin: accessPeriods.endsAt, montantCentimes: accessPeriods.amountCents })
      .from(accessPeriods)
      .where(eq(accessPeriods.userId, user.id)),
    db
      .select({ question: sheets.question, jour: sheets.day, notes: listeningNotes.notes, modifieLe: listeningNotes.updatedAt })
      .from(listeningNotes)
      .innerJoin(sheets, eq(sheets.id, listeningNotes.sheetId))
      .where(eq(listeningNotes.userId, user.id))
      .orderBy(asc(listeningNotes.createdAt)),
  ]);
  const body = {
    exporteLe: new Date().toISOString(),
    compte: { email: user.email, nom: user.displayName, inscritLe: user.createdAt, emailConfirmeLe: user.emailVerifiedAt },
    acces,
    carnet,
    notesEcoute,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mon-cafe-philo-donnees.json"`,
      "Cache-Control": "no-store",
    },
  });
}
