import "dotenv/config";
// Rattache les auteurs relevés par l'IA (fiches déjà rédigées) à leurs vidéos, avec la présentation reprise de la description YouTube,
// puis complète pour chaque auteur le lien de présentation et le portrait dessiné qui manquent.
import { eq, isNull, or } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets, speakers, videos } from "../src/db/schema";
import { attachAuthor, findProfile } from "../src/lib/automation";
import { drawPortraitFromUrl } from "../src/lib/portrait";

async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const rows = await db.select().from(sheets).where(eq(sheets.aiDrafted, true));
  for (const s of rows) {
    const m = (s.editorialNotes ?? "").match(/Auteur d'après la description YouTube : (.+?) \(à vérifier\)/);
    if (!m || !s.shortVideoId) continue;
    const ids = [s.shortVideoId, s.lectureVideoId].filter((id): id is string => !!id);
    const vs = await Promise.all(ids.map(async (id) => (await db.query.videos.findFirst({ where: eq(videos.id, id) }))!));
    await attachAuthor(db, m[1], vs.map((v) => ({ id: v.id, youtubeId: v.youtubeId, description: v.description })));
  }

  const report: string[] = [];
  for (const sp of await db.select().from(speakers).where(or(isNull(speakers.profileUrl), isNull(speakers.portrait)))) {
    const own = await db.select({ description: videos.description }).from(videos).where(eq(videos.speakerId, sp.id));
    const profileUrl = sp.profileUrl ?? (await findProfile(db, sp.fullName, own));
    const portrait = sp.portrait ?? (sp.photoUrl ? await drawPortraitFromUrl(sp.photoUrl) : null);
    await db.update(speakers).set({ profileUrl, portrait }).where(eq(speakers.id, sp.id));
    report.push(`${sp.fullName} : lien ${profileUrl ?? "à trouver"} ; portrait ${portrait ? "dessiné" : "non dessiné (image inaccessible)"}`);
  }
  console.log(report.join("\n"));
  await pool.end();
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
