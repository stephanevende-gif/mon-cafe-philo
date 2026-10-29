import { resolveJourney } from "@/lib/journey";
import { worksheetResponse } from "@/lib/worksheet-route";

export const dynamic = "force-dynamic";

export async function GET() {
  return worksheetResponse(await resolveJourney());
}
