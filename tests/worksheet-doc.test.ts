import { describe, expect, it } from "vitest";
import { worksheetDoc, worksheetFileName } from "@/lib/worksheet-doc";
import type { NotebookEntry, Sheet } from "@/db/schema";

describe("fiche de travail au format Word", () => {
  it("reprend les versions du lecteur, échappées, et les lectures", () => {
    const sheet = { question: "Juger ou calculer ?", theme: "la raison", problem: "P.", solutionQuestion: "S ?", pressArticles: [{ title: "A", source: "The Conversation", url: "https://theconversation.com/a", side: "Juger", description: "D." }], readings: null } as unknown as Sheet;
    const entries = [{ id: "1", version: 1, stage: "je_pense", body: "Je pense <b>fort</b>\net long", createdAt: new Date("2026-10-29T08:00:00Z") }] as unknown as NotebookEntry[];
    const html = worksheetDoc({ sheet, day: "2026-10-29", readerName: "Camille", speakerName: null, entries, note: { these: "T", arguments: "", exemples: "", probleme: "Mon P" } });
    expect(html).toContain("Je pense &lt;b&gt;fort&lt;/b&gt;<br>et long");
    expect(html).toContain("<b>Mon problème.</b> Mon P");
    expect(html).toContain('href="https://theconversation.com/a"');
    expect(worksheetFileName("2026-10-29")).toBe("fiche-de-travail-2026-10-29.doc");
  });
});
