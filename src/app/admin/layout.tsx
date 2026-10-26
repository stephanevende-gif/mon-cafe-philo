import Link from "next/link";
import { requireEditor } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEditor();
  return (
    <main className="page">
      <div className="stack-lg">
        <nav className="admin-nav" aria-label="Administration">
          <Link href="/admin">Tableau de bord</Link>
          <Link href="/admin/fiches">Fiches</Link>
          <Link href="/admin/intervenants">Intervenants</Link>
          <Link href="/admin/videos">Vidéos</Link>
          <Link href="/admin/livres">Livres</Link>
          <Link href="/admin/synchronisation">Synchronisation</Link>
          {user.role === "admin" && <Link href="/admin/utilisateurs">Utilisateurs</Link>}
        </nav>
        {children}
      </div>
    </main>
  );
}
