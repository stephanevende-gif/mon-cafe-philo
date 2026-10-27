import "dotenv/config";
import { and, desc, eq, isNotNull, isNull, notLike, or } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets } from "../src/db/schema";
import { aiEnabled, proposeProblem, proposeReadingParts, proposeReadings } from "../src/lib/ai";
import { cleanReadings } from "../src/lib/readings";
import { withCovers } from "../src/lib/covers";

// Complète les fiches déjà rédigées qui n'ont pas encore leur fin de page « Je suis » :
// le problème à surmonter, la question de solution et les trois philosophes à lire.
// Les couvertures des livres conseillés sont ajoutées quand Open Library en connaît une.
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
      if (r?.length) set.readings = await withCovers(cleanReadings(r));
    }
    if (!Object.keys(set).length) continue;
    await db.update(sheets).set({ ...set, updatedAt: new Date() }).where(eq(sheets.id, s.id));
    done.push({ question: s.question, ...set });
  }
  // Couvertures encore manquantes sur les lectures déjà enregistrées.
  const covers = [];
  for (const s of await db.select({ id: sheets.id, readings: sheets.readings }).from(sheets).where(isNotNull(sheets.readings))) {
    if (!s.readings?.some((r) => !r.cover)) continue;
    const readings = await withCovers(s.readings);
    await db.update(sheets).set({ readings }).where(eq(sheets.id, s.id));
    covers.push(...readings.map((r) => `${r.philosopher}, ${r.book} : ${r.cover ? "couverture trouvée" : "pas de couverture"}`));
  }
  // Partie du livre qui traite de la question, sur les lectures enregistrées avant que ce champ existe.
  // Les livres eux-mêmes ne changent pas ; une partie incertaine reste vide.
  const parts = [];
  for (const s of await db.select({ id: sheets.id, question: sheets.question, readings: sheets.readings }).from(sheets).where(isNotNull(sheets.readings))) {
    if (!s.readings?.length || s.readings.some((r) => "part" in r)) continue;
    const found = await proposeReadingParts({ question: s.question, readings: s.readings });
    if (!found) continue;
    const readings = cleanReadings(s.readings.map((r, i) => ({ ...r, part: found[i] })));
    await db.update(sheets).set({ readings }).where(eq(sheets.id, s.id));
    parts.push(...readings.map((r) => `${r.philosopher}, ${r.book} : ${r.part ?? "(partie non précisée)"}`));
  }
  console.log(JSON.stringify({ done: done.map((d) => ({ ...d, readings: d.readings?.map(({ cover, ...r }) => ({ ...r, cover: !!cover })) })), covers, parts }, null, 2));
  await pool.end();
}
main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
