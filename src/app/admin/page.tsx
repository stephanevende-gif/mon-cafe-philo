import Link from "next/link";
import { and, count, countDistinct, eq, gt, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { accessPeriods, notebookEntries, sheets, users } from "@/db/schema";
import { addDays, formatDayLong, parisDay } from "@/lib/dates";

export default async function Page() {
  const now = new Date();
  const today = parisDay(now);
  const until = addDays(today, 13);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const [[u], [active], [paid], [entries], [toReview], planned] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: countDistinct(accessPeriods.userId) }).from(accessPeriods).where(and(lte(accessPeriods.startsAt, now), gt(accessPeriods.endsAt, now))),
    db.select({ n: count() }).from(accessPeriods).where(and(eq(accessPeriods.kind, "paiement"), lte(accessPeriods.startsAt, now), gt(accessPeriods.endsAt, now))),
    db.select({ n: count() }).from(notebookEntries).where(gte(notebookEntries.createdAt, weekAgo)),
    db.select({ n: count() }).from(sheets).where(inArray(sheets.status, ["brouillon", "a_verifier"])),
    db.select({ id: sheets.id, day: sheets.day, question: sheets.question, status: sheets.status }).from(sheets).where(and(gte(sheets.day, today), lte(sheets.day, until))),
  ]);
  const byDay = new Map(planned.map((p) => [p.day, p]));
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  return (
    <div className="stack-lg">
      <h1 className="page-title">Tableau de bord</h1>
      <div className="stats">
        <div className="stat"><b>{u.n}</b>comptes</div>
        <div className="stat"><b>{active.n}</b>accès en cours</div>
        <div className="stat"><b>{paid.n}</b>abonnés payants</div>
        <div className="stat"><b>{entries.n}</b>réflexions écrites en 7 jours</div>
        <div className="stat"><b>{toReview.n}</b>fiches à valider</div>
      </div>
      <p className="small muted">Chiffres agrégés uniquement : aucun contenu de carnet n&apos;est visible ici.</p>
      <section className="stack">
        <h2>Les 14 prochains jours</h2>
        <div className="calendar">
          {days.map((d) => {
            const s = byDay.get(d);
            const ok = s?.status === "validee";
            return (
              <div key={d} className={ok ? "" : "missing"}>
                <b>{formatDayLong(d).replace(/ \d{4}$/, "")}</b>
                <br />
                {s ? <Link href={`/admin/fiches/${s.id}`}>{ok ? s.question : `À valider : ${s.question}`}</Link> : <Link href={`/admin/fiches/nouvelle?jour=${d}`}>Aucune fiche · programmer</Link>}
              </div>
            );
          })}
        </div>
        <p className="small muted">Un jour sans fiche validée affichera une fiche de secours.</p>
      </section>
    </div>
  );
}
