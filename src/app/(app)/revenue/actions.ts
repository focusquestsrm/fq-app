"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSplit(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("tenant_id"));
  // Enter School % and Publisher %; FocusQuest % is the remainder.
  let school = Math.max(0, Math.min(1, Number(formData.get("school_share") || 0) / 100));
  let provider = Math.max(0, Math.min(1, Number(formData.get("provider_share") || 0) / 100));
  if (school + provider > 1) provider = Math.max(0, 1 - school);
  const fq = Math.max(0, 1 - school - provider);
  await supabase.from("tenants").update({ school_share: school, provider_share: provider, fq_share: fq }).eq("id", id);
  revalidatePath("/revenue");
  revalidatePath("/", "layout");
}
