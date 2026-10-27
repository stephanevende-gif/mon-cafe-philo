import "dotenv/config";
import { and, desc, eq, isNull, notLike } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets } from "../src/db/schema";
import { aiEnabled, proposeProblem } from "../src/lib/ai";

// Complète les fiches déjà rédigées qui n'ont pas encore de problème à surmonter (page « Je suis »).
// Seuls le problème et la question de solution sont écrits ; le reste de la fiche n'est pas touché.
async function main() {
  if (!aiEnabled()) throw new Error("Clé Anthropic absente (ANTHROPIC_API_KEY ou CAFE_PHILO_ANTHROPIC_KEY)");
  const limit = Number(process.argv[2] ?? 10);
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const todo = await db
    .select({ id: sheets.id, question: sheets.question, synthesis: sheets.synthesis })
    .from(sheets)
    .where(and(isNull(sheets.solutionQuestion), notLike(sheets.question, "[Question à rédiger]%")))
    .orderBy(desc(sheets.updatedAt))
    .limit(limit);
  const done: { question: string; problem: string; solutionQuestion: string }[] = [];
  for (const s of todo) {
    const p = await proposeProblem(s);
    if (!p) continue;
    await db
      .update(sheets)
      .set({ problem: p.problem.slice(0, 700), solutionQuestion: p.solutionQuestion.slice(0, 400), updatedAt: new Date() })
      .where(eq(sheets.id, s.id));
    done.push({ question: s.question, ...p });
  }
  console.log(JSON.stringify(done, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
