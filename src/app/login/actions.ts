"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function signIn(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUp(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "");

  // Invite-only: public sign-up is allowed ONLY to bootstrap the very first
  // account (the owner). Once anyone exists, new accounts come from invites.
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("profiles").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return { error: "Sign-ups are invite-only. Ask an administrator to invite you." };
    }
  } catch {
    return { error: "Sign-up isn’t available yet. The server is missing its configuration." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) return { error: error.message };
  // If email confirmation is disabled, the session is set and we can proceed.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return { error: "Check your email to confirm your account, then sign in." };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
