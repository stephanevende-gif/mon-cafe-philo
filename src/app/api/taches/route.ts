import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { aiEnabled, chooseFlatteringFrame, proposeSheet } from "@/lib/ai";
import { runScheduledTasks } from "@/lib/automation";

export const dynamic = "force-dynamic";
// La synchronisation et les propositions de l'IA peuvent prendre plusieurs minutes.
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Appelée par le planificateur de l'hébergeur : synchronise la playlist et prépare aujourd'hui et demain.
// Le planificateur de Vercel appelle en GET, avec le même en-tête Authorization.
export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "non autorisé" }, { status: 401 });
  const result = await runScheduledTasks(db, {
    apiKey: process.env.YOUTUBE_API_KEY,
    playlistId: process.env.YOUTUBE_PLAYLIST_ID || undefined,
    propose: aiEnabled() ? proposeSheet : undefined,
    chooseFrame: aiEnabled() ? (frames) => chooseFlatteringFrame(frames) : undefined,
  });
  return Response.json(result);
}
