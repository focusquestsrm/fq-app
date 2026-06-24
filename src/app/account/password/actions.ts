"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function setPassword(_prev: unknown, formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords don’t match." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your invite link has expired. Ask for a new invite." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  // Mark the profile active now that they've set a password.
  await supabase.from("profiles").update({ status: "Active" }).eq("id", user.id);
  redirect("/dashboard");
}
