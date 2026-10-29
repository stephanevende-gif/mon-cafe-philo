import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { books, sheets, speakers, videos } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { chooseShortPoster, deleteSheet, draftSheetsWithAi, findArticlesWithAi, saveSheet } from "@/app/actions/admin";
import { aiEnabled } from "@/lib/ai";
import { formatDate } from "@/lib/dates";
import { cleanTitle } from "@/lib/youtube";
import { NOTIONS, notionsOf } from "@/lib/notions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string; jour?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "nouvelle";
  const sheet = isNew ? null : /^[0-9a-f-]{36}$/.test(id) ? await db.query.sheets.findFirst({ where: eq(sheets.id, id) }) : null;
  if (!isNew && !sheet) notFound();
  const [vids, bks] = await Promise.all([
    db.select({ id: videos.id, title: videos.title, kind: videos.kind, speaker: speakers.fullName, verified: speakers.verifiedAt })
      .from(videos).leftJoin(speakers, eq(speakers.id, videos.speakerId)).orderBy(asc(videos.title)),
    db.select().from(books).orderBy(asc(books.title)),
  ]);
  const posterOf = async (vid: string | null | undefined) =>
    vid ? (await db.select({ id: videos.id, poster: videos.poster }).from(videos).where(eq(videos.id, vid)))[0] ?? null : null;
  const [shortPoster, lecturePoster] = await Promise.all([posterOf(sheet?.shortVideoId), posterOf(sheet?.lectureVideoId)]);
  const current = notionsOf(sheet?.theme ?? "");
  const label = (v: (typeof vids)[number]) => `${cleanTitle(v.title)}${v.speaker ? ` · ${v.speaker}${v.verified ? " ✓" : ""}` : ""}`;

  return (
    <div className="stack-lg narrow">
      <h1 className="page-title">{isNew ? "Nouvelle fiche" : "Modifier la fiche"}</h1>
      <Notice code={sp.message} />
      {sheet?.aiDrafted && (
        <p className="notice error" role="note">
          Titre, thème, question ou approche de l&apos;auteur proposés par un outil d&apos;IA à partir du titre et de la description YouTube. Vérifiez chaque formulation
          en regardant la vidéo avant de valider : l&apos;approche de l&apos;auteur reste une reformulation, jamais une citation.
        </p>
      )}
      {sheet && aiEnabled() && !sheet.aiDrafted && sheet.status !== "validee" && sheet.shortVideoId && (
        <form action={draftSheetsWithAi}>
          <input type="hidden" name="id" value={sheet.id} />
          <button className="btn" type="submit">Proposer titre, thème, question et approche avec l&apos;IA</button>
          <span className="hint"> Remplace le titre, le thème, la question et l&apos;approche actuels par un brouillon à relire.</span>
        </form>
      )}
      {sheet && aiEnabled() && (
        <form action={findArticlesWithAi}>
          <input type="hidden" name="id" value={sheet.id} />
          <button className="btn" type="submit">{sheet.pressArticles?.length ? "Chercher deux autres articles avec l'IA" : "Chercher deux articles avec l'IA"}</button>
          <span className="hint"> Presse et revues en ligne en accès libre ; environ une minute.</span>
        </form>
      )}
      {sheet?.replayOf && <p className="notice ok" role="note">Rediffusion automatique d&apos;une fiche déjà publiée.</p>}
      <form action={saveSheet} className="field-group">
        {sheet && <input type="hidden" name="id" value={sheet.id} />}
        <label>Jour de publication (facultatif)<input type="date" name="jour" id="jour" defaultValue={sheet?.day ?? sp.jour ?? ""} /><span className="hint">À laisser vide : chaque jour, une fiche validée est tirée au sort, jamais deux fois dans l&apos;année. Une date sert seulement à imposer une fiche un jour précis.</span></label>
        <label>Titre<input type="text" name="titre" id="titre" maxLength={200} defaultValue={sheet?.title ?? ""} placeholder="Interrogeons-nous sur…" /></label>
        <fieldset className="notions">
          <legend>Thèmes (trois au plus)</legend>
          {NOTIONS.map((n) => (
            <label className="check" key={n}>
              <input type="checkbox" name="notion" value={n} defaultChecked={current.includes(n)} />
              <span>{n}</span>
            </label>
          ))}
        </fieldset>
        <label>Question (sous forme d&apos;alternative : « … ou … ? »)<input type="text" name="question" id="question" required defaultValue={sheet?.question ?? ""} /></label>
        <label>
          Approche de la question par l&apos;auteur, en deux phrases
          <textarea name="synthese" id="synthese" defaultValue={sheet?.synthesis ?? ""} style={{ minHeight: 120 }} />
          <span className="hint">Approche de l&apos;auteur, reformulée fidèlement à partir de l&apos;intervention. Elle n&apos;est jamais présentée comme une citation de l&apos;intervenant.</span>
        </label>
        <label>
          Le problème à surmonter (page « Je suis »)
          <textarea name="probleme" id="probleme" maxLength={700} defaultValue={sheet?.problem ?? ""} style={{ minHeight: 90 }} />
          <span className="hint">Pourquoi aucune des deux branches de l&apos;alternative ne suffit : ce que l&apos;on risque avec l&apos;une, puis avec l&apos;autre.</span>
        </label>
        <label>
          Question de solution posée au lecteur
          <textarea name="solution" id="solution" maxLength={700} defaultValue={sheet?.solutionQuestion ?? ""} style={{ minHeight: 70 }} placeholder="Quelle attitude adopter (individuelle et collective) pour qu'à la fois nous puissions, d'une part…" />
          <span className="hint">Affichée avant la version 3 du carnet. Elle ne donne jamais la réponse : la solution revient au lecteur.</span>
        </label>
        <fieldset className="field-group" id="articles">
          <legend>Deux articles à lire (page « Pour aller plus loin »)</legend>
          <span className="hint">
            Deux articles de presse en ligne en accès libre : chacun défend une branche de l&apos;alternative et, faute de voir le problème, s&apos;y heurte.
            Ouvrez chaque lien avant de valider. La présentation est rédigée par nous : aucune citation de l&apos;article.
          </span>
          {[0, 1].map((i) => {
            const a = sheet?.pressArticles?.[i];
            return (
              <div className="stack" key={i} style={{ gap: 6 }}>
                <label>Article {i + 1} : titre<input type="text" name={`article${i + 1}_titre`} maxLength={300} defaultValue={a?.title ?? ""} /></label>
                <label>Adresse<input type="url" name={`article${i + 1}_url`} maxLength={500} defaultValue={a?.url ?? ""} placeholder="https://theconversation.com/…" /></label>
                {a?.url && <a className="small" href={a.url} target="_blank" rel="noopener noreferrer">Ouvrir l&apos;article →</a>}
                <label>Média<input type="text" name={`article${i + 1}_source`} maxLength={120} defaultValue={a?.source ?? ""} /></label>
                <label>Auteur (facultatif)<input type="text" name={`article${i + 1}_auteur`} maxLength={120} defaultValue={a?.author ?? ""} /></label>
                <label>Date (facultatif)<input type="date" name={`article${i + 1}_date`} defaultValue={a?.date ?? ""} /></label>
                <label>Branche de l&apos;alternative défendue<input type="text" name={`article${i + 1}_position`} maxLength={200} defaultValue={a?.side ?? ""} /></label>
                <label>Présentation en deux phrases<textarea name={`article${i + 1}_descriptif`} maxLength={700} defaultValue={a?.description ?? ""} style={{ minHeight: 70 }} /></label>
              </div>
            );
          })}
        </fieldset>
        <fieldset className="field-group">
          <legend>Quels philosophes lire pour approfondir la question ? (page « Pour aller plus loin »)</legend>
          <span className="hint">Trois philosophes, chacun avec un de ses livres et deux phrases de présentation. Vérifiez que chaque livre existe et qu&apos;il est bien de cet auteur.</span>
          {[0, 1, 2].map((i) => (
            <div className="stack" key={i} style={{ gap: 6 }}>
              {sheet?.readings?.[i]?.cover && (
                <img src={sheet.readings[i].cover} alt={`Couverture trouvée pour ${sheet.readings[i].book}`} style={{ width: 64, height: "auto" }} />
              )}
              <label>Philosophe {i + 1}<input type="text" name={`lecture${i + 1}_philosophe`} id={`lecture${i + 1}_philosophe`} maxLength={120} defaultValue={sheet?.readings?.[i]?.philosopher ?? ""} /></label>
              <label>Livre<input type="text" name={`lecture${i + 1}_livre`} id={`lecture${i + 1}_livre`} maxLength={200} defaultValue={sheet?.readings?.[i]?.book ?? ""} /></label>
              <label>Partie du livre qui traite de la question<input type="text" name={`lecture${i + 1}_partie`} id={`lecture${i + 1}_partie`} maxLength={300} defaultValue={sheet?.readings?.[i]?.part ?? ""} placeholder="Livre I, chapitre 8 : « De l'état civil »" /></label>
              <label>Présentation en deux phrases<textarea name={`lecture${i + 1}_descriptif`} id={`lecture${i + 1}_descriptif`} maxLength={500} defaultValue={sheet?.readings?.[i]?.description ?? ""} style={{ minHeight: 70 }} /></label>
            </div>
          ))}
        </fieldset>
        <label>
          Short (moins de 3 minutes)
          <select name="short" id="short" defaultValue={sheet?.shortVideoId ?? ""}>
            <option value="">Aucun</option>
            {vids.filter((v) => v.kind === "short").map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </select>
        </label>
        <label>
          Conférence ou extrait (plus de 3 minutes, même intervenant)
          <select name="conference" id="conference" defaultValue={sheet?.lectureVideoId ?? ""}>
            <option value="">Aucune</option>
            {vids.filter((v) => v.kind === "conference").map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </select>
        </label>
        <label>
          Livre des Éditions M-Éditer
          <select name="livre" id="livre" defaultValue={sheet?.bookId ?? ""}>
            <option value="">Aucun</option>
            {bks.map((b) => <option key={b.id} value={b.id}>{b.title} · {b.author}</option>)}
          </select>
        </label>
        <label>Sources de la fiche<textarea name="sources" id="sources" defaultValue={sheet?.sources ?? ""} style={{ minHeight: 80 }} placeholder="Description du Short, minutage de la conférence, référence du livre…" /></label>
        <label>Notes éditoriales internes<textarea name="notes" id="notes" defaultValue={sheet?.editorialNotes ?? ""} style={{ minHeight: 80 }} /></label>
        <label>
          État
          <select name="statut" id="statut" defaultValue={sheet?.status ?? "brouillon"}>
            <option value="brouillon">Brouillon</option>
            <option value="a_verifier">À vérifier</option>
            <option value="validee">Validée (publiable)</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" name="secours" id="secours" defaultChecked={sheet?.isBackup ?? false} /><span>Fiche de secours : peut être servie un jour sans fiche programmée.</span></label>
        <label className="check">
          <input type="checkbox" name="authenticite" id="authenticite" defaultChecked={!!sheet?.authenticityVerifiedAt} />
          <span>
            J&apos;ai vérifié l&apos;origine de l&apos;intervention : la mention « Intervention humaine authentique — sélection éditoriale M-Éditer » sera affichée.
            {sheet?.authenticityVerifiedAt && <span className="hint"> Vérifiée le {formatDate(sheet.authenticityVerifiedAt)}.</span>}
          </span>
        </label>
        <button className="btn primary" type="submit">Enregistrer la fiche</button>
      </form>
      {sheet && (shortPoster || lecturePoster) && (
        <section className="field-group">
          <h2 className="small">Images d&apos;attente des vidéos</h2>
          <p className="hint">Affichées sur « Donc ? » avant le clic sur le lecteur, à la place d&apos;un écran noir.</p>
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            {shortPoster && (
              <form action={chooseShortPoster} className="stack" style={{ gap: 6 }}>
                <input type="hidden" name="id" value={sheet.id} />
                <input type="hidden" name="video" value={shortPoster.id} />
                {shortPoster.poster ? <img src={shortPoster.poster} alt="Image d'attente du Short" style={{ width: 120, borderRadius: 4 }} /> : <span className="hint">Short sans image</span>}
                <select name="image" defaultValue="ia" aria-label="Image du Short">
                  <option value="ia">Choix de l&apos;IA (image la plus flatteuse, ou portrait de l&apos;auteur)</option>
                  <option value="1">Image 1 (début)</option>
                  <option value="2">Image 2 (milieu)</option>
                  <option value="3">Image 3 (fin)</option>
                </select>
                <button className="btn small" type="submit">Changer l&apos;image du Short</button>
              </form>
            )}
            {lecturePoster?.poster && <img src={lecturePoster.poster} alt="Vignette de la conférence" style={{ width: 213, borderRadius: 4 }} />}
          </div>
        </section>
      )}
      {sheet && (
        <form action={deleteSheet}>
          <input type="hidden" name="id" value={sheet.id} />
          <details>
            <summary className="small" style={{ cursor: "pointer" }}>Supprimer cette fiche</summary>
            <p className="small" style={{ margin: "8px 0" }}>Les réflexions des lecteurs sur cette question seront aussi supprimées.</p>
            <button className="btn danger small" type="submit">Supprimer définitivement</button>
          </details>
        </form>
      )}
    </div>
  );
}
