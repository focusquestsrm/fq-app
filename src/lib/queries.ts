import { createClient } from "./supabase/server";
import type {
  Profile, Tenant, Program, Student, Lead, ConfigItem, Provider, FQCost,
  ImportProfile, ImportBatch,
} from "./types";
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

// Which tenant the UI is scoped to. School users are pinned to their own; FQ users
// switch via the `scope` cookie and may choose "all" to view every school at once.
// Returns a tenant id, the literal "all" (FQ aggregate), or null (no schools yet).
export async function getScope(profile: Profile, tenants: Tenant[]): Promise<string | null> {
  if (profile.tenant_id) return profile.tenant_id;
  const cookieScope = cookies().get("scope")?.value;
  if (cookieScope === "all") return "all";
  if (cookieScope && tenants.some((t) => t.id === cookieScope)) return cookieScope;
  return tenants.length ? "all" : null; // FQ default: all schools
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

export async function getLeads(tenantId?: string): Promise<Lead[]> {
  const supabase = createClient();
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data } = await q;
  return (data as Lead[]) ?? [];
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

// FQ "Client View" preview toggle (cookie). When on, an FQ user sees a scoped
// school exactly as that school would: school-share only and read-only.
export function getClientView(): boolean {
  return cookies().get("clientview")?.value === "1";
}

export async function getProviders(): Promise<Provider[]> {
  const supabase = createClient();
  const { data } = await supabase.from("providers").select("*").order("name");
  return (data as Provider[]) ?? [];
}

// FocusQuest cost line items. RLS restricts this to FQ staff only.
export async function getFQCosts(): Promise<FQCost[]> {
  const supabase = createClient();
  const { data } = await supabase.from("fq_costs").select("*").order("created_at");
  return (data as FQCost[]) ?? [];
}

// ---- Data Intake (provider report importer) — FQ-only via RLS --------------
export async function getImportProfiles(): Promise<ImportProfile[]> {
  const supabase = createClient();
  const { data } = await supabase.from("import_profiles").select("*").order("name");
  return (data as ImportProfile[]) ?? [];
}

export async function getImportProfileBySignature(sig: string): Promise<ImportProfile | null> {
  const supabase = createClient();
  const { data } = await supabase.from("import_profiles").select("*").eq("header_signature", sig).limit(1);
  return (data?.[0] as ImportProfile) ?? null;
}

export async function getImportBatches(): Promise<ImportBatch[]> {
  const supabase = createClient();
  const { data } = await supabase.from("import_batches").select("*").order("created_at", { ascending: false });
  return (data as ImportBatch[]) ?? [];
}

export async function getImportBatch(id: string): Promise<ImportBatch | null> {
  const supabase = createClient();
  const { data } = await supabase.from("import_batches").select("*").eq("id", id).single();
  return (data as ImportBatch) ?? null;
}

export async function getConfig(): Promise<ConfigItem[]> {
  const supabase = createClient();
  // Alphabetical so every dropdown built from these lists is sorted.
  const { data } = await supabase.from("config_items").select("*").order("value");
  return (data as ConfigItem[]) ?? [];
}
