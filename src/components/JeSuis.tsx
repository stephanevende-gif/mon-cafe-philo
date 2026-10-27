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

const STAGE_LABEL = { je_pense: "Je pense", donc: "Donc ?", je_suis: "Je suis" } as const;

// Ce que la page demande au lecteur selon le nombre de versions déjà écrites.
function nextPrompt(count: number, helpSolution: boolean): { invite?: string; label: string; placeholder: string } {
  const label = `Version ${count + 1}`;
  if (count === 0) return { label: "Ma première réflexion", placeholder: "Ce que je pense de cette question…" };
  if (count === 1)
    return { invite: "Après l'écoute de l'auteur, qu'en pensez-vous maintenant ?", label, placeholder: "Nuancer, compléter, objecter à ma propre pensée…" };
  if (count === 2 && helpSolution) return { invite: "Quelle solution proposeriez-vous ?", label: `${label} : ma solution`, placeholder: "La solution que je propose…" };
  if (count === 3)
    return { invite: "Qu'ai-je appris, et que vais-je en retenir ?", label: `${label} : ce que je retiens`, placeholder: "Ce que cette question m'a appris…" };
  return { label, placeholder: "Nuancer, compléter, objecter à ma propre pensée…" };
}

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
  // À partir de la version 3, le lecteur est invité à proposer sa solution au problème posé par la question.
  const helpSolution = entries.length >= 2 && !!ctx.sheet.solutionQuestion;
  const prompt = nextPrompt(entries.length, helpSolution);

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
          {helpSolution && (
            <section className="probleme" aria-labelledby="probleme-titre">
              <span className="step-label">Pour aller plus loin</span>
              <p className="principe">
                On ne philosophe pas vraiment tant que l&apos;on ne pose pas un problème, qu&apos;on ne l&apos;instruit pas et qu&apos;on ne s&apos;y confronte pas pour le
                surmonter, avec et pour les autres. Les solutions évidentes et les réponses sans analyse sont sources d&apos;erreur, et même de faute.
              </p>
              <div className="corps">
                <h2 id="probleme-titre" className="invite">Quel est alors le problème à surmonter&nbsp;?</h2>
                {ctx.sheet.problem && <p>{ctx.sheet.problem}</p>}
                <p className="solution">{ctx.sheet.solutionQuestion}</p>
              </div>
            </section>
          )}
          {prompt.invite && <p className="invite">{prompt.invite}</p>}
          <form action={saveReflection} className="stack">
            <input type="hidden" name="fiche" value={ctx.sheet.id} />
            <input type="hidden" name="etape" value={entries.length === 0 ? "je_pense" : entries.length === 1 ? "donc" : "je_suis"} />
            <input type="hidden" name="retour" value={here} />
            <label>
              {prompt.label}
              <textarea name="texte" id="texte" maxLength={8000} placeholder={prompt.placeholder} style={{ minHeight: 130 }} />
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
          {!!ctx.sheet.readings?.length && (
            <section className="lectures" aria-labelledby="lectures-titre">
              <span className="step-label">Pour approfondir</span>
              <h2 id="lectures-titre" className="invite">Quels philosophes lire pour approfondir la question&nbsp;?</h2>
              <ol>
                {ctx.sheet.readings.map((r) => (
                  <li key={r.philosopher + r.book} className={r.cover ? "avec-couverture" : undefined}>
                    {r.cover && <img className="couverture" src={r.cover} alt={`Couverture de ${r.book}, ${r.philosopher}`} />}
                    <div className="texte">
                      <span className="ph">{r.philosopher}</span>
                      <cite>{r.book}</cite>
                      <p>{r.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
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
