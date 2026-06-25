"use server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getImportProfileBySignature } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { headerSignature, suggestColumnMap } from "@/lib/intake";
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
