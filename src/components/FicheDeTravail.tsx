import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDate, formatDayLong, formatTime } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { listEntries } from "@/lib/notebook";
import { getNote, isEmptyNote } from "@/lib/listening-notes";
import { getSheetDetails } from "@/lib/sheets";
import { Question } from "./Question";
import { AccessEnded } from "./AccessEnded";
import { PrintButton } from "./PrintButton";

const STAGE_LABEL = { je_pense: "Je pense", donc: "Donc ?", je_suis: "Je suis" } as const;

// Fiche de travail imprimable : tout le cheminement du lecteur sur une question, de sa première pensée à ce qu'il retient.
export async function FicheDeTravail({ ctx }: { ctx: JourneyContext }) {
  const here = `${ctx.base}/fiche-de-travail`;
  const user = await requireUser(here);
  const access = await currentAccess();
  if (!access?.active || !ctx.sheet) {
    return <main className="page">{!access?.active ? <AccessEnded /> : <p className="notice">La question du jour est en préparation.</p>}</main>;
  }
  const [entries, note, details] = await Promise.all([listEntries(db, user.id, ctx.sheet.id), getNote(db, user.id, ctx.sheet.id), getSheetDetails(db, ctx.sheet)]);
  const speaker = details.short?.speaker ?? null;
  const attempt = note?.probleme?.trim() || "";

  return (
    <main className="page fiche-travail">
      <div className="row no-print" style={{ justifyContent: "space-between" }}>
        <a className="small" href={`${ctx.base}/je-suis`}>← Revenir à mon carnet</a>
        <div className="row">
          <PrintButton label="Imprimer ou enregistrer en PDF" />
          <a className="btn" href={`${here}/word`} download>Télécharger en Word (.doc)</a>
        </div>
      </div>
      <p className="small muted no-print">Pour un PDF, choisissez « Enregistrer au format PDF » comme imprimante.</p>
      <header className="stack" style={{ gap: 6 }}>
        <span className="step-label">Mon café philo · fiche de travail</span>
        <h1 className="recall"><Question text={ctx.sheet.question} /></h1>
        <p className="small muted">
          {user.displayName} · question du {formatDayLong(ctx.day).toLowerCase()}
          {speaker ? ` · avec ${speaker.fullName}` : ""} · {ctx.sheet.theme}
        </p>
      </header>

      <section>
        <h2>Mon cheminement</h2>
        {entries.map((e) => (
          <article className="version" key={e.id}>
            <div className="meta">
              <span>Version {e.version} · {STAGE_LABEL[e.stage]}</span>
              <span>{formatDate(e.createdAt)}, {formatTime(e.createdAt)}</span>
            </div>
            <p style={{ whiteSpace: "pre-line" }}>{e.body}</p>
          </article>
        ))}
      </section>

      {note && !isEmptyNote(note) && (
        <section>
          <h2>Mes notes d&apos;écoute</h2>
          {note.these.trim() && <p><b>Thèse.</b> {note.these}</p>}
          {note.arguments.trim() && <p style={{ whiteSpace: "pre-line" }}><b>Arguments.</b> {note.arguments}</p>}
          {note.exemples.trim() && <p style={{ whiteSpace: "pre-line" }}><b>Exemples et objections.</b> {note.exemples}</p>}
        </section>
      )}

      {(attempt || ctx.sheet.problem) && (
        <section>
          <h2>Le problème à surmonter</h2>
          {attempt && <p style={{ whiteSpace: "pre-line" }}><b>Mon problème.</b> {attempt}</p>}
          {ctx.sheet.problem && <p><b>Le problème que pose la question.</b> {ctx.sheet.problem}</p>}
          {ctx.sheet.solutionQuestion && <p><i>{ctx.sheet.solutionQuestion}</i></p>}
        </section>
      )}

      {!!(ctx.sheet.pressArticles?.length || ctx.sheet.readings?.length) && (
        <section>
          <h2>Pour aller plus loin</h2>
          <ul>
            {ctx.sheet.pressArticles?.map((a) => (
              <li key={a.url}>
                {a.side} : « {a.title} », {a.source}{a.author ? `, ${a.author}` : ""}. <span className="lien">{a.url}</span>
              </li>
            ))}
            {ctx.sheet.readings?.map((r) => (
              <li key={r.philosopher + r.book}>
                {r.philosopher}, <i>{r.book}</i>{r.part ? `, ${r.part}` : ""}.
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="small muted">Mon café philo, une application des Éditions M-Éditer. Fiche personnelle : elle vous appartient.</p>
    </main>
  );
}
