"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, signUp } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn gold" style={{ width: "100%", marginTop: 6 }} disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action] = useFormState(mode === "in" ? signIn : signUp, { error: "" } as { error: string });

  return (
    <div className="authwrap">
      <div className="authcard">
        <div className="logo">FQ</div>
        <h2 style={{ fontSize: 20 }}>
          FocusQuest <span style={{ color: "var(--gold-deep)" }}>Strata</span>
        </h2>
        <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 18px" }}>
          {mode === "in" ? "Sign in to your workspace." : "Create your account. The first account becomes the owner."}
        </p>
        <form action={action} className="form">
          {mode === "up" && (
            <div className="field">
              <label>Full name</label>
              <input name="full_name" placeholder="Jane Doe" required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" placeholder="you@org.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" placeholder="••••••••" required minLength={6} />
          </div>
          <Submit label={mode === "in" ? "Sign in" : "Create account"} />
          {state?.error && <div className="err">{state.error}</div>}
        </form>
        <div className="toggle">
          {mode === "in" ? (
            <>No account yet? <a onClick={() => setMode("up")}>Create one</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode("in")}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
}
