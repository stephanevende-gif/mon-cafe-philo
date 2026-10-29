import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addEntry } from "@/lib/notebook";
import { listWorkedSheets } from "@/lib/my-sheets";
import { sheets, users } from "@/db/schema";
import { testDb } from "./helpers";

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(async () => ctx.close());

describe("mes fiches", () => {
  it("liste les questions travaillées par le lecteur, et seulement les siennes", async () => {
    const { db } = ctx;
    const [moi, autre] = await db.insert(users).values([{ email: "moi@example.org", passwordHash: "x", displayName: "Moi" }, { email: "autre@example.org", passwordHash: "x", displayName: "Autre" }]).returning();
    const [a, b, c] = await db.insert(sheets).values(["A ?", "B ?", "C ?"].map((question) => ({ theme: "la liberté", question, status: "validee" as const }))).returning();
    await addEntry(db, moi.id, a.id, "je_pense", "1");
    await addEntry(db, moi.id, a.id, "donc", "2");
    await addEntry(db, moi.id, b.id, "je_pense", "1");
    await addEntry(db, autre.id, c.id, "je_pense", "1");
    const rows = await listWorkedSheets(db, moi.id);
    expect(rows.map((r) => [r.question, r.versions]).sort()).toEqual([["A ?", 2], ["B ?", 1]]);
  });
});
