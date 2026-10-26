import Link from "next/link";
import type { AccessState } from "@/lib/access";
import { formatDate } from "@/lib/dates";

export function AccessLine({ access }: { access: AccessState }) {
  if (!access.active) {
    return (
      <p className="access-line">
        <span>Accès terminé{access.endsAt ? ` le ${formatDate(access.endsAt)}` : ""}</span>
        <Link href="/compte">Prolonger</Link>
      </p>
    );
  }
  return (
    <p className="access-line">
      <span>{access.currentKind === "essai" ? "Essai gratuit" : "Accès"}</span>
      <span>
        jusqu&apos;au <b>{access.endsAt ? formatDate(access.endsAt) : ""}</b>
      </span>
    </p>
  );
}
