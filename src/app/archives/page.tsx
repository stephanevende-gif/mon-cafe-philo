import Link from "next/link";
import { db } from "@/db";
import { AccessEnded } from "@/components/AccessEnded";
import { currentAccess, requireUser } from "@/lib/auth";
import { formatDayLong, isDay, parisDay } from "@/lib/dates";
import { archiveFacets, searchArchives } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Archives" };

type SP = { q?: string; theme?: string; intervenant?: string; du?: string; au?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("/archives");
  if (!(await currentAccess())?.active) return <main className="page"><AccessEnded /></main>;
  const sp = await searchParams;
  const today = parisDay();
  const filters = {
    q: sp.q?.trim().slice(0, 100) || undefined,
    theme: sp.theme || undefined,
    speaker: sp.intervenant && /^[0-9a-f-]{36}$/.test(sp.intervenant) ? sp.intervenant : undefined,
    from: sp.du && isDay(sp.du) ? sp.du : undefined,
    to: sp.au && isDay(sp.au) ? sp.au : undefined,
  };
  const [rows, facets] = await Promise.all([searchArchives(db, filters, today), archiveFacets(db, today)]);

  return (
    <main className="page">
      <div className="stack-lg">
        <div className="stack">
          <h1 className="page-title">Archives philosophiques</h1>
          <p className="muted">Toutes les questions déjà publiées, avec leur piste, leurs vidéos, leur livre et votre carnet.</p>
        </div>
        <form className="filters" method="get" role="search">
          <label>Mot-clé ou concept<input type="search" name="q" id="q" defaultValue={sp.q ?? ""} /></label>
          <label>
            Thème
            <select name="theme" id="theme" defaultValue={sp.theme ?? ""}>
              <option value="">Tous</option>
              {facets.themes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Intervenant
            <select name="intervenant" id="intervenant" defaultValue={sp.intervenant ?? ""}>
              <option value="">Tous</option>
              {facets.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Du<input type="date" name="du" id="du" defaultValue={sp.du ?? ""} /></label>
          <label>Au<input type="date" name="au" id="au" defaultValue={sp.au ?? ""} /></label>
          <button className="btn primary" type="submit">Rechercher</button>
        </form>
        <p className="small muted" aria-live="polite">{rows.length} question{rows.length > 1 ? "s" : ""}</p>
        <div className="list">
          {rows.map((r) => (
            <Link className="item" key={r.id} href={`/question/${r.day}`}>
              <span className="small muted">{formatDayLong(r.day!)} · {r.theme}{r.speakerName ? ` · ${r.speakerName}` : ""}</span>
              <span className="q">{r.question}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
