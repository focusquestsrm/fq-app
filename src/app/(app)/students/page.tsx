import { getProfile, getTenants, getScope, getPrograms, getStudents, getConfig } from "@/lib/queries";
import { STAGES, STA } from "@/lib/constants";
import { fmt } from "@/lib/format";
import { addStudent, deleteStudent } from "./actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function stageChip(stage: number) {
  const tone = stage === STA.dropped ? "red" : stage === STA.atRisk ? "amber" : stage >= STA.enrolled ? "green" : "blue";
  return <span className={"chip " + tone}>{STAGES[stage]}</span>;
}

export default async function StudentsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);
  if (!scope) return <div className="empty">Create a school first (Tenant Management).</div>;

  const programs = (await getPrograms(scope || undefined)).filter((p) => p.active);
  const students = await getStudents(scope || undefined);
  const payments = (await getConfig()).filter((c) => c.kind === "payment");

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Intelligence</div>
        <h2>Students</h2>
      </div>

      <div className="card">
        <h3>Add a student</h3>
        {programs.length === 0 ? (
          <div className="callout">Add at least one program in the Program Catalog before enrolling students.</div>
        ) : (
          <form action={addStudent} className="form">
            <input type="hidden" name="tenant_id" value={scope} />
            <div className="frow f3">
              <div className="field"><label>First name</label><input name="first_name" required /></div>
              <div className="field"><label>Last name</label><input name="last_name" required /></div>
              <div className="field"><label>Program</label>
                <select name="program_id">{programs.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmt(p.cost)}</option>)}</select>
              </div>
            </div>
            <div className="frow f3">
              <div className="field"><label>Stage</label>
                <select name="stage" defaultValue={STA.enrolled}>{STAGES.map((s, i) => <option key={i} value={i}>{s}</option>)}</select>
              </div>
              <div className="field"><label>Payment source</label>
                <select name="payment">{payments.map((p) => <option key={p.id}>{p.value}</option>)}</select>
              </div>
              <div className="field"><label>Collected ($)</label><input name="collected" type="number" defaultValue={0} /></div>
            </div>
            <div className="frow f2">
              <div className="field"><label>Start date</label><input name="start_date" placeholder="MM/DD/YY" /></div>
              <div className="field"><label>Expected end</label><input name="end_date" placeholder="MM/DD/YY" /></div>
            </div>
            <div><button className="btn gold">+ Add student</button></div>
          </form>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Student</th><th>Program</th><th className="r">Cost</th><th className="r">Collected</th><th>Stage</th><th></th></tr></thead>
          <tbody>
            {students.length === 0 && <tr><td colSpan={6}><div className="empty">No students yet.</div></td></tr>}
            {students.map((s) => (
              <tr key={s.id}>
                <td><b>{s.first_name} {s.last_name}</b></td>
                <td>{s.program || "—"}</td>
                <td className="r money">{fmt(s.cost)}</td>
                <td className="r money" style={{ color: "var(--green)" }}>{fmt(s.collected)}</td>
                <td>{stageChip(s.stage)}</td>
                <td><form action={deleteStudent}><input type="hidden" name="id" value={s.id} /><button className="btn sm danger">✕</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
