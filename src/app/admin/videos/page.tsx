import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { speakers, videos } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { saveVideo } from "@/app/actions/admin";
import { formatDuration } from "@/lib/dates";
import { cleanTitle } from "@/lib/youtube";

type Props = { searchParams: Promise<{ message?: string; modifier?: string }> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const [rows, people] = await Promise.all([
    db.select({ v: videos, speaker: speakers.fullName }).from(videos).leftJoin(speakers, eq(speakers.id, videos.speakerId)).orderBy(desc(videos.publishedAt)),
    db.select({ id: speakers.id, name: speakers.fullName }).from(speakers).orderBy(asc(speakers.fullName)),
  ]);
  const edit = sp.modifier ? rows.find((r) => r.v.id === sp.modifier)?.v : undefined;
  return (
    <div className="stack-lg">
      <h1 className="page-title">Vidéos</h1>
      <p className="muted">Shorts et conférences de la chaîne des Éditions M-Éditer. Les nouveaux Shorts de la playlist sont détectés automatiquement (voir Synchronisation).</p>
      <Notice code={sp.message} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Titre</th><th>Type</th><th>Durée</th><th>Intervenant</th><th></th></tr></thead>
          <tbody>
            {rows.map(({ v, speaker }) => (
              <tr key={v.id}>
                <td><a href={`https://www.youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer">{cleanTitle(v.title)}</a></td>
                <td>{v.kind === "short" ? "Short" : "Conférence"}</td>
                <td>{formatDuration(v.durationSeconds)}</td>
                <td>{speaker ?? <span className="tag warn">à renseigner</span>}</td>
                <td><a href={`?modifier=${v.id}`}>Modifier</a></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}>Aucune vidéo.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={saveVideo} className="field-group narrow" key={edit?.id ?? "nouvelle"}>
        <h2>{edit ? "Modifier la vidéo" : "Ajouter une vidéo"}</h2>
        {edit && <input type="hidden" name="id" value={edit.id} />}
        <label>Adresse ou identifiant YouTube<input type="text" name="youtube" id="youtube" required defaultValue={edit?.youtubeId ?? ""} /></label>
        <label>Titre exact<input type="text" name="titre" id="titre" required defaultValue={edit?.title ?? ""} /></label>
        <label>
          Type
          <select name="type" id="type" defaultValue={edit?.kind ?? "short"}>
            <option value="short">Short (moins de 3 minutes)</option>
            <option value="conference">Conférence ou extrait (plus de 3 minutes)</option>
          </select>
        </label>
        <label>Durée (min:s ou h:min:s)<input type="text" name="duree" id="duree" defaultValue={formatDuration(edit?.durationSeconds)} placeholder="2:41" /></label>
        <label>
          Intervenant
          <select name="intervenant" id="intervenant" defaultValue={edit?.speakerId ?? ""}>
            <option value="">À renseigner</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Date de publication<input type="date" name="publiee" id="publiee" defaultValue={edit?.publishedAt?.toISOString().slice(0, 10) ?? ""} /></label>
        <label>Description YouTube<textarea name="description" id="description" defaultValue={edit?.description ?? ""} /></label>
        <button className="btn primary" type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
