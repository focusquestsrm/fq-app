"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSplit(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("tenant_id"));
  let school = Number(formData.get("school_share") || 0) / 100;
  let fq = Number(formData.get("fq_share") || 0) / 100;
  school = Math.max(0, Math.min(1, school));
  fq = Math.max(0, Math.min(1, fq));
  if (school + fq > 1) fq = Math.max(0, 1 - school);
  await supabase.from("tenants").update({ school_share: school, fq_share: fq }).eq("id", id);
  revalidatePath("/revenue");
  revalidatePath("/", "layout");
}
