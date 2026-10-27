import Link from "next/link";
import { cleanTitle } from "@/lib/youtube";
import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDuration, formatTime } from "@/lib/dates";
import { listEntries } from "@/lib/notebook";
import { saveReflection } from "@/app/actions/notebook";
import type { JourneyContext } from "@/lib/journey";
import { authenticityConfirmed, getSheetDetails } from "@/lib/sheets";
import { Steps } from "./Steps";
import { Question } from "./Question";
import { YouTubePlayer } from "./YouTubePlayer";
import { AccessEnded } from "./AccessEnded";
import { SiteFoot } from "./SiteFoot";
import { Notice } from "./Notice";

export async function Donc({ ctx, message }: { ctx: JourneyContext; message?: string }) {
  const here = `${ctx.base}/donc`;
  const user = await requireUser(here);
  const access = await currentAccess();
  if (!access?.active || !ctx.sheet) {
    return (
      <main className="page">
        <Steps base={ctx.base} current="donc" />
        {!access?.active ? <AccessEnded /> : <p className="notice" style={{ marginTop: 24 }}>La question du jour est en préparation.</p>}
      </main>
    );
  }
  const [d, entries] = await Promise.all([getSheetDetails(db, ctx.sheet), listEntries(db, user.id, ctx.sheet.id)]);
  const speaker = d.short?.speaker ?? d.lecture?.speaker ?? null;
  const authentic = authenticityConfirmed(d);
  // La photo de l'auteur, gardée dans l'application ; à défaut, l'image YouTube d'origine (seule image externe autorisée par le site).
  const picture = speaker?.portrait ?? (speaker?.photoUrl?.startsWith("https://i.ytimg.com/") ? speaker.photoUrl : null);

  return (
    <main className="page">
      <Steps base={ctx.base} current="donc" />
      <div className="donc" style={{ marginTop: 24 }}>
        <div className="head stack" style={{ gap: 8 }}>
          <span className="step-label">Donc ?</span>
          <h1 className="recall"><Question text={d.sheet.question} /></h1>
        </div>

        <div className="synth">
          <span className="eyebrow">Approche de la question par {speaker ? speaker.fullName : "l'auteur"}</span>
          {d.sheet.synthesis ? (
            <>
              <p>{d.sheet.synthesis}</p>
              <small>
                Approche de l&apos;auteur reformulée par les Éditions M-Éditer{speaker ? ", fidèle à l'intervention ci-dessous" : ""}. Ce n&apos;est pas une
                citation de l&apos;intervenant.
              </small>
            </>
          ) : (
            <p className="pending">L&apos;approche de la question par l&apos;auteur est en cours de rédaction.</p>
          )}
        </div>

        {speaker && (
          <div className="speaker">
            <div className={`band${speaker.portrait ? " photo" : ""}`} aria-hidden={!picture}>
              {picture ? (
                <img src={picture} alt={`Portrait de ${speaker.fullName}`} />
              ) : (
                <span>{speaker.fullName.charAt(0)}</span>
              )}
            </div>
            <div className="who">
              <span className="nm">{speaker.fullName}</span>
              <span className="q">{speaker.qualification}</span>
              {speaker.profileUrl && (
                <a className="profile" href={speaker.profileUrl} target="_blank" rel="noopener noreferrer">
                  En savoir plus sur l&apos;auteur →
                </a>
              )}
              {speaker.verifiedAt && <span className="verified">✓ Identité et qualification vérifiées</span>}
            </div>
          </div>
        )}

        {d.short && (
          <div className="media ecouter">
            <div className="kind"><span>Écouter l&apos;auteur sur cette question</span></div>
            <YouTubePlayer youtubeId={d.short.youtubeId} title={cleanTitle(d.short.title)} vertical duration={formatDuration(d.short.durationSeconds)} />
            <span className="ttl">{cleanTitle(d.short.title)}</span>
          </div>
        )}

        <div className="reflexion stack">
          {entries.length === 0 ? (
            <>
              <p className="invite">Et vous, qu&apos;en pensez-vous&nbsp;?</p>
              <p className="muted">Commencez par écrire votre première réflexion, avant d&apos;écouter l&apos;auteur.</p>
              <div className="row"><Link className="btn" href={ctx.base || "/"}>Écrire ma première réflexion : Je pense →</Link></div>
            </>
          ) : entries.length === 1 ? (
            <>
              <p className="invite">Après l&apos;écoute de l&apos;auteur, qu&apos;en pensez-vous maintenant&nbsp;?</p>
              <div className="version">
                <div className="meta"><span>Ma première réflexion</span><span>{formatTime(entries[0].createdAt)}</span></div>
                <p>{entries[0].body}</p>
              </div>
              <Notice code={message} />
              <form action={saveReflection} className="stack">
                <input type="hidden" name="fiche" value={d.sheet.id} />
                <input type="hidden" name="etape" value="donc" />
                <input type="hidden" name="retour" value={here} />
                <label>
                  Version 2
                  <textarea name="texte" id="texte" maxLength={8000} placeholder="Nuancer, compléter, objecter à ma propre pensée…" style={{ minHeight: 130 }} />
                  <span className="hint">Votre première réflexion reste intacte.</span>
                </label>
                <div className="row"><button className="btn primary" type="submit">Enregistrer ma version 2</button></div>
              </form>
            </>
          ) : (
            <>
              <Notice code={message} />
              <div className="version">
                <div className="meta"><span>Ma version 2 · Donc ?</span><span>{formatTime(entries[1].createdAt)}</span></div>
                <p>{entries[1].body}</p>
              </div>
            </>
          )}
        </div>

        {d.lecture ? (
          <div className="media loin">
            <div className="kind"><span>Aller plus loin avec l&apos;auteur</span></div>
            <YouTubePlayer youtubeId={d.lecture.youtubeId} title={cleanTitle(d.lecture.title)} duration={formatDuration(d.lecture.durationSeconds)} />
            <span className="ttl">{cleanTitle(d.lecture.title)}</span>
          </div>
        ) : d.short ? (
          <p className="pending loin">La vidéo longue de cet auteur n&apos;est pas encore identifiée.</p>
        ) : null}

        {authentic && (
          <div className="seal-slot">
            <div className="seal">
              <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" style={{ flex: "none" }}>
                <circle cx="9" cy="9" r="8" fill="none" stroke="#943E37" strokeWidth="1.4" />
                <path d="M5 9.3 7.8 12 13 6.5" fill="none" stroke="#943E37" strokeWidth="1.6" />
              </svg>
              <div>
                <b>Intervention humaine authentique — sélection éditoriale M-Éditer</b>
                <span>Source : chaîne YouTube des Éditions M-Éditer.{d.sheet.sources ? ` ${d.sheet.sources}` : ""}</span>
              </div>
            </div>
          </div>
        )}

        {d.book && (
          <div className="book">
            <span className="eyebrow" style={{ gridColumn: "1 / -1" }}>Pour aller plus loin · un livre M-Éditer</span>
            {d.book.coverUrl && <img className="cover" src={d.book.coverUrl} alt={`Couverture de ${d.book.title}, ${d.book.author}`} />}
            <div className="info">
              <span className="bt">{d.book.title}</span>
              <span>{d.book.author}</span>
              {d.book.subtitle && <p className="bp">{d.book.subtitle}</p>}
              {d.book.summary && <p className="bp">{d.book.summary}</p>}
              {d.book.catalogueUrl && (
                <a className="btn" href={d.book.catalogueUrl} target="_blank" rel="noopener noreferrer">
                  Voir le livre sur la boutique →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 32 }}>
        <Link className="btn primary" href={`${ctx.base}/je-suis`}>Revenir à ma réflexion : Je suis →</Link>
      </div>
      <SiteFoot />
    </main>
  );
}
