import { getProfile, getTenants, getScope, getPrograms, getConfig } from "@/lib/queries";
import { saveProgram, deleteProgram, updateProgramField } from "./actions";
import { InlineNumber } from "@/components/InlineNumber";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({ searchParams }: { searchParams: { edit?: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);
  if (!scope) return <div className="empty">Create a school first (Tenant Management).</div>;

  const programs = await getPrograms(scope);
  const config = await getConfig();
  const providers = config.filter((c) => c.kind === "provider");
  const categories = config.filter((c) => c.kind === "category");
  const funding = config.filter((c) => c.kind === "funding");

  const editing = searchParams.edit ? programs.find((p) => p.id === searchParams.edit) : undefined;

  // Include the editing record's current values even if they're no longer in the lists.
  const catValues = categories.map((c) => c.value);
  const catOptions = editing?.category && !catValues.includes(editing.category)
    ? [editing.category, ...catValues] : catValues;
  const editFunding = editing?.funding ?? [];
  const fundOptions = Array.from(new Set([...funding.map((c) => c.value), ...editFunding]));

  return (
    <>
      <div className="pagehead">
        <h2>Program Catalog</h2>
      </div>

      <div className="card">
        <h3>{editing ? "Edit Program" : "Add a Program"}</h3>
        <form action={saveProgram} className="form">
          <input type="hidden" name="tenant_id" value={scope} />
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="frow f3">
            <div className="field"><label>Program name</label><input name="name" placeholder="e.g. Medical Assistant" defaultValue={editing?.name ?? ""} required /></div>
            <div className="field"><label>Provider / publisher</label>
              <input name="provider" list="providerlist" placeholder="type or pick" defaultValue={editing?.provider ?? ""} />
              <datalist id="providerlist">{providers.map((p) => <option key={p.id} value={p.value} />)}</datalist>
            </div>
            <div className="field"><label>Certification</label><input name="cert" placeholder="e.g. CCMA (NHA)" defaultValue={editing?.cert ?? ""} /></div>
          </div>
          <div className="frow f3">
            <div className="field"><label>Tuition ($)</label><input name="cost" type="number" defaultValue={editing?.cost ?? 0} /></div>
            <div className="field"><label>Cohort goal</label><input name="goal" type="number" defaultValue={editing?.goal ?? 0} /></div>
            <div className="field"><label>Enrollment cap</label><input name="cap" type="number" defaultValue={editing?.cap ?? 0} /></div>
          </div>
          <div className="frow f3">
            <div className="field"><label>Delivery</label>
              <select name="delivery" defaultValue={editing?.delivery ?? "Online"}>
                <option>Online</option><option>Hybrid</option><option>In-person</option>
              </select>
            </div>
            <div className="field"><label>Category</label>
              <select name="category" defaultValue={editing?.category ?? catOptions[0] ?? ""}>
                {catOptions.length === 0 && <option value="">— add categories in Configuration —</option>}
                {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Funding (select one or more)</label>
              <select name="funding" multiple defaultValue={editFunding} size={Math.min(Math.max(fundOptions.length, 2), 4)}>
                {fundOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn gold">{editing ? "Save changes" : "+ Add program to catalog"}</button>
            {editing
              ? <Link className="btn ghost" href="/programs">Cancel</Link>
              : <button type="reset" className="btn ghost">Clear</button>}
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Program</th><th>Provider</th><th className="r">Tuition</th><th>Delivery</th><th className="r">Cohort goal</th><th>Cert</th><th></th></tr></thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={7}><div className="empty">No programs yet — add your first above.</div></td></tr>}
            {programs.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b><div className="muted" style={{ fontSize: 11 }}>{p.category || "—"}{p.funding?.length ? " · " + p.funding.join(", ") : ""}</div></td>
                <td>{p.provider || "—"}</td>
                <td className="r"><InlineNumber id={p.id} field="cost" value={p.cost} action={updateProgramField} prefix="$" /></td>
                <td><span className={"chip " + (p.delivery === "Hybrid" ? "amber" : p.delivery === "In-person" ? "gray" : "blue")}>{p.delivery}</span></td>
                <td className="r"><InlineNumber id={p.id} field="goal" value={p.goal} action={updateProgramField} /></td>
                <td style={{ fontSize: 11.5 }}>{p.cert}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Link className="btn sm ghost" href={`/programs?edit=${p.id}`}>Edit</Link>
                    <form action={deleteProgram}><input type="hidden" name="id" value={p.id} /><button className="btn sm danger">✕</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
