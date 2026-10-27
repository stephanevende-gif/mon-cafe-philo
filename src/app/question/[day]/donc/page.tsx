import { Donc } from "@/components/Donc";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ day: string }>; searchParams: Promise<{ message?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ day }, sp] = await Promise.all([params, searchParams]);
  return <Donc ctx={await resolveJourney(day)} message={sp.message} />;
}
