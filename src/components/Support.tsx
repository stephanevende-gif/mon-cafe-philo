import { LINKS } from "@/lib/links";

export function Support() {
  return (
    <div className="support">
      <span className="t">Soutenez une philosophie exigeante et accessible</span>
      <p>
        En soutenant les Éditions M-Éditer, vous contribuez à la diffusion indépendante de conférences et de réflexions
        philosophiques accessibles à tous. Ce soutien facultatif est distinct de votre accès à l&apos;application.
      </p>
      <a className="btn sepia" href={LINKS.youtubeJoin} target="_blank" rel="noopener noreferrer">
        Soutenir les Éditions M-Éditer sur YouTube
      </a>
      <a className="small" style={{ textAlign: "center", fontWeight: 600 }} href={LINKS.youtubeSubscribe} target="_blank" rel="noopener noreferrer">
        S&apos;abonner gratuitement à la chaîne
      </a>
    </div>
  );
}
