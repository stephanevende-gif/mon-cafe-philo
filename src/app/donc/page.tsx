import { Donc } from "@/components/Donc";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donc ?" };

export default async function Page() {
  return <Donc ctx={await resolveJourney()} />;
}
