import { getProfile, getTenants, getProviders, getImportProfiles, getImportBatches } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { createBatch, deleteBatch, clearImportedLeads } from "./actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Data Intake is FocusQuest-only.</div>;
  const canRun = profile.role !== "fqviewer";

  const tenants = await getTenants();
  const providers = await getProviders();
  const profiles = await getImportProfiles();
  const batches = await getImportBatches();
  const tenantName = (id: string | null) => (id ? tenants.find((t) => t.id === id)?.name ?? "—" : "—");
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US");

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Data Intake</div>
        <h2>Provider Report Importer</h2>
      </div>

      {canRun && (
        <div className="card">
          <h3>Upload a Report</h3>
          <form action={createBatch} className="form">
            <div className="frow f3">
              <div className="field"><label>File (.xlsx or .csv)</label><input type="file" name="file" accept=".xlsx,.xls,.csv" required /></div>
              <div className="field"><label>School / tenant</label>
                <select name="tenant_id" required defaultValue="">
                  <option value="" disabled>Select a school…</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Source provider</label>
                <select name="source" defaultValue={providers[0]?.name ?? ""}>
                  {providers.length === 0 && <option value="">— add providers in Configuration —</option>}
                  {providers.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div><button className="btn gold">Upload &amp; map →</button></div>
          </form>
          <div className="srcnote">The file is parsed and held as a draft for review — nothing is written to leads until you confirm the import.</div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Saved Formats</h3></div>
        <table>
          <thead><tr><th>Profile</th><th>Source</th><th className="r">Columns mapped</th></tr></thead>
          <tbody>
            {profiles.length === 0 && <tr><td colSpan={3}><div className="empty">No saved formats yet — save one from a mapping screen.</div></td></tr>}
            {profiles.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b></td>
                <td>{p.source || "—"}</td>
                <td className="r mono">{Object.keys(p.column_map || {}).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Import History</h3></div>
        <table>
          <thead><tr><th>File</th><th>School</th><th>Source</th><th>Date</th><th>By</th><th className="r">Ins / Upd / Flag</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {batches.length === 0 && <tr><td colSpan={8}><div className="empty">No imports yet.</div></td></tr>}
            {batches.map((b) => (
              <tr key={b.id}>
                <td><b>{b.file_name}</b></td>
                <td>{tenantName(b.tenant_id)}</td>
                <td>{b.source || "—"}</td>
                <td className="mono" style={{ fontSize: 12 }}>{fmtDate(b.created_at)}</td>
                <td style={{ fontSize: 12 }}>{b.created_by_name || "—"}</td>
                <td className="r mono">{b.inserted} / {b.updated} / {b.flagged}</td>
                <td>{b.status === "imported" ? <span className="chip green">Imported</span> : <span className="chip amber">Draft</span>}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Link className="btn sm ghost" href={`/intake/${b.id}`}>{b.status === "imported" ? "View" : "Continue"}</Link>
                    {canRun && <form action={deleteBatch}><input type="hidden" name="id" value={b.id} /><button className="btn sm danger">✕</button></form>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canRun && (
        <div className="card">
          <h3>Clear Imported Data</h3>
          <form action={clearImportedLeads} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div className="field" style={{ flex: "1 1 200px" }}><label>Source</label>
              <select name="source" defaultValue={providers[0]?.name ?? ""}>
                {providers.length === 0 && <option value="">— no providers —</option>}
                {providers.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: "1 1 200px" }}><label>School</label>
              <select name="tenant_id" defaultValue="">
                <option value="">All schools</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <ConfirmButton className="btn danger" message="Permanently delete the imported leads AND import history for this source/school? This cannot be undone.">
              Clear imported leads
            </ConfirmButton>
          </form>
          <div className="srcnote">Deletes the actual leads (the dashboard data) <b>and</b> their import-history rows for the selected source. The saved format profile is kept.</div>
        </div>
      )}
    </>
  );
}
