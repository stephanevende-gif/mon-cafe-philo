import { resolveJourney } from "@/lib/journey";
import { worksheetResponse } from "@/lib/worksheet-route";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  return worksheetResponse(await resolveJourney(day));
}
