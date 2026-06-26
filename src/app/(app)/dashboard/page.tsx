import { getProfile, getTenants, getScope, getPrograms, getStudents, getLeads, getProviders, getClientView } from "@/lib/queries";
import { isFQ, splitForProvider, ZERO_SPLIT, type Split } from "@/lib/types";
import { STAGES, STA, enrolledRev, PHASES } from "@/lib/constants";
import { fmt, pct } from "@/lib/format";
import { setScope } from "@/app/(app)/schools/actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const APP_STARTED = STAGES.indexOf("Application started"); // 4
const ENROLL_PENDING = STAGES.indexOf("Enrollment pending"); // 6 — admitted, not yet enrolled

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
  const clientView = fq && !all && getClientView();
  const viewAsSchool = !fq || clientView; // school portal / client preview: school share only
  const tenant = all ? null : tenants.find((t) => t.id === scope);
  if (!all && !tenant) return <div className="empty">Select a school from the top bar.</div>;
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab! : "overview";

  const programs = await getPrograms(all ? undefined : scope || undefined);
  const students = await getStudents(all ? undefined : scope || undefined);
  const leads = await getLeads(all ? undefined : scope || undefined);

  // Providers are the single source of truth for revenue splits.
  const providers = await getProviders();
  const providerSplit = new Map(providers.map((p) => [p.name, splitForProvider(p)] as const));
  const codeOf = new Map(tenants.map((t) => [t.id, t.short_code] as const));
  const splitOf = (providerName: string): Split => providerSplit.get(providerName) ?? ZERO_SPLIT;

  const enrolled = students.filter((s) => enrolledRev(s.stage));
  const gross = enrolled.reduce((a, s) => a + s.cost, 0);
  const collected = enrolled.reduce((a, s) => a + s.collected, 0);
  let schoolRev = 0, providerRev = 0, fqRev = 0;
  for (const s of enrolled) {
    const spx = splitOf(s.provider);
    schoolRev += s.cost * spx.school;
    providerRev += s.cost * spx.provider;
    fqRev += s.cost * spx.fq;
  }

  const activePrograms = programs.filter((p) => p.active);

  // Per-school rollups for the All-Schools tile overview.
  const enrolledByTenant = new Map<string, number>();
  for (const s of enrolled) enrolledByTenant.set(s.tenant_id, (enrolledByTenant.get(s.tenant_id) || 0) + 1);
  const progByTenant = new Map<string, number>();
  for (const p of activePrograms) progByTenant.set(p.tenant_id, (progByTenant.get(p.tenant_id) || 0) + 1);

  // Funnel across the 14-stage model (leads + students combined).
  const pipeline = [...leads.map((l) => l.stage), ...students.map((s) => s.stage)];
  const atStage = STAGES.map((_, i) => pipeline.filter((s) => s === i).length);
  const reached = STAGES.map((_, i) => pipeline.filter((s) => s >= i).length);
  const total = reached[0] || 0;

  // Display-only PHASE rollup (5 phases on top of the 14 stages).
  const phaseRows = PHASES.map((ph) => ({
    ph,
    inPhase: ph.stages.reduce((a, i) => a + atStage[i], 0),
    reachedP: reached[ph.stages[0]] ?? 0,
  }));

  const activeLeads = leads.filter((l) => l.stage < STA.enrolled && l.stage !== STA.dropped).length;
  const appsStarted = pipeline.filter((s) => s >= APP_STARTED).length;
  const enrollDenom = leads.length + students.length;
  const enrollRate = enrollDenom > 0 ? enrolled.length / enrollDenom : 0;

  // Per-program metrics (match on id, fall back to name within tenant).
  const progMetrics = activePrograms.map((p) => {
    const list = enrolled.filter((s) => s.program_id === p.id || (!s.program_id && s.program === p.name && s.tenant_id === p.tenant_id));
    const spx = splitOf(p.provider);
    const pGross = list.reduce((a, s) => a + s.cost, 0);
    return {
      p,
      cnt: list.length,
      gross: pGross,
      school: pGross * spx.school,
      provider: pGross * spx.provider,
      fq: pGross * spx.fq,
      projected: p.goal * p.cost, // cohort goal × cost — NOT a forecast
    };
  });

  // Revenue leakage (observed, not predicted): dropped + admitted-not-enrolled.
  const dropped = students.filter((s) => s.stage === STA.dropped);
  const admittedNotEnrolled = students.filter((s) => s.stage === ENROLL_PENDING);
  const droppedGross = dropped.reduce((a, s) => a + s.cost, 0);
  const admittedGross = admittedNotEnrolled.reduce((a, s) => a + s.cost, 0);

  // Student Success metrics (derived from current stages — not predictions).
  const successOf = (list: typeof students) => {
    const active = list.filter((s) => s.stage >= STA.enrolled && s.stage <= STA.successEngaged).length; // 7–9
    const atRisk = list.filter((s) => s.stage === STA.atRisk).length;
    const completed = list.filter((s) => s.stage === STA.completed || s.stage === STA.revClosed).length;
    const drop = list.filter((s) => s.stage === STA.dropped).length;
    const base = active + atRisk + completed + drop;
    return { active, atRisk, completed, drop, completion: base > 0 ? completed / base : 0 };
  };
  const succ = successOf(students);

  // Per-school rollup rows (FQ all-tenant view): journey + success counts.
  const schoolRows = all
    ? tenants.map((t) => {
        const st = students.filter((s) => s.tenant_id === t.id);
        const ld = leads.filter((l) => l.tenant_id === t.id);
        const sx = successOf(st);
        const pipe = [...ld.map((l) => l.stage), ...st.map((s) => s.stage)];
        return {
          t,
          enrolledN: st.filter((s) => enrolledRev(s.stage)).length,
          phaseCounts: PHASES.map((ph) => pipe.filter((x) => ph.stages.includes(x)).length),
          ...sx,
        };
      })
    : [];

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">{fq ? "FocusQuest" : tenant!.short_code}</div>
        <h2>{all ? "All Schools" : tenant!.name}</h2>
        {fq && !all && (
          <form action={setScope} style={{ marginTop: 6 }}>
            <input type="hidden" name="scope" value="all" />
            <button className="btn sm ghost">← All Schools</button>
          </form>
        )}
      </div>

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/dashboard?tab=${key}`} className={tab === key ? "on" : ""}>{label}</Link>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {all && (
            <div className="cards c3" style={{ marginBottom: 16 }}>
              {tenants.map((t) => (
                <form key={t.id} action={setScope}>
                  <input type="hidden" name="scope" value={t.id} />
                  <button className="card" style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{t.short_code}</div>
                    <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>{enrolledByTenant.get(t.id) || 0} enrolled · {progByTenant.get(t.id) || 0} active programs</div>
                  </button>
                </form>
              ))}
            </div>
          )}
          <h3 style={{ margin: "0 0 10px" }}>Enrollment</h3>
          <div className="cards c4">
            <div className="card kpi"><div className="lbl">Active leads</div><div className="val">{activeLeads}</div></div>
            <div className="card kpi"><div className="lbl">Applications started</div><div className="val">{appsStarted}</div></div>
            <div className="card kpi"><div className="lbl">Enrolled students</div><div className="val">{enrolled.length}</div></div>
            <div className="card kpi"><div className="lbl">Enrollment rate</div><div className="val">{pct(enrollRate)}</div><div className="det">enrolled ÷ (leads + students)</div></div>
          </div>
          <h3 style={{ margin: "18px 0 10px" }}>Revenue</h3>
          <div className="cards c4">
            <div className="card kpi"><div className="lbl">Gross revenue</div><div className="val" style={{ fontSize: 22 }}>{fmt(gross)}</div><div className="det">collected {fmt(collected)}</div></div>
            <div className="card kpi"><div className="lbl">School share</div><div className="val" style={{ fontSize: 22 }}>{fmt(schoolRev)}</div></div>
            {!viewAsSchool && <div className="card kpi"><div className="lbl">Provider share</div><div className="val" style={{ fontSize: 22 }}>{fmt(providerRev)}</div></div>}
            {!viewAsSchool && <div className="card kpi"><div className="lbl">FocusQuest share</div><div className="val" style={{ fontSize: 22 }}>{fmt(fqRev)}</div></div>}
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div style={{ padding: "16px 18px 0" }}><h3>Enrollment Funnel — by Phase</h3></div>
            <table>
              <thead><tr><th>Phase</th><th className="r">In phase</th><th className="r">Reached</th><th>Funnel</th><th className="r">Conversion from previous</th></tr></thead>
              <tbody>
                {total === 0 && <tr><td colSpan={5}><div className="empty">No leads or students yet.</div></td></tr>}
                {total > 0 && phaseRows.map((row, i) => {
                  const prev = phaseRows[i - 1];
                  const conv = i > 0 && prev.reachedP > 0 ? row.reachedP / prev.reachedP : null;
                  return (
                    <tr key={row.ph.key}>
                      <td><b>{row.ph.label}</b></td>
                      <td className="r mono">{row.inPhase}</td>
                      <td className="r mono">{row.reachedP}</td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: pct(row.reachedP / total), height: "100%", background: "var(--gold)" }} />
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
            {viewAsSchool ? (
              <>
                <div className="split"><div className="s1" style={{ width: "100%" }}>School {fmt(schoolRev)}</div></div>
                <div className="srcnote">Your school&apos;s share of realized gross, from each program&apos;s revenue-sharing model.</div>
              </>
            ) : (
              <>
                <div className="split">
                  <div className="s1" style={{ width: pct(gross > 0 ? schoolRev / gross : 0) }}>School {fmt(schoolRev)}</div>
                  <div className="s2" style={{ width: pct(gross > 0 ? providerRev / gross : 0) }}>Provider {fmt(providerRev)}</div>
                  <div className="s3" style={{ width: pct(gross > 0 ? fqRev / gross : 0) }}>FQ {fmt(fqRev)}</div>
                </div>
                <div className="srcnote">
                  Revenue figures are calculated based on the configured revenue-sharing model: School {pct(gross > 0 ? schoolRev / gross : 0)} | Provider {pct(gross > 0 ? providerRev / gross : 0)} | FocusQuest {pct(gross > 0 ? fqRev / gross : 0)}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div style={{ padding: "16px 18px 0" }}><h3>Revenue by Program</h3></div>
            <table>
              <thead>
                <tr>
                  <th>Program</th>{all && <th>School</th>}
                  <th className="r">Students</th><th className="r">Gross</th>
                  <th className="r">School share</th>
                  {!viewAsSchool && <th className="r">Provider share</th>}
                  {!viewAsSchool && <th className="r">FQ share</th>}
                  <th className="r">Projected at goal</th>
                </tr>
              </thead>
              <tbody>
                {progMetrics.length === 0 && <tr><td colSpan={(all ? 6 : 5) + (viewAsSchool ? 0 : 2)}><div className="empty">No active programs yet.</div></td></tr>}
                {progMetrics.map((m) => (
                  <tr key={m.p.id}>
                    <td><b>{m.p.name}</b></td>
                    {all && <td className="mono">{codeOf.get(m.p.tenant_id) ?? "—"}</td>}
                    <td className="r mono">{m.cnt}</td>
                    <td className="r money">{fmt(m.gross)}</td>
                    <td className="r money" style={{ color: "var(--gold-deep)" }}>{fmt(m.school)}</td>
                    {!viewAsSchool && <td className="r money">{fmt(m.provider)}</td>}
                    {!viewAsSchool && <td className="r money">{fmt(m.fq)}</td>}
                    <td className="r money">{fmt(m.projected)}</td>
                  </tr>
                ))}
                {progMetrics.length > 0 && (
                  <tr style={{ borderTop: "2px solid var(--line)" }}>
                    <td><b>Total</b></td>{all && <td></td>}
                    <td className="r mono"><b>{progMetrics.reduce((a, m) => a + m.cnt, 0)}</b></td>
                    <td className="r money"><b>{fmt(progMetrics.reduce((a, m) => a + m.gross, 0))}</b></td>
                    <td className="r money" style={{ color: "var(--gold-deep)" }}><b>{fmt(progMetrics.reduce((a, m) => a + m.school, 0))}</b></td>
                    {!viewAsSchool && <td className="r money"><b>{fmt(progMetrics.reduce((a, m) => a + m.provider, 0))}</b></td>}
                    {!viewAsSchool && <td className="r money"><b>{fmt(progMetrics.reduce((a, m) => a + m.fq, 0))}</b></td>}
                    <td className="r money"><b>{fmt(progMetrics.reduce((a, m) => a + m.projected, 0))}</b></td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="srcnote" style={{ padding: "0 18px 14px" }}>“Projected at goal” = cohort goal × cost. It is not an AI forecast.</div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div style={{ padding: "16px 18px 0" }}><h3>Revenue Leakage</h3></div>
            <table>
              <thead><tr><th>Category</th><th className="r">Students</th><th className="r">Lost / at-risk gross</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>Dropped</b><div className="muted" style={{ fontSize: 11 }}>students marked dropped</div></td>
                  <td className="r mono">{dropped.length}</td>
                  <td className="r money" style={{ color: "var(--red)" }}>{fmt(droppedGross)}</td>
                </tr>
                <tr>
                  <td><b>Admitted, not enrolled</b><div className="muted" style={{ fontSize: 11 }}>at the “Enrollment pending” stage</div></td>
                  <td className="r mono">{admittedNotEnrolled.length}</td>
                  <td className="r money" style={{ color: "var(--amber)" }}>{fmt(admittedGross)}</td>
                </tr>
              </tbody>
            </table>
            <div className="srcnote" style={{ padding: "0 18px 14px" }}>Observed from current student stages — not a prediction.</div>
          </div>
        </>
      )}

      {tab === "journey" && (
        total === 0 ? (
          <div className="card"><div className="empty">No Data Available</div></div>
        ) : (
          <>
            <div className="card">
              <h3>Journey — Phases{all ? " (all schools)" : ""}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {phaseRows.map((row) => (
                  <div key={row.ph.key} style={{ flex: "1 1 130px", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--paper)" }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>{row.ph.label}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, marginTop: 2 }}>{row.inPhase}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{pct(total > 0 ? row.inPhase / total : 0)} of pipeline</div>
                  </div>
                ))}
              </div>
              <div className="srcnote">Five phases over the 14 underlying stages. Expand a phase below for stage detail.</div>
            </div>

            <div className="card">
              <h3>Phase Detail</h3>
              {phaseRows.map((row) => (
                <details key={row.ph.key} style={{ borderTop: "1px solid var(--line)", padding: "8px 2px" }}>
                  <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <b>{row.ph.label}</b><span className="mono">{row.inPhase}</span>
                  </summary>
                  <table style={{ marginTop: 6 }}>
                    <tbody>
                      {row.ph.stages.map((si) => (
                        <tr key={si}>
                          <td style={{ paddingLeft: 10 }}>{STAGES[si]}</td>
                          <td className="r mono">{atStage[si]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))}
            </div>

            {all && (
              <div className="card" style={{ padding: 0, overflowX: "auto" }}>
                <div style={{ padding: "16px 18px 0" }}><h3>Journey by School — Phases</h3></div>
                <table>
                  <thead><tr><th>School</th>{PHASES.map((ph) => <th key={ph.key} className="r">{ph.label}</th>)}</tr></thead>
                  <tbody>
                    {schoolRows.map((r) => (
                      <tr key={r.t.id}>
                        <td><b>{r.t.name}</b> <span className="muted" style={{ fontSize: 11 }}>{r.t.short_code}</span></td>
                        {r.phaseCounts.map((c, i) => <td key={i} className="r mono">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}

      {tab === "success" && (
        students.length === 0 ? (
          <div className="card"><div className="empty">No Data Available</div></div>
        ) : (
          <>
            <div className="cards c4">
              <div className="card kpi"><div className="lbl">Active</div><div className="val">{succ.active}</div></div>
              <div className="card kpi"><div className="lbl">At-risk</div><div className="val">{succ.atRisk}</div></div>
              <div className="card kpi"><div className="lbl">Completed</div><div className="val">{succ.completed}</div></div>
              <div className="card kpi"><div className="lbl">Completion rate</div><div className="val">{pct(succ.completion)}</div><div className="det">completed ÷ outcomes</div></div>
            </div>
            {all && (
              <div className="card" style={{ padding: 0, overflowX: "auto" }}>
                <div style={{ padding: "16px 18px 0" }}><h3>Student Success by School</h3></div>
                <table>
                  <thead><tr><th>School</th><th className="r">Enrolled</th><th className="r">Active</th><th className="r">At-risk</th><th className="r">Completed</th><th className="r">Dropped</th><th className="r">Completion</th></tr></thead>
                  <tbody>
                    {schoolRows.map((r) => (
                      <tr key={r.t.id}>
                        <td><b>{r.t.name}</b> <span className="muted" style={{ fontSize: 11 }}>{r.t.short_code}</span></td>
                        <td className="r mono">{r.enrolledN}</td>
                        <td className="r mono">{r.active}</td>
                        <td className="r mono">{r.atRisk}</td>
                        <td className="r mono">{r.completed}</td>
                        <td className="r mono">{r.drop}</td>
                        <td className="r mono">{pct(r.completion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="srcnote" style={{ padding: "0 18px 14px" }}>Derived from current student stages — not predictions.</div>
              </div>
            )}
          </>
        )
      )}

      {tab === "ai" && (
        <div className="card"><div className="empty">No Data Available</div></div>
      )}
    </>
  );
}
