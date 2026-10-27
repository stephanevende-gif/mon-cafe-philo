import "dotenv/config";
// Rattache les auteurs relevés par l'IA (fiches déjà rédigées) à leurs vidéos, avec la présentation reprise de la description YouTube.
import { eq } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets, videos, speakers } from "../src/db/schema";
import { attachAuthor } from "../src/lib/automation";
(async () => {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const rows = await db.select().from(sheets).where(eq(sheets.aiDrafted, true));
  for (const s of rows) {
    const m = (s.editorialNotes ?? "").match(/Auteur d'après la description YouTube : (.+?) \(à vérifier\)/);
    if (!m || !s.shortVideoId) continue;
    const ids = [s.shortVideoId, s.lectureVideoId].filter(Boolean) as string[];
    const vs = await Promise.all(ids.map(async (id) => (await db.query.videos.findFirst({ where: eq(videos.id, id) }))!));
    await attachAuthor(db, m[1], vs.map((v) => ({ id: v.id, youtubeId: v.youtubeId, description: v.description })));
  }
  console.log(JSON.stringify(await db.select({ n: speakers.fullName, q: speakers.qualification, src: speakers.qualificationSource, v: speakers.verifiedAt }).from(speakers), null, 1));
  await pool.end();
})();
