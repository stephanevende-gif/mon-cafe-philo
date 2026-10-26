import { LegalPage } from "@/components/LegalPage";
import { PAID_DAYS, PRICE_CENTS, TRIAL_DAYS } from "@/lib/access";

export const metadata = { title: "Conditions d'utilisation" };

export default function Page() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente">
      <section className="stack">
        <h2>Le service</h2>
        <p>Mon café philo propose chaque jour une question philosophique, une piste de réflexion, des vidéos d&apos;intervenants réels issues de la chaîne des Éditions M-Éditer et un carnet personnel.</p>
      </section>
      <section className="stack">
        <h2>Accès et prix</h2>
        <p>Chaque nouveau compte bénéficie de {TRIAL_DAYS} jours d&apos;accès gratuit, sans moyen de paiement. L&apos;accès peut ensuite être prolongé de {PAID_DAYS} jours pour {PRICE_CENTS / 100} € TTC, par un paiement unique. Il n&apos;y a aucun renouvellement automatique.</p>
        <p>[Droit de rétractation, modalités de remboursement et service client à compléter.]</p>
      </section>
      <section className="stack">
        <h2>Discussion entre lecteurs</h2>
        <p>« Toutes les idées peuvent être discutées. Toutes les personnes doivent être respectées. » [Charte de modération et procédure de contestation à compléter avant l&apos;ouverture du forum.]</p>
      </section>
    </LegalPage>
  );
}
