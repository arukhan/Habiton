
"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useHabiton } from "@/context/AppContext";

export default function Login() {
  const { login } = useHabiton();

  const [email, setEmail] = useState(
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
      ? "demo@habiton.local"
      : ""
  );

  const [password, setPassword] = useState(
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
      ? "HabitonDemo2026!"
      : ""
  );

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setBusy(true);
    setErr("");

    try {
      await login(email, password);
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Login failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        {/* Brand */}
        <div className="small-brand">HABITON ✦</div>

        {/* Penguin */}
        <div className="auth-penguin">
          <Image
            src="/images/penguin-welcome.png"
            alt="Habiton penguin waving hello"
            width={380}
            height={310}
            className="login-penguin-image"
            priority
          />
        </div>

        {/* Welcome */}
        <h1>Your rhythm is here.</h1>

        <p className="muted">
          Welcome back. Your penguin missed you!
        </p>

        {/* Login form */}
        <form className="form-stack" onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
          >
            {busy ? "Signing in..." : "Log in"}
          </button>
        </form>

        {/* Registration */}
        <p className="switch-auth">
          New to Habiton?{" "}
          <Link href="/register">Create account</Link>
        </p>

        {/* Login errors */}
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
      </section>
    </main>
  );
}
