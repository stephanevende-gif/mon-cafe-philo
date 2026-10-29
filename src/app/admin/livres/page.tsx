import { asc } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { importCatalogueBooks, saveBook } from "@/app/actions/admin";
import { PendingButton } from "@/components/PendingButton";

type Props = { searchParams: Promise<{ message?: string; modifier?: string; ajoutes?: string; lus?: string }> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const rows = await db.select().from(books).orderBy(asc(books.author), asc(books.title));
  const edit = sp.modifier ? rows.find((r) => r.id === sp.modifier) : undefined;
  return (
    <div className="stack-lg">
      <h1 className="page-title">Livres</h1>
      <p className="muted">Uniquement des ouvrages du catalogue des Éditions M-Éditer, avec leur couverture originale et le lien vers leur fiche.</p>
      <Notice code={sp.message} />
      {sp.lus && <p className="notice ok" role="status">Catalogue lu : {sp.lus} livres, dont {sp.ajoutes ?? 0} ajoutés à la liste.</p>}
      <form action={importCatalogueBooks}>
        <PendingButton pending="Lecture du catalogue en cours…">Importer tout le catalogue de la boutique</PendingButton>
        <span className="hint"> {rows.length} livres dans la liste. Le catalogue est aussi relu à chaque mise en ligne.</span>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>Titre</th><th>Auteur</th><th>Fiche boutique</th><th></th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td style={{ width: 56 }}>{b.coverUrl && <img src={b.coverUrl} alt="" width={40} />}</td>
                <td>{b.title}</td>
                <td>{b.author}</td>
                <td>{b.catalogueUrl ? <a href={b.catalogueUrl} target="_blank" rel="noopener noreferrer">ouvrir</a> : <span className="tag warn">à renseigner</span>}</td>
                <td><a href={`?modifier=${b.id}`}>Modifier</a></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}>Aucun livre.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={saveBook} className="field-group narrow" key={edit?.id ?? "nouveau"}>
        <h2>{edit ? `Modifier : ${edit.title}` : "Ajouter un livre"}</h2>
        {edit && <input type="hidden" name="id" value={edit.id} />}
        <label>Titre<input type="text" name="titre" id="titre" required defaultValue={edit?.title ?? ""} /></label>
        <label>Sous-titre<input type="text" name="soustitre" id="soustitre" defaultValue={edit?.subtitle ?? ""} /></label>
        <label>Auteur<input type="text" name="auteur" id="auteur" required defaultValue={edit?.author ?? ""} /></label>
        <label>ISBN<input type="text" name="isbn" id="isbn" defaultValue={edit?.isbn ?? ""} /></label>
        <label>Lien vers la fiche du livre (boutique)<input type="url" name="fiche" id="fiche" defaultValue={edit?.catalogueUrl ?? ""} /></label>
        <label>Couverture (lien https ou /couvertures/…)<input type="text" name="couverture" id="couverture" defaultValue={edit?.coverUrl ?? ""} /></label>
        <label>Courte présentation<textarea name="presentation" id="presentation" defaultValue={edit?.summary ?? ""} style={{ minHeight: 100 }} /></label>
        <button className="btn primary" type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
