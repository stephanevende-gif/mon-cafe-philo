import Link from "next/link";
import { and, eq, isNotNull, not, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { speakers, videos, type Sheet, type User } from "@/db/schema";
import { PAID_DAYS, PRICE_CENTS, TRIAL_DAYS } from "@/lib/access";
import { formatDayLong } from "@/lib/dates";
import { STUDENT_PATTERN } from "@/lib/student";
import type { JourneyContext } from "@/lib/journey";
import { Question } from "./Question";
import { SiteFoot } from "./SiteFoot";

// Page d'accueil, pour tous, avant la question du jour : la question en grand, sur l'image de la conférence qui
// l'éclaire, avec son intervenant ; puis ce qu'est l'application. Un lecteur connecté y trouve un accès direct
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
  const bio = guest?.qualification && !guest.qualification.startsWith("Présentation à compléter") ? firstSentence(guest.qualification) : null;

  return (
    <main className="page accueil">
      <section className="seuil">
        {image && <img className="fond" src={thumb(image)} alt="" />}
        <div className="voile">
          <span className="eyebrow">{tests.length ? "Version de test" : `Question du ${formatDayLong(ctx.day)}`}</span>
          {sheet ? (
            <p className="q"><Question text={sheet.question} /></p>
          ) : (
            <p className="q">Chaque jour, une question. Chaque jour, l&apos;exercice de penser.</p>
          )}
          {guest?.fullName && (
            <div className="invite-du-jour">
              {guest.portrait && <img src={guest.portrait} alt="" width={56} height={56} />}
              <div>
                <span>Avec {guest.fullName}</span>
                {bio && <small>{bio}</small>}
              </div>
            </div>
          )}
          <div className="row">
            <Link className="btn clair" href="/je-pense">J&apos;y réfléchis →</Link>
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

      {tests.length > 0 && (
        <section className="stack-lg questions-test" id="questions-test">
          <div className="stack">
            <h2>{tests.length > 1 ? `Les ${tests.length} questions à essayer` : "La question à essayer"}</h2>
            <p className="muted">
              Cette version de test est ouverte à quelques lecteurs. Travaillez chaque question dans l&apos;ordre des trois temps, puis
              dites-nous ce que vous en pensez.
            </p>
          </div>
          <ol className="liste-fiches">
            {tests.map((t, i) => {
              const href = i === 0 ? "/je-pense" : user ? `/mes-fiches/${t.id}` : "/inscription";
              return (
                <li key={t.id}>
                  <span className="small muted">Question {i + 1} · {t.theme}</span>
                  <Link className="q" href={href}><Question text={t.question} /></Link>
                  <div className="row"><Link className="btn" href={href}>J&apos;y réfléchis →</Link></div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

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
