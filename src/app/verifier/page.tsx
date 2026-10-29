import Link from "next/link";
import { db } from "@/db";
import { verifyEmail } from "@/lib/accounts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmation de l'adresse" };

export default async function Page({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const { jeton } = await searchParams;
  const ok = jeton ? await verifyEmail(db, jeton) : false;
  return (
    <main className="page">
      <div className="stack narrow">
        <h1 className="page-title">{ok ? "Adresse confirmée" : "Lien expiré ou déjà utilisé"}</h1>
        <p>{ok ? "Merci. Votre adresse e-mail est confirmée." : "Vous pouvez demander un nouveau lien depuis votre compte."}</p>
        <Link className="btn primary" href={ok ? "/je-pense" : "/compte"}>{ok ? "Voir la question du jour" : "Mon compte"}</Link>
      </div>
    </main>
  );
}
