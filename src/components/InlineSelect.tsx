"use client";
import { useRef } from "react";

// A small inline <select> that submits its server action on change. Mirrors the
// InlineNumber pattern so editable table cells look and behave consistently.
export function InlineSelect({
  id, field, value, options, action,
}: {
  id: string;
  field: string;
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} style={{ display: "inline-flex" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <select
        className="inlinesel"
        name="value"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        style={{
          padding: "5px 8px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--card)",
          color: "var(--text)",
          fontFamily: "var(--font-body)",
          fontSize: 12.5,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}
