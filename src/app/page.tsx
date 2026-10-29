import { Accueil } from "@/components/Accueil";
import { JePense } from "@/components/JePense";
import { currentUser } from "@/lib/auth";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

// Les visiteurs découvrent d'abord l'application ; les lecteurs connectés arrivent sur la question du jour.
export default async function Home({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [ctx, sp, user] = await Promise.all([resolveJourney(), searchParams, currentUser()]);
  if (!user) return <Accueil ctx={ctx} />;
  return <JePense ctx={ctx} message={sp.message} />;
}
