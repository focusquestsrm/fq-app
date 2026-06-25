"use server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { revalidatePath } from "next/cache";

// Costs are FocusQuest-internal; editable by FQ staff except the read-only Viewer.
async function requireFQEditor() {
  const p = await getProfile();
  if (!p || !isFQ(p.role) || p.role === "fqviewer") throw new Error("FocusQuest admins only.");
}

export async function addCost(formData: FormData) {
  await requireFQEditor();
  const label = String(formData.get("label") || "").trim();
  if (!label) return;
  const amount = Number(formData.get("amount") || 0);
  const supabase = createClient();
  await supabase.from("fq_costs").insert({ label, amount });
  revalidatePath("/costs");
}

export async function deleteCost(formData: FormData) {
  await requireFQEditor();
  const supabase = createClient();
  await supabase.from("fq_costs").delete().eq("id", String(formData.get("id")));
  revalidatePath("/costs");
}
