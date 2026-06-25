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
  const clientView = getClientView();

  return (
    <div className="shell">
      <Sidebar fq={isFQ(profile.role)} canUsers={isFQ(profile.role) || canManageUsers(profile.role)} />
      <div className="main">
        <Topbar profile={profile} tenants={tenants} scope={scope} clientView={clientView} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
