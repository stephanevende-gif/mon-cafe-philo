import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { planDay, syncPlaylist } from "@/lib/automation";
import { parseIsoDuration, linkedVideoIds } from "@/lib/youtube-api";
import { sheets, speakers, syncRuns, videos } from "@/db/schema";
import { testDb } from "./helpers";

// Fausse API YouTube : aucune donnée réelle, uniquement pour vérifier la logique.
const CH = "UC_chaine_test";
const vids: Record<string, { title: string; description: string; publishedAt: string; duration: string; channelId: string }> = {
  shortAAAAA1: { title: "Short A", description: "Conférence complète : https://youtu.be/longLLLLLL1", publishedAt: "2026-10-26T08:00:00Z", duration: "PT1M50S", channelId: CH },
  shortBBBBB2: { title: "Short B", description: "Sans lien", publishedAt: "2026-10-26T15:00:00Z", duration: "PT2M10S", channelId: CH },
  shortCCCCC3: { title: "Short C", description: "https://www.youtube.com/watch?v=autreCHAIN4", publishedAt: "2026-10-27T09:00:00Z", duration: "PT59S", channelId: CH },
  tropLONGGG5: { title: "Pas un Short", description: "", publishedAt: "2026-10-27T10:00:00Z", duration: "PT12M", channelId: CH },
  longLLLLLL1: { title: "Conférence A", description: "", publishedAt: "2025-01-01T10:00:00Z", duration: "PT48M10S", channelId: CH },
  autreCHAIN4: { title: "Vidéo d'une autre chaîne", description: "", publishedAt: "2025-01-01T10:00:00Z", duration: "PT40M", channelId: "UC_autre" },
};
let playlist = ["shortAAAAA1", "shortBBBBB2"];

const fakeFetch = (async (input: URL | RequestInfo) => {
  const url = new URL(String(input));
  if (url.pathname.endsWith("/playlistItems")) {
    return Response.json({ items: playlist.map((id) => ({ contentDetails: { videoId: id, videoPublishedAt: vids[id].publishedAt } })) });
  }
  const ids = url.searchParams.get("id")!.split(",");
  return Response.json({
    items: ids.filter((id) => vids[id]).map((id) => ({
      id,
      snippet: { title: vids[id].title, description: vids[id].description, publishedAt: vids[id].publishedAt, channelId: vids[id].channelId },
      contentDetails: { duration: vids[id].duration },
    })),
  });
}) as typeof fetch;

let ctx: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => {
  ctx = await testDb();
});
afterAll(() => ctx.close());

describe("outils YouTube", () => {
  it("lit les durées ISO et les liens d'une description", () => {
    expect(parseIsoDuration("PT2M41S")).toBe(161);
    expect(parseIsoDuration("PT1H")).toBe(3600);
    expect(linkedVideoIds("Voir https://youtu.be/longLLLLLL1 et https://exemple.fr", "x")).toEqual(["longLLLLLL1"]);
  });
});

