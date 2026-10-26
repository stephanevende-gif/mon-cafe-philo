import Link from "next/link";
import { cleanTitle } from "@/lib/youtube";
import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDuration } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { authenticityConfirmed, getSheetDetails } from "@/lib/sheets";
import { Steps } from "./Steps";
import { Question } from "./Question";
import { YouTubePlayer } from "./YouTubePlayer";
import { AccessEnded } from "./AccessEnded";
import { SiteFoot } from "./SiteFoot";

export async function Donc({ ctx }: { ctx: JourneyContext }) {
  await requireUser(`${ctx.base}/donc`);
  const access = await currentAccess();
  if (!access?.active || !ctx.sheet) {
    return (
      <main className="page">
        <Steps base={ctx.base} current="donc" />
        {!access?.active ? <AccessEnded /> : <p className="notice" style={{ marginTop: 24 }}>La question du jour est en préparation.</p>}
      </main>
    );
  }
  const d = await getSheetDetails(db, ctx.sheet);
  const speaker = d.short?.speaker ?? d.lecture?.speaker ?? null;
  const authentic = authenticityConfirmed(d);

  return (
    <main className="page">
      <Steps base={ctx.base} current="donc" />
      <div className="donc" style={{ marginTop: 24 }}>
        <div className="head stack" style={{ gap: 8 }}>
          <span className="step-label">Donc ?</span>
          <h1 className="recall"><Question text={d.sheet.question} /></h1>
        </div>

        <div className="synth">
          <span className="eyebrow">Une piste en deux phrases</span>
          {d.sheet.synthesis ? (
            <>
              <p>{d.sheet.synthesis}</p>
              <small>
                Synthèse éditoriale des Éditions M-Éditer{speaker ? ", fidèle à l'intervention ci-dessous" : ""}. Ce n&apos;est pas une citation
                de l&apos;intervenant.
              </small>
            </>
          ) : (
            <p className="pending">La synthèse de cette question est en cours de rédaction.</p>
          )}
        </div>

        {speaker && (
          <div className="speaker">
            <div className="band" aria-hidden={!speaker.photoUrl}>
              {speaker.photoUrl ? <img src={speaker.photoUrl} alt={`Portrait de ${speaker.fullName}`} /> : <span>{speaker.fullName.charAt(0)}</span>}
            </div>
            <div className="who">
              <span className="nm">{speaker.fullName}</span>
              <span className="q">{speaker.qualification}</span>
              {speaker.verifiedAt && <span className="verified">✓ Identité et qualification vérifiées</span>}
            </div>
          </div>
        )}

        <div className="medias">
          {d.short && (
            <div className="media">
              <div className="kind"><span>Short</span><span>&lt; 3 min</span></div>
              <YouTubePlayer youtubeId={d.short.youtubeId} title={cleanTitle(d.short.title)} vertical duration={formatDuration(d.short.durationSeconds)} />
              <span className="ttl">{cleanTitle(d.short.title)}</span>
            </div>
          )}
          {d.lecture ? (
            <div className="media">
              <div className="kind"><span>Conférence</span><span>&gt; 3 min</span></div>
              <YouTubePlayer youtubeId={d.lecture.youtubeId} title={cleanTitle(d.lecture.title)} duration={formatDuration(d.lecture.durationSeconds)} />
              <span className="ttl">{cleanTitle(d.lecture.title)}</span>
            </div>
          ) : d.short ? (
            <p className="pending">La conférence de cet intervenant n&apos;est pas encore identifiée.</p>
          ) : null}
        </div>

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
