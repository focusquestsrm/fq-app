import { getProfile, getStudents, getProviders, getFQCosts } from "@/lib/queries";
import { isFQ, splitForProvider, ZERO_SPLIT, type Split } from "@/lib/types";
import { enrolledRev } from "@/lib/constants";
import { fmt, pct } from "@/lib/format";
import { addCost, deleteCost } from "./actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Costs &amp; profitability is FocusQuest-only.</div>;
  const canEdit = profile.role !== "fqviewer";

  // FocusQuest revenue = FQ's share of realized gross across every school.
  const students = await getStudents();
  const providerSplit = new Map((await getProviders()).map((p) => [p.name, splitForProvider(p)] as const));
  const splitOf = (name: string): Split => providerSplit.get(name) ?? ZERO_SPLIT;
  const fqRevenue = students
    .filter((s) => enrolledRev(s.stage))
    .reduce((a, s) => a + s.cost * splitOf(s.provider).fq, 0);

  const costs = await getFQCosts();
  const totalCosts = costs.reduce((a, c) => a + c.amount, 0);
  const net = fqRevenue - totalCosts;
  const margin = fqRevenue > 0 ? net / fqRevenue : 0;

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Finance</div>
        <h2>Costs &amp; Profitability</h2>
      </div>

      <div className="cards c4">
        <div className="card kpi"><div className="lbl">FocusQuest revenue</div><div className="val" style={{ fontSize: 22 }}>{fmt(fqRevenue)}</div><div className="det">FQ share, all schools</div></div>
        <div className="card kpi"><div className="lbl">Total costs</div><div className="val" style={{ fontSize: 22 }}>{fmt(totalCosts)}</div></div>
        <div className="card kpi"><div className="lbl">Net profit</div><div className="val" style={{ fontSize: 22, color: net >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(net)}</div><div className="det">revenue − costs</div></div>
        <div className="card kpi"><div className="lbl">Margin</div><div className="val" style={{ fontSize: 22 }}>{pct(margin)}</div></div>
      </div>

      {canEdit && (
        <div className="card">
          <h3>Add a Cost</h3>
          <form action={addCost} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div className="field" style={{ flex: "1 1 240px" }}><label>Cost</label><input name="label" placeholder="e.g. Salaries, Software, Marketing" required /></div>
            <div className="field" style={{ width: 160 }}><label>Amount ($)</label><input name="amount" type="number" defaultValue={0} /></div>
            <button className="btn gold">+ Add cost</button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Cost</th><th className="r">Amount</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {costs.length === 0 && <tr><td colSpan={canEdit ? 3 : 2}><div className="empty">No costs entered yet.</div></td></tr>}
            {costs.map((c) => (
              <tr key={c.id}>
                <td><b>{c.label}</b></td>
                <td className="r money">{fmt(c.amount)}</td>
                {canEdit && <td><form action={deleteCost}><input type="hidden" name="id" value={c.id} /><button className="btn sm danger">✕</button></form></td>}
              </tr>
            ))}
            {costs.length > 0 && (
              <tr style={{ borderTop: "2px solid var(--line)" }}>
                <td><b>Total costs</b></td>
                <td className="r money"><b>{fmt(totalCosts)}</b></td>
                {canEdit && <td></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
