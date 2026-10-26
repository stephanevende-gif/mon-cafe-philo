import { JePense } from "@/components/JePense";
import { AccessEnded } from "@/components/AccessEnded";
import { currentAccess, requireUser } from "@/lib/auth";
import { resolveJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ day: string }>; searchParams: Promise<{ message?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const { day } = await params;
  await requireUser(`/question/${day}`);
  // Les archives font partie de l'accès abonné.
  if (!(await currentAccess())?.active) return <main className="page"><AccessEnded /></main>;
  const ctx = await resolveJourney(day);
  return <JePense ctx={ctx} message={(await searchParams).message} />;
}
