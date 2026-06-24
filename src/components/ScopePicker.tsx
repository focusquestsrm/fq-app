"use client";
import { useRef } from "react";
import type { Tenant } from "@/lib/types";
import { setScope } from "@/app/(app)/schools/actions";

// FocusQuest-only school switcher. A dropdown that scales to many tenants, with
// an "All Schools" option that drives the aggregate dashboard view.
export function ScopePicker({ tenants, scope }: { tenants: Tenant[]; scope: string | null }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setScope}>
      <select
        className="scopesel"
        name="scope"
        defaultValue={scope ?? "all"}
        onChange={() => ref.current?.requestSubmit()}
      >
        <option value="all">All Schools</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </form>
  );
}
