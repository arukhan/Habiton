"use client";

import { translateError } from "@/lib/translations";
import { LanguageSelect, useLocale } from "@/context/LocaleContext";
import { useState } from "react";
import Link from "next/link";
import { Penguin } from "@/components/Penguin";
import { useHabiton } from "@/context/AppContext";
export default function Register() {
  const { locale, t } = useLocale();
  const { register } = useHabiton();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(name, email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="small-brand">HABITON ✦</div>
        <div className="auth-penguin">
          <Penguin mood="happy" size="lg" />
        </div>
        <h1>{t("Start with a little.")}</h1>
        <p className="muted">{t("Small steps are enough to begin.")}</p>
        <form className="form-stack" onSubmit={submit}>
          <label>
            {t("Your name")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={70}
            />
          </label>
          <label>
            {t("Email address")}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            {t("Password (8+ characters)")}
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button className="btn-primary" disabled={busy}>
            {t("Create your account")}
          </button>
        </form>
        <p className="switch-auth">
          {t("Already have an account?")}{" "}
          <Link href="/login">{t("Log in")}</Link>
        </p>
        <div className="form-stack">
          <LanguageSelect />
        </div>
        {error && (
          <p className="error" role="alert">
            {translateError(locale, error)}
          </p>
        )}
      </section>
    </main>
  );
}
