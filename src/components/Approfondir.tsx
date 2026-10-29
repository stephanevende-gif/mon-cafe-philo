import { db } from "@/db";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDayLong } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { getSheetDetails } from "@/lib/sheets";
import { Steps } from "./Steps";
import { Question } from "./Question";
import { AccessEnded } from "./AccessEnded";
import { SiteFoot } from "./SiteFoot";

// Page « Pour aller plus loin » : deux articles de presse qui prennent chacun une branche de l'alternative,
// puis les philosophes à lire et la bibliographie de l'auteur aux Éditions M-Éditer.
export async function Approfondir({ ctx }: { ctx: JourneyContext }) {
  const here = `${ctx.base}/approfondir`;
  await requireUser(here);
  const access = await currentAccess();
  if (!access?.active || !ctx.sheet) {
    return (
      <main className="page">
        <Steps base={ctx.base} current="suis" />
        {!access?.active ? <AccessEnded /> : <p className="notice" style={{ marginTop: 24 }}>La question du jour est en préparation.</p>}
      </main>
    );
  }
  const articles = ctx.sheet.pressArticles ?? [];
  const authorBooks = ctx.sheet.authorBooks ?? [];
  const author = authorBooks.length ? ((await getSheetDetails(db, ctx.sheet)).short?.speaker ?? null) : null;
  const empty = !articles.length && !ctx.sheet.readings?.length && !(author && authorBooks.length);

  return (
    <main className="page">
      <Steps base={ctx.base} current="suis" />
      <div className="stack-lg approfondir" style={{ marginTop: 24 }}>
        <div className="stack" style={{ gap: 8 }}>
          <span className="step-label">Pour aller plus loin</span>
          <h1 className="recall"><Question text={ctx.sheet.question} /></h1>
          <a className="small" href={`${ctx.base}/je-suis`}>← Revenir à mon carnet</a>
        </div>
        {empty && <p className="muted">Les lectures de cette question sont en préparation.</p>}
        {articles.length > 0 && (
          <section className="lectures articles" aria-labelledby="articles-titre">
            <span className="step-label">Deux articles en débat</span>
            <h2 id="articles-titre" className="invite">Deux articles qui choisissent chacun leur camp</h2>
            <p className="muted">
              Chacun défend l&apos;une des deux réponses de l&apos;alternative. Lisez-les en vous demandant ce que chacun ne voit pas :
              en choisissant un seul camp, ils se heurtent au problème sans le poser.
            </p>
            <ol>
              {articles.map((a) => (
                <li key={a.url}>
                  <div className="texte">
                    <span className="position">{a.side}</span>
                    <cite><a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a></cite>
                    <span className="partie">
                      {a.source}
                      {a.author ? `, ${a.author}` : ""}
                      {a.date ? `, ${formatDayLong(a.date)}` : ""}
                    </span>
                    <p>{a.description}</p>
                    <a className="voir" href={a.url} target="_blank" rel="noopener noreferrer">Lire l&apos;article sur {a.source} →</a>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
        {!!ctx.sheet.readings?.length && (
          <section className="lectures" aria-labelledby="lectures-titre">
            <span className="step-label">Les philosophes</span>
            <h2 id="lectures-titre" className="invite">Quels philosophes lire pour approfondir la question&nbsp;?</h2>
            <ol>
              {ctx.sheet.readings.map((r) => (
                <li key={r.philosopher + r.book} className={r.cover ? "avec-couverture" : undefined}>
                  {r.cover && <img className="couverture" src={r.cover} alt={`Couverture de ${r.book}, ${r.philosopher}`} />}
                  <div className="texte">
                    <span className="ph">{r.philosopher}</span>
                    <cite>{r.book}</cite>
                    {r.part && <span className="partie">{r.part}</span>}
                    <p>{r.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
        {author && authorBooks.length > 0 && (
          <section className="lectures bibliographie" aria-labelledby="bibliographie-titre">
            <span className="step-label">Aux Éditions M-Éditer</span>
            <h2 id="bibliographie-titre" className="invite">Bibliographie de {author.fullName}</h2>
            <ol>
              {authorBooks.map((b) => (
                <li key={b.url} className={b.cover ? "avec-couverture" : undefined}>
                  {b.cover && (
                    <a href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`${b.title}, sur le site des Éditions M-Éditer`}>
                      <img className="couverture" src={b.cover} alt={`Couverture de ${b.title}, ${author.fullName}`} />
                    </a>
                  )}
                  <div className="texte">
                    <cite><a href={b.url} target="_blank" rel="noopener noreferrer">{b.title}</a></cite>
                    {b.description && <p>{b.description}</p>}
                    <a className="voir" href={b.url} target="_blank" rel="noopener noreferrer">Voir le livre sur le site des Éditions →</a>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      <SiteFoot />
    </main>
  );
}
