import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets, videos } from "../src/db/schema";
import { aiEnabled, proposeSheet } from "../src/lib/ai";
import { draftWithAi } from "../src/lib/automation";

// Essai ponctuel : demande à l'IA un brouillon pour les N fiches « à vérifier » les plus récentes
// (5 par défaut) et affiche le résultat tel qu'enregistré, sans rien valider.
async function main() {
  if (!aiEnabled()) throw new Error("Clé Anthropic absente (ANTHROPIC_API_KEY ou CAFE_PHILO_ANTHROPIC_KEY)");
  const limit = Number(process.argv[2] ?? 5);
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const report = await draftWithAi(db, (input) => proposeSheet(input), { limit });
  const rows = await db
    .select({ title: videos.title, sheetTitle: sheets.title, theme: sheets.theme, question: sheets.question, synthesis: sheets.synthesis, problem: sheets.problem, solutionQuestion: sheets.solutionQuestion, notes: sheets.editorialNotes, status: sheets.status })
    .from(sheets)
    .innerJoin(videos, eq(videos.id, sheets.shortVideoId))
    .where(eq(sheets.aiDrafted, true));
  console.log(JSON.stringify({ report, sheets: rows }, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
