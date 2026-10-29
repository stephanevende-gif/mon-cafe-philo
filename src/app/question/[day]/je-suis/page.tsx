import { JeSuis } from "@/components/JeSuis";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ day: string }>; searchParams: Promise<{ message?: string; voir?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ day }, sp] = await Promise.all([params, searchParams]);
  return <JeSuis ctx={await resolveJourney(day)} message={sp.message} showProblem={sp.voir === "probleme"} />;
}
