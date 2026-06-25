"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, type NavItem, type NavGroup } from "@/lib/constants";

export function Sidebar({ fq, canUsers, showSetup }: { fq: boolean; canUsers: boolean; showSetup: boolean }) {
  const path = usePathname();
  const visible = (n: NavItem) => (n.fqOnly ? fq : n.usersNav ? canUsers : true);

  const link = (n: NavItem) => (
    <Link key={n.href} href={n.href} className={path === n.href ? "on" : ""}>
      {n.label}
    </Link>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">FQ</div>
        <div className="wm">FocusQuest <b>Strata</b></div>
        <div className="sub">Enrollment Intelligence</div>
      </div>
      <nav className="nav">
        {NAV.map((n, i) => {
          if ("group" in n) {
            if (!showSetup) return null; // Setup is FocusQuest-only (hidden in Client View)
            const items = (n as NavGroup).items.filter(visible);
            if (items.length === 0) return null;
            return (
              <div key={n.group}>
                <div className="grp">{n.group}</div>
                {items.map(link)}
              </div>
            );
          }
          return visible(n as NavItem) ? link(n as NavItem) : null;
        })}
      </nav>
      <div className="sidefoot">
        <span className="ferpa">✓ FERPA-aware · TX-RAMP track</span>
        <br />
        Tenant isolation · Role-based access
      </div>
    </aside>
  );
}
