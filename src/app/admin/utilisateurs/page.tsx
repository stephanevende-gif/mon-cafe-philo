import { desc, ilike } from "drizzle-orm";
import { db } from "@/db";
import { accessPeriods, users } from "@/db/schema";
import { Notice } from "@/components/Notice";
import { adminGrant, adminRole, adminSuspend } from "@/app/actions/admin";
import { computeAccess } from "@/lib/access";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";

type Props = { searchParams: Promise<{ message?: string; q?: string }> };

export default async function Page({ searchParams }: Props) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100);
  const list = await db
    .select()
    .from(users)
    .where(q ? ilike(users.email, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(100);
  const periods = await db.select().from(accessPeriods);
  const now = new Date();

  return (
    <div className="stack-lg">
      <h1 className="page-title">Utilisateurs</h1>
      <Notice code={sp.message} />
      <form method="get" className="row" role="search">
        <label style={{ flex: 1, minWidth: 220 }}>Rechercher une adresse<input type="search" name="q" id="q" defaultValue={q ?? ""} /></label>
        <button className="btn" type="submit" style={{ alignSelf: "end" }}>Rechercher</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Compte</th><th>Accès</th><th>Rôle</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((u) => {
              const a = computeAccess(periods.filter((p) => p.userId === u.id), now);
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    {u.displayName}<br /><span className="small muted">{u.email}</span><br />
                    <span className="small muted">inscrit le {formatDate(u.createdAt)}</span>
                    {u.suspendedAt && <><br /><span className="tag warn">suspendu</span></>}
                  </td>
                  <td>{a.active ? `${a.currentKind === "essai" ? "Essai" : "Actif"} jusqu'au ${formatDate(a.endsAt!)}` : "Expiré"}</td>
                  <td>
                    {self ? u.role : (
                      <form action={adminRole} className="row">
                        <input type="hidden" name="id" value={u.id} />
                        <select name="role" defaultValue={u.role} aria-label="Rôle">
                          <option value="membre">membre</option><option value="editeur">éditeur</option><option value="admin">admin</option>
                        </select>
                        <button className="btn small" type="submit">Changer</button>
                      </form>
                    )}
                  </td>
                  <td>
                    <div className="stack" style={{ gap: 8 }}>
                      <form action={adminGrant} className="row">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="number" name="jours" defaultValue={335} min={1} max={1000} aria-label="Jours offerts" style={{ width: 90 }} />
                        <input type="text" name="note" placeholder="motif" aria-label="Motif" style={{ width: 140 }} />
                        <button className="btn small" type="submit">Offrir</button>
                      </form>
                      {!self && (
                        <form action={adminSuspend} className="row">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="action" value={u.suspendedAt ? "retablir" : "suspendre"} />
                          {!u.suspendedAt && <input type="text" name="motif" placeholder="motif" aria-label="Motif de suspension" style={{ width: 140 }} />}
                          <button className="btn small" type="submit">{u.suspendedAt ? "Rétablir" : "Suspendre"}</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
