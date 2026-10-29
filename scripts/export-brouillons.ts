import "dotenv/config";
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createDb } from "../src/db";
import { exportDrafts } from "../src/lib/draft-transfer";

// Exporte les brouillons IA de la base de travail (titres, notions, questions, problèmes, intervenants)
// vers data/brouillons-ia.json.gz, que le déploiement applique à la base en ligne (scripts/prepare-test.ts).
async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const bundle = await exportDrafts(db);
  writeFileSync("data/brouillons-ia.json.gz", gzipSync(JSON.stringify(bundle)));
  console.log(`${bundle.sheets.length} fiches, ${bundle.speakers.length} intervenants, ${bundle.videoSpeakers.length} vidéos reliées.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
