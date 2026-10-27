import "dotenv/config";
import { eq, isNotNull, or } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets } from "../src/db/schema";
import { aiEnabled, chooseFlatteringFrame } from "../src/lib/ai";
import { fillPosters } from "../src/lib/posters";

// Essai ponctuel : images d'attente des lecteurs pour les fiches déjà rédigées (par l'IA ou à la main) ou validées.
async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const rows = await db
    .select({ short: sheets.shortVideoId, lecture: sheets.lectureVideoId })
    .from(sheets)
    .where(or(eq(sheets.aiDrafted, true), isNotNull(sheets.problem), eq(sheets.status, "validee")));
  const ids = [...new Set(rows.flatMap((r) => [r.short, r.lecture]).filter((id): id is string => !!id))];
  const report = await fillPosters(db, ids, { choose: aiEnabled() ? (frames) => chooseFlatteringFrame(frames) : null });
  console.log(JSON.stringify(report, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
