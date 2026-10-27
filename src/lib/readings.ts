import type { Reading } from "@/db/schema";

// Garde la couverture déjà trouvée pour un livre resté le même après modification de la fiche.
export function keepCovers(next: Reading[], previous: Reading[] | null | undefined): Reading[] {
  return next.map((r) => {
    const same = previous?.find((p) => p.cover && p.philosopher === r.philosopher && p.book === r.book);
    return same ? { ...r, cover: same.cover } : r;
  });
}

// Trois lectures au plus, chacune complète, aux longueurs bornées.
export function cleanReadings(list: (Omit<Reading, "part"> & { part?: string | null })[]): Reading[] {
  return list
    .map((r) => ({
      philosopher: r.philosopher.trim().slice(0, 120),
      book: r.book.trim().slice(0, 200),
      description: r.description.trim().slice(0, 500),
      ...(r.part?.trim() ? { part: r.part.trim().slice(0, 300) } : {}),
      ...(r.cover?.startsWith("data:image/") ? { cover: r.cover } : {}),
    }))
    .filter((r) => r.philosopher && r.book && r.description)
    .slice(0, 3);
}
