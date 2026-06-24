# FocusQuest Strata — Enrollment Intelligence (working app)

A multi-tenant enrollment-intelligence platform for HBCUs / MSIs, built as a real
web application: **Next.js (App Router) + Supabase (Postgres, Auth, Row-Level
Security)**. Multiple people log in and work on the same shared data; each school
only ever sees its own records, while FocusQuest sees everything.

There is **no dummy data** — you enter your own schools, programs, costs, cohort
sizes, revenue percentages and students through forms. The configurable lists
(institution types, providers, payment sources, dispositions) are seeded only
with sensible defaults and are fully editable.

---

## 1. Create the database (Supabase)

1. Create a free project at https://supabase.com.
2. In the dashboard go to **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates all
   tables, the 8-role model, the new-user trigger, and the Row-Level Security
   policies that enforce tenant isolation.
3. Run [`supabase/seed.sql`](supabase/seed.sql) to load the default
   configurable lists (types HBCU/MSI/HSI, payment sources, dispositions).
4. (Optional) Under **Authentication → Providers → Email**, turn **off**
   "Confirm email" while developing so signups log in immediately.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in from **Supabase → Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Click **Create one** to make an account — **the very
first account automatically becomes the FocusQuest Super Admin** (owner). From
there: create your first school, add programs and costs, set the revenue split,
and add students.

## 4. Deploy

Push to GitHub and import into **Vercel**. Add the same two environment
variables in the Vercel project settings. That's it — it's live and shared.

---

## Roles & access

| Role | Sees | Can edit |
|------|------|----------|
| Super Admin / Account Mgr / Finance | all schools | yes (FQ) |
| School Executive / Enrollment Mgr | their school only | their school |
| Success Coach | their school | success items |
| Provider / Publisher | assigned records | — |
| Read-only Auditor | their school | — |

Access is enforced in the database itself via RLS — not just hidden in the UI —
so a school user physically cannot read another school's rows.

To assign someone to a school or change their role, update their row in the
`profiles` table (a Users admin screen is the natural next addition).

## What's included vs. next

**Working now:** auth + roles, tenant management, program catalog (inline-editable
cost & cohort size, provider auto-register), revenue model (editable school/FQ %,
auto provider %, live totals calculator), students, dashboard KPIs, and the
configurable lists — all backed by Postgres with RLS, persisting across users and
devices.

**Ports over the same way (from the single-file prototype):** Cohort Planner,
Student Journey, Disposition Intelligence, Provider Performance, Student Success,
Finance Ledger, Alerts & Tasks, Reports & Exports, Compliance Center, and a Users
& Permissions admin screen. Each is a page reading the same tables through the
same query layer in `src/lib/queries.ts`.

## Project map

```
supabase/schema.sql      tables, roles, RLS, signup trigger
supabase/seed.sql        default configurable lists
src/lib/                  types, constants, queries, supabase clients
src/app/login/           auth (sign in / sign up / sign out)
src/app/(app)/           the authenticated app shell + feature pages
src/components/           sidebar, topbar, inline editors
middleware.ts            session refresh + route protection
```
