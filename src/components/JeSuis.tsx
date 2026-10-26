import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { listEntries } from "@/lib/notebook";
import { saveReflection } from "@/app/actions/notebook";
import { Steps } from "./Steps";
import { Question } from "./Question";
import { Support } from "./Support";
import { AccessLine } from "./AccessLine";
import { AccessEnded } from "./AccessEnded";
import { Notice } from "./Notice";
import { SiteFoot } from "./SiteFoot";

const STAGE_LABEL = { je_pense: "Je pense", je_suis: "Je suis" } as const;

export async function JeSuis({ ctx, message }: { ctx: JourneyContext; message?: string }) {
  const here = `${ctx.base}/je-suis`;
  const user = await requireUser(here);
  const access = await currentAccess();
  if (!access?.active || !ctx.sheet) {
    return (
      <main className="page">
        <Steps base={ctx.base} current="suis" />
        {!access?.active ? <AccessEnded /> : <p className="notice" style={{ marginTop: 24 }}>La question du jour est en préparation.</p>}
      </main>
    );
  }
  const entries = await listEntries(db, user.id, ctx.sheet.id);
  const shown = entries.length > 2 ? [entries[0], entries[entries.length - 1]] : entries;

  return (
    <main className="page">
      <Steps base={ctx.base} current="suis" />
      <div className="suis" style={{ marginTop: 24 }}>
        <div className="stack-lg">
          <div className="stack" style={{ gap: 8 }}>
            <span className="step-label">Je suis</span>
            <h1 className="recall"><Question text={ctx.sheet.question} /></h1>
            <span className="theme">Mon carnet · privé</span>
          </div>
          <Notice code={message} />
          {entries.length === 0 ? (
            <p className="muted">Vous n&apos;avez encore rien écrit sur cette question. Votre première réflexion commence ici.</p>
          ) : (
            <div className="stack">
              {entries.length > 2 && (
                <p className="small muted">Comparaison de votre première et de votre dernière version. Les {entries.length} versions sont listées plus bas.</p>
              )}
              <div className="versions">
                {shown.map((e) => (
                  <article className="version" key={e.id}>
                    <div className="meta">
                      <span>Version {e.version} · {STAGE_LABEL[e.stage]}</span>
                      <span>{formatDate(e.createdAt)}, {formatTime(e.createdAt)}</span>
                    </div>
                    <p>{e.body}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
          <form action={saveReflection} className="stack">
            <input type="hidden" name="fiche" value={ctx.sheet.id} />
            <input type="hidden" name="etape" value={entries.length === 0 ? "je_pense" : "je_suis"} />
            <input type="hidden" name="retour" value={here} />
            <label>
              {entries.length === 0 ? "Ma première réflexion" : `Version ${entries.length + 1}`}
              <textarea name="texte" id="texte" maxLength={8000} placeholder="Nuancer, compléter, objecter à ma propre pensée…" style={{ minHeight: 130 }} />
              <span className="hint">Les versions précédentes restent intactes.</span>
            </label>
            <div className="row"><button className="btn primary" type="submit">Enregistrer une nouvelle version</button></div>
          </form>
          {entries.length > 2 && (
            <details>
              <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>Toutes mes versions ({entries.length})</summary>
              <div className="stack" style={{ marginTop: 12 }}>
                {entries.map((e) => (
                  <article className="version" key={e.id}>
                    <div className="meta"><span>Version {e.version}</span><span>{formatTime(e.createdAt)}</span></div>
                    <p>{e.body}</p>
                  </article>
                ))}
              </div>
            </details>
          )}
        </div>
        <aside className="side">
          <div className="stack" style={{ gap: 10 }}>
            <span className="step-label" style={{ color: "var(--nuit)" }}>La discussion du jour</span>
            <p className="charte">« Toutes les idées peuvent être discutées. Toutes les personnes doivent être respectées. »</p>
            <p className="pending">La discussion entre lecteurs ouvrira prochainement. Votre carnet reste privé : rien n&apos;y sera publié sans votre choix explicite.</p>
          </div>
          <AccessLine access={access} />
          <Support />
        </aside>
      </div>
      <SiteFoot />
    </main>
  );
}
