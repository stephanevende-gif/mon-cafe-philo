import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/forum/400.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "./globals.css";
import { currentUser, isEditor } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Mon café philo", template: "%s · Mon café philo" },
  description:
    "Chaque jour, une question. Chaque jour, l'exercice de penser. Une application des Éditions M-Éditer.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#fdfef9", viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="fr">
      <body>
        <header className="site-top">
          <Link href="/" className="brand">
            <span className="name">Mon café philo</span>
            <span className="by">Une application des Éditions M-Éditer</span>
          </Link>
          <nav className="top-links" aria-label="Navigation principale">
            {user && <Link href="/mes-fiches">Mes fiches</Link>}
            <Link href="/archives">Archives</Link>
            {isEditor(user) && <Link href="/admin">Administration</Link>}
            {user ? <Link href="/compte">Mon compte</Link> : <Link href="/connexion">Connexion</Link>}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
