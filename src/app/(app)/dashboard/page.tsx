import { getProfile, getTenants, getScope, getPrograms, getStudents, getLeads } from "@/lib/queries";
import { isFQ, splitFor } from "@/lib/types";
import { STAGES, STA, enrolledRev } from "@/lib/constants";
import { fmt, pct } from "@/lib/format";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const APP_STARTED = STAGES.indexOf("Application started"); // 4

const TABS: [string, string][] = [
  ["overview", "Enrollment Overview"],
  ["revenue", "Revenue Intelligence"],
  ["journey", "Student Journey"],
  ["success", "Student Success"],
  ["ai", "AI Insights"],
];

export default async function DashboardPage({ searchParams }: { searchParams: { tab?: string } }) {
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
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab! : "overview";

  const programs = await getPrograms(all ? undefined : scope || undefined);
  const students = await getStudents(all ? undefined : scope || undefined);
  const leads = await getLeads(all ? undefined : scope || undefined);

  // Aggregate revenue per student using that student's own school split.
  const splitMap = new Map(tenants.map((t) => [t.id, splitFor(t)] as const));
  const codeOf = new Map(tenants.map((t) => [t.id, t.short_code] as const));

  const enrolled = students.filter((s) => enrolledRev(s.stage));
  const gross = enrolled.reduce((a, s) => a + s.cost, 0);
  const collected = enrolled.reduce((a, s) => a + s.collected, 0);
  let schoolRev = 0, fqRev = 0;
  for (const s of enrolled) {
    const spx = splitMap.get(s.tenant_id);
    if (!spx) continue;
    schoolRev += s.cost * spx.school;
    fqRev += s.cost * spx.fq;
  }

  const activePrograms = programs.filter((p) => p.active);

  // Funnel across the 14-stage model (leads + students combined).
  const pipeline = [...leads.map((l) => l.stage), ...students.map((s) => s.stage)];
  const atStage = STAGES.map((_, i) => pipeline.filter((s) => s === i).length);
  const reached = STAGES.map((_, i) => pipeline.filter((s) => s >= i).length);
  const total = reached[0] || 0;

  const activeLeads = leads.filter((l) => l.stage < STA.enrolled && l.stage !== STA.dropped).length;
  const appsStarted = pipeline.filter((s) => s >= APP_STARTED).length;
  const enrollDenom = leads.length + students.length;
  const enrollRate = enrollDenom > 0 ? enrolled.length / enrollDenom : 0;
  const atRiskOutstanding = students
    .filter((s) => s.stage === STA.atRisk)
    .reduce((a, s) => a + Math.max(0, s.cost - s.collected), 0);

  // Per-program enrolled counts (match on id, fall back to name within tenant).
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

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/dashboard?tab=${key}`} className={tab === key ? "on" : ""}>{label}</Link>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="cards c4">
            <div className="card kpi"><div className="lbl">Active leads</div><div className="val">{activeLeads}</div></div>
            <div className="card kpi"><div className="lbl">Applications started</div><div className="val">{appsStarted}</div></div>
            <div className="card kpi"><div className="lbl">Enrolled students</div><div className="val">{enrolled.length}</div></div>
            <div className="card kpi"><div className="lbl">Enrollment rate</div><div className="val">{pct(enrollRate)}</div><div className="det">enrolled ÷ (leads + students)</div></div>
          </div>
          <div className="cards c4">
            <div className="card kpi"><div className="lbl">Gross revenue</div><div className="val" style={{ fontSize: 22 }}>{fmt(gross)}</div><div className="det">collected {fmt(collected)}</div></div>
            <div className="card kpi"><div className="lbl">School share</div><div className="val" style={{ fontSize: 22 }}>{fmt(schoolRev)}</div></div>
            <div className="card kpi"><div className="lbl">FocusQuest share</div><div className="val" style={{ fontSize: 22 }}>{fmt(fqRev)}</div></div>
            <div className="card kpi"><div className="lbl">Revenue at risk</div><div className="val" style={{ fontSize: 22 }}>{fmt(atRiskOutstanding)}</div><div className="det">Advisory · outstanding on at-risk students</div></div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div style={{ padding: "16px 18px 0" }}><h3>Enrollment Funnel</h3></div>
            <table>
              <thead><tr><th>Stage</th><th className="r">At this stage</th><th className="r">Reached</th><th>Funnel</th><th className="r">Conversion from previous</th></tr></thead>
              <tbody>
                {total === 0 && <tr><td colSpan={5}><div className="empty">No leads or students yet.</div></td></tr>}
                {total > 0 && STAGES.map((name, i) => {
                  const conv = i > 0 && reached[i - 1] > 0 ? reached[i] / reached[i - 1] : null;
                  return (
                    <tr key={i}>
                      <td><b>{name}</b></td>
                      <td className="r mono">{atStage[i]}</td>
                      <td className="r mono">{reached[i]}</td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: pct(reached[i] / total), height: "100%", background: "var(--gold)" }} />
                        </div>
                      </td>
                      <td className="r mono">{conv === null ? "—" : pct(conv)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div style={{ padding: "16px 18px 0" }}><h3>Program Performance — Enrolled vs Goal</h3></div>
            <table>
              <thead><tr><th>Program</th>{all && <th>School</th>}<th className="r">Enrolled</th><th className="r">Cohort goal</th><th>Actual vs goal</th></tr></thead>
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
      )}

      {tab === "revenue" && (
        <>
          <div className="card">
            <h3>Live Revenue Snapshot</h3>
            <div className="split">
              <div className="s1" style={{ width: pct(gross > 0 ? schoolRev / gross : 0) }}>School {fmt(schoolRev)}</div>
              <div className="s2" style={{ width: pct(gross > 0 ? (gross - schoolRev - fqRev) / gross : 0) }}>Provider {fmt(gross - schoolRev - fqRev)}</div>
              <div className="s3" style={{ width: pct(gross > 0 ? fqRev / gross : 0) }}>FQ {fmt(fqRev)}</div>
            </div>
            <div className="srcnote">
              {all
                ? `Aggregated across ${tenants.length} school${tenants.length === 1 ? "" : "s"} — each school uses its own revenue-sharing model.`
                : `Revenue figures are calculated based on the configured revenue-sharing model: School ${pct(splitFor(tenant!).school)} | Provider ${pct(splitFor(tenant!).provider)} | FocusQuest ${pct(splitFor(tenant!).fq)}`}
            </div>
          </div>
        </>
      )}

      {(tab === "journey" || tab === "success" || tab === "ai") && (
        <div className="card"><div className="empty">Coming in a later phase.</div></div>
      )}
    </>
  );
}
