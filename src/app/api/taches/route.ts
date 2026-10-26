import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { aiEnabled, proposeSheet } from "@/lib/ai";
import { runScheduledTasks } from "@/lib/automation";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Appelée chaque heure par le planificateur de l'hébergeur : synchronise la playlist et prépare aujourd'hui et demain.
export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "non autorisé" }, { status: 401 });
  const result = await runScheduledTasks(db, {
    apiKey: process.env.YOUTUBE_API_KEY,
    playlistId: process.env.YOUTUBE_PLAYLIST_ID || undefined,
    propose: aiEnabled() ? proposeSheet : undefined,
  });
  return Response.json(result);
}
