import { FicheDeTravail } from "@/components/FicheDeTravail";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma fiche de travail" };

export default async function Page() {
  return <FicheDeTravail ctx={await resolveJourney()} />;
}
