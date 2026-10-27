import "dotenv/config";
import { isNotNull } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets } from "../src/db/schema";
import { aiEnabled, chooseAuthorBooks } from "../src/lib/ai";
import { fillBibliographies } from "../src/lib/automation";

// Essai ponctuel : bibliographie de l'auteur (Éditions M-Éditer) pour les fiches déjà rédigées qui n'en ont pas.
async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const ids = (await db.select({ id: sheets.id }).from(sheets).where(isNotNull(sheets.problem))).map((r) => r.id);
  const done = await fillBibliographies(db, {
    sheetIds: ids,
    choose: aiEnabled() ? (question, titles) => chooseAuthorBooks(question, titles) : null,
  });
  console.log(JSON.stringify(done, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
