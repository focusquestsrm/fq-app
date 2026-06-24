import { createClient } from "@supabase/supabase-js";

// Privileged Supabase client using the SERVICE ROLE key. It bypasses RLS, so it
// is ONLY used in validated, admin-only server paths (inviting/removing users and
// seeding their profile row). The key is read from a non-public env var and must
// NEVER be exposed to the browser (do not prefix it with NEXT_PUBLIC_).
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client is not configured — set SUPABASE_SERVICE_ROLE_KEY (server env)."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
