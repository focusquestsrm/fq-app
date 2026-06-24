import { getProfile, getConfig } from "@/lib/queries";
import { isFQ, type ConfigItem } from "@/lib/types";
import { addConfigItem, removeConfigItem } from "./actions";
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
  const by = (k: string) => config.filter((c) => c.kind === k);

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Configuration</div>
        <h2>Manage your lists</h2>
        <p>Nothing here is fixed — add or remove the options that appear across your forms. These are shared by every user in your organization.</p>
      </div>
      <div className="cards c2">
        <ListEditor title="Institution types" kind="type" items={by("type")} placeholder="HBCU" />
        <ListEditor title="Providers / publishers" kind="provider" items={by("provider")} placeholder="MedCerts" />
        <ListEditor title="Payment sources" kind="payment" items={by("payment")} placeholder="Workforce" />
        <ListEditor title="Lead dispositions" kind="disposition" items={by("disposition")} placeholder="Contacted" />
      </div>
    </>
  );
}
