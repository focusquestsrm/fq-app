import { getProfile, getTenants, getConfig } from "@/lib/queries";
import { isFQ, splitFor } from "@/lib/types";
import { saveTenant, deleteTenant } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SchoolsPage({ searchParams }: { searchParams: { edit?: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Tenant management is FocusQuest-only.</div>;

  const tenants = await getTenants();
  const types = (await getConfig()).filter((c) => c.kind === "type");
  const editing = searchParams.edit ? tenants.find((t) => t.id === searchParams.edit) : undefined;
  const editSplit = editing ? splitFor(editing) : undefined;

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Administration</div>
        <h2>Schools &amp; Tenants</h2>
      </div>

      <div className="card">
        <h3>{editing ? "Edit School" : "Add a School"}</h3>
        <form action={saveTenant} className="form">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="frow f3">
            <div className="field"><label>Institution name</label><input name="name" placeholder="e.g. Texas Southern University" defaultValue={editing?.name ?? ""} required /></div>
            <div className="field"><label>Short code</label><input name="short_code" placeholder="e.g. TSU" maxLength={6} defaultValue={editing?.short_code ?? ""} required /></div>
            <div className="field"><label>Type</label>
              <select name="type" defaultValue={editing?.type ?? types[0]?.value}>{types.map((t) => <option key={t.id}>{t.value}</option>)}</select>
            </div>
          </div>
          <div className="frow f3">
            <div className="field"><label>School %</label><input name="school_share" type="number" defaultValue={editSplit ? Math.round(editSplit.school * 100) : 40} min={0} max={100} /></div>
            <div className="field"><label>FocusQuest %</label><input name="fq_share" type="number" defaultValue={editSplit ? Math.round(editSplit.fq * 100) : 20} min={0} max={100} /></div>
            <div className="field"><label>Primary contact</label><input name="contact" placeholder="Office of Online Programs" defaultValue={editing?.contact ?? ""} /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn gold">{editing ? "Save changes" : "+ Create tenant"}</button>
            {editing
              ? <Link className="btn ghost" href="/schools">Cancel</Link>
              : <button type="reset" className="btn ghost">Clear</button>}
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Institution</th><th>Code</th><th>Type</th><th className="r">School %</th><th>DSA</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {tenants.length === 0 && <tr><td colSpan={7}><div className="empty">No schools yet — add your first above.</div></td></tr>}
            {tenants.map((t) => {
              const sp = splitFor(t);
              return (
                <tr key={t.id}>
                  <td><b>{t.name}</b><div className="muted" style={{ fontSize: 11 }}>{t.contact}</div></td>
                  <td className="mono">{t.short_code}</td>
                  <td><span className={"chip " + (t.type === "HBCU" ? "gold" : "blue")}>{t.type}</span></td>
                  <td className="r mono">{Math.round(sp.school * 100)}%</td>
                  <td>{t.dsa === "Signed" ? <span className="chip green">Signed</span> : <span className="chip amber">{t.dsa}</span>}</td>
                  <td>{t.live ? <span className="chip green">Active</span> : <span className="chip gray">Prospect</span>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Link className="btn sm ghost" href={`/schools?edit=${t.id}`}>Edit</Link>
                      <form action={deleteTenant}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="btn sm danger">Remove</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
