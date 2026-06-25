"use server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function updateSplit(formData: FormData) {
  const profile = await getProfile();
  if (!profile || !isFQ(profile.role)) throw new Error("Revenue settings are managed by FocusQuest.");
  const supabase = createClient();
  const id = String(formData.get("tenant_id"));
  // Enter School % and Provider %; FocusQuest % is the remainder.
  let school = Math.max(0, Math.min(1, Number(formData.get("school_share") || 0) / 100));
  let provider = Math.max(0, Math.min(1, Number(formData.get("provider_share") || 0) / 100));
  if (school + provider > 1) provider = Math.max(0, 1 - school);
  const fq = Math.max(0, 1 - school - provider);
  await supabase.from("tenants").update({ school_share: school, provider_share: provider, fq_share: fq }).eq("id", id);
  revalidatePath("/revenue");
  revalidatePath("/", "layout");
}
