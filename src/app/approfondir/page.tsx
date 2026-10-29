import { Approfondir } from "@/components/Approfondir";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pour aller plus loin" };

export default async function Page() {
  return <Approfondir ctx={await resolveJourney()} />;
}
