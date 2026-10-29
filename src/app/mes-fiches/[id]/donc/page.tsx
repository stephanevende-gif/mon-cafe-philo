import { Donc } from "@/components/Donc";
import { resolveSheetJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <Donc ctx={await resolveSheetJourney(id)} message={sp.message} />;
}
