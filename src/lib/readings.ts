import type { Reading } from "@/db/schema";

// Trois lectures au plus, chacune complète, aux longueurs bornées.
export function cleanReadings(list: Reading[]): Reading[] {
  return list
    .map((r) => ({ philosopher: r.philosopher.trim().slice(0, 120), book: r.book.trim().slice(0, 200), description: r.description.trim().slice(0, 500) }))
    .filter((r) => r.philosopher && r.book && r.description)
    .slice(0, 3);
}
