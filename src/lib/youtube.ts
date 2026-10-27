// Accepte un identifiant YouTube ou une adresse (watch, youtu.be, shorts, embed).
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return check(u.pathname.slice(1));
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return check(u.searchParams.get("v")!);
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

function check(id: string): string | null {
  return /^[\w-]{11}$/.test(id) ? id : null;
}

export function parseDuration(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// Titre affiché dans l'application : sans les hashtags (#philosophie) ni les emojis ajoutés pour YouTube.
// Le titre exact reste enregistré tel quel (il sert à retrouver les vidéos).
export function cleanTitle(title: string): string {
  const cleaned = title
    .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, " ")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([?!.,;:])$/u, " $1")
    .trim();
  return cleaned || title.trim();
}
