import { redirect } from "next/navigation";
import { getProfile, getTenants, getScope } from "@/lib/queries";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { isFQ } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const tenants = await getTenants();
  const scope = await getScope(profile, tenants);

  return (
    <div className="shell">
      <Sidebar fq={isFQ(profile.role)} />
      <div className="main">
        <Topbar profile={profile} tenants={tenants} scope={scope} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
