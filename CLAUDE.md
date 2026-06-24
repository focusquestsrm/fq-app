# CLAUDE.md — FocusQuest Strata

Project context for Claude Code. Read this first, every session.

FocusQuest Strata is a multi-tenant **Enrollment Intelligence** platform for HBCUs
and minority-serving institutions. Stack: **Next.js (App Router, TypeScript) +
Supabase (Postgres, Auth, Row-Level Security)**. Multiple users log in and share
one dataset; each school sees only its own rows, FocusQuest sees everything.

---

## 🔒 BRAND & DESIGN SYSTEM — DO NOT CHANGE

The visual identity is fixed. Preserve it exactly when adding or editing any UI.
**Never introduce new colors, fonts, or a different component look.** All styling
lives in `src/app/globals.css`; reuse those classes and CSS variables.

### Colors (defined as CSS variables in `globals.css :root` — always reference these, never hardcode hex)
| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#0A0A0B` | sidebar, topbar, dark chrome |
| `--gold` | `#C9AE62` | primary accent, logo, active states, primary buttons |
| `--gold-deep` | `#A8893F` | gold text on light, hover |
| `--paper` | `#F4F1E8` | app background (warm cream) |
| `--card` | `#FFFFFF` | card surfaces |
| `--text` | `#1A1A1A` | body text |
| `--muted` | `#6B6B66` | secondary text |
| `--line` | `#E6E1D4` | borders |
| `--green / --amber / --red / --blue` | see file | status chips only |

### Typography
- Display / headings (`h1,h2,h3`): **Montserrat** via `--font-display`.
- Body / UI: **Public Sans** via `--font-body`. No other typefaces.
- Both are loaded with `next/font/google` in `src/app/layout.tsx` (self-hosted,
  exposed as `--font-montserrat` / `--font-public-sans`); `globals.css` maps the
  `--font-display` / `--font-body` variables to them. Reference the variables,
  never the family names directly.
- Eyebrows above page titles: gold, uppercase, letter-spaced (`.eyebrow`).

### Identity
- Logo: gold rounded square containing **"FQ"** in the display font (`.logo`).
- Wordmark: "FocusQuest **Strata**" with "Strata" in gold (`.brand .wm b`).
- Layout chrome: black sidebar (`.sidebar`) + black topbar with a **2px gold
  bottom border** (`.topbar`). Cream content area.

### Component conventions (already in globals.css — match them)
- Cards: `.card`. Grids: `.cards.c2/.c3/.c4`. KPI tiles: `.card.kpi`.
- Buttons: `.btn`, `.btn.gold` (primary), `.btn.ghost`, `.btn.danger`, `.btn.sm`.
- Chips: `.chip` + `.gold/.green/.amber/.red/.gray/.blue`.
- Forms: `.form`, `.frow.f2/.f3`, `.field` (label + input). Inline numbers: `.numedit`.
- Page header block: `.pagehead` with `.eyebrow`, `h2`, `p`.
- Revenue split bar: `.split` with `.s1` (school, ink) `.s2` (provider, blue) `.s3` (FQ, gold).

When you add a module, copy the structure of an existing page (e.g.
`src/app/(app)/programs/page.tsx`) so spacing, headers and tables stay identical.

---

## Hard product rules (do not violate)

1. **No dummy/seed data.** Schools, programs, costs, cohort sizes, students, and
   the revenue percentages are all entered by the user through forms. Only the
   configurable *lists* (types, providers, payments, dispositions) ship with
   defaults, and even those are editable.
2. **Everything configurable.** Institution types, providers, payment sources and
   dispositions are rows in `config_items`, managed on the Settings page. Never
   hardcode these lists in components.
3. **Revenue numbers derive from the entered split**, never hardcoded. School %
   and FocusQuest % are stored on the tenant; provider % = `1 - school - fq`.
   School portals only ever see the school %.
4. **AI scoring is advisory only** — human oversight + equity review. Never
   auto-enroll, auto-deny, or auto-drop a student.
5. **Tenant isolation is enforced in the database** via RLS, not just the UI.
   Don't bypass it with the service-role key in user-facing paths.
6. **Don't break working modules.** Verify `npm run build` passes before finishing.

## Roles
`superadmin, accountmgr, finance` = FocusQuest (see all). `schoolexec, enrollmgr,
coach, auditor` = scoped to their `tenant_id`. `provider` = assigned records.
Helpers: `isFQ()`, `canEdit()` in `src/lib/types.ts`; SQL mirrors them
(`app_is_fq()`, `app_can_edit()`).

## Architecture / conventions
- **Read** data in Server Components via helpers in `src/lib/queries.ts`.
- **Mutate** via Server Actions (`actions.ts` next to each page) → `revalidatePath`.
- RLS does the security; queries run as the logged-in user via the cookie-based
  server client (`src/lib/supabase/server.ts`).
- Scope: school users are pinned to their tenant; FQ users switch via the `scope`
  cookie (set in `schools/actions.ts → setScope`).
- Journey stages: 14-stage model in `src/lib/constants.ts` (`STAGES`, `STA`).

## Data model (Postgres — see `supabase/schema.sql`)
`tenants, profiles, programs, students, leads, config_items`. Money split fields:
`tenants.school_share`, `tenants.fq_share` (0..1). Run `schema.sql` then
`seed.sql` on a fresh Supabase project.

## Build status
**Done:** auth + roles, tenant management, program catalog (inline-edit cost &
cohort, provider auto-register), revenue model (editable split + totals
calculator), students, dashboard KPIs, configurable lists.

**To build (same patterns, same brand):** Cohort Planner, Student Journey,
Disposition Intelligence, Provider Performance, Student Success, Finance Ledger,
Alerts & Tasks, Reports & Exports, Compliance Center, Users & Permissions admin.

## Setup
1. Supabase project → run `supabase/schema.sql` then `supabase/seed.sql`.
2. `cp .env.local.example .env.local` and fill the two keys.
3. `npm install && npm run dev`. First account to sign up becomes Super Admin.
4. Deploy to Vercel with the same env vars.
