"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PALETTE } from "@/lib/constants";

async function ensureProvider(name: string) {
  name = (name || "").trim();
  if (!name) return "";
  const supabase = createClient();
  const { data } = await supabase.from("config_items").select("id").eq("kind", "provider").eq("value", name);
  if (!data || data.length === 0) {
    const { count } = await supabase.from("config_items").select("*", { count: "exact", head: true }).eq("kind", "provider");
    await supabase.from("config_items").insert({
      kind: "provider", value: name, color: PALETTE[(count || 0) % PALETTE.length], sort: count || 0,
    });
  }
  return name;
}

// Create a new program, or update an existing one when an `id` is present.
export async function saveProgram(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const provider = await ensureProvider(String(formData.get("provider") || ""));
  const fields = {
    name: String(formData.get("name") || "").trim(),
    provider,
    cost: Number(formData.get("cost") || 0),
    goal: Number(formData.get("goal") || 0),
    cap: Number(formData.get("cap") || 0),
    cert: String(formData.get("cert") || ""),
    category: String(formData.get("category") || ""),
    delivery: String(formData.get("delivery") || "Online"),
    funding: formData.getAll("funding").map(String).filter(Boolean),
  };
  if (id) {
    await supabase.from("programs").update(fields).eq("id", id);
  } else {
    await supabase.from("programs").insert({ tenant_id: String(formData.get("tenant_id")), ...fields, active: true });
  }
  revalidatePath("/programs");
  revalidatePath("/revenue");
  redirect("/programs"); // clears the ?edit= param after saving
}

export async function updateProgramField(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const field = String(formData.get("field")); // 'cost' | 'goal'
  const value = Number(formData.get("value") || 0);
  if (field !== "cost" && field !== "goal") return;
  await supabase.from("programs").update({ [field]: value }).eq("id", id);
  revalidatePath("/programs");
  revalidatePath("/revenue");
}

export async function deleteProgram(formData: FormData) {
  const supabase = createClient();
  await supabase.from("programs").delete().eq("id", String(formData.get("id")));
  revalidatePath("/programs");
}