describe("synchronisation de la playlist", () => {
  it("programme le plus récent Short du jour à J+1 et met les autres en file", async () => {
    const r = await syncPlaylist(ctx.db, { apiKey: "test", fetchImpl: fakeFetch, now: new Date("2026-10-26T18:00:00Z") });
    expect(r).toMatchObject({ newShorts: 2, scheduled: ["2026-10-27"], queued: 1, lecturesFound: 1 });
    const scheduled = await ctx.db.query.sheets.findFirst({ where: eq(sheets.day, "2026-10-27") });
    expect(scheduled?.status).toBe("a_verifier");
    const short = await ctx.db.query.videos.findFirst({ where: eq(videos.id, scheduled!.shortVideoId!) });
    expect(short?.youtubeId).toBe("shortBBBBB2");
    // Short A cite une conférence de la même chaîne : elle est rattachée à sa fiche.
    const shortA = await ctx.db.query.videos.findFirst({ where: eq(videos.youtubeId, "shortAAAAA1") });
    const sheetA = await ctx.db.query.sheets.findFirst({ where: eq(sheets.shortVideoId, shortA!.id) });
    expect(sheetA?.day).toBeNull();
    expect(sheetA?.lectureVideoId).not.toBeNull();
    expect(sheetA?.question).toContain("[Question à rédiger]");
  });

  it("ignore les vidéos déjà connues, les vidéos longues et les conférences d'autres chaînes", async () => {
    playlist = ["shortAAAAA1", "shortBBBBB2", "shortCCCCC3", "tropLONGGG5"];
    const r = await syncPlaylist(ctx.db, { apiKey: "test", fetchImpl: fakeFetch, now: new Date("2026-10-27T12:00:00Z") });
    expect(r.newShorts).toBe(1);
    expect(r.lecturesFound).toBe(0);
    expect(r.skipped.join()).toContain("Pas un Short");
    const runs = await ctx.db.select().from(syncRuns);
    expect(runs.every((x) => x.ok)).toBe(true);
  });

  it("utilise les propositions de l'IA sans jamais valider la fiche", async () => {
    vids.shortDDDDD6 = { title: "Short D", description: "Un philosophe parle du temps.", publishedAt: "2026-10-28T08:00:00Z", duration: "PT1M", channelId: CH };
    playlist.push("shortDDDDD6");
    await syncPlaylist(ctx.db, {
      apiKey: "test",
      fetchImpl: fakeFetch,
      now: new Date("2026-10-28T12:00:00Z"),
      propose: async () => ({ theme: "Temps", question: "Le temps passe-t-il ?", synthesis: null, missing: "La thèse de l'intervenant n'est pas explicite." }),
    });
    const s = await ctx.db.query.sheets.findFirst({ where: eq(sheets.day, "2026-10-29") });
    expect(s).toMatchObject({ theme: "temps", question: "Le temps passe-t-il ?", status: "a_verifier", aiDrafted: true, synthesis: null });
    expect(s?.editorialNotes).toContain("pas explicite");
  });

  it("enregistre l'échec d'une synchronisation", async () => {
    const broken = (async () => new Response("quota", { status: 403 })) as unknown as typeof fetch;
    await expect(syncPlaylist(ctx.db, { apiKey: "test", fetchImpl: broken })).rejects.toThrow("403");
    const runs = await ctx.db.select().from(syncRuns);
    expect(runs.some((x) => x.ok === false && x.error?.includes("403"))).toBe(true);
  });
});

describe("programmation quotidienne", () => {
  it("replace en file une fiche non validée et rediffuse une fiche validée variée", async () => {
    const [sp1] = await ctx.db.insert(speakers).values({ fullName: "Intervenant 1", qualification: "q" }).returning();
    const [sp2] = await ctx.db.insert(speakers).values({ fullName: "Intervenant 2", qualification: "q" }).returning();
    const mk = async (yt: string, speakerId: string, day: string, theme: string) => {
      const [v] = await ctx.db.insert(videos).values({ youtubeId: yt, kind: "short", title: yt, speakerId }).returning();
      const [s] = await ctx.db.insert(sheets).values({ day, theme, question: `Q ${theme}`, synthesis: "s", shortVideoId: v.id, status: "validee" }).returning();
      return s;
    };
    const old = await mk("ancienAAA01", sp1.id, "2026-07-01", "liberté");
    await mk("recentBBB02", sp1.id, "2026-10-20", "vérité");
    await mk("recentCCC03", sp2.id, "2026-10-25", "bonheur");

    // Le 27 octobre a une fiche « à vérifier » issue de la synchronisation.
    const r = await planDay(ctx.db, "2026-10-27");
    expect(r.action).toBe("rediffusion");
    expect(r.movedToQueue).toBeDefined();
    const replay = await ctx.db.query.sheets.findFirst({ where: eq(sheets.day, "2026-10-27") });
    // Seule la fiche de juillet n'a pas été publiée dans les 60 derniers jours.
    expect(replay).toMatchObject({ status: "validee", replayOf: old.id, question: "Q liberté" });

    expect((await planDay(ctx.db, "2026-10-27")).action).toBe("deja_prete");
    // Le lendemain, plus aucune fiche ancienne disponible : la fiche de secours prendra le relais.
    expect((await planDay(ctx.db, "2026-10-28")).action).toBe("aucune");
  });
});
