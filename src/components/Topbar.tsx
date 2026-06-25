import { isFQ, type Profile, type Tenant } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
import { ScopePicker } from "@/components/ScopePicker";
import { setClientView } from "@/app/(app)/schools/actions";
import { signOut } from "@/app/login/actions";

export function Topbar({
  profile, tenants, scope, clientView,
}: { profile: Profile; tenants: Tenant[]; scope: string | null; clientView: boolean }) {
  const fq = isFQ(profile.role);
  const onSchool = !!scope && scope !== "all";
  const initials = (profile.full_name || profile.email || "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="topbar">
      <div className="ttl">{ROLE_LABELS[profile.role]}</div>
      <div className="right">
        {fq && tenants.length > 0 && <ScopePicker tenants={tenants} scope={scope} />}
        {fq && onSchool && (
          <form action={setClientView}>
            <input type="hidden" name="on" value={clientView ? "0" : "1"} />
            <button className={"btn sm " + (clientView ? "gold" : "ghost")}>
              {clientView ? "Exit Client View" : "Client View"}
            </button>
          </form>
        )}
        <span className="rolechip">
          {fq ? (clientView && onSchool ? tenants.find((t) => t.id === scope)?.short_code + " (CLIENT VIEW)" : "FOCUSQUEST") : tenants.find((t) => t.id === scope)?.short_code + " PORTAL"}
        </span>
        <span className="avatar">{initials}</span>
        <form action={signOut}>
          <button className="btn sm ghost">Sign out</button>
        </form>
      </div>
    </div>
  );
}
