import { resolveSheetJourney } from "@/lib/journey";
import { worksheetResponse } from "@/lib/worksheet-route";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return worksheetResponse(await resolveSheetJourney(id));
}
