"use client";
import { useFormState, useFormStatus } from "react-dom";
import { setPassword } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn gold" style={{ width: "100%", marginTop: 6 }} disabled={pending}>
      {pending ? "…" : "Set password & continue"}
    </button>
  );
}

export default function SetPasswordPage() {
  const [state, action] = useFormState(setPassword, { error: "" } as { error: string });
  return (
    <div className="authwrap">
      <div className="authcard">
        <div className="logo">FQ</div>
        <h2 style={{ fontSize: 20 }}>
          Welcome to FocusQuest <span style={{ color: "var(--gold-deep)" }}>Strata</span>
        </h2>
        <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 18px" }}>
          Choose a password to finish setting up your account.
        </p>
        <form action={action} className="form">
          <div className="field">
            <label>New password</label>
            <input name="password" type="password" placeholder="••••••••" required minLength={6} />
          </div>
          <div className="field">
            <label>Confirm password</label>
            <input name="confirm" type="password" placeholder="••••••••" required minLength={6} />
          </div>
          <Submit />
          {state?.error && <div className="err">{state.error}</div>}
        </form>
      </div>
    </div>
  );
}
