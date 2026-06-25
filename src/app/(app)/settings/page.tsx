import { getProfile, getConfig, getProviders } from "@/lib/queries";
import { isFQ, type ConfigItem } from "@/lib/types";
import { addConfigItem, removeConfigItem, addProvider, updateProviderShare, removeProvider } from "./actions";
import { InlineNumber } from "@/components/InlineNumber";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function ListEditor({ title, kind, items, placeholder }: { title: string; kind: string; items: ConfigItem[]; placeholder: string }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="chiprow" style={{ marginBottom: 12 }}>
        {items.length === 0 && <span className="muted" style={{ fontSize: 12 }}>None yet.</span>}
        {items.map((it) => (
          <span key={it.id} className="chip gray"
            style={it.color ? { background: it.color + "22", color: it.color } : undefined}>
            {it.value}
            <form action={removeConfigItem} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={it.id} />
              <button className="x">✕</button>
            </form>
          </span>
        ))}
      </div>
      <form action={addConfigItem} style={{ display: "flex", gap: 8 }}>
        <input type="hidden" name="kind" value={kind} />
        <input name="value" placeholder={`Add — e.g. ${placeholder}`}
          style={{ flex: 1, padding: "8px 11px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "var(--font-body)" }} />
        <button className="btn gold sm">+ Add</button>
      </form>
    </div>
  );
}

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Configuration is FocusQuest-only.</div>;

  const config = await getConfig();
  const providers = await getProviders();
  const by = (k: string) => config.filter((c) => c.kind === k);

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Configuration</div>
        <h2>Manage Your Lists</h2>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Providers &amp; Revenue Splits</h3></div>
        <table>
          <thead><tr><th>Provider</th><th className="r">Provider %</th><th className="r">School %</th><th className="r">FocusQuest %</th><th className="r">Total</th><th></th></tr></thead>
          <tbody>
            {providers.length === 0 && <tr><td colSpan={6}><div className="empty">No providers yet — add your first below.</div></td></tr>}
            {providers.map((p) => {
              const total = Math.round((p.provider_share + p.school_share + p.fq_share) * 100);
              return (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td className="r"><InlineNumber id={p.id} field="provider_share" value={Math.round(p.provider_share * 100)} action={updateProviderShare} /></td>
                  <td className="r"><InlineNumber id={p.id} field="school_share" value={Math.round(p.school_share * 100)} action={updateProviderShare} /></td>
                  <td className="r"><InlineNumber id={p.id} field="fq_share" value={Math.round(p.fq_share * 100)} action={updateProviderShare} /></td>
                  <td className="r"><span className={"chip " + (total === 100 ? "green" : "red")}>{total}%</span></td>
                  <td><form action={removeProvider}><input type="hidden" name="id" value={p.id} /><button className="btn sm danger">✕</button></form></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <form action={addProvider} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", padding: "12px 18px 16px" }}>
          <div className="field" style={{ flex: "1 1 180px" }}><label>Provider</label><input name="name" placeholder="e.g. MedCerts" required /></div>
          <div className="field" style={{ width: 96 }}><label>Provider %</label><input name="provider_share" type="number" defaultValue={40} min={0} max={100} /></div>
          <div className="field" style={{ width: 96 }}><label>School %</label><input name="school_share" type="number" defaultValue={40} min={0} max={100} /></div>
          <div className="field" style={{ width: 96 }}><label>FQ %</label><input name="fq_share" type="number" defaultValue={20} min={0} max={100} /></div>
          <button className="btn gold sm">+ Add provider</button>
        </form>
        <div className="srcnote" style={{ padding: "0 18px 14px" }}>A program uses its provider&apos;s split for all revenue. Editing School or Provider auto-fills FocusQuest as the remainder; FocusQuest stays editable. The three must total 100% (Total turns red otherwise).</div>
      </div>

      <div className="cards c2">
        <ListEditor title="Institution Types" kind="type" items={by("type")} placeholder="HBCU" />
        <ListEditor title="Payment Sources" kind="payment" items={by("payment")} placeholder="Workforce" />
        <ListEditor title="Lead Dispositions" kind="disposition" items={by("disposition")} placeholder="Contacted" />
        <ListEditor title="Program Categories" kind="category" items={by("category")} placeholder="Allied Health" />
        <ListEditor title="Funding Sources" kind="funding" items={by("funding")} placeholder="Workforce" />
      </div>
    </>
  );
}
