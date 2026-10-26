import { JePense } from "@/components/JePense";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [ctx, sp] = await Promise.all([resolveJourney(), searchParams]);
  return <JePense ctx={ctx} message={sp.message} />;
}
