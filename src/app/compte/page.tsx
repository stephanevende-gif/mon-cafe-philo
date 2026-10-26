import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessPeriods } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { AccessLine } from "@/components/AccessLine";
import { Support } from "@/components/Support";
import { PAID_DAYS, PRICE_CENTS, nextPaidPeriod } from "@/lib/access";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { deleteAccount, logout, resendVerification, updateProfile } from "../actions/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte" };

const KIND = { essai: "Essai gratuit", paiement: "Accès payé", attribution: "Accès offert" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await requireUser("/compte");
  const access = (await currentAccess())!;
  const { message } = await searchParams;
  const periods = await db.select().from(accessPeriods).where(eq(accessPeriods.userId, user.id)).orderBy(desc(accessPeriods.startsAt));
  const next = nextPaidPeriod(periods, new Date());

  return (
    <main className="page">
      <div className="stack-lg narrow">
        <h1 className="page-title">Mon compte</h1>
        <Notice code={message} />

        <section className="stack">
          <h2>Mon accès</h2>
          <AccessLine access={access} />
          <div className="notice">
            <p>
              <b>Prolonger de {PAID_DAYS} jours pour {PRICE_CENTS / 100} €.</b> La prolongation commencerait le{" "}
              {formatDate(next.startsAt)} et vous donnerait accès jusqu&apos;au {formatDate(next.endsAt)}. Paiement unique, sans
              renouvellement automatique.
            </p>
            <p className="small muted" style={{ marginTop: 8 }}>Le paiement en ligne sera ouvert prochainement.</p>
          </div>
          {periods.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Période</th><th>Du</th><th>Au</th></tr></thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id}><td>{KIND[p.kind]}</td><td>{formatDate(p.startsAt)}</td><td>{formatDate(p.endsAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="stack">
          <h2>Mes informations</h2>
          <p>
            {user.email}{" "}
            {user.emailVerifiedAt ? <span className="tag ok">confirmée</span> : <span className="tag warn">à confirmer</span>}
          </p>
          {!user.emailVerifiedAt && (
            <form action={resendVerification}><button className="btn small" type="submit">Renvoyer l&apos;e-mail de confirmation</button></form>
          )}
          <form action={updateProfile} className="row" style={{ alignItems: "end" }}>
            <label style={{ flex: 1, minWidth: 200 }}>Prénom ou pseudonyme<input type="text" name="nom" id="nom" defaultValue={user.displayName} maxLength={60} required /></label>
            <button className="btn" type="submit">Enregistrer</button>
          </form>
        </section>

        <section className="stack">
          <h2>Mes données</h2>
          <p>Votre carnet est privé. Vous pouvez en télécharger une copie complète à tout moment, au format JSON.</p>
          <a className="btn" href="/compte/export">Télécharger mes données</a>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Supprimer mon compte</summary>
            <form action={deleteAccount} className="field-group" style={{ marginTop: 12 }}>
              <p className="small">La suppression efface définitivement votre compte, votre carnet et l&apos;historique de vos accès.</p>
              <label>Tapez SUPPRIMER<input type="text" name="confirmation" id="confirmation" autoComplete="off" required /></label>
              <label>Mot de passe<input type="password" name="motdepasse" id="motdepasse-suppr" autoComplete="current-password" required /></label>
              <button className="btn danger" type="submit">Supprimer définitivement</button>
            </form>
          </details>
        </section>

        <form action={logout}><button className="btn" type="submit">Se déconnecter</button></form>
        <Support />
      </div>
    </main>
  );
}
