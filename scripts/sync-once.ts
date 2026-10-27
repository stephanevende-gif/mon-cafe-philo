import "dotenv/config";
import { createDb } from "../src/db";
import { syncPlaylist, DEFAULT_PLAYLIST } from "../src/lib/automation";

async function main() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY absente");
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const report = await syncPlaylist(db, { apiKey: key, playlistId: process.env.YOUTUBE_PLAYLIST_ID || DEFAULT_PLAYLIST });
  console.log(JSON.stringify(report, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e).replaceAll(process.env.YOUTUBE_API_KEY ?? "§", "***")); process.exit(1); });
