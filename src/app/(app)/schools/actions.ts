"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function setScope(formData: FormData) {
  const scope = String(formData.get("scope") || "");
  cookies().set("scope", scope, { path: "/" });
  revalidatePath("/", "layout");
}

// Create a new school, or update an existing one when an `id` is present.
export async function saveTenant(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  // Enter School % and Provider %; FocusQuest % is the remainder.
  const school = Math.max(0, Math.min(1, Number(formData.get("school_share") || 40) / 100));
  let provider = Math.max(0, Math.min(1, Number(formData.get("provider_share") || 40) / 100));
  if (school + provider > 1) provider = Math.max(0, 1 - school);
  const fq = Math.max(0, 1 - school - provider);
  const fields = {
    name: String(formData.get("name") || "").trim(),
    short_code: String(formData.get("short_code") || "").trim().toUpperCase(),
    type: String(formData.get("type") || "HBCU"),
    school_share: school,
    provider_share: provider,
    fq_share: fq,
    contact: String(formData.get("contact") || ""),
  };
  if (id) {
    // Only the editable fields — leaves dsa/billing/live untouched.
    await supabase.from("tenants").update(fields).eq("id", id);
  } else {
    await supabase.from("tenants").insert({ ...fields, dsa: "Not started", billing: "Prospect", live: true });
  }
  revalidatePath("/schools");
  revalidatePath("/revenue");
  revalidatePath("/", "layout");
  redirect("/schools"); // clears the ?edit= param after saving
}

export async function deleteTenant(formData: FormData) {
  const supabase = createClient();
  await supabase.from("tenants").delete().eq("id", String(formData.get("id")));
  revalidatePath("/schools");
  revalidatePath("/", "layout");
}
