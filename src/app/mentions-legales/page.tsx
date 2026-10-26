import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <LegalPage title="Mentions légales">
      <section className="stack">
        <h2>Éditeur</h2>
        <p>Mon café philo est édité par les Éditions M-Éditer, [forme juridique], [capital], [adresse du siège], [RCS / SIREN], [numéro de TVA intracommunautaire].</p>
        <p>Directeur de la publication : [nom].</p>
        <p>Contact : [adresse e-mail de contact].</p>
      </section>
      <section className="stack">
        <h2>Hébergement</h2>
        <p>[Nom de l&apos;hébergeur, adresse, téléphone]. Les données sont hébergées dans l&apos;Union européenne.</p>
      </section>
      <section className="stack">
        <h2>Propriété intellectuelle</h2>
        <p>Les couvertures, textes de présentation et le logo sont la propriété des Éditions M-Éditer. Les vidéos sont diffusées par le lecteur officiel de YouTube, depuis la chaîne des Éditions M-Éditer.</p>
      </section>
    </LegalPage>
  );
}
