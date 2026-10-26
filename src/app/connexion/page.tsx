import Link from "next/link";
import { Notice } from "@/components/Notice";
import { login } from "../actions/auth";

export const metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string; suite?: string }> }) {
  const { message, suite } = await searchParams;
  return (
    <main className="page">
      <div className="stack-lg narrow">
        <h1 className="page-title">Connexion</h1>
        <Notice code={message} />
        <form action={login} className="field-group">
          <input type="hidden" name="suite" value={suite ?? "/"} />
          <label>Adresse e-mail<input type="email" name="email" id="email" required autoComplete="email" /></label>
          <label>Mot de passe<input type="password" name="motdepasse" id="motdepasse" required autoComplete="current-password" /></label>
          <button className="btn primary" type="submit">Se connecter</button>
        </form>
        <div className="stack small">
          <Link href="/mot-de-passe-oublie">Mot de passe oublié</Link>
          <span>Pas encore de compte ? <Link href="/inscription">Commencer gratuitement</Link></span>
        </div>
      </div>
    </main>
  );
}
