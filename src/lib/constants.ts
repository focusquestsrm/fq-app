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

// Display-only PHASE layer on top of the 14 stages (stages stay the source of
// truth for status-mapping + revenue). Edit groupings here. Stage = STAGES index.
export const PHASES: { key: string; label: string; stages: number[] }[] = [
  { key: "lead", label: "Lead", stages: [0, 1] },
  { key: "outreach", label: "Outreach", stages: [2, 3] },
  { key: "application", label: "Application", stages: [4, 5, 6] },
  { key: "enrolled", label: "Enrolled", stages: [7, 8] },
  { key: "outcome", label: "Outcome", stages: [9, 10, 11, 12, 13] },
];

export function stageToPhase(stage: number): string {
  return PHASES.find((p) => p.stages.includes(stage))?.key ?? "";
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "FQ Owner",
  accountmgr: "FQ Admin",
  fqviewer: "FQ Viewer",
  schoolexec: "School Admin",
  enrollmgr: "School Editor",
  coach: "Student Success Coach",
  provider: "Provider",
  finance: "Finance / Billing",
  auditor: "School Viewer",
};

export type NavItem = { href: string; label: string; fqOnly?: boolean; usersNav?: boolean };
export type NavGroup = { group: string; items: NavItem[] };

export const NAV: (NavItem | NavGroup)[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/revenue", label: "Revenue Model" },
  { href: "/programs", label: "Program Catalog" },
  { href: "/students", label: "Students" },
  {
    group: "Setup",
    items: [
      { href: "/schools", label: "Tenant Management", fqOnly: true },
      { href: "/intake", label: "Data Intake", fqOnly: true },
      { href: "/costs", label: "Costs & Profit", fqOnly: true },
      { href: "/users", label: "Users & Permissions", usersNav: true },
      { href: "/settings", label: "Configuration", fqOnly: true },
    ],
  },
];

// Canonical fields a provider column can map to (Data Intake importer).
// `stage` is derived from raw_status via the status map; the resolved program name
// is derived from the Product column via the program map — so they aren't here.
export const CANONICAL_FIELDS: { key: string; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "program", label: "Program (Product column)" },
  { key: "raw_status", label: "Status (Lead Status column)" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
  { key: "lead_owner", label: "Lead owner" },
  { key: "created_at", label: "Created date" },
  { key: "projected_enroll_date", label: "Projected enroll date" },
  { key: "projected_start_date", label: "Projected start date" },
];

export const PALETTE = [
  "#2E5FA3", "#7A3FB8", "#B07414", "#C6A04A", "#1E8E5A",
  "#C0392B", "#5E86C4", "#9B7BC4", "#2E8B7A", "#A0552E",
];
