import Link from "next/link";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { speakers } from "@/db/schema";
import { PAID_DAYS, PRICE_CENTS, TRIAL_DAYS } from "@/lib/access";
import { formatDayLong } from "@/lib/dates";
import type { JourneyContext } from "@/lib/journey";
import { Question } from "./Question";
import { SiteFoot } from "./SiteFoot";

// Page d'accueil des visiteurs non connectés : ce qu'est l'application, avant la question du jour.
// Les lecteurs connectés arrivent directement sur la question.

const firstSentence = (s: string) => s.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? s;

const STEPS = [
  {
    label: "Je pense",
    title: "La question",
    text: "Vous lisez la question du jour et notez votre première réflexion, avant de lire quoi que ce soit d'autre.",
  },
  {
    label: "Donc ?",
    title: "La piste",
    text: "Le problème que pose la question, puis un philosophe qui l'éclaire : un extrait vidéo d'une minute et sa conférence complète.",
  },
  {
    label: "Je suis",
    title: "Mon carnet",
    text: "Vous revenez sur votre pensée, et trouvez les livres et les passages précis pour aller plus loin. Votre carnet garde tout.",
  },
];

const AUDIENCES = [
  {
    title: "Élèves",
    text: "S'exercer chaque jour à faire d'une question un problème, comme au bac, avec des auteurs et des références précises.",
  },
  {
    title: "Professeurs",
    text: "Une question, une vidéo courte et des lectures sourcées, pour ouvrir un cours ou lancer une discussion.",
  },
  {
    title: "Curieux de philosophie",
    text: "Un rendez-vous de cinq minutes pour penser par soi-même, en compagnie de philosophes qui argumentent.",
  },
];

export async function Accueil({ ctx }: { ctx: JourneyContext }) {
  const people = await db
    .select({ id: speakers.id, fullName: speakers.fullName, qualification: speakers.qualification, portrait: speakers.portrait })
    .from(speakers)
    .where(isNotNull(speakers.portrait))
    .limit(6);
  const { sheet } = ctx;

  return (
    <main className="page accueil">
      <div className="ouverture">
        <section className="hero">
          <span className="step-label">Mon café philo</span>
          <h1>Chaque jour, une question. Chaque jour, l&apos;exercice de penser.</h1>
          <p className="lead">
            Cinq minutes par jour pour réfléchir à une vraie question philosophique, avec des philosophes et des
            universitaires en chair et en os.
          </p>
          <div className="row">
            <Link className="btn primary" href="/je-pense">Découvrir la question du jour</Link>
            <Link className="btn" href="/inscription">Commencer gratuitement</Link>
          </div>
          <p className="small muted">{TRIAL_DAYS} jours gratuits, sans carte bancaire.</p>
        </section>

        {sheet && (
          <section className="du-jour">
            <span className="eyebrow">Question du {formatDayLong(ctx.day)}</span>
            <p className="q"><Question text={sheet.question} /></p>
            <Link className="btn primary" href="/je-pense">J&apos;y réfléchis →</Link>
          </section>
        )}
      </div>

      <section className="stack-lg">
        <h2>Trois temps, chaque jour</h2>
        <ol className="temps">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <span className="n">{i + 1}</span>
              <span className="step-label">{s.label}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="stack-lg">
        <h2>Pour qui ?</h2>
        <div className="publics">
          {AUDIENCES.map((a) => (
            <div key={a.title}>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="garantie">
        <h2>Des philosophes en chair et en os. Une pensée vivante.</h2>
        <p>
          Chaque piste repose sur la conférence d&apos;un auteur réel et sur des livres précis. Aucune citation n&apos;est
          inventée. Une exigence garantie par les Éditions M-Éditer depuis 2003.
        </p>
        {people.length > 0 && (
          <ul className="intervenants">
            {people.map((p) => (
              <li key={p.id}>
                {p.portrait && <img src={p.portrait} alt="" width={72} height={72} />}
                <div>
                  <b>{p.fullName}</b>
                  <span>{firstSentence(p.qualification)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarif">
        <h2>Essayez librement</h2>
        <p>
          <b>{TRIAL_DAYS} jours gratuits</b>, sans carte bancaire. Ensuite, <b>{PRICE_CENTS / 100} € pour {PAID_DAYS} jours</b>,
          sans renouvellement automatique.
        </p>
        <div className="row">
          <Link className="btn primary" href="/inscription">Commencer gratuitement</Link>
          <Link className="btn" href="/connexion">J&apos;ai déjà un compte</Link>
        </div>
      </section>

      <SiteFoot />
    </main>
  );
}
