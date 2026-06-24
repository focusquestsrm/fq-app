"use client";
import { useRef } from "react";

export function SplitForm({
  tenantId, school, fq, provider, action,
}: {
  tenantId: string;
  school: number;
  fq: number;
  provider: number;
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action} className="form" style={{ maxWidth: 560, marginBottom: 12 }}>
      <input type="hidden" name="tenant_id" value={tenantId} />
      <div className="frow f3">
        <div className="field">
          <label>School %</label>
          <input name="school_share" type="number" min={0} max={100} defaultValue={school}
            onBlur={() => ref.current?.requestSubmit()} />
        </div>
        <div className="field">
          <label>FocusQuest %</label>
          <input name="fq_share" type="number" min={0} max={100} defaultValue={fq}
            onBlur={() => ref.current?.requestSubmit()} />
        </div>
        <div className="field">
          <label>Provider % (auto)</label>
          <input value={provider} disabled style={{ background: "var(--paper)" }} />
        </div>
      </div>
    </form>
  );
}
