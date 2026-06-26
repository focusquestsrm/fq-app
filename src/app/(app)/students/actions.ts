"use server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";
import { isFQ } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Students are managed by FocusQuest; schools view them read-only.
async function requireFQ() {
  const p = await getProfile();
  if (!p || !isFQ(p.role)) throw new Error("Students are managed by FocusQuest.");
}

// Create a new student, or update an existing one when an `id` is present.
export async function saveStudent(formData: FormData) {
  await requireFQ();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const program_id = String(formData.get("program_id") || "");

  // Program name / provider / cost are pulled from the chosen catalog program.
  let program = "", provider = "", cost = 0;
  if (program_id) {
    const { data } = await supabase.from("programs").select("name,provider,cost").eq("id", program_id).single();
    if (data) { program = data.name; provider = data.provider; cost = data.cost; }
  }

  const fields = {
    program_id: program_id || null,
    first_name: String(formData.get("first_name") || "").trim(),
    last_name: String(formData.get("last_name") || "").trim(),
    program, provider, cost,
    stage: Number(formData.get("stage") || 7),
    payment: String(formData.get("payment") || ""),
    collected: Number(formData.get("collected") || 0),
    start_date: String(formData.get("start_date") || ""),
    end_date: String(formData.get("end_date") || ""),
  };

  if (id) {
    await supabase.from("students").update(fields).eq("id", id);
  } else {
    await supabase.from("students").insert({ tenant_id: String(formData.get("tenant_id")), ...fields, checklist: [], help: [] });
  }
  revalidatePath("/students");
  redirect("/students"); // clears the ?edit= param after saving
}

export async function deleteStudent(formData: FormData) {
  await requireFQ();
  const supabase = createClient();
  await supabase.from("students").delete().eq("id", String(formData.get("id")));
  revalidatePath("/students");
}
