import { timingSafeEqual } from "node:crypto";

// Version de test : quand TESTER_ACCESS_CODE est défini, seules les personnes qui ont reçu ce code peuvent s'inscrire.
export function testerCodeRequired(): boolean {
  return !!process.env.TESTER_ACCESS_CODE?.trim();
}

export function testerCodeOk(given: FormDataEntryValue | null): boolean {
  const expected = process.env.TESTER_ACCESS_CODE?.trim();
  if (!expected) return true;
  const a = Buffer.from(String(given ?? "").trim().toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
