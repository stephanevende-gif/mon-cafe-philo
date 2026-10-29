import Link from "next/link";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listWorkedSheets } from "@/lib/my-sheets";
import { Question } from "@/components/Question";
import { SiteFoot } from "@/components/SiteFoot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes fiches" };

// Toutes les questions que le lecteur a travaillées, pour les reprendre, les imprimer ou les télécharger.
export default async function Page() {
  const user = await requireUser("/mes-fiches");
  const rows = await listWorkedSheets(db, user.id);
  return (
    <main className="page stack-lg mes-fiches">
      <div className="stack" style={{ gap: 8 }}>
        <span className="step-label">Mon carnet</span>
        <h1 className="page-title">Mes fiches</h1>
        <p className="muted">
          {rows.length
            ? `Les ${rows.length > 1 ? `${rows.length} questions` : "questions"} que vous avez travaillées. Elles vous appartiennent : reprenez-les, imprimez-les ou téléchargez-les quand vous voulez.`
            : "Vous n'avez encore travaillé aucune question. Votre première réflexion commence avec la question du jour."}
        </p>
        {!rows.length && <Link className="btn primary" href="/je-pense" style={{ justifySelf: "start" }}>La question du jour</Link>}
      </div>
      {rows.length > 0 && (
        <ol className="liste-fiches">
          {rows.map((r) => (
            <li key={r.id}>
              <span className="small muted">
                {r.theme} · {r.versions} version{r.versions > 1 ? "s" : ""} · commencée le {formatDate(new Date(r.firstAt))}
                {formatDate(new Date(r.lastAt)) !== formatDate(new Date(r.firstAt)) ? `, reprise le ${formatDate(new Date(r.lastAt))}` : ""}
              </span>
              <Link className="q" href={`/mes-fiches/${r.id}/je-suis`}><Question text={r.question} /></Link>
              <div className="row">
                <Link className="btn" href={`/mes-fiches/${r.id}/je-suis`}>Reprendre</Link>
                <Link className="btn" href={`/mes-fiches/${r.id}/fiche-de-travail`}>Imprimer ou PDF</Link>
                <a className="btn" href={`/mes-fiches/${r.id}/fiche-de-travail/word`} download>Word (.doc)</a>
              </div>
            </li>
          ))}
        </ol>
      )}
      <SiteFoot />
    </main>
  );
}
