import { getProfile, getTenants, getScope, getPrograms, getProviders } from "@/lib/queries";
import { isFQ, splitFor, splitForProvider, type Split } from "@/lib/types";
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
  if (scope === "all") return <div className="empty">Select a single school from the top bar to view its revenue model.</div>;
  const tenant = tenants.find((t) => t.id === scope);
  if (!tenant) return <div className="empty">Create a school first (Tenant Management).</div>;

  const fq = isFQ(profile.role);
  const sp = splitFor(tenant); // tenant default split (fallback + school-portal share)
  const programs = (await getPrograms(scope || undefined)).filter((p) => p.active);

  // Each program uses its provider's split; fall back to the tenant split.
  const providerSplit = new Map((await getProviders()).map((p) => [p.name, splitForProvider(p)] as const));
  const splitOf = (providerName: string): Split => providerSplit.get(providerName) ?? sp;

  let tCohort = 0, tGross = 0, tSchool = 0, tProvider = 0, tFq = 0;
  for (const p of programs) {
    const gr = p.goal * p.cost;
    const spx = splitOf(p.provider);
    tCohort += p.goal; tGross += gr;
    tSchool += gr * spx.school; tProvider += gr * spx.provider; tFq += gr * spx.fq;
  }

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Finance</div>
        <h2>Revenue Model — {tenant.name}</h2>
      </div>

      {fq ? (
        <div className="card">
          <h3>Revenue Split</h3>
          <SplitForm tenantId={tenant.id} school={Math.round(sp.school * 100)} fq={Math.round(sp.fq * 100)} provider={Math.round(sp.provider * 100)} action={updateSplit} />
          <div className="split">
            <div className="s1" style={{ width: pct(sp.school) }}>School {pct(sp.school)}</div>
            <div className="s2" style={{ width: pct(sp.provider) }}>Provider {pct(sp.provider)}</div>
            <div className="s3" style={{ width: pct(sp.fq) }}>FQ {pct(sp.fq)}</div>
          </div>
          <div className="srcnote">School portals only ever see the school %. Provider = remainder after school + FQ.</div>
        </div>
      ) : (
        <div className="card"><h3>Your Revenue Share</h3><div style={{ fontSize: 22, fontFamily: "var(--font-display)" }}>{pct(sp.school)}</div></div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Totals Calculator — Students × Cost × Split</h3></div>
        <table>
          <thead>
            <tr>
              <th>Program</th><th>Provider</th><th className="r">Cohort size</th><th className="r">Cost / student</th>
              <th className="r">Gross</th><th className="r">School</th>
              {fq && <th className="r">Provider</th>}
              {fq && <th className="r">FQ</th>}
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={fq ? 8 : 6}><div className="empty">No active programs yet. Add programs in the catalog.</div></td></tr>}
            {programs.map((p) => {
              const gr = p.goal * p.cost;
              const spx = splitOf(p.provider);
              return (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td>{p.provider || "—"}</td>
                  <td className="r"><InlineNumber id={p.id} field="goal" value={p.goal} action={updateProgramField} /></td>
                  <td className="r"><InlineNumber id={p.id} field="cost" value={p.cost} action={updateProgramField} prefix="$" /></td>
                  <td className="r money">{fmt(gr)}</td>
                  <td className="r money" style={{ color: "var(--gold-deep)" }}>{fmt(gr * spx.school)}</td>
                  {fq && <td className="r money">{fmt(gr * spx.provider)}</td>}
                  {fq && <td className="r money">{fmt(gr * spx.fq)}</td>}
                </tr>
              );
            })}
            {programs.length > 0 && (
              <tr style={{ borderTop: "2px solid var(--line)" }}>
                <td><b>Total at full cohorts</b></td>
                <td></td>
                <td className="r mono">{tCohort}</td>
                <td></td>
                <td className="r money"><b>{fmt(tGross)}</b></td>
                <td className="r money" style={{ color: "var(--gold-deep)" }}><b>{fmt(tSchool)}</b></td>
                {fq && <td className="r money"><b>{fmt(tProvider)}</b></td>}
                {fq && <td className="r money"><b>{fmt(tFq)}</b></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
