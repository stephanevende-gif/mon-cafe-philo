import { describe, expect, it } from "vitest";
import { computeAccess, nextPaidPeriod, trialPeriod, PAID_DAYS, TRIAL_DAYS } from "@/lib/access";

const DAY = 86400000;
const t0 = new Date("2026-11-01T10:00:00Z");

describe("droits d'accès", () => {
  it("donne 30 jours d'essai puis coupe l'accès", () => {
    const trial = { kind: "essai" as const, ...trialPeriod(t0) };
    expect(computeAccess([trial], new Date(t0.getTime() + 29 * DAY)).active).toBe(true);
    expect(computeAccess([trial], new Date(t0.getTime() + TRIAL_DAYS * DAY)).active).toBe(false);
  });

  it("totalise 365 jours quand on paie pendant l'essai", () => {
    const trial = { kind: "essai" as const, ...trialPeriod(t0) };
    const paid = nextPaidPeriod([trial], new Date(t0.getTime() + 10 * DAY));
    expect(paid.startsAt).toEqual(trial.endsAt);
    expect((paid.endsAt.getTime() - t0.getTime()) / DAY).toBe(TRIAL_DAYS + PAID_DAYS);
    const state = computeAccess([trial, { kind: "paiement", ...paid }], new Date(t0.getTime() + 200 * DAY));
    expect(state).toMatchObject({ active: true, currentKind: "paiement", hadPaid: true });
  });

  it("repart du jour du paiement quand l'accès est échu", () => {
    const trial = { kind: "essai" as const, ...trialPeriod(t0) };
    const late = new Date(t0.getTime() + 60 * DAY);
    const paid = nextPaidPeriod([trial], late);
    expect(paid.startsAt).toEqual(late);
    expect((paid.endsAt.getTime() - late.getTime()) / DAY).toBe(PAID_DAYS);
  });
});
