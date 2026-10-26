import { JeSuis } from "@/components/JeSuis";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata = { title: "Je suis" };

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [ctx, sp] = await Promise.all([resolveJourney(), searchParams]);
  return <JeSuis ctx={ctx} message={sp.message} />;
}
