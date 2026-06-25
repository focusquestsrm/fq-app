"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PALETTE } from "@/lib/constants";

export async function addConfigItem(formData: FormData) {
  const supabase = createClient();
  const kind = String(formData.get("kind"));
  const value = String(formData.get("value") || "").trim();
  if (!value) return;
  const { data } = await supabase.from("config_items").select("id").eq("kind", kind).eq("value", value);
  if (data && data.length) return; // no duplicates
  const { count } = await supabase.from("config_items").select("*", { count: "exact", head: true }).eq("kind", kind);
  await supabase.from("config_items").insert({
    kind, value, sort: count || 0,
    color: kind === "provider" ? PALETTE[(count || 0) % PALETTE.length] : "",
  });
  revalidatePath("/settings");
}

export async function removeConfigItem(formData: FormData) {
  const supabase = createClient();
  await supabase.from("config_items").delete().eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}

// ---- Providers (each with its own revenue split) --------------------------
const clampPct = (v: FormDataEntryValue | null, dflt: number) =>
  Math.max(0, Math.min(1, Number(v ?? dflt) / 100));

export async function addProvider(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const { count } = await supabase.from("providers").select("*", { count: "exact", head: true });
  await supabase.from("providers").insert({
    name,
    provider_share: clampPct(formData.get("provider_share"), 40),
    school_share: clampPct(formData.get("school_share"), 40),
    fq_share: clampPct(formData.get("fq_share"), 20),
    sort: count || 0,
  });
  revalidatePath("/settings");
  revalidatePath("/programs");
  revalidatePath("/revenue");
  revalidatePath("/dashboard");
}

export async function updateProviderShare(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const field = String(formData.get("field"));
  if (!["provider_share", "school_share", "fq_share"].includes(field)) return;

  const { data: row } = await supabase
    .from("providers").select("provider_share,school_share,fq_share").eq("id", id).single();
  if (!row) return;
  let school = row.school_share, provider = row.provider_share, fq = row.fq_share;
  const v = clampPct(formData.get("value"), 0);
  // Editing School or Provider auto-fills FocusQuest as the remainder (kept 0..1);
  // editing FocusQuest directly keeps the entered value (still editable).
  if (field === "school_share") { school = v; fq = Math.max(0, Math.min(1, 1 - school - provider)); }
  else if (field === "provider_share") { provider = v; fq = Math.max(0, Math.min(1, 1 - school - provider)); }
  else { fq = v; }

  await supabase.from("providers")
    .update({ school_share: school, provider_share: provider, fq_share: fq }).eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/revenue");
  revalidatePath("/dashboard");
}

export async function removeProvider(formData: FormData) {
  const supabase = createClient();
  await supabase.from("providers").delete().eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}
