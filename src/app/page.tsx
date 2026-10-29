import { Accueil } from "@/components/Accueil";
import { currentUser } from "@/lib/auth";
import { resolveJourney } from "@/lib/journey";
import { testSheets } from "@/lib/test-version";

export const dynamic = "force-dynamic";

// Tous passent d'abord par la page d'accueil, qui mène à la question du jour.
export default async function Home() {
  const [ctx, user, tests] = await Promise.all([resolveJourney(), currentUser(), testSheets()]);
  return <Accueil ctx={ctx} user={user} tests={tests} />;
}
