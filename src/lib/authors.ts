// Présentation de l'auteur reprise telle quelle de la description YouTube (ligne « 🎓 … est … »).
// Rien n'est rédigé ni complété : si la description ne présente pas l'auteur, on ne renvoie rien.

const URL_RE = /https?:\/\/\S+/g;
const DECOR_RE = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

export function authorBio(description: string | null | undefined, name: string): string | null {
  if (!description || !name.trim()) return null;
  const lastName = name.trim().split(/\s+/).pop()!.toLowerCase();
  for (const raw of description.split("\n")) {
    if (!raw.includes("🎓")) continue;
    const line = raw
      .replace(URL_RE, "")
      .replace(DECOR_RE, "")
      .replace(/^\s*À propos\s*:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[\s:;,-]+$/, "");
    if (!line.toLowerCase().includes(lastName)) continue;
    if (!/\b(est|était|a été|enseigne|né|née)\b/.test(line)) continue;
    return line.endsWith(".") ? line : `${line}.`;
  }
  return null;
}

// Lien « En savoir plus sur l'auteur » donné dans la description, s'il existe.
export function authorLink(description: string | null | undefined): string | null {
  if (!description) return null;
  const m = description.match(/En savoir plus sur l.auteur[^\n]*?(https?:\/\/\S+)/i);
  return m ? m[1] : null;
}

const PUBLISHER_AUTHOR_RE = /https?:\/\/m-editer\.izibookstore\.com\/auteur\/[^\s)"'<>]+/gi;

export function isPublisherPage(url: string): boolean {
  return /^https?:\/\/m-editer\.izibookstore\.com\/auteur\//i.test(url);
}

const fold = (s: string) =>
  decodeURIComponent(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

// Fiche auteur des Éditions M-Éditer citée dans l'une des descriptions, dont l'adresse porte le nom de l'auteur.
export function publisherPage(descriptions: (string | null | undefined)[], name: string): string | null {
  const wanted = fold(name);
  if (!wanted) return null;
  for (const d of descriptions) {
    for (const url of d?.match(PUBLISHER_AUTHOR_RE) ?? []) {
      const slug = url.split("/").pop() ?? "";
      let folded = "";
      try {
        folded = fold(slug);
      } catch {
        continue;
      }
      if (folded === wanted) return url.replace(/^http:\/\//i, "https://");
    }
  }
  return null;
}

// Photo de l'auteur sur sa fiche (page HTML) : image de partage (og:image), sinon première image dont
// le texte alternatif ou l'adresse porte le nom de l'auteur. Rien n'est renvoyé si la page n'en a pas.
export function photoFromProfilePage(html: string, pageUrl: string, name: string): string | null {
  const abs = (src: string) => {
    try {
      return new URL(src.replace(/&amp;/g, "&"), pageUrl).toString().replace(/^http:\/\//i, "https://");
    } catch {
      return null;
    }
  };
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og && !/logo/i.test(og[1])) return abs(og[1]);
  const wanted = fold(name.split(/\s+/).pop() ?? "");
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
    if (!src || /logo|icon|sprite/i.test(src)) continue;
    let hay = "";
    try {
      hay = fold(alt) + fold(src);
    } catch {
      hay = fold(alt);
    }
    if (wanted && hay.includes(wanted)) return abs(src);
  }
  return null;
}
