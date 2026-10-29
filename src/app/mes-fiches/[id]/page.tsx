import { JePense } from "@/components/JePense";
import { AccessEnded } from "@/components/AccessEnded";
import { currentAccess, requireUser } from "@/lib/auth";
import { resolveSheetJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  await requireUser(`/mes-fiches/${id}`);
  // Les archives font partie de l'accès abonné.
  if (!(await currentAccess())?.active) return <main className="page"><AccessEnded /></main>;
  const ctx = await resolveSheetJourney(id);
  return <JePense ctx={ctx} message={(await searchParams).message} />;
}
