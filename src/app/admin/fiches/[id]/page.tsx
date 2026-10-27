import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { books, sheets, speakers, videos } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { deleteSheet, draftSheetsWithAi, saveSheet } from "@/app/actions/admin";
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
      {sheet?.replayOf && <p className="notice ok" role="note">Rediffusion automatique d&apos;une fiche déjà publiée.</p>}
      <form action={saveSheet} className="field-group">
        {sheet && <input type="hidden" name="id" value={sheet.id} />}
        <label>Jour de publication<input type="date" name="jour" id="jour" defaultValue={sheet?.day ?? sp.jour ?? ""} /><span className="hint">Laisser vide pour une fiche non programmée ou de secours. Le sujet change à minuit, heure de Paris.</span></label>
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
