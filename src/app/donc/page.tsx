import { Donc } from "@/components/Donc";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donc ?" };

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [ctx, sp] = await Promise.all([resolveJourney(), searchParams]);
  return <Donc ctx={ctx} message={sp.message} />;
}
