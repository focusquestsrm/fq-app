export type Role =
  | "superadmin" | "accountmgr" | "schoolexec" | "enrollmgr"
  | "coach" | "provider" | "finance" | "auditor";

export type Tenant = {
  id: string;
  name: string;
  short_code: string;
  type: string;
  school_share: number; // 0..1
  fq_share: number;     // 0..1
  contact: string;
  dsa: string;
  billing: string;
  live: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  tenant_id: string | null;
  status: string;
};

export type Program = {
  id: string;
  tenant_id: string;
  name: string;
  provider: string;
  cost: number;
  goal: number;
  cap: number;
  cert: string;
  hours: number;
  weeks: number;
  category: string;
  delivery: string;
  funding: string[];
  active: boolean;
};

export type Student = {
  id: string;
  tenant_id: string;
  program_id: string | null;
  first_name: string;
  last_name: string;
  program: string;
  provider: string;
  cost: number;
  stage: number;
  payment: string;
  collected: number;
  start_date: string;
  end_date: string;
  checklist: boolean[];
  help: string[];
};

export type Lead = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  program: string;
  source: string;
  disposition: string;
  stage: number;
  days: number;
};

export type ConfigItem = {
  id: string;
  kind: "type" | "provider" | "payment" | "disposition";
  value: string;
  color: string;
  sort: number;
};

export type Split = { school: number; provider: number; fq: number };

export function splitFor(t: Pick<Tenant, "school_share" | "fq_share">): Split {
  const school = t.school_share ?? 0.4;
  const fq = t.fq_share ?? 0;
  return { school, fq, provider: Math.max(0, 1 - school - fq) };
}

export const isFQ = (r: Role) =>
  r === "superadmin" || r === "accountmgr" || r === "finance";
export const canEdit = (r: Role) =>
  r === "superadmin" || r === "accountmgr" || r === "schoolexec" || r === "enrollmgr";
