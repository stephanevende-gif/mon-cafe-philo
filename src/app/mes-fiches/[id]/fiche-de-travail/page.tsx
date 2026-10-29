import { FicheDeTravail } from "@/components/FicheDeTravail";
import { resolveSheetJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma fiche de travail" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FicheDeTravail ctx={await resolveSheetJourney(id)} />;
}
