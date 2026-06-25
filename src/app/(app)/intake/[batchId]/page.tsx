import { getProfile, getImportBatch, getTenants } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function IntakeBatchPage({ params }: { params: { batchId: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Data Intake is FocusQuest-only.</div>;

  const batch = await getImportBatch(params.batchId);
  if (!batch) return <div className="empty">Import batch not found.</div>;
  const tenants = await getTenants();
  const tenantName = batch.tenant_id ? tenants.find((t) => t.id === batch.tenant_id)?.name ?? "—" : "—";
  const preview = batch.rows.slice(0, 25);

  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Data Intake</div>
        <h2>{batch.file_name}</h2>
        <Link className="btn sm ghost" href="/intake" style={{ marginTop: 6 }}>← Back to Data Intake</Link>
      </div>

      <div className="card">
        <h3>Batch</h3>
        <div className="frow f3">
          <div className="field"><label>School / tenant</label><input value={tenantName} disabled /></div>
          <div className="field"><label>Source</label><input value={batch.source || "—"} disabled /></div>
          <div className="field"><label>Rows</label><input value={String(batch.rows.length)} disabled /></div>
        </div>
        <div className="srcnote">
          {batch.profile_id ? "Matched a saved format — its mapping was pre-applied." : "New format — column mapping was auto-suggested."} Column mapping and import are added in the next step.
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Parsed Preview (first {preview.length} rows)</h3></div>
        <table>
          <thead><tr>{batch.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {preview.length === 0 && <tr><td colSpan={batch.headers.length || 1}><div className="empty">No data rows.</div></td></tr>}
            {preview.map((r, i) => (
              <tr key={i}>{batch.headers.map((h) => <td key={h} style={{ fontSize: 12 }}>{r[h]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
