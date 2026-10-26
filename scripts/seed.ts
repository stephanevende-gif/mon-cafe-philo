import "dotenv/config";
import { createDb } from "../src/db";
import { books, sheets } from "../src/db/schema";
import { parisDay } from "../src/lib/dates";

// Données de départ. Les quatre livres sont ceux dont les couvertures ont été fournies par les Éditions M-Éditer.
// Aucun intervenant ni aucune vidéo n'est créé ici : ils doivent être saisis et vérifiés par l'équipe éditoriale.
async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const existing = await db.select({ id: books.id }).from(books).limit(1);
  if (existing.length === 0) {
    await db.insert(books).values([
      { title: "La Culture de l'humanité", subtitle: "Platon, Rousseau et Kant, philosophes de l'éducation", author: "Jean-Marie Frey", isbn: "978-2-36287-205-1", coverUrl: "/couvertures/la-culture-de-l-humanite.jpg" },
      { title: "La Pensée de la mort", author: "Yvon Quiniou", coverUrl: "/couvertures/la-pensee-de-la-mort.jpg" },
      { title: "Ralph Waldo Emerson", subtitle: "Philosophe américain, penseur de la liberté et de la confiance en soi", author: "Julie Cloarec-Michaud", isbn: "978-2-36287-209-9", coverUrl: "/couvertures/ralph-waldo-emerson.jpg" },
      { title: "Au nom du bien : la face cachée du management", subtitle: "Comment le management transforme l'engagement en vulnérabilité", author: "Danièle Linhart", coverUrl: "/couvertures/au-nom-du-bien.jpg" },
    ]);
  }
  if (process.argv.includes("--demo")) {
    // Fiche de démonstration, non publiable telle quelle : à compléter avec un Short réel.
    await db
      .insert(sheets)
      .values({
        day: parisDay(),
        theme: "technique",
        question: "Les machines peuvent-elles penser ?",
        synthesis:
          "Une machine peut produire des raisonnements sans que cela démontre qu'elle comprend ce qu'elle énonce. La question est donc de savoir si penser consiste seulement à traiter des informations ou suppose une expérience du sens.",
        status: "validee",
        editorialNotes: "Fiche de démonstration : Short, conférence et livre à associer.",
      })
      .onConflictDoNothing();
  }
  await pool.end();
  console.log("Données de départ en place.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
