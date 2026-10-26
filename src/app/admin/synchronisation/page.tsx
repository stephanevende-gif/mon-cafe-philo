import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sheets, syncRuns } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { syncNow } from "@/app/actions/admin";
import { aiEnabled } from "@/lib/ai";
import { DEFAULT_PLAYLIST } from "@/lib/automation";
import { formatDate, formatTime } from "@/lib/dates";

type Props = { searchParams: Promise<{ message?: string }> };

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return ok ? <span className="tag ok">{yes}</span> : <span className="tag warn">{no}</span>;
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const [runs, queue] = await Promise.all([
    db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(20),
    db.select().from(sheets).where(and(isNull(sheets.day), eq(sheets.status, "a_verifier"))).orderBy(desc(sheets.createdAt)),
  ]);
  const playlist = process.env.YOUTUBE_PLAYLIST_ID || DEFAULT_PLAYLIST;
  return (
    <div className="stack-lg">
      <h1 className="page-title">Synchronisation YouTube</h1>
      <p className="muted">
        Chaque heure, l&apos;application lit la playlist, prépare une fiche « à vérifier » pour chaque nouveau Short et garantit une fiche
        validée pour aujourd&apos;hui et demain. Rien n&apos;est publié sans votre validation : sans fiche validée, une ancienne fiche est rediffusée.
      </p>
      <Notice code={sp.message} />

      <section className="field-group">
        <h2>Configuration</h2>
        <p>Clé YouTube : <Status ok={!!process.env.YOUTUBE_API_KEY} yes="configurée" no="manquante" /></p>
        <p>Tâche programmée : <Status ok={(process.env.CRON_SECRET ?? "").length >= 16} yes="secret configuré" no="secret manquant" /></p>
        <p>Assistance IA (facultative) : <Status ok={aiEnabled()} yes="activée" no="désactivée" /></p>
        <p>Playlist : <a href={`https://www.youtube.com/playlist?list=${playlist}`} target="_blank" rel="noopener noreferrer">{playlist}</a></p>
        <form action={syncNow}>
          <button className="btn primary" type="submit">Synchroniser maintenant</button>
        </form>
      </section>

      <section className="stack">
        <h2>File éditoriale ({queue.length})</h2>
        <p className="muted">Fiches préparées automatiquement, en attente de relecture et d&apos;une date.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Détectée le</th><th>Question</th><th>Origine</th></tr></thead>
            <tbody>
              {queue.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.createdAt)}</td>
                  <td><Link href={`/admin/fiches/${s.id}`}>{s.question}</Link></td>
                  <td>{s.aiDrafted ? <span className="tag warn">proposée par l&apos;IA</span> : <span className="tag neutral">à rédiger</span>}</td>
                </tr>
              ))}
              {queue.length === 0 && <tr><td colSpan={3}>La file est vide.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack">
        <h2>Journal</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Tâche</th><th>Résultat</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.startedAt)} {formatTime(r.startedAt)}</td>
                  <td>{r.kind === "youtube" ? "Lecture de la playlist" : "Programmation"}</td>
                  <td>{r.ok === false ? <span className="tag warn">échec : {r.error}</span> : r.summary ?? "en cours"}</td>
                </tr>
              ))}
              {runs.length === 0 && <tr><td colSpan={3}>Aucune exécution pour l&apos;instant.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
