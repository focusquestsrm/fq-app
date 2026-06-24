import { createClient } from "./supabase/server";
import type { Profile, Tenant, Program, Student, ConfigItem } from "./types";
import { cookies } from "next/headers";

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function getTenants(): Promise<Tenant[]> {
  const supabase = createClient();
  const { data } = await supabase.from("tenants").select("*").order("name");
  return (data as Tenant[]) ?? [];
}

// Which tenant the UI is scoped to. School users are pinned to their own;
// FQ users can switch via the `scope` cookie.
export async function getScope(profile: Profile, tenants: Tenant[]): Promise<string | null> {
  if (profile.tenant_id) return profile.tenant_id;
  const cookieScope = cookies().get("scope")?.value;
  if (cookieScope && tenants.some((t) => t.id === cookieScope)) return cookieScope;
  return tenants[0]?.id ?? null;
}

export async function getPrograms(tenantId?: string): Promise<Program[]> {
  const supabase = createClient();
  let q = supabase.from("programs").select("*").order("created_at");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data } = await q;
  return (data as Program[]) ?? [];
}

export async function getStudents(tenantId?: string): Promise<Student[]> {
  const supabase = createClient();
  let q = supabase.from("students").select("*").order("created_at", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data } = await q;
  return (data as Student[]) ?? [];
}

// People the current user is allowed to see. RLS scopes the result: FQ users get
// everyone; school users get only their own tenant's profiles (+ themselves).
export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("role")
    .order("full_name");
  return (data as Profile[]) ?? [];
}

export async function getConfig(): Promise<ConfigItem[]> {
  const supabase = createClient();
  const { data } = await supabase.from("config_items").select("*").order("sort");
  return (data as ConfigItem[]) ?? [];
}
