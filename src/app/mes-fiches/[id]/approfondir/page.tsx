import { Approfondir } from "@/components/Approfondir";
import { resolveSheetJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pour aller plus loin" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Approfondir ctx={await resolveSheetJourney(id)} />;
}
