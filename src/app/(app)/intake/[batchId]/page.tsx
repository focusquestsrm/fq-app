import { getProfile, getImportBatch, getTenants, getPrograms } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { CANONICAL_FIELDS, STAGES } from "@/lib/constants";
import { headerForCanonical, distinctValues } from "@/lib/intake";
import { InlineSelect } from "@/components/InlineSelect";
import { updateColumnMap, updateStatusMap, updateProgramMap, saveProfile, runImport } from "../actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function IntakeBatchPage({ params }: { params: { batchId: string } }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!isFQ(profile.role)) return <div className="empty">Data Intake is FocusQuest-only.</div>;
  const canRun = profile.role !== "fqviewer";

  const batch = await getImportBatch(params.batchId);
  if (!batch) return <div className="empty">Import batch not found.</div>;
  const tenants = await getTenants();
  const tenantName = batch.tenant_id ? tenants.find((t) => t.id === batch.tenant_id)?.name ?? "—" : "—";
  const imported = batch.status === "imported";

  const programNames = batch.tenant_id
    ? Array.from(new Set((await getPrograms(batch.tenant_id)).map((p) => p.name))).sort((a, b) => a.localeCompare(b))
    : [];

  const statusHeader = headerForCanonical(batch.column_map, "raw_status");
  const programHeader = headerForCanonical(batch.column_map, "program");
  const statuses = distinctValues(batch.rows, statusHeader);
  const products = distinctValues(batch.rows, programHeader);
  const missingStatus = statuses.filter((s) => batch.status_map[s] === undefined);
  const missingProduct = products.filter((p) => !batch.program_map[p]);
  const ignored = batch.headers.filter((h) => !batch.column_map[h]);
  const ready = !!batch.tenant_id && missingStatus.length === 0 && missingProduct.length === 0;

  const colOptions = [{ value: "", label: "(ignore)" }, ...CANONICAL_FIELDS.map((f) => ({ value: f.key, label: f.label }))];
  const stageOptions = [{ value: "", label: "— choose stage —" }, ...STAGES.map((s, i) => ({ value: String(i), label: s }))];
  const progOptions = [{ value: "", label: "— choose program —" }, ...programNames.map((n) => ({ value: n, label: n }))];

  const preview = batch.rows.slice(0, 25);
  const cv = (r: Record<string, string>, canon: string) => {
    const h = headerForCanonical(batch.column_map, canon);
    return h ? r[h] ?? "" : "";
  };

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
          {imported ? "This batch has been imported." : batch.profile_id ? "A saved format matched — its mapping was pre-applied; adjust if needed." : "New format — column mapping was auto-suggested. Confirm the dropdowns."}
        </div>
      </div>

      {ignored.length > 0 && (
        <div className="card"><div className="callout">Ignored columns (not mapped, will not be imported): <b>{ignored.join(", ")}</b></div></div>
      )}

      {/* COLUMN MAPPING */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Column Mapping</h3></div>
        <table>
          <thead><tr><th>Their column</th><th>Maps to our field</th></tr></thead>
          <tbody>
            {batch.headers.map((h) => (
              <tr key={h}>
                <td><b>{h}</b></td>
                <td>
                  {canRun
                    ? <InlineSelect id={batch.id} field={h} value={batch.column_map[h] ?? ""} options={colOptions} action={updateColumnMap} />
                    : <span>{CANONICAL_FIELDS.find((f) => f.key === batch.column_map[h])?.label ?? "(ignore)"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* STATUS → STAGE */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Status → Stage{missingStatus.length > 0 && <span className="chip red" style={{ marginLeft: 8 }}>{missingStatus.length} unmapped</span>}</h3></div>
        <table>
          <thead><tr><th>Their status</th><th>Our journey stage</th></tr></thead>
          <tbody>
            {!statusHeader && <tr><td colSpan={2}><div className="empty">Map a column to “Status (Lead Status column)” above first.</div></td></tr>}
            {statusHeader && statuses.length === 0 && <tr><td colSpan={2}><div className="empty">No status values found.</div></td></tr>}
            {statuses.map((s) => {
              const mapped = batch.status_map[s] !== undefined;
              return (
                <tr key={s}>
                  <td><b>{s}</b>{!mapped && <span className="chip red" style={{ marginLeft: 8 }}>unmapped</span>}</td>
                  <td>
                    {canRun
                      ? <InlineSelect id={batch.id} field={s} value={mapped ? String(batch.status_map[s]) : ""} options={stageOptions} action={updateStatusMap} />
                      : <span>{mapped ? STAGES[batch.status_map[s]] : "—"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="srcnote" style={{ padding: "0 18px 14px" }}>The original status is also kept verbatim (raw_status). Mapping is saved to the format profile.</div>
      </div>

      {/* PRODUCT → PROGRAM */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Product → Program{missingProduct.length > 0 && <span className="chip red" style={{ marginLeft: 8 }}>{missingProduct.length} unmapped</span>}</h3></div>
        <table>
          <thead><tr><th>Their product</th><th>Our catalog program</th></tr></thead>
          <tbody>
            {!programHeader && <tr><td colSpan={2}><div className="empty">Map a column to “Program (Product column)” above first.</div></td></tr>}
            {programHeader && !batch.tenant_id && <tr><td colSpan={2}><div className="empty">Assign a school to load its program catalog.</div></td></tr>}
            {programHeader && products.map((p) => {
              const mapped = !!batch.program_map[p];
              return (
                <tr key={p}>
                  <td><b>{p}</b>{!mapped && <span className="chip red" style={{ marginLeft: 8 }}>unmapped</span>}</td>
                  <td>
                    {canRun
                      ? <InlineSelect id={batch.id} field={p} value={batch.program_map[p] ?? ""} options={progOptions} action={updateProgramMap} />
                      : <span>{batch.program_map[p] || "—"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="srcnote" style={{ padding: "0 18px 14px" }}>Multiple versions of a product can map to the same program.</div>
      </div>

      {/* SAVE FORMAT */}
      {canRun && !imported && (
        <div className="card">
          <h3>Save This Format</h3>
          <form action={saveProfile} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <input type="hidden" name="id" value={batch.id} />
            <div className="field" style={{ flex: "1 1 260px" }}><label>Format name</label><input name="name" placeholder="e.g. MedCerts Lead Report" defaultValue={batch.source ? `${batch.source} Lead Report` : ""} required /></div>
            <button className="btn ghost">Save format profile</button>
          </form>
          <div className="srcnote">Saves the column, status, and program maps so the next upload of this format reuses them automatically.</div>
        </div>
      )}

      {/* PREVIEW */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "16px 18px 0" }}><h3>Preview (first {preview.length} rows)</h3></div>
        <table>
          <thead><tr><th>First</th><th>Last</th><th>Email</th><th>Phone</th><th>Program</th><th>Status → Stage</th></tr></thead>
          <tbody>
            {preview.map((r, i) => {
              const product = programHeader ? (r[programHeader] ?? "") : "";
              const rawStatus = statusHeader ? (r[statusHeader] ?? "") : "";
              const prog = product ? (batch.program_map[product] || null) : "";
              const stageIdx = rawStatus ? batch.status_map[rawStatus] : undefined;
              const stageOk = !rawStatus || stageIdx !== undefined;
              const progOk = !product || !!prog;
              return (
                <tr key={i}>
                  <td>{cv(r, "first_name")}</td>
                  <td>{cv(r, "last_name")}</td>
                  <td style={{ fontSize: 12 }}>{cv(r, "email")}</td>
                  <td style={{ fontSize: 12 }}>{cv(r, "phone")}</td>
                  <td style={{ color: progOk ? undefined : "var(--red)" }}>{product ? (prog || "⚠ unmapped") : "—"}</td>
                  <td style={{ color: stageOk ? undefined : "var(--red)" }}>{rawStatus ? `${rawStatus} → ${stageOk ? STAGES[stageIdx as number] : "⚠ unmapped"}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* IMPORT */}
      {!imported && canRun && (
        <div className="card">
          <h3>Import</h3>
          {!ready ? (
            <div className="callout">
              Resolve before importing:
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {!batch.tenant_id && <li>Assign a school/tenant (re-upload with a school selected).</li>}
                {missingStatus.length > 0 && <li>Unmapped statuses: <b>{missingStatus.join(", ")}</b></li>}
                {missingProduct.length > 0 && <li>Unmapped products: <b>{missingProduct.join(", ")}</b></li>}
              </ul>
            </div>
          ) : (
            <form action={runImport}>
              <input type="hidden" name="id" value={batch.id} />
              <button className="btn gold">Import {batch.rows.length} rows (upsert by email / phone) →</button>
              <div className="srcnote">Existing leads in {tenantName} are updated; new ones inserted. Nothing was written until now.</div>
            </form>
          )}
        </div>
      )}

      {imported && (
        <div className="card"><div className="callout">Imported: <b>{batch.inserted}</b> inserted · <b>{batch.updated}</b> updated · <b>{batch.flagged}</b> flagged (no email/phone).</div></div>
      )}
    </>
  );
}
