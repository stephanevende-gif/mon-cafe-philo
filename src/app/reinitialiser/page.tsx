import { Notice } from "@/components/Notice";
import { doReset } from "../actions/auth";

export const metadata = { title: "Nouveau mot de passe" };

export default async function Page({ searchParams }: { searchParams: Promise<{ jeton?: string; message?: string }> }) {
  const { jeton, message } = await searchParams;
  return (
    <main className="page">
      <div className="stack-lg narrow">
        <h1 className="page-title">Choisir un nouveau mot de passe</h1>
        <Notice code={message} />
        <form action={doReset} className="field-group">
          <input type="hidden" name="jeton" value={jeton ?? ""} />
          <label>
            Nouveau mot de passe
            <input type="password" name="motdepasse" id="motdepasse" required minLength={10} autoComplete="new-password" />
            <span className="hint">Au moins 10 caractères. Vos autres sessions seront fermées.</span>
          </label>
          <button className="btn primary" type="submit">Enregistrer</button>
        </form>
      </div>
    </main>
  );
}
