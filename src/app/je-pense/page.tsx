import { JePense } from "@/components/JePense";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Je pense" };

// La question du jour, pour tous, y compris les visiteurs venus de la page d'accueil.
export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [ctx, sp] = await Promise.all([resolveJourney(), searchParams]);
  return <JePense ctx={ctx} message={sp.message} />;
}
