import { describe, expect, it } from "vitest";
import { addDays, formatDayLong, isDay, parisDay } from "@/lib/dates";

describe("jour de Paris", () => {
  it("change à minuit heure de Paris, pas à minuit UTC", () => {
    // 22 h 30 UTC le 26 octobre 2026 = 23 h 30 à Paris (heure d'hiver) : encore le 26.
    expect(parisDay(new Date("2026-10-26T22:30:00Z"))).toBe("2026-10-26");
    // 23 h 05 UTC = 0 h 05 à Paris : déjà le 27.
    expect(parisDay(new Date("2026-10-26T23:05:00Z"))).toBe("2026-10-27");
    // Heure d'été : minuit à Paris = 22 h UTC.
    expect(parisDay(new Date("2026-07-14T22:00:00Z"))).toBe("2026-07-15");
  });

  it("valide et additionne les jours", () => {
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("26/10/2026")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(formatDayLong("2026-10-26")).toBe("Lundi 26 octobre 2026");
  });
});
