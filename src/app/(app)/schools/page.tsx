import { getProfile, getTenants, getConfig } from "@/lib/queries";
import { isFQ, splitFor } from "@/lib/types";
import { createTenant, deleteTenant } from "./actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Tenant management is FocusQuest-only.</div>;

  const tenants = await getTenants();
  const types = (await getConfig()).filter((c) => c.kind === "type");

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Administration</div>
        <h2>Schools &amp; tenants</h2>
        <p>Each school is an isolated tenant with its own students, programs, financials and users. Enter the revenue split directly — provider share is the remainder.</p>
      </div>

      <div className="card">
        <h3>Add a school</h3>
        <form action={createTenant} className="form">
          <div className="frow f3">
            <div className="field"><label>Institution name</label><input name="name" placeholder="e.g. Texas Southern University" required /></div>
            <div className="field"><label>Short code</label><input name="short_code" placeholder="e.g. TSU" maxLength={6} required /></div>
            <div className="field"><label>Type</label>
              <select name="type">{types.map((t) => <option key={t.id}>{t.value}</option>)}</select>
            </div>
          </div>
          <div className="frow f3">
            <div className="field"><label>School %</label><input name="school_share" type="number" defaultValue={40} min={0} max={100} /></div>
            <div className="field"><label>FocusQuest %</label><input name="fq_share" type="number" defaultValue={20} min={0} max={100} /></div>
            <div className="field"><label>Primary contact</label><input name="contact" placeholder="Office of Online Programs" /></div>
          </div>
          <div><button className="btn gold">+ Create tenant</button></div>
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
                    <form action={deleteTenant}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn sm danger">Remove</button>
                    </form>
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
