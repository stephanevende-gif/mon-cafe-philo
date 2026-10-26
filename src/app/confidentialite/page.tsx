import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité">
      <section className="stack">
        <h2>Données collectées</h2>
        <p>Pour fonctionner, l&apos;application conserve : votre adresse e-mail, votre prénom ou pseudonyme, une empreinte de votre mot de passe (jamais le mot de passe lui-même), les réflexions de votre carnet et les dates de vos périodes d&apos;accès.</p>
      </section>
      <section className="stack">
        <h2>Finalités et base légale</h2>
        <p>Ces données servent uniquement à fournir le service auquel vous vous êtes inscrit (exécution du contrat). Elles ne sont ni vendues, ni utilisées à des fins publicitaires.</p>
      </section>
      <section className="stack">
        <h2>Votre carnet</h2>
        <p>Votre carnet est privé. Il n&apos;est publié nulle part sans votre choix explicite.</p>
      </section>
      <section className="stack">
        <h2>Cookies et vidéos</h2>
        <p>L&apos;application utilise un seul cookie, indispensable, pour maintenir votre connexion. Les vidéos YouTube ne sont chargées que lorsque vous cliquez sur le lecteur, via le domaine youtube-nocookie.com. YouTube applique alors sa propre politique de confidentialité.</p>
      </section>
      <section className="stack">
        <h2>Vos droits</h2>
        <p>Depuis votre compte, vous pouvez télécharger toutes vos données et supprimer votre compte. Pour toute autre demande (accès, rectification, opposition) : [adresse e-mail du responsable]. Vous pouvez aussi saisir la CNIL.</p>
      </section>
      <section className="stack">
        <h2>Durée de conservation</h2>
        <p>[Durée à définir] après la fin de votre dernier accès, puis suppression. Les sessions de connexion expirent après 30 jours.</p>
      </section>
    </LegalPage>
  );
}
