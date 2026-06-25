// Helpers for the Data Intake importer: header normalization, format signature
// (for auto-detecting a saved profile), and fuzzy column auto-suggestion.

export function normHeader(h: string): string {
  return (h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Stable signature of a file's columns, used to auto-match a saved profile.
export function headerSignature(headers: string[]): string {
  return headers.map(normHeader).filter(Boolean).sort().join("|");
}

// Normalized header → canonical field guesses.
const SYNONYMS: Record<string, string> = {
  firstname: "first_name", fname: "first_name", givenname: "first_name",
  lastname: "last_name", lname: "last_name", surname: "last_name",
  email: "email", emailaddress: "email",
  phone: "phone", phonenumber: "phone", mobile: "phone", cell: "phone",
  product: "program", program: "program", course: "program",
  leadstatus: "raw_status", status: "raw_status",
  leadowner: "lead_owner", owner: "lead_owner", advisor: "lead_owner",
  prioritynotes: "notes", notes: "notes", note: "notes", comments: "notes",
  createdate: "created_at", createddate: "created_at", created: "created_at", createdat: "created_at",
  projectedenrolldate: "projected_enroll_date", enrolldate: "projected_enroll_date",
  projectedstartdate: "projected_start_date", startdate: "projected_start_date",
  source: "source", leadsource: "source",
};

// Best-guess canonical field for one header ("" = leave unmapped / ignore).
export function suggestField(header: string): string {
  const n = normHeader(header);
  if (!n) return "";
  if (SYNONYMS[n]) return SYNONYMS[n];
  for (const key of Object.keys(SYNONYMS)) {
    if (n.includes(key) || key.includes(n)) return SYNONYMS[key];
  }
  return "";
}

export function suggestColumnMap(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const h of headers) {
    const f = suggestField(h);
    if (f) m[h] = f;
  }
  return m;
}

// Which of their headers is mapped to a given canonical field (if any).
export function headerForCanonical(columnMap: Record<string, string>, canonical: string): string | undefined {
  return Object.keys(columnMap).find((h) => columnMap[h] === canonical);
}

// Distinct non-empty values in a column, sorted.
export function distinctValues(rows: Record<string, string>[], header: string | undefined): string[] {
  if (!header) return [];
  const set = new Set<string>();
  for (const r of rows) {
    const v = (r[header] ?? "").toString().trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
