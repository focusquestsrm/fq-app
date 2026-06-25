import { redirect } from "next/navigation";
import { getProfile, getTenants, getScope, getClientView } from "@/lib/queries";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { isFQ, canManageUsers } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);
  // Client View only applies while previewing a single school (never on All Schools),
  // so going back to All Schools can't leave you stuck in a school's view.
  const clientView = isFQ(profile.role) && scope !== "all" && getClientView();

  return (
    <div className="shell">
      <Sidebar
        fq={isFQ(profile.role)}
        canUsers={isFQ(profile.role) || canManageUsers(profile.role)}
        showSetup={isFQ(profile.role) && !clientView}
      />
      <div className="main">
        <Topbar profile={profile} tenants={tenants} scope={scope} clientView={clientView} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
