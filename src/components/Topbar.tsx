import { isFQ, type Profile, type Tenant } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
import { ScopePicker } from "@/components/ScopePicker";
import { signOut } from "@/app/login/actions";

export function Topbar({
  profile, tenants, scope,
}: { profile: Profile; tenants: Tenant[]; scope: string | null }) {
  const fq = isFQ(profile.role);
  const initials = (profile.full_name || profile.email || "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="topbar">
      <div className="ttl">{ROLE_LABELS[profile.role]}</div>
      <div className="right">
        {fq && tenants.length > 0 && <ScopePicker tenants={tenants} scope={scope} />}
        <span className="rolechip">
          {fq ? "FOCUSQUEST" : tenants.find((t) => t.id === scope)?.short_code + " PORTAL"}
        </span>
        <span className="avatar">{initials}</span>
        <form action={signOut}>
          <button className="btn sm ghost">Sign out</button>
        </form>
      </div>
    </div>
  );
}
