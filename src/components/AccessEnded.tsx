import Link from "next/link";
import { PRICE_CENTS, PAID_DAYS } from "@/lib/access";

export function AccessEnded() {
  return (
    <div className="stack narrow" style={{ marginTop: 32 }}>
      <h1 className="page-title">Votre accès a pris fin</h1>
      <p>
        La piste du jour, votre carnet et les archives sont réservés aux abonnés. Vous pouvez prolonger votre accès de{" "}
        {PAID_DAYS} jours pour {PRICE_CENTS / 100} €, sans renouvellement automatique.
      </p>
      <Link className="btn primary" href="/compte">Prolonger mon accès</Link>
    </div>
  );
}
