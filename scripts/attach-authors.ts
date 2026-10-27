import "dotenv/config";
// Rattache les auteurs relevés par l'IA (fiches déjà rédigées) à leurs vidéos, avec la présentation reprise de la description YouTube,
// puis complète pour chaque auteur le lien de présentation et le portrait (vraie photo) qui manquent.
import { eq } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets, speakers, videos } from "../src/db/schema";
import { attachAuthor, BIO_TODO, findProfile, profileInfo, profilePhoto } from "../src/lib/automation";
import { portraitFromUrl } from "../src/lib/portrait";

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
  // Auteurs sans lien ou sans portrait, ou dont le portrait est encore un ancien dessin (PNG).
  const todo = (await db.select().from(speakers)).filter((sp) => !sp.profileUrl || !sp.portrait || sp.portrait.startsWith("data:image/png"));
  for (const sp of todo) {
    const own = await db.select({ description: videos.description, youtubeId: videos.youtubeId, kind: videos.kind }).from(videos).where(eq(videos.speakerId, sp.id));
    const profileUrl = sp.profileUrl ?? (await findProfile(db, sp.fullName, own));
    const fromVideo = !sp.photoUrl || /i\.ytimg\.com\/vi\/[^/]+\/maxresdefault/.test(sp.photoUrl);
    // Priorité à la photo de la fiche auteur M-Éditer ; sinon l'image d'un Short, recadrée sur le visage.
    const fromProfile = fromVideo ? await profilePhoto(profileUrl, sp.fullName) : null;
    const short = own.find((v) => v.kind === "short");
    const photoUrl = fromProfile ?? (fromVideo && short ? `https://i.ytimg.com/vi/${short.youtubeId}/maxresdefault.jpg` : sp.photoUrl);
    const portrait = photoUrl ? await portraitFromUrl(photoUrl, fetch, { short: !fromProfile && fromVideo }) : null;
    await db.update(speakers).set({ profileUrl, photoUrl, portrait: portrait ?? sp.portrait }).where(eq(speakers.id, sp.id));
    report.push(`${sp.fullName} : lien ${profileUrl ?? "à trouver"} ; photo ${photoUrl?.includes("izibookstore.com") ? "de la fiche auteur M-Éditer" : "d'une vidéo"} ; portrait ${portrait ? "enregistré" : "absent (image inaccessible)"}`);
  }
  // Présentations encore à compléter : reprises de la fiche auteur M-Éditer quand elle en a une.
  for (const sp of await db.select().from(speakers)) {
    if (sp.verifiedAt || sp.qualification !== BIO_TODO) continue;
    const { bio } = await profileInfo(sp.profileUrl, sp.fullName);
    if (bio) await db.update(speakers).set({ qualification: bio, qualificationSource: sp.profileUrl }).where(eq(speakers.id, sp.id));
    report.push(`${sp.fullName} : présentation ${bio ? "reprise de la fiche auteur M-Éditer" : "toujours à compléter"}`);
  }
  console.log(report.join("\n"));
  await pool.end();
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
