
"use client";

import { translateError } from "@/lib/translations";
import { LanguageSelect, useLocale } from "@/context/LocaleContext";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { API, ApiError } from "@/lib/api";
import { EmailCode, useAuthOptions } from "@/components/EmailCode";
import { useHabiton } from "@/context/AppContext";

export default function Login() {
  const { locale, t } = useLocale();

  const { login, loginWithCode } = useHabiton();
  const options = useAuthOptions();
  const [mode, setMode] = useState<"password" | "login" | "reset">("password");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");

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

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("google");
    if (result === "existing") setErr("This email already has an account. Sign in with your usual method.");
    if (result === "failed") setErr("Could not sign in with Google.");
  }, []);

  function changeMode(next: typeof mode) {
    setMode(next);
    setSent(false);
    setCode("");
    setPassword("");
    setErr("");
    setNotice("");
  }

  async function sendCode(purpose: "login" | "reset") {
    await API.requestEmailCode(email, purpose);
    setCode("");
    setSent(true);
  }

  async function resend() {
    if (mode === "password") return;
    setBusy(true);
    setErr("");
    try {
      await sendCode(mode);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not request a code.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (mode === "password") {
        await login(email, password);
      } else if (!sent) {
        await sendCode(mode);
      } else if (mode === "login") {
        await loginWithCode(email, code);
      } else {
        await API.resetPassword(email, code, password);
        changeMode("password");
        setNotice("Password updated. Sign in with your new password.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "email_unverified") changeMode("reset");
      setErr(error instanceof Error ? error.message : "Login failed");
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
            alt={t("Habiton penguin waving hello")}
            width={380}
            height={310}
            className="login-penguin-image"
            priority
          />
        </div>

        {/* Welcome */}
        <h1>{t("Your rhythm is here.")}</h1>

        <p className="muted">
          {t("Welcome back. Your penguin missed you!")}
        </p>

        {/* Login form */}
        <form className="form-stack" onSubmit={submit}>
          <label>
            {t("Email address")}
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSent(false); setCode(""); }}
              required
            />
          </label>

          {sent && <EmailCode value={code} onChange={setCode} onResend={resend} busy={busy} />}
          {(mode === "password" || (mode === "reset" && sent)) && (
            <label>
              {t(mode === "reset" ? "New password" : "Password")}
              <input
                type="password"
                autoComplete={mode === "reset" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === "reset" ? 8 : undefined}
                required
              />
            </label>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {t(mode === "password" ? "Log in" : !sent ? "Send email code" : mode === "reset" ? "Save new password" : "Log in")}
          </button>
          {options.email_codes && mode === "password" && (
            <>
              <button type="button" className="btn-outline" onClick={() => changeMode("login")}>{t("Log in with an email code")}</button>
              <button type="button" className="btn-outline" onClick={() => changeMode("reset")}>{t("Forgot password?")}</button>
            </>
          )}
          {mode !== "password" && (
            <button type="button" className="btn-outline" onClick={() => changeMode("password")}>{t("Back to password login")}</button>
          )}
          {options.google && <a className="btn-outline" href="/api/auth/google">{t("Continue with Google")}</a>}
        </form>
        {notice && <p role="status">{t(notice)}</p>}

        {/* Registration */}
        <p className="switch-auth">
          {t("New to Habiton?")}{" "}
          <Link href="/register">{t("Create account")}</Link>
        </p>

        <div className="form-stack"><LanguageSelect /></div>

        {/* Login errors */}
        {err && (
          <p className="error" role="alert">
            {translateError(locale, err)}
          </p>
        )}
      </section>
    </main>
  );
}
