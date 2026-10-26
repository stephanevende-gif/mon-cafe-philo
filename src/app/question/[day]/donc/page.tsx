import { Donc } from "@/components/Donc";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ day: string }> }) {
  return <Donc ctx={await resolveJourney((await params).day)} />;
}
