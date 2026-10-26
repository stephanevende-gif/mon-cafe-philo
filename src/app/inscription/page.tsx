import Link from "next/link";
import { Notice } from "@/components/Notice";
import { signup } from "../actions/auth";
import { PAID_DAYS, PRICE_CENTS, TRIAL_DAYS } from "@/lib/access";

export const metadata = { title: "Créer un compte" };

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main className="page">
      <div className="stack-lg narrow">
        <div className="stack">
          <h1 className="page-title">Commencer gratuitement</h1>
          <p>
            {TRIAL_DAYS} jours d&apos;accès complet, sans carte bancaire. Ensuite, vous pourrez prolonger votre accès de {PAID_DAYS} jours
            pour {PRICE_CENTS / 100} €, soit une année entière depuis votre inscription. Aucun prélèvement automatique.
          </p>
        </div>
        <Notice code={message} />
        <form action={signup} className="field-group">
          <label>Prénom ou pseudonyme<input type="text" name="nom" id="nom" required maxLength={60} autoComplete="nickname" /></label>
          <label>Adresse e-mail<input type="email" name="email" id="email" required autoComplete="email" /></label>
          <label>
            Mot de passe
            <input type="password" name="motdepasse" id="motdepasse" required minLength={10} autoComplete="new-password" />
            <span className="hint">Au moins 10 caractères. Une phrase facile à retenir convient très bien.</span>
          </label>
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
            <label>Ne pas remplir<input type="text" name="site" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <label className="check">
            <input type="checkbox" name="conditions" id="conditions" required />
            <span>
              J&apos;accepte les <Link href="/conditions">conditions d&apos;utilisation</Link> et j&apos;ai lu la{" "}
              <Link href="/confidentialite">politique de confidentialité</Link>.
            </span>
          </label>
          <button className="btn primary" type="submit">Créer mon compte</button>
        </form>
        <p className="small">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
      </div>
    </main>
  );
}
