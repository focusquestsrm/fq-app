import { getProfile, getTenants, getScope, getPrograms, getProviders, getClientView } from "@/lib/queries";
import { isFQ, splitForProvider, ZERO_SPLIT, type Split } from "@/lib/types";
import { fmt } from "@/lib/format";
import { updateProgramField } from "../programs/actions";
import { InlineNumber } from "@/components/InlineNumber";
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
  const clientView = fq && getClientView();
  const canManage = fq && !clientView;   // schools (and FQ in Client View) are read-only
  const viewAsSchool = !fq || clientView; // school portal: school share only
  const programs = (await getPrograms(scope || undefined)).filter((p) => p.active);

  // Providers are the single source of truth for splits (managed on Settings).
  const providerSplit = new Map((await getProviders()).map((p) => [p.name, splitForProvider(p)] as const));
  const splitOf = (providerName: string): Split => providerSplit.get(providerName) ?? ZERO_SPLIT;

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

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}>
          <h3>Totals Calculator — Students × Cost × Split</h3>
          {canManage && <div className="srcnote">Each program&apos;s split comes from its provider — manage providers &amp; splits on the Settings page.</div>}
        </div>
        <table>
          <thead>
            <tr>
              <th>Program</th><th>Provider</th><th className="r">Cohort size</th><th className="r">Cost / student</th>
              <th className="r">Gross</th><th className="r">School</th>
              {!viewAsSchool && <th className="r">Provider</th>}
              {!viewAsSchool && <th className="r">FQ</th>}
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 && <tr><td colSpan={viewAsSchool ? 6 : 8}><div className="empty">No active programs yet.</div></td></tr>}
            {programs.map((p) => {
              const gr = p.goal * p.cost;
              const spx = splitOf(p.provider);
              return (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td>{p.provider || "—"}</td>
                  <td className="r">{canManage ? <InlineNumber id={p.id} field="goal" value={p.goal} action={updateProgramField} /> : <span className="mono">{p.goal}</span>}</td>
                  <td className="r">{canManage ? <InlineNumber id={p.id} field="cost" value={p.cost} action={updateProgramField} prefix="$" /> : <span className="money">{fmt(p.cost)}</span>}</td>
                  <td className="r money">{fmt(gr)}</td>
                  <td className="r money" style={{ color: "var(--gold-deep)" }}>{fmt(gr * spx.school)}</td>
                  {!viewAsSchool && <td className="r money">{fmt(gr * spx.provider)}</td>}
                  {!viewAsSchool && <td className="r money">{fmt(gr * spx.fq)}</td>}
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
                {!viewAsSchool && <td className="r money"><b>{fmt(tProvider)}</b></td>}
                {!viewAsSchool && <td className="r money"><b>{fmt(tFq)}</b></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
