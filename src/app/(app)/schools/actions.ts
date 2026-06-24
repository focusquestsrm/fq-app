"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function setScope(formData: FormData) {
  const scope = String(formData.get("scope") || "");
  cookies().set("scope", scope, { path: "/" });
  revalidatePath("/", "layout");
}

export async function createTenant(formData: FormData) {
  const supabase = createClient();
  const school = Number(formData.get("school_share") || 40) / 100;
  const fq = Number(formData.get("fq_share") || 20) / 100;
  await supabase.from("tenants").insert({
    name: String(formData.get("name") || "").trim(),
    short_code: String(formData.get("short_code") || "").trim().toUpperCase(),
    type: String(formData.get("type") || "HBCU"),
    school_share: school,
    fq_share: fq,
    contact: String(formData.get("contact") || ""),
    dsa: String(formData.get("dsa") || "Not started"),
    billing: String(formData.get("billing") || "Prospect"),
    live: true,
  });
  revalidatePath("/schools");
  revalidatePath("/", "layout");
}

export async function deleteTenant(formData: FormData) {
  const supabase = createClient();
  await supabase.from("tenants").delete().eq("id", String(formData.get("id")));
  revalidatePath("/schools");
  revalidatePath("/", "layout");
}
