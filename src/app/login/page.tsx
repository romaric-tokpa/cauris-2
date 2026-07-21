"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="login-shell">
      <form className="login-card" action={formAction}>
        <div className="login-brand">
          <div className="login-mark" aria-hidden>
            <svg viewBox="0 0 70 66" width="30" height="28">
              <ellipse cx="35" cy="52" rx="26" ry="8" fill="#6C737B" />
              <ellipse cx="35" cy="40" rx="24" ry="8" fill="#1C2025" />
              <ellipse cx="35" cy="28" rx="20" ry="7" fill="#F2C200" />
              <ellipse cx="35" cy="17" rx="15" ry="6" fill="#F5F3EF" />
            </svg>
          </div>
          <div>
            <div className="login-logo">Cauris</div>
            <div className="login-sub">
              Suivi de trésorerie · <b>FCFA</b>
            </div>
          </div>
        </div>
        <p className="login-lead">Vos données personnelles, protégées par mot de passe.</p>
        <label className="login-label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="login-input"
          placeholder="••••••••"
        />
        {state?.error ? <div className="login-error">{state.error}</div> : null}
        <button className="login-btn" type="submit" disabled={pending}>
          {pending ? "Vérification…" : "Entrer"}
        </button>
        <div className="login-foot">
          <span className="strip">
            <i style={{ background: "#1C2025" }} />
            <i style={{ background: "#E2541A" }} />
            <i style={{ background: "#6C737B" }} />
            <i style={{ background: "#F5F3EF" }} />
            <i style={{ background: "#F2C200" }} />
          </span>
          Cauris · Romaric Tokpa
        </div>
      </form>
    </main>
  );
}
