"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/queries";
import { revalidatePath } from "next/cache";
import {
  assignableRoles, canManageUsers, isFQ, isOwner, isFQRole, isSchoolRole,
  type Profile, type Role,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Server-side guardrails. The UI hides controls a user shouldn't have, but the
// real enforcement lives here (plus RLS in the database). Never trust the form.
// ---------------------------------------------------------------------------

async function requireManager(): Promise<Profile> {
  const actor = await getProfile();
  if (!actor || !canManageUsers(actor.role)) throw new Error("Not authorized to manage users.");
  return actor;
}

// May `actor` administer this existing `target`?
function canActOn(actor: Profile, target: Profile): boolean {
  if (target.id === actor.id) return false;                 // never edit/remove yourself here
  if (isOwner(target.role) && !isOwner(actor.role)) return false; // protect the owner
  if (isFQ(actor.role)) return true;                        // FQ admins manage everyone
  // School Admin: only their own school, and only school-level people.
  return actor.tenant_id != null
    && target.tenant_id === actor.tenant_id
    && isSchoolRole(target.role);
}

function siteURL(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Reconcile a role with the tenant it implies. FQ roles are org-wide (null);
// school roles must belong to one school.
function reconcileTenant(actor: Profile, role: Role, current: string | null): string | null {
  if (isFQRole(role)) return null;
  // school role:
  if (!isFQ(actor.role)) return actor.tenant_id; // school admin can only grant within their school
  return current;                                 // FQ admin keeps/sets the explicit school
}

async function ownerCount(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { count } = await supabase
    .from("profiles").select("*", { count: "exact", head: true }).eq("role", "superadmin");
  return count ?? 0;
}

// ---- invite ---------------------------------------------------------------
export async function inviteUser(formData: FormData) {
  const actor = await requireManager();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "") as Role;
  let tenant_id: string | null = String(formData.get("tenant_id") || "") || null;
  if (!email) throw new Error("Email is required.");
  if (!assignableRoles(actor.role).includes(role)) throw new Error("You can’t assign that role.");

  tenant_id = reconcileTenant(actor, role, tenant_id);
  if (isSchoolRole(role) && !tenant_id) throw new Error("Pick a school for a school-level role.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: `${siteURL()}/auth/confirm?next=/account/password`,
  });
  if (error) throw new Error(error.message);

  // Seed the new user's profile with the chosen role + school. (The signup
  // trigger creates a default 'auditor' row; we overwrite it here.)
  const uid = data.user?.id;
  if (uid) {
    await admin.from("profiles")
      .update({ full_name, email, role, tenant_id, status: "Invited" })
      .eq("id", uid);
  }
  revalidatePath("/users");
}

// ---- change role ----------------------------------------------------------
export async function setUserRole(formData: FormData) {
  const actor = await requireManager();
  const id = String(formData.get("id"));
  const role = String(formData.get("value") || "") as Role;
  if (!assignableRoles(actor.role).includes(role)) throw new Error("You can’t assign that role.");

  const supabase = createClient();
  const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!target) throw new Error("User not found.");
  if (!canActOn(actor, target as Profile)) throw new Error("Not authorized for this user.");

  // Never demote the last owner out of existence.
  if (isOwner((target as Profile).role) && !isOwner(role) && (await ownerCount(supabase)) <= 1) {
    throw new Error("There must always be at least one owner.");
  }

  const tenant_id = reconcileTenant(actor, role, (target as Profile).tenant_id);
  const { error } = await supabase.from("profiles").update({ role, tenant_id }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
  revalidatePath("/", "layout");
}

// ---- change school (FQ admins only) ---------------------------------------
export async function setUserSchool(formData: FormData) {
  const actor = await requireManager();
  if (!isFQ(actor.role)) throw new Error("Only FocusQuest can reassign schools.");
  const id = String(formData.get("id"));
  const tenant_id = String(formData.get("value") || "") || null;

  const supabase = createClient();
  const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!target) throw new Error("User not found.");
  if (!canActOn(actor, target as Profile)) throw new Error("Not authorized for this user.");
  if (!isSchoolRole((target as Profile).role)) throw new Error("Give them a school-level role first.");
  if (!tenant_id) throw new Error("Pick a school.");

  const { error } = await supabase.from("profiles").update({ tenant_id }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

// ---- remove ---------------------------------------------------------------
export async function removeUser(formData: FormData) {
  const actor = await requireManager();
  const id = String(formData.get("id"));

  const supabase = createClient();
  const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!target) return;
  if (!canActOn(actor, target as Profile)) throw new Error("Not authorized for this user.");
  if (isOwner((target as Profile).role) && (await ownerCount(supabase)) <= 1) {
    throw new Error("Can’t remove the last owner.");
  }

  // Deleting the auth user cascades to the profile row.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}
