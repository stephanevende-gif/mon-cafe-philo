import Link from "next/link";
import { and, eq, isNotNull, not, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { speakers, videos, type Sheet, type User } from "@/db/schema";
import { PAID_DAYS, PRICE_CENTS, TRIAL_DAYS } from "@/lib/access";
import { STUDENT_PATTERN } from "@/lib/student";
import type { JourneyContext } from "@/lib/journey";
import { Question } from "./Question";
import { SiteFoot } from "./SiteFoot";

// Page d'accueil, pour tous, avant la question du jour : « Je pense. Donc ? Je suis. » et l'adage de l'application,
// sur un conférencier qui parle en fond, sans le son ; puis ce qu'est l'application. Un lecteur connecté y trouve un accès direct
// à la question et à ses fiches ; un visiteur, l'essai gratuit.

const firstSentence = (s: string) => s.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? s;

const STEPS = [
  {
    label: "Je pense",
    title: "Un sujet de réflexion",
    text: "Vous découvrez la question du jour et notez votre première réflexion sur le sujet.",
  },
  {
    label: "Donc ?",
    title: "Une discussion argumentée",
    text: "Une analyse du sujet s'engage alors en compagnie d'un philosophe contemporain.",
  },
  {
    label: "Je suis",
    title: "Une réponse réfléchie",
    text: "Le problème que travaille la question se découvre. Votre solution devrait permettre de le surmonter, que vous pourrez mettre en perspective.",
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

const thumb = (youtubeId: string) => `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`;

// Intervenants présentés, renouvelés chaque jour : seulement ceux dont la présentation est publiée, avec environ
// un tiers d'intervenantes.
async function faces(day: string) {
  const base = and(
    isNotNull(speakers.portrait),
    not(like(speakers.qualification, "Présentation à compléter%")),
    sql`${speakers.qualification} !~* ${STUDENT_PATTERN}`,
  );
  const pick = (cond: ReturnType<typeof and>, n: number) =>
    db
      .select({ id: speakers.id, fullName: speakers.fullName, qualification: speakers.qualification, portrait: speakers.portrait })
      .from(speakers)
      .where(cond)
      .orderBy(sql`md5(${speakers.id}::text || ${day})`)
      .limit(n);
  const [women, others] = await Promise.all([
    pick(and(base, eq(speakers.gender, "femme")), 4),
    pick(and(base, sql`${speakers.gender} is distinct from 'femme'`), 8),
  ]);
  // Une intervenante toutes les trois places.
  const out: typeof others = [];
  while (women.length || others.length) {
    if (others.length) out.push(others.shift()!);
    if (others.length) out.push(others.shift()!);
    if (women.length) out.push(women.shift()!);
  }
  return out;
}

export async function Accueil({ ctx, user, tests = [] }: { ctx: JourneyContext; user: User | null; tests?: Sheet[] }) {
  const { sheet } = ctx;
  const [people, guest] = await Promise.all([
    faces(ctx.day),
    sheet?.shortVideoId
      ? db
          .select({ fullName: speakers.fullName, qualification: speakers.qualification, portrait: speakers.portrait, youtubeId: videos.youtubeId })
          .from(videos)
          .leftJoin(speakers, eq(speakers.id, videos.speakerId))
          .where(eq(videos.id, sheet.shortVideoId))
          .then((r) => r[0] ?? null)
      : null,
  ]);
  const lecture = sheet?.lectureVideoId
    ? await db.select({ youtubeId: videos.youtubeId }).from(videos).where(eq(videos.id, sheet.lectureVideoId)).then((r) => r[0] ?? null)
    : null;
  const image = lecture?.youtubeId ?? guest?.youtubeId;

  return (
    <main className="page accueil">
      <section className="seuil">
        {image && <img className="fond" src={thumb(image)} alt="" />}
        {image && (
          // Un conférencier de la chaîne parle en fond, sans le son : lecture automatique, en boucle, sans commandes.
          <iframe
            className="fond video"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(image)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(image)}&start=60&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&modestbranding=1`}
            title="Conférencier des Éditions M-Éditer, sans le son"
            aria-hidden="true"
            tabIndex={-1}
            allow="autoplay; encrypted-media"
          />
        )}
        <div className="voile">
          <span className="eyebrow">{tests.length ? "Mon café philo · version de test" : "Mon café philo"}</span>
          <p className="devise">
            <span>Je pense.</span> <span>Donc&nbsp;?</span> <span>Je suis.</span>
          </p>
          <blockquote className="adage">
            <p>« On ne peut apprendre aucune philosophie&nbsp;; on ne peut qu’apprendre à philosopher. »</p>
            <footer>Kant, <cite>Logique</cite>, Introduction, III</footer>
          </blockquote>
          <p className="pitch">
            Proposée par les Éditions M-Éditer, cette application donne vie à l’adage de Kant&nbsp;: chaque jour, un sujet de
            réflexion, un dialogue argumenté avec un philosophe contemporain et, pour finir, votre propre réponse.
          </p>
          {tests.length > 0 ? (
            <div className="choix-test" id="questions-test">
              <span className="eyebrow">Version de test : travaillez l&apos;une ou l&apos;autre de ces questions</span>
              <ol>
                {tests.map((t, i) => {
                  const href = i === 0 ? "/je-pense" : user ? `/mes-fiches/${t.id}` : "/inscription";
                  return (
                    <li key={t.id}>
                      <Link href={href}>
                        <span className="n">Question {i + 1}</span>
                        <span className="qt"><Question text={t.question} /></span>
                        <span className="go">J&apos;y réfléchis →</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          <div className="row">
            {!tests.length && <Link className="btn clair" href="/je-pense">Découvrir le sujet du jour →</Link>}
            {user ? (
              <Link className="btn contour" href="/mes-fiches">Mes fiches</Link>
            ) : (
              <Link className="btn contour" href="/inscription">Commencer gratuitement</Link>
            )}
          </div>
        </div>
      </section>

      <section className="hero">
        <h1 className={user ? "salut" : undefined}>{user ? `Bonjour ${user.displayName}.` : "Chaque jour, une question. Chaque jour, l'exercice de penser."}</h1>
        <p className="lead">
          Cinq minutes par jour pour réfléchir à une vraie question philosophique, avec des philosophes et des
          universitaires en chair et en os.
        </p>
        {!user && <p className="small muted">{TRIAL_DAYS} jours gratuits, sans carte bancaire.</p>}
      </section>


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
                {p.portrait && <img src={p.portrait} alt="" width={72} height={72} loading="lazy" />}
                <div>
                  <b>{p.fullName}</b>
                  <span>{firstSentence(p.qualification)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!user && <section className="tarif">
        <h2>Essayez librement</h2>
        <p>
          <b>{TRIAL_DAYS} jours gratuits</b>, sans carte bancaire. Ensuite, <b>{PRICE_CENTS / 100} € pour {PAID_DAYS} jours</b>,
          sans renouvellement automatique.
        </p>
        <div className="row">
          <Link className="btn primary" href="/inscription">Commencer gratuitement</Link>
          <Link className="btn" href="/connexion">J&apos;ai déjà un compte</Link>
        </div>
      </section>}

      <SiteFoot />
    </main>
  );
}
