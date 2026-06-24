import { getProfile, getTenants, getScope, getPrograms } from "@/lib/queries";
import { isFQ, splitFor } from "@/lib/types";
import { fmt, pct } from "@/lib/format";
import { updateSplit } from "./actions";
import { updateProgramField } from "../programs/actions";
import { InlineNumber } from "@/components/InlineNumber";
import { SplitForm } from "@/components/SplitForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);
  const tenant = tenants.find((t) => t.id === scope);
  if (!tenant) return <div className="empty">Create a school first (Tenant Management).</div>;

  const fq = isFQ(profile.role);
  const sp = splitFor(tenant);
  const programs = (await getPrograms(scope || undefined)).filter((p) => p.active);
  const goalGross = programs.reduce((a, p) => a + p.goal * p.cost, 0);

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Finance</div>
        <h2>Revenue model — {tenant.name}</h2>
        <p>Enter the revenue split directly: the school % and the FocusQuest %. The provider share fills the remainder, and every total below recalculates from your numbers.</p>
      </div>

      {fq ? (
        <div className="card">
          <h3>Revenue split</h3>
          <SplitForm tenantId={tenant.id} school={Math.round(sp.school * 100)} fq={Math.round(sp.fq * 100)} provider={Math.round(sp.provider * 100)} action={updateSplit} />
          <div className="split">
            <div className="s1" style={{ width: pct(sp.school) }}>School {pct(sp.school)}</div>
            <div className="s2" style={{ width: pct(sp.provider) }}>Provider {pct(sp.provider)}</div>
            <div className="s3" style={{ width: pct(sp.fq) }}>FQ {pct(sp.fq)}</div>
          </div>
          <div className="srcnote">School portals only ever see the school %. Provider = remainder after school + FQ.</div>
        </div>
      ) : (
        <div className="card"><h3>Your revenue share</h3><div style={{ fontSize: 22, fontFamily: "var(--font-display)" }}>{pct(sp.school)}</div></div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Totals calculator — students × cost × split</h3></div>
        <table>
          <thead>
            <tr>
              <th>Program</th><th className="r">Cohort size</th><th className="r">Cost / student</th>
              <th className="r">Gross</th><th className="r">School ({pct(sp.school)})</th>
              {fq && <th className="r">Provider ({pct(sp.provider)})</th>}
              {fq && <th className="r">FQ ({pct(sp.fq)})</th>}
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={fq ? 7 : 5}><div className="empty">No active programs yet. Add programs in the catalog.</div></td></tr>}
            {programs.map((p) => {
              const gr = p.goal * p.cost;
              return (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td className="r"><InlineNumber id={p.id} field="goal" value={p.goal} action={updateProgramField} /></td>
                  <td className="r"><InlineNumber id={p.id} field="cost" value={p.cost} action={updateProgramField} prefix="$" /></td>
                  <td className="r money">{fmt(gr)}</td>
                  <td className="r money" style={{ color: "var(--gold-deep)" }}>{fmt(gr * sp.school)}</td>
                  {fq && <td className="r money">{fmt(gr * sp.provider)}</td>}
                  {fq && <td className="r money">{fmt(gr * sp.fq)}</td>}
                </tr>
              );
            })}
            {programs.length > 0 && (
              <tr style={{ borderTop: "2px solid var(--line)" }}>
                <td><b>Total at full cohorts</b></td>
                <td className="r mono">{programs.reduce((a, p) => a + p.goal, 0)}</td>
                <td></td>
                <td className="r money"><b>{fmt(goalGross)}</b></td>
                <td className="r money" style={{ color: "var(--gold-deep)" }}><b>{fmt(goalGross * sp.school)}</b></td>
                {fq && <td className="r money"><b>{fmt(goalGross * sp.provider)}</b></td>}
                {fq && <td className="r money"><b>{fmt(goalGross * sp.fq)}</b></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
