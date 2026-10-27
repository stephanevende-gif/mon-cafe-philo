import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { accessPeriods, type AccessPeriod } from "@/db/schema";

export const TRIAL_DAYS = 10;
export const PAID_DAYS = 355;
// Tarif validé par les Éditions M-Éditer le 26 octobre 2026, durées revues le 27 octobre 2026.
export const PRICE_CENTS = 2000;

const DAY_MS = 24 * 60 * 60 * 1000;

type Period = Pick<AccessPeriod, "kind" | "startsAt" | "endsAt">;

export interface AccessState {
  active: boolean;
  // Fin de la période en cours, ou de la dernière période si l'accès est échu.
  endsAt: Date | null;
  currentKind: AccessPeriod["kind"] | null;
  hadPaid: boolean;
}

export function computeAccess(periods: Period[], now: Date): AccessState {
  const current = periods.filter((p) => p.startsAt <= now && now < p.endsAt);
  const lastEnd = periods.reduce<Date | null>((acc, p) => (!acc || p.endsAt > acc ? p.endsAt : acc), null);
  const hadPaid = periods.some((p) => p.kind === "paiement");
  if (current.length === 0) {
    return { active: false, endsAt: lastEnd, currentKind: null, hadPaid };
  }
  // Les périodes peuvent se suivre : l'accès court jusqu'à la fin de la dernière.
  current.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
  return { active: true, endsAt: lastEnd, currentKind: current[0].kind, hadPaid };
}

// Une prolongation commence à la fin de l'accès en cours, jamais avant :
// payer pendant l'essai ne fait perdre aucun jour.
export function nextPaidPeriod(periods: Period[], now: Date): { startsAt: Date; endsAt: Date } {
  const { endsAt } = computeAccess(periods, now);
  const startsAt = endsAt && endsAt > now ? endsAt : now;
  return { startsAt, endsAt: new Date(startsAt.getTime() + PAID_DAYS * DAY_MS) };
}

export function trialPeriod(now: Date): { startsAt: Date; endsAt: Date } {
  return { startsAt: now, endsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS) };
}

export async function getAccess(db: Db, userId: string, now = new Date()): Promise<AccessState> {
  const periods = await db.select().from(accessPeriods).where(eq(accessPeriods.userId, userId));
  return computeAccess(periods, now);
}

export async function startTrial(db: Db, userId: string, now = new Date()) {
  const p = trialPeriod(now);
  await db.insert(accessPeriods).values({ userId, kind: "essai", ...p });
}

export async function grantAccess(
  db: Db,
  userId: string,
  opts: { kind: "paiement" | "attribution"; days?: number; amountCents?: number; reference?: string; note?: string },
  now = new Date(),
) {
  const periods = await db.select().from(accessPeriods).where(eq(accessPeriods.userId, userId));
  const next = nextPaidPeriod(periods, now);
  const endsAt = opts.days ? new Date(next.startsAt.getTime() + opts.days * DAY_MS) : next.endsAt;
  await db.insert(accessPeriods).values({
    userId,
    kind: opts.kind,
    startsAt: next.startsAt,
    endsAt,
    amountCents: opts.amountCents,
    reference: opts.reference,
    note: opts.note,
  });
  return { startsAt: next.startsAt, endsAt };
}
