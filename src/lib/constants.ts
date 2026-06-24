import type { Role } from "./types";

export const STAGES = [
  "Lead received", "Lead validated", "Sent to provider", "Provider contacted",
  "Application started", "Funding reviewed", "Enrollment pending", "Enrolled",
  "Active student", "Student Success engaged", "At-risk", "Completed",
  "Dropped", "Revenue closed",
];
export const STA = {
  enrolled: 7, active: 8, successEngaged: 9, atRisk: 10,
  completed: 11, dropped: 12, revClosed: 13,
};
export const enrolledRev = (stage: number) => stage >= STA.enrolled && stage !== STA.dropped;

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "FQ Owner",
  accountmgr: "FQ Admin",
  fqviewer: "FQ Viewer",
  schoolexec: "School Admin",
  enrollmgr: "School Editor",
  coach: "Student Success Coach",
  provider: "Provider / Publisher",
  finance: "Finance / Billing",
  auditor: "School Viewer",
};

export const NAV: { href: string; label: string; fqOnly?: boolean; usersNav?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/revenue", label: "Revenue Model" },
  { href: "/programs", label: "Program Catalog" },
  { href: "/students", label: "Students" },
  { href: "/schools", label: "Tenant Management", fqOnly: true },
  { href: "/users", label: "Users & Permissions", usersNav: true },
  { href: "/settings", label: "Configuration", fqOnly: true },
];

export const PALETTE = [
  "#2E5FA3", "#7A3FB8", "#B07414", "#C6A04A", "#1E8E5A",
  "#C0392B", "#5E86C4", "#9B7BC4", "#2E8B7A", "#A0552E",
];
