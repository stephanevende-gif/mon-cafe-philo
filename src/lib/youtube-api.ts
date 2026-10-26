import { parseYouTubeId } from "./youtube";

// Accès en lecture à l'API officielle YouTube Data v3 (quota standard, aucune donnée réhébergée).
const API = "https://www.googleapis.com/youtube/v3";

export type Fetch = typeof fetch;

export interface PlaylistEntry {
  videoId: string;
  publishedAt: Date | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  durationSeconds: number | null;
  channelId: string;
}

export class YouTubeError extends Error {}

async function call(fetchImpl: Fetch, path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(k, v);
  const res = await fetchImpl(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new YouTubeError(`YouTube ${path} : HTTP ${res.status} ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function listPlaylist(fetchImpl: Fetch, apiKey: string, playlistId: string, maxPages = 40): Promise<PlaylistEntry[]> {
  const out: PlaylistEntry[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const data = await call(
      fetchImpl,
      "playlistItems",
      { part: "contentDetails", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) },
      apiKey,
    );
    for (const item of data.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (id) out.push({ videoId: id, publishedAt: item.contentDetails.videoPublishedAt ? new Date(item.contentDetails.videoPublishedAt) : null });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function getVideos(fetchImpl: Fetch, apiKey: string, ids: string[]): Promise<VideoInfo[]> {
  const out: VideoInfo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await call(fetchImpl, "videos", { part: "snippet,contentDetails", id: ids.slice(i, i + 50).join(",") }, apiKey);
    for (const v of data.items ?? []) {
      out.push({
        id: v.id,
        title: v.snippet?.title ?? "",
        description: v.snippet?.description ?? "",
        publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : null,
        durationSeconds: parseIsoDuration(v.contentDetails?.duration ?? ""),
        channelId: v.snippet?.channelId ?? "",
      });
    }
  }
  return out;
}

// « PT1H2M3S » → 3723
export function parseIsoDuration(value: string): number | null {
  const m = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m || value === "P" || value === "PT") return null;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

// Liens YouTube présents dans une description (conférence longue, extraits…), dans l'ordre d'apparition.
export function linkedVideoIds(description: string, exclude?: string): string[] {
  const urls = description.match(/https?:\/\/[^\s)>\]"']+/g) ?? [];
  const ids = urls.map((u) => parseYouTubeId(u)).filter((id): id is string => !!id && id !== exclude);
  return [...new Set(ids)];
}
