import { Notice } from "@/components/Notice";
import { requestReset } from "../actions/auth";

export const metadata = { title: "Mot de passe oublié" };

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main className="page">
      <div className="stack-lg narrow">
        <h1 className="page-title">Mot de passe oublié</h1>
        <Notice code={message} />
        <form action={requestReset} className="field-group">
          <label>Adresse e-mail du compte<input type="email" name="email" id="email" required autoComplete="email" /></label>
          <button className="btn primary" type="submit">Recevoir un lien</button>
        </form>
      </div>
    </main>
  );
}
