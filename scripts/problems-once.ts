import "dotenv/config";
import { and, desc, eq, isNull, notLike, or } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets } from "../src/db/schema";
import { aiEnabled, proposeProblem, proposeReadings } from "../src/lib/ai";
import { cleanReadings } from "../src/lib/readings";

// Complète les fiches déjà rédigées qui n'ont pas encore leur fin de page « Je suis » :
// le problème à surmonter, la question de solution et les trois philosophes à lire.
// Seuls ces champs sont écrits, et seulement s'ils sont vides ; le reste de la fiche n'est pas touché.
async function main() {
  if (!aiEnabled()) throw new Error("Clé Anthropic absente (ANTHROPIC_API_KEY ou CAFE_PHILO_ANTHROPIC_KEY)");
  const limit = Number(process.argv[2] ?? 10);
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const todo = await db
    .select({ id: sheets.id, question: sheets.question, synthesis: sheets.synthesis, solutionQuestion: sheets.solutionQuestion, readings: sheets.readings })
    .from(sheets)
    .where(and(or(isNull(sheets.solutionQuestion), isNull(sheets.readings)), notLike(sheets.question, "[Question à rédiger]%")))
    .orderBy(desc(sheets.updatedAt))
    .limit(limit);
  const done = [];
  for (const s of todo) {
    const set: Partial<typeof sheets.$inferInsert> = {};
    if (!s.solutionQuestion) {
      const p = await proposeProblem(s);
      if (p) Object.assign(set, { problem: p.problem.slice(0, 700), solutionQuestion: p.solutionQuestion.slice(0, 400) });
    }
    if (!s.readings) {
      const r = await proposeReadings(s);
      if (r?.length) set.readings = cleanReadings(r);
    }
    if (!Object.keys(set).length) continue;
    await db.update(sheets).set({ ...set, updatedAt: new Date() }).where(eq(sheets.id, s.id));
    done.push({ question: s.question, ...set });
  }
  console.log(JSON.stringify(done, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
