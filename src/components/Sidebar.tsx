"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/constants";

export function Sidebar({ fq, canUsers }: { fq: boolean; canUsers: boolean }) {
  const path = usePathname();
  const items = NAV.filter((n) => (n.fqOnly ? fq : n.usersNav ? canUsers : true));
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">FQ</div>
        <div className="wm">FocusQuest <b>Strata</b></div>
        <div className="sub">Enrollment Intelligence</div>
      </div>
      <nav className="nav">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className={path === n.href ? "on" : ""}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="sidefoot">
        <span className="ferpa">✓ FERPA-aware · TX-RAMP track</span>
        <br />
        Tenant isolation · Role-based access
      </div>
    </aside>
  );
}
