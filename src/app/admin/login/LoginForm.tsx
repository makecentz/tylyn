"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card flex w-full flex-col gap-4">
      <h1 className="font-serif text-2xl">Admin sign in</h1>
      <label className="field">Email<input name="email" type="email" autoComplete="username" required className="input" /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" required className="input" /></label>
      {state?.error ? <p role="alert" className="text-sm text-[#B3124F]">{state.error}</p> : null}
      <button className="btn btn-pink" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
