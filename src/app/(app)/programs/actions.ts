"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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

export async function createProgram(formData: FormData) {
  const supabase = createClient();
  const provider = await ensureProvider(String(formData.get("provider") || ""));
  await supabase.from("programs").insert({
    tenant_id: String(formData.get("tenant_id")),
    name: String(formData.get("name") || "").trim(),
    provider,
    cost: Number(formData.get("cost") || 0),
    goal: Number(formData.get("goal") || 0),
    cap: Number(formData.get("cap") || 0),
    cert: String(formData.get("cert") || ""),
    hours: Number(formData.get("hours") || 0),
    weeks: Number(formData.get("weeks") || 0),
    category: String(formData.get("category") || "Allied Health"),
    delivery: String(formData.get("delivery") || "Online"),
    funding: String(formData.get("funding") || "").split(",").map((s) => s.trim()).filter(Boolean),
    active: true,
  });
  revalidatePath("/programs");
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
