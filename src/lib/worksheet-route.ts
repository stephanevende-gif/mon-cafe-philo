import "server-only";
import { db } from "@/db";
import { currentAccess, requireUser } from "./auth";
import type { JourneyContext } from "./journey";
import { listEntries } from "./notebook";
import { getNote } from "./listening-notes";
import { getSheetDetails } from "./sheets";
import { worksheetDoc, worksheetFileName } from "./worksheet-doc";

// Téléchargement de la fiche de travail au format Word, réservé au lecteur et à ses propres écrits.
export async function worksheetResponse(ctx: JourneyContext): Promise<Response> {
  const user = await requireUser(`${ctx.base}/fiche-de-travail`);
  if (!(await currentAccess())?.active || !ctx.sheet) return new Response("Accès indisponible.", { status: 403 });
  const [entries, note, details] = await Promise.all([listEntries(db, user.id, ctx.sheet.id), getNote(db, user.id, ctx.sheet.id), getSheetDetails(db, ctx.sheet)]);
  const body = worksheetDoc({ sheet: ctx.sheet, day: ctx.day, readerName: user.displayName, speakerName: details.short?.speaker?.fullName ?? null, entries, note });
  return new Response(body, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${worksheetFileName(ctx.day)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
