import type { ListeningNote, NotebookEntry, Sheet } from "@/db/schema";
import { formatDate, formatDayLong, formatTime } from "./dates";

// Fiche de travail au format Word : un document HTML que Word, LibreOffice et Pages ouvrent comme un .doc.
const STAGE_LABEL = { je_pense: "Je pense", donc: "Donc ?", je_suis: "Je suis" } as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const para = (s: string) => esc(s).replace(/\n/g, "<br>");

export function worksheetDoc(d: {
  sheet: Sheet;
  day: string;
  readerName: string;
  speakerName: string | null;
  entries: NotebookEntry[];
  note: ListeningNote | null;
}): string {
  const { sheet, note } = d;
  const parts: string[] = [];
  parts.push(`<p class="eyebrow">Mon café philo · fiche de travail</p><h1>${esc(sheet.question)}</h1>`);
  parts.push(`<p class="meta">${esc(d.readerName)} · question du ${esc(formatDayLong(d.day).toLowerCase())}${d.speakerName ? ` · avec ${esc(d.speakerName)}` : ""} · ${esc(sheet.theme)}</p>`);
  parts.push(`<h2>Mon cheminement</h2>`);
  for (const e of d.entries) {
    parts.push(`<h3>Version ${e.version} · ${STAGE_LABEL[e.stage]} <span class="meta">(${esc(formatDate(e.createdAt))}, ${esc(formatTime(e.createdAt))})</span></h3><p>${para(e.body)}</p>`);
  }
  if (note && (note.these.trim() || note.arguments.trim() || note.exemples.trim())) {
    parts.push(`<h2>Mes notes d'écoute</h2>`);
    if (note.these.trim()) parts.push(`<p><b>Thèse.</b> ${para(note.these)}</p>`);
    if (note.arguments.trim()) parts.push(`<p><b>Arguments.</b> ${para(note.arguments)}</p>`);
    if (note.exemples.trim()) parts.push(`<p><b>Exemples et objections.</b> ${para(note.exemples)}</p>`);
  }
  const attempt = note?.probleme?.trim();
  if (attempt || sheet.problem) {
    parts.push(`<h2>Le problème à surmonter</h2>`);
    if (attempt) parts.push(`<p><b>Mon problème.</b> ${para(attempt)}</p>`);
    if (sheet.problem) parts.push(`<p><b>Le problème que pose la question.</b> ${para(sheet.problem)}</p>`);
    if (sheet.solutionQuestion) parts.push(`<p><i>${para(sheet.solutionQuestion)}</i></p>`);
  }
  const more = [
    ...(sheet.pressArticles ?? []).map((a) => `${esc(a.side)} : « <a href="${esc(a.url)}">${esc(a.title)}</a> », ${esc(a.source)}${a.author ? `, ${esc(a.author)}` : ""}.`),
    ...(sheet.readings ?? []).map((r) => `${esc(r.philosopher)}, <i>${esc(r.book)}</i>${r.part ? `, ${esc(r.part)}` : ""}.`),
  ];
  if (more.length) parts.push(`<h2>Pour aller plus loin</h2><ul>${more.map((m) => `<li>${m}</li>`).join("")}</ul>`);
  parts.push(`<p class="meta">Mon café philo, une application des Éditions M-Éditer. Fiche personnelle : elle vous appartient.</p>`);

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="fr">
<head><meta charset="utf-8"><title>Fiche de travail</title>
<style>
body { font-family: Georgia, serif; font-size: 12pt; color: #2a2a2d; }
h1 { font-size: 18pt; color: #1e224a; } h2 { font-size: 14pt; color: #943e37; margin-top: 18pt; } h3 { font-size: 12pt; color: #1e224a; margin-bottom: 2pt; }
.eyebrow { font-size: 9pt; letter-spacing: 1pt; text-transform: uppercase; color: #943e37; } .meta { font-size: 10pt; color: #6b6b70; font-weight: normal; }
</style></head>
<body>${parts.join("\n")}</body></html>`;
}

// Nom du fichier : « fiche-de-travail-AAAA-MM-JJ.doc ».
export const worksheetFileName = (day: string) => `fiche-de-travail-${day}.doc`;
