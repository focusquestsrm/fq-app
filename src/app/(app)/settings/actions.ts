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
