import { getProfile, getTenants, getScope, getPrograms, getConfig } from "@/lib/queries";
import { fmt } from "@/lib/format";
import { createProgram, deleteProgram, updateProgramField } from "./actions";
import { InlineNumber } from "@/components/InlineNumber";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);
  if (!scope) return <div className="empty">Create a school first (Tenant Management).</div>;

  const programs = await getPrograms(scope);
  const providers = (await getConfig()).filter((c) => c.kind === "provider");

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Configuration</div>
        <h2>Program catalog</h2>
        <p>Add each program with its provider, tuition and cohort goal. Cost and cohort size are editable inline and feed every financial total.</p>
      </div>

      <div className="card">
        <h3>Add a program</h3>
        <form action={createProgram} className="form">
          <input type="hidden" name="tenant_id" value={scope} />
          <div className="frow f3">
            <div className="field"><label>Program name</label><input name="name" placeholder="e.g. Medical Assistant" required /></div>
            <div className="field"><label>Provider / publisher</label>
              <input name="provider" list="providerlist" placeholder="type or pick" />
              <datalist id="providerlist">{providers.map((p) => <option key={p.id} value={p.value} />)}</datalist>
            </div>
            <div className="field"><label>Certification</label><input name="cert" placeholder="e.g. CCMA (NHA)" /></div>
          </div>
          <div className="frow f3">
            <div className="field"><label>Tuition ($)</label><input name="cost" type="number" defaultValue={0} /></div>
            <div className="field"><label>Cohort goal</label><input name="goal" type="number" defaultValue={0} /></div>
            <div className="field"><label>Enrollment cap</label><input name="cap" type="number" defaultValue={0} /></div>
          </div>
          <div className="frow f3">
            <div className="field"><label>Delivery</label>
              <select name="delivery"><option>Online</option><option>Hybrid</option><option>In-person</option></select>
            </div>
            <div className="field"><label>Category</label>
              <select name="category"><option>Allied Health</option><option>Technology</option><option>Skilled Trades</option><option>Supportive Service</option></select>
            </div>
            <div className="field"><label>Funding (comma-separated)</label><input name="funding" placeholder="Workforce, ETPL, Cash" /></div>
          </div>
          <div><button className="btn gold">+ Add program to catalog</button></div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Program</th><th>Provider</th><th className="r">Tuition</th><th>Delivery</th><th className="r">Cohort goal</th><th>Cert</th><th></th></tr></thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={7}><div className="empty">No programs yet — add your first above.</div></td></tr>}
            {programs.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b><div className="muted" style={{ fontSize: 11 }}>{p.weeks}w · {p.hours}h</div></td>
                <td>{p.provider || "—"}</td>
                <td className="r"><InlineNumber id={p.id} field="cost" value={p.cost} action={updateProgramField} prefix="$" /></td>
                <td><span className={"chip " + (p.delivery === "Hybrid" ? "amber" : p.delivery === "In-person" ? "gray" : "blue")}>{p.delivery}</span></td>
                <td className="r"><InlineNumber id={p.id} field="goal" value={p.goal} action={updateProgramField} /></td>
                <td style={{ fontSize: 11.5 }}>{p.cert}</td>
                <td>
                  <form action={deleteProgram}><input type="hidden" name="id" value={p.id} /><button className="btn sm danger">✕</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
