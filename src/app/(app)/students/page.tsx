import { getProfile, getTenants, getScope, getPrograms, getStudents, getConfig, getClientView } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { STAGES, STA } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { saveStudent, deleteStudent } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function stageChip(stage: number) {
  const tone = stage === STA.dropped ? "red" : stage === STA.atRisk ? "amber" : stage >= STA.enrolled ? "green" : "blue";
  return <span className={"chip " + tone}>{STAGES[stage]}</span>;
}

export default async function StudentsPage({ searchParams }: { searchParams: { edit?: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);
  if (!scope) return <div className="empty">Create a school first (Tenant Management).</div>;

  const all = scope === "all";
  // Students are FocusQuest-managed; schools (and FQ in Client View) are read-only.
  const clientView = isFQ(profile.role) && !all && getClientView();
  const canManage = isFQ(profile.role) && !clientView;
  const codeOf = new Map(tenants.map((t) => [t.id, t.short_code] as const));
  const programs = (await getPrograms(all ? undefined : scope)).filter((p) => p.active);
  const students = await getStudents(all ? undefined : scope);
  const payments = (await getConfig()).filter((c) => c.kind === "payment");

  const editing = canManage && searchParams.edit ? students.find((s) => s.id === searchParams.edit) : undefined;
  // Program options for the form (scoped to the student's school when editing).
  const formPrograms = editing ? programs.filter((p) => p.tenant_id === editing.tenant_id) : programs;

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Intelligence</div>
        <h2>Students</h2>
      </div>

      {canManage && (
        (!editing && all) ? (
          <div className="card"><h3>Add a Student</h3><div className="callout">Showing students for <b>all schools</b>. Select a single school from the top bar to enroll a student.</div></div>
        ) : (!editing && programs.length === 0) ? (
          <div className="card"><h3>Add a Student</h3><div className="callout">Add at least one program in the Program Catalog before enrolling students.</div></div>
        ) : (
          <div className="card">
            <h3>{editing ? "Edit Student" : "Add a Student"}</h3>
            <form action={saveStudent} className="form">
              <input type="hidden" name="tenant_id" value={editing ? editing.tenant_id : scope} />
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="frow f3">
                <div className="field"><label>First name</label><input name="first_name" defaultValue={editing?.first_name ?? ""} required /></div>
                <div className="field"><label>Last name</label><input name="last_name" defaultValue={editing?.last_name ?? ""} required /></div>
                <div className="field"><label>Program</label>
                  <select name="program_id" defaultValue={editing?.program_id ?? ""}>
                    {formPrograms.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmt(p.cost)}</option>)}
                  </select>
                </div>
              </div>
              <div className="frow f3">
                <div className="field"><label>Stage</label>
                  <select name="stage" defaultValue={editing ? editing.stage : STA.enrolled}>{STAGES.map((s, i) => <option key={i} value={i}>{s}</option>)}</select>
                </div>
                <div className="field"><label>Payment source</label>
                  <select name="payment" defaultValue={editing?.payment ?? ""}>{payments.map((p) => <option key={p.id}>{p.value}</option>)}</select>
                </div>
                <div className="field"><label>Collected ($)</label><input name="collected" type="number" defaultValue={editing?.collected ?? 0} /></div>
              </div>
              <div className="frow f2">
                <div className="field"><label>Start date</label><input name="start_date" placeholder="MM/DD/YY" defaultValue={editing?.start_date ?? ""} /></div>
                <div className="field"><label>Expected end</label><input name="end_date" placeholder="MM/DD/YY" defaultValue={editing?.end_date ?? ""} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn gold">{editing ? "Save changes" : "+ Add student"}</button>
                {editing && <Link className="btn ghost" href="/students">Cancel</Link>}
              </div>
            </form>
          </div>
        )
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Student</th><th>Program</th><th className="r">Cost</th><th className="r">Collected</th><th>Stage</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {students.length === 0 && <tr><td colSpan={canManage ? 6 : 5}><div className="empty">No students yet.</div></td></tr>}
            {students.map((s) => (
              <tr key={s.id}>
                <td><b>{s.first_name} {s.last_name}</b>{all && <div className="muted" style={{ fontSize: 11 }}>{codeOf.get(s.tenant_id) ?? "—"}</div>}</td>
                <td>{s.program || "—"}</td>
                <td className="r money">{fmt(s.cost)}</td>
                <td className="r money" style={{ color: "var(--green)" }}>{fmt(s.collected)}</td>
                <td>{stageChip(s.stage)}</td>
                {canManage && (
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Link className="btn sm ghost" href={`/students?edit=${s.id}`}>Edit</Link>
                      <form action={deleteStudent}><input type="hidden" name="id" value={s.id} /><button className="btn sm danger">✕</button></form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
