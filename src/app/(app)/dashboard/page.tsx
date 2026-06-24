import { getProfile, getTenants, getScope, getPrograms, getStudents } from "@/lib/queries";
import { isFQ, splitFor } from "@/lib/types";
import { enrolledRev } from "@/lib/constants";
import { fmt, pct } from "@/lib/format";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const tenants = await getTenants();

  if (tenants.length === 0) {
    return (
      <>
        <div className="pagehead">
          <div className="eyebrow">Welcome</div>
          <h2>Let&apos;s Set Up Your Platform</h2>
        </div>
        <div className="card">
          <h3>Get Started</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            {isFQ(profile.role)
              ? "Head to Tenant Management to create your first school."
              : "Your account isn't linked to a school yet. Ask a FocusQuest admin to assign you."}
          </p>
          {isFQ(profile.role) && <Link className="btn gold" href="/schools">Create your first school →</Link>}
        </div>
      </>
    );
  }

  const scope = await getScope(profile, tenants);
  const fq = isFQ(profile.role);
  const all = scope === "all";
  const tenant = all ? null : tenants.find((t) => t.id === scope);
  if (!all && !tenant) return <div className="empty">Select a school from the top bar.</div>;

  const programs = await getPrograms(all ? undefined : scope || undefined);
  const students = await getStudents(all ? undefined : scope || undefined);
  const enrolled = students.filter((s) => enrolledRev(s.stage));
  const gross = enrolled.reduce((a, s) => a + s.cost, 0);
  const collected = enrolled.reduce((a, s) => a + s.collected, 0);
  const activePrograms = programs.filter((p) => p.active);
  const projected = activePrograms.reduce((a, p) => a + p.goal * p.cost, 0);

  // Each school keeps its own split, so aggregate revenue per student's tenant.
  const splitMap = new Map(tenants.map((t) => [t.id, splitFor(t)] as const));
  const codeOf = new Map(tenants.map((t) => [t.id, t.short_code] as const));
  let schoolRev = 0, providerRev = 0, fqRev = 0;
  for (const s of enrolled) {
    const spx = splitMap.get(s.tenant_id);
    if (!spx) continue;
    schoolRev += s.cost * spx.school;
    providerRev += s.cost * spx.provider;
    fqRev += s.cost * spx.fq;
  }
  const frac = (n: number) => (gross > 0 ? n / gross : 0);
  const sp = tenant ? splitFor(tenant) : null;

  // Enrolled students per program (match on id, falling back to name within tenant).
  const progMetrics = activePrograms.map((p) => ({
    p,
    cnt: enrolled.filter((s) => s.program_id === p.id || (!s.program_id && s.program === p.name && s.tenant_id === p.tenant_id)).length,
  }));

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">{fq ? "FocusQuest" : tenant!.short_code}</div>
        <h2>{all ? "All Schools" : tenant!.name}</h2>
      </div>

      <div className="cards c4">
        <div className="card kpi"><div className="lbl">{all ? "Schools" : "Active programs"}</div><div className="val">{all ? tenants.length : activePrograms.length}</div>{all && <div className="det">{activePrograms.length} active programs</div>}</div>
        <div className="card kpi"><div className="lbl">Enrolled students</div><div className="val">{enrolled.length}</div></div>
        <div className="card kpi"><div className="lbl">Realized gross</div><div className="val" style={{ fontSize: 22 }}>{fmt(gross)}</div><div className="det">collected {fmt(collected)}</div></div>
        <div className="card kpi"><div className="lbl">Projected at goal</div><div className="val" style={{ fontSize: 22 }}>{fmt(projected)}</div><div className="det">if cohorts fill</div></div>
      </div>

      <div className="card">
        <h3>Live Revenue Snapshot</h3>
        <div className="split">
          <div className="s1" style={{ width: pct(frac(schoolRev)) }}>School {fmt(schoolRev)}</div>
          <div className="s2" style={{ width: pct(frac(providerRev)) }}>Provider {fmt(providerRev)}</div>
          <div className="s3" style={{ width: pct(frac(fqRev)) }}>FQ {fmt(fqRev)}</div>
        </div>
        <div className="srcnote">
          {all
            ? `Aggregated across ${tenants.length} school${tenants.length === 1 ? "" : "s"} — each school uses its own revenue-sharing model.`
            : fq
              ? `Revenue figures are calculated based on the configured revenue-sharing model: School ${pct(sp!.school)} | Provider ${pct(sp!.provider)} | FocusQuest ${pct(sp!.fq)}`
              : `Revenue figures are calculated based on the configured revenue-sharing model: School ${pct(sp!.school)}`}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Program Performance — Enrolled vs Goal</h3></div>
        <table>
          <thead><tr><th>Program</th>{all && <th>School</th>}<th className="r">Enrolled</th><th className="r">Cohort goal</th><th>Progress</th></tr></thead>
          <tbody>
            {progMetrics.length === 0 && <tr><td colSpan={all ? 5 : 4}><div className="empty">No active programs yet.</div></td></tr>}
            {progMetrics.map(({ p, cnt }) => {
              const goal = p.goal || 0;
              const fill = goal > 0 ? Math.round((cnt / goal) * 100) : 0;
              const tone = goal === 0 ? "gray" : cnt >= goal ? "green" : fill >= 50 ? "amber" : "red";
              return (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  {all && <td className="mono">{codeOf.get(p.tenant_id) ?? "—"}</td>}
                  <td className="r mono">{cnt}</td>
                  <td className="r mono">{goal || "—"}</td>
                  <td><span className={"chip " + tone}>{goal > 0 ? `${cnt} / ${goal} · ${fill}%` : `${cnt} enrolled`}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
