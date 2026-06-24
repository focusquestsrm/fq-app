"use client";
import { useRef } from "react";

// A small inline number input that submits its server action on blur / Enter.
export function InlineNumber({
  id, field, value, action, prefix = "",
}: {
  id: string;
  field: string;
  value: number;
  action: (formData: FormData) => void;
  prefix?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      {prefix && <span className="muted">{prefix}</span>}
      <input
        className="numedit"
        type="number"
        name="value"
        defaultValue={value}
        onBlur={() => formRef.current?.requestSubmit()}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); formRef.current?.requestSubmit(); } }}
      />
    </form>
  );
}
