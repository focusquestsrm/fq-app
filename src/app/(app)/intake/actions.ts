"use server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getImportProfileBySignature } from "@/lib/queries";
import { isFQ, type ImportBatch } from "@/lib/types";
import { headerSignature, suggestColumnMap, headerForCanonical, distinctValues } from "@/lib/intake";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Data Intake is FocusQuest-admin only (the read-only FQ Viewer can't run imports).
async function requireFQAdmin() {
  const p = await getProfile();
  if (!p || !isFQ(p.role) || p.role === "fqviewer") throw new Error("Data Intake is for FocusQuest admins.");
  return p;
}

// Upload → parse headers + rows → auto-detect a saved profile → create a draft.
export async function createBatch(formData: FormData) {
  const me = await requireFQAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Choose a .xlsx or .csv file.");
  const tenant_id = String(formData.get("tenant_id") || "") || null;
  const source = String(formData.get("source") || "").trim();

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
  const headerRow = (aoa[0] || []).map((h) => String(h ?? "").trim());
  const headers = headerRow.filter((h) => h !== "");
  if (headers.length === 0) throw new Error("Couldn't read any column headers from that file.");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const arr = (aoa[i] || []) as unknown[];
    if (arr.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: Record<string, string> = {};
    headerRow.forEach((h, idx) => { if (h !== "") obj[h] = String(arr[idx] ?? "").trim(); });
    rows.push(obj);
  }

  // Auto-detect a saved profile for this exact column signature.
  const sig = headerSignature(headers);
  const matched = await getImportProfileBySignature(sig);
  const column_map = matched ? matched.column_map : suggestColumnMap(headers);
  const status_map = matched ? matched.status_map : {};
  const program_map = matched ? matched.program_map : {};

  const supabase = createClient();
  const { data, error } = await supabase.from("import_batches").insert({
    tenant_id,
    source: source || matched?.source || "",
    file_name: file.name,
    headers,
    rows,
    profile_id: matched?.id ?? null,
    column_map,
    status_map,
    program_map,
    status: "draft",
    created_by: me.id,
    created_by_name: me.full_name || me.email || "",
  }).select("id").single();
  if (error) throw new Error(error.message);

  revalidatePath("/intake");
  redirect(`/intake/${data!.id}`);
}

export async function deleteBatch(formData: FormData) {
  await requireFQAdmin();
  const supabase = createClient();
  await supabase.from("import_batches").delete().eq("id", String(formData.get("id")));
  revalidatePath("/intake");
}

// ---- mapping edits (each dropdown submits one key) -------------------------
async function mergeMap(id: string, col: "column_map" | "status_map" | "program_map",
  key: string, value: string, asNumber: boolean) {
  const supabase = createClient();
  const { data: b } = await supabase.from("import_batches").select(col).eq("id", id).single();
  if (!b) return;
  const map: Record<string, unknown> = { ...((b as Record<string, Record<string, unknown>>)[col] || {}) };
  if (value === "") delete map[key];
  else map[key] = asNumber ? Number(value) : value;
  await supabase.from("import_batches").update({ [col]: map }).eq("id", id);
  revalidatePath(`/intake/${id}`);
}

export async function updateColumnMap(formData: FormData) {
  await requireFQAdmin();
  await mergeMap(String(formData.get("id")), "column_map", String(formData.get("field")), String(formData.get("value") || ""), false);
}
export async function updateStatusMap(formData: FormData) {
  await requireFQAdmin();
  await mergeMap(String(formData.get("id")), "status_map", String(formData.get("field")), String(formData.get("value") || ""), true);
}
export async function updateProgramMap(formData: FormData) {
  await requireFQAdmin();
  await mergeMap(String(formData.get("id")), "program_map", String(formData.get("field")), String(formData.get("value") || ""), false);
}

// ---- save the current maps as a reusable profile per provider format -------
export async function saveProfile(formData: FormData) {
  await requireFQAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name the format (e.g. “MedCerts Lead Report”).");
  const supabase = createClient();
  const { data: b } = await supabase.from("import_batches").select("*").eq("id", id).single();
  if (!b) return;
  const batch = b as ImportBatch;
  const payload = {
    name, source: batch.source,
    header_signature: headerSignature(batch.headers),
    column_map: batch.column_map, status_map: batch.status_map, program_map: batch.program_map,
    updated_at: new Date().toISOString(),
  };
  if (batch.profile_id) {
    await supabase.from("import_profiles").update(payload).eq("id", batch.profile_id);
  } else {
    const { data: prof } = await supabase.from("import_profiles").insert(payload).select("id").single();
    if (prof) await supabase.from("import_batches").update({ profile_id: prof.id }).eq("id", id);
  }
  revalidatePath(`/intake/${id}`);
  revalidatePath("/intake");
}

// ---- import (UPSERT into leads by email, fallback phone, within tenant) ----
export async function runImport(formData: FormData) {
  await requireFQAdmin();
  const id = String(formData.get("id"));
  const supabase = createClient();
  const { data: b } = await supabase.from("import_batches").select("*").eq("id", id).single();
  if (!b) throw new Error("Batch not found.");
  const batch = b as ImportBatch;
  if (!batch.tenant_id) throw new Error("Assign a school/tenant first.");

  const statusHeader = headerForCanonical(batch.column_map, "raw_status");
  const programHeader = headerForCanonical(batch.column_map, "program");

  // Never guess: every distinct status & product value must be mapped first.
  const missingStatus = distinctValues(batch.rows, statusHeader).filter((s) => batch.status_map[s] === undefined);
  const missingProduct = distinctValues(batch.rows, programHeader).filter((p) => !batch.program_map[p]);
  if (statusHeader && missingStatus.length) throw new Error(`Map these statuses first: ${missingStatus.join(", ")}`);
  if (programHeader && missingProduct.length) throw new Error(`Map these products first: ${missingProduct.join(", ")}`);

  // Existing leads in this tenant, for dedupe.
  const { data: existing } = await supabase.from("leads").select("id,email,phone").eq("tenant_id", batch.tenant_id);
  const byEmail = new Map<string, string>(), byPhone = new Map<string, string>();
  for (const e of existing || []) {
    if (e.email) byEmail.set(String(e.email).toLowerCase(), e.id);
    if (e.phone) byPhone.set(String(e.phone), e.id);
  }
  const seenEmail = new Set<string>(), seenPhone = new Set<string>();

  const val = (r: Record<string, string>, canon: string) => {
    const hh = headerForCanonical(batch.column_map, canon);
    return hh ? (r[hh] ?? "").toString().trim() : "";
  };

  let inserted = 0, updated = 0, flagged = 0;
  const toInsert: Record<string, unknown>[] = [];
  for (const r of batch.rows) {
    const email = val(r, "email").toLowerCase();
    const phone = val(r, "phone");
    const rawStatus = statusHeader ? (r[statusHeader] ?? "").toString().trim() : "";
    const product = programHeader ? (r[programHeader] ?? "").toString().trim() : "";
    const fields = {
      first_name: val(r, "first_name"), last_name: val(r, "last_name"),
      email: val(r, "email"), phone,
      program: product ? (batch.program_map[product] || "") : "",
      source: batch.source || val(r, "source"),
      raw_status: rawStatus,
      stage: rawStatus && batch.status_map[rawStatus] !== undefined ? batch.status_map[rawStatus] : 2,
      disposition: rawStatus || "Contacted",
      notes: val(r, "notes"), lead_owner: val(r, "lead_owner"),
      projected_enroll_date: val(r, "projected_enroll_date"),
      projected_start_date: val(r, "projected_start_date"),
    };
    if (!email && !phone) flagged++; // un-dedupable, still imported

    const matchId = (email && byEmail.get(email)) || (phone && byPhone.get(phone));
    if (matchId) {
      await supabase.from("leads").update({
        stage: fields.stage, raw_status: fields.raw_status, notes: fields.notes,
        program: fields.program, lead_owner: fields.lead_owner, disposition: fields.disposition,
        projected_enroll_date: fields.projected_enroll_date, projected_start_date: fields.projected_start_date,
      }).eq("id", matchId);
      updated++;
    } else if ((email && seenEmail.has(email)) || (phone && seenPhone.has(phone))) {
      continue; // duplicate row within the same file
    } else {
      toInsert.push({ tenant_id: batch.tenant_id, ...fields });
      if (email) seenEmail.add(email);
      if (phone) seenPhone.add(phone);
      inserted++;
    }
  }
  if (toInsert.length) {
    const { error } = await supabase.from("leads").insert(toInsert);
    if (error) throw new Error(error.message);
  }
  await supabase.from("import_batches").update({ status: "imported", inserted, updated, flagged }).eq("id", id);
  revalidatePath("/intake");
  redirect("/intake");
}
