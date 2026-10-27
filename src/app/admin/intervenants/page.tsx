import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { speakers } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { saveSpeaker } from "@/app/actions/admin";
import { formatDate } from "@/lib/dates";

type Props = { searchParams: Promise<{ message?: string; modifier?: string }> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const rows = await db.select().from(speakers).orderBy(asc(speakers.fullName));
  const edit = sp.modifier ? rows.find((r) => r.id === sp.modifier) : undefined;
  return (
    <div className="stack-lg">
      <h1 className="page-title">Intervenants</h1>
      <p className="muted">Des philosophes en chair et en os : chaque intervenant doit être une personne réelle, dont la qualification est vérifiable.</p>
      <Notice code={sp.message} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Qualification</th><th>Vérification</th><th></th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.fullName}</td>
                <td>{s.qualification}{s.qualificationSource && <> · <a href={s.qualificationSource} target="_blank" rel="noopener noreferrer">source</a></>}</td>
                <td>{s.verifiedAt ? <span className="tag ok">vérifié le {formatDate(s.verifiedAt)}</span> : <span className="tag warn">à vérifier</span>}</td>
                <td><a href={`?modifier=${s.id}`}>Modifier</a></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4}>Aucun intervenant.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={saveSpeaker} className="field-group narrow" key={edit?.id ?? "nouveau"}>
        <h2>{edit ? `Modifier : ${edit.fullName}` : "Ajouter un intervenant"}</h2>
        {edit && <input type="hidden" name="id" value={edit.id} />}
        <label>Nom complet<input type="text" name="nom" id="nom" required defaultValue={edit?.fullName ?? ""} /></label>
        <label>Présentation<textarea name="qualification" id="qualification" required maxLength={1000} defaultValue={edit?.qualification ?? ""} placeholder="Professeur de philosophie, université de…" /></label>
        <label>Lien de présentation (fiche auteur M-Éditer, sinon une page qui présente l&apos;auteur)<input type="url" name="presentation" id="presentation" defaultValue={edit?.profileUrl ?? ""} /></label>
        <label>Source de vérification (lien https)<input type="url" name="source" id="source" defaultValue={edit?.qualificationSource ?? ""} /></label>
        <label>Photo de l&apos;auteur (lien https, facultatif)<input type="url" name="photo" id="photo" defaultValue={edit?.photoUrl ?? ""} /><span className="hint">De préférence la photo de sa fiche auteur M-Éditer, sinon une photo où il regarde l&apos;objectif. Elle est recadrée puis gardée dans l&apos;application.</span></label>
        {edit?.portrait && <img src={edit.portrait} alt={`Portrait de ${edit.fullName}`} width={120} height={140} style={{ border: "1px solid var(--filet)" }} />}
        {edit?.photoUrl && <label className="check"><input type="checkbox" name="reprendre" id="reprendre" /><span>Reprendre le portrait à partir de cette photo.</span></label>}
        <label className="check"><input type="checkbox" name="verifie" id="verifie" defaultChecked={!!edit?.verifiedAt} /><span>J&apos;ai vérifié l&apos;identité et la qualification de cette personne.</span></label>
        <button className="btn primary" type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
