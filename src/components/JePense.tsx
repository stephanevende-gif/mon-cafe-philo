import Link from "next/link";
import { db } from "@/db";
import { currentAccess, currentUser } from "@/lib/auth";
import { formatDayLong, formatTime } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { listEntries } from "@/lib/notebook";
import { saveReflection } from "@/app/actions/notebook";
import { Steps } from "./Steps";
import { Question } from "./Question";
import { Pledge } from "./Pledge";
import { AccessLine } from "./AccessLine";
import { Notice } from "./Notice";
import { SiteFoot } from "./SiteFoot";

export async function JePense({ ctx, message }: { ctx: JourneyContext; message?: string }) {
  const { sheet } = ctx;
  const user = await currentUser();
  const access = await currentAccess();
  const entries = user && sheet ? await listEntries(db, user.id, sheet.id) : [];
  const first = entries[0];
  const here = ctx.base || "/je-pense";

  return (
    <main className="page">
      <Steps base={ctx.base} current="pense" />
      <div className="pense" style={{ marginTop: 24 }}>
        <div className="pense-main">
          <div className="stack" style={{ gap: 8 }}>
            <span className="date">{formatDayLong(ctx.day)}</span>
            <span className="step-label">Je pense</span>
            {sheet?.title && <p className="sheet-title">{sheet.title}</p>}
            {sheet && (
              <span className="theme">
                {sheet.theme.includes(",") ? "Thèmes" : "Thème"} : <b>{sheet.theme}</b>
              </span>
            )}
          </div>
          <Notice code={message} />
          {!sheet ? (
            <div className="stack">
              <h1 className="question">La question du jour est en préparation.</h1>
              <p className="muted">Revenez un peu plus tard, ou parcourez les archives.</p>
            </div>
          ) : (
            <>
              <h1 className="question">
                {sheet.title && <span className="visually-hidden">Question : </span>}
                <Question text={sheet.question} />
              </h1>
              {ctx.fallback && <p className="small muted">Question tirée des archives des Éditions M-Éditer.</p>}
              <p className="invite">Et vous, qu&apos;en pensez-vous&nbsp;?</p>

              {first ? (
                <div className="stack">
                  <div className="version">
                    <div className="meta">
                      <span>Ma première réflexion</span>
                      <span>{formatTime(first.createdAt)}</span>
                    </div>
                    <p>{first.body}</p>
                  </div>
                  <p className="relance" id="relance">
                    Votre pensée est notée. Gardez-la en tête : la piste du jour va maintenant la mettre à l&apos;épreuve,
                    avec un philosophe qui s&apos;est posé la même question.
                  </p>
                  <div className="row">
                    <Link className="btn primary" href={`${ctx.base}/donc`}>Découvrir une piste : Donc ? →</Link>
                    <Link className="btn" href={`${ctx.base}/je-suis`}>Revenir sur ma pensée</Link>
                  </div>
                </div>
              ) : user && access?.active ? (
                <form action={saveReflection} className="stack">
                  <input type="hidden" name="fiche" value={sheet.id} />
                  <input type="hidden" name="etape" value="je_pense" />
                  <input type="hidden" name="retour" value={here} />
                  <label>
                    <span className="visually-hidden">Ma première réflexion</span>
                    <textarea name="texte" id="texte" maxLength={8000} placeholder="Écrivez votre première réflexion, avant de lire quoi que ce soit d'autre…" />
                    <span className="hint">Facultatif · visible de vous seul</span>
                  </label>
                  <div className="row">
                    <button className="btn primary" type="submit">Enregistrer dans mon carnet</button>
                    <Link className="btn" href={`${ctx.base}/donc`}>Découvrir une piste : Donc ? →</Link>
                  </div>
                </form>
              ) : user ? (
                <div className="stack">
                  <p className="notice">Votre accès a pris fin. Vous pouvez toujours réfléchir à la question, et prolonger votre accès pour retrouver votre carnet.</p>
                  <Link className="btn primary" href="/compte">Prolonger mon accès</Link>
                </div>
              ) : (
                <div className="stack">
                  <p>Prenez le temps d&apos;y réfléchir. Pour garder vos réflexions dans un carnet et découvrir la piste du jour, créez un compte : les 10 premiers jours sont gratuits, sans carte bancaire.</p>
                  <div className="row">
                    <Link className="btn primary" href="/inscription">Commencer gratuitement</Link>
                    <Link className="btn" href={`/connexion?suite=${encodeURIComponent(here)}`}>J&apos;ai déjà un compte</Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <aside className="aside">
          <Pledge />
          <p className="motto">Cinq minutes par jour pour exercer sa pensée. Toute une vie pour apprendre à philosopher.</p>
          {access && <AccessLine access={access} />}
        </aside>
      </div>
      <SiteFoot />
    </main>
  );
}
