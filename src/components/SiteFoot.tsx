import Link from "next/link";
import { LINKS } from "@/lib/links";

export function SiteFoot() {
  return (
    <footer className="site-foot">
      <img className="logo" src="/logo-m-editer.png" alt="Éditions M-Éditer" width={116} height={22} />
      <span>Une application des Éditions M-Éditer, depuis 2003</span>
      <a href={LINKS.boutique} target="_blank" rel="noopener noreferrer">Boutique</a>
      <a href={LINKS.youtube} target="_blank" rel="noopener noreferrer">Chaîne YouTube</a>
      <Link href="/mentions-legales">Mentions légales</Link>
      <Link href="/confidentialite">Confidentialité</Link>
    </footer>
  );
}
