import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { listEntries } from "@/lib/notebook";
import { getNote, isEmptyNote } from "@/lib/listening-notes";
import { saveProblemAttempt, saveReflection } from "@/app/actions/notebook";
import { Steps } from "./Steps";
import { Question } from "./Question";
import { Support } from "./Support";
import { AccessLine } from "./AccessLine";
import { AccessEnded } from "./AccessEnded";
import { Notice } from "./Notice";
import { SiteFoot } from "./SiteFoot";
import { Dictionnaire } from "./Dictionnaire";

const STAGE_LABEL = { je_pense: "Je pense", donc: "Donc ?", je_suis: "Je suis" } as const;

// Ce que la page demande au lecteur selon le nombre de versions déjà écrites.
function nextPrompt(count: number, helpSolution: boolean): { invite?: string; note?: string; label: string; placeholder: string } {
  const label = `Version ${count + 1}`;
  if (count === 0) return { label: "Ma première réflexion", placeholder: "Ce que je pense de cette question…" };
  if (count === 1)
    return { invite: "Après l'écoute de l'auteur, qu'en pensez-vous maintenant ?", label, placeholder: "Nuancer, compléter, objecter à ma propre pensée…" };
  if (count === 2 && helpSolution)
    return {
      invite: "À vous de jouer : quelle solution proposeriez-vous ?",
      note: "Il n'y a pas de réponse attendue. Votre solution vous appartient : elle reste dans votre carnet, et vous pourrez bientôt la partager pour en débattre avec d'autres lecteurs.",
      label: `${label} : ma solution`,
      placeholder: "Pour tenir les deux exigences à la fois, je propose…",
    };
  if (count === 3)
    return { invite: "Qu'ai-je appris, et que vais-je en retenir ?", label: `${label} : ce que je retiens`, placeholder: "Ce que cette question m'a appris…" };
  return { label, placeholder: "Nuancer, compléter, objecter à ma propre pensée…" };
}

export async function JeSuis({ ctx, message, showProblem = false }: { ctx: JourneyContext; message?: string; showProblem?: boolean }) {
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
  const [entries, note] = await Promise.all([listEntries(db, user.id, ctx.sheet.id), getNote(db, user.id, ctx.sheet.id)]);
  const hasMore = !!(ctx.sheet.pressArticles?.length || ctx.sheet.readings?.length || ctx.sheet.authorBooks?.length);
  const shown = entries.length > 2 ? [entries[0], entries[entries.length - 1]] : entries;
  // À partir de la version 3, le lecteur est invité à proposer sa solution au problème posé par la question.
  const helpSolution = entries.length >= 2 && !!ctx.sheet.solutionQuestion;
  const prompt = nextPrompt(entries.length, helpSolution);
  const attempt = note?.probleme?.trim() || "";

  return (
    <main className="page">
      <Steps base={ctx.base} current="suis" />
      <div className="suis" style={{ marginTop: 24 }}>
        <div className="stack-lg">
          <div className="stack" style={{ gap: 8 }}>
            <span className="step-label">Je suis</span>
            <h1 className="recall"><Question text={ctx.sheet.question} /></h1>
            <span className="theme">Mon carnet · privé · <a href="/mes-fiches">toutes mes fiches</a></span>
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
            <section className="probleme" id="probleme" aria-labelledby="probleme-titre">
              <span className="step-label">Pour aller plus loin</span>
              <p className="principe">
                On ne philosophe pas vraiment tant que l&apos;on ne pose pas un problème, qu&apos;on ne l&apos;instruit pas et qu&apos;on ne s&apos;y confronte pas pour le
                surmonter, avec et pour les autres. Les solutions évidentes et les réponses sans analyse sont sources d&apos;erreur, et même de faute.
              </p>
              {!attempt && !showProblem ? (
                <div className="corps">
                  <h2 id="probleme-titre" className="invite">À vous : quel est le problème à surmonter&nbsp;?</h2>
                  <p>
                    Cherchez les deux exigences légitimes que la question met en tension, et le risque que l&apos;on court en ne
                    suivant que l&apos;une d&apos;elles. Vous pouvez partir de ce modèle :
                  </p>
                  <p className="modele">
                    Quelle attitude adopter (individuelle et collective) pour qu&apos;à la fois nous puissions, d&apos;une part, … pour gagner
                    en … sans courir le risque de …, et d&apos;autre part, garantir … sans courir le risque cette fois de … ?
                  </p>
                  <form action={saveProblemAttempt} className="stack">
                    <input type="hidden" name="fiche" value={ctx.sheet.id} />
                    <input type="hidden" name="retour" value={here} />
                    <label>
                      <span className="visually-hidden">Mon problème</span>
                      <textarea name="texte" id="probleme-texte" maxLength={4000} placeholder="Quelle attitude adopter (individuelle et collective) pour qu'à la fois nous puissions…" style={{ minHeight: 130 }} />
                      <span className="hint">Visible de vous seul</span>
                    </label>
                    <div className="row">
                      <button className="btn primary" type="submit">Enregistrer et découvrir le problème</button>
                      <a className="btn" href={`${here}?voir=probleme#probleme`}>Voir le problème sans m&apos;exercer</a>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="corps">
                  <h2 id="probleme-titre" className="invite">Quel est alors le problème à surmonter&nbsp;?</h2>
                  {attempt && (
                    <article className="version">
                      <div className="meta"><span>Mon problème</span></div>
                      <p style={{ whiteSpace: "pre-line" }}>{attempt}</p>
                    </article>
                  )}
                  {attempt && <span className="eyebrow">Le problème que pose la question</span>}
                  {ctx.sheet.problem && <p>{ctx.sheet.problem}</p>}
                  <p className="solution">{ctx.sheet.solutionQuestion}</p>
                </div>
              )}
            </section>
          )}
          {note && !isEmptyNote(note) && (
            <article className="version notes-relues">
              <div className="meta"><span>Mes notes d&apos;écoute · Donc ?</span></div>
              {note.these.trim() && <p><b>Thèse.</b> {note.these}</p>}
              {note.arguments.trim() && <p><b>Arguments.</b> {note.arguments}</p>}
              {note.exemples.trim() && <p><b>Exemples et objections.</b> {note.exemples}</p>}
            </article>
          )}
          {prompt.invite && <p className="invite">{prompt.invite}</p>}
          {prompt.note && <p className="muted" style={{ marginTop: -8 }}>{prompt.note}</p>}
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
          <Dictionnaire />
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
          {entries.length >= 1 && (
            <section className="imprimer">
              <span className="step-label">Ma fiche de travail</span>
              <p>
                Toutes vos versions, vos notes d&apos;écoute et le problème, réunis sur une seule page, toujours à jour : à imprimer,
                à enregistrer en PDF ou à télécharger pour Word.
              </p>
              <div className="row">
                <a className="btn primary" href={`${ctx.base}/fiche-de-travail`}>Imprimer ma fiche de travail</a>
                <a className="btn" href={`${ctx.base}/fiche-de-travail/word`} download>Télécharger en Word (.doc)</a>
              </div>
            </section>
          )}
          {hasMore && (
            <section className="vers-approfondir">
              <span className="step-label">Pour aller plus loin</span>
              <p>
                Deux articles de presse qui prennent chacun parti, des philosophes à lire et les livres de l&apos;auteur : de quoi
                approfondir la question, et voir pourquoi une seule branche de l&apos;alternative ne suffit pas.
              </p>
              <a className="btn primary" href={`${ctx.base}/approfondir`}>Approfondir la question →</a>
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
