import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { formatDayLong } from "@/lib/dates";

const STATUS = { brouillon: ["Brouillon", "neutral"], a_verifier: ["À vérifier", "warn"], validee: ["Validée", "ok"] } as const;

export default async function Page() {
  const rows = await db.select().from(sheets).orderBy(sql`${sheets.day} desc nulls first`, desc(sheets.createdAt));
  return (
    <div className="stack-lg">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="page-title">Fiches quotidiennes</h1>
        <Link className="btn primary" href="/admin/fiches/nouvelle">Nouvelle fiche</Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Jour</th><th>Question</th><th>Thème</th><th>État</th><th>Authenticité</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.day ? formatDayLong(s.day) : s.isBackup ? "Fiche de secours" : s.status === "validee" ? "Tirage au sort" : "Non programmée"}</td>
                <td><Link href={`/admin/fiches/${s.id}`}>{s.question}</Link></td>
                <td>{s.theme}</td>
                <td><span className={`tag ${STATUS[s.status][1]}`}>{STATUS[s.status][0]}</span>{s.isBackup && s.day ? " · secours" : ""}{s.replayOf ? " · rediffusion" : ""}{s.aiDrafted ? " · IA" : ""}</td>
                <td>{s.authenticityVerifiedAt ? <span className="tag ok">vérifiée</span> : <span className="tag neutral">non</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}>Aucune fiche pour l&apos;instant.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
