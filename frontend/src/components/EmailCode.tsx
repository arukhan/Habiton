"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { API } from "@/lib/api";

export function useAuthOptions() {
  const [options, setOptions] = useState({ email_codes: false, google: false });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    API.authOptions()
      .then((data) => { if (active) setOptions(data); })
      .catch(() => { /* The server still enforces the authentication policy. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { ...options, loading };
}

export function EmailCode({ value, onChange, onResend, busy }: {
  value: string;
  onChange: (value: string) => void;
  onResend: () => Promise<void>;
  busy: boolean;
}) {
  const { t } = useLocale();
  const [canResend, setCanResend] = useState(false);
  useEffect(() => {
    if (canResend) return;
    const timeout = window.setTimeout(() => setCanResend(true), 60_000);
    return () => window.clearTimeout(timeout);
  }, [canResend]);

  return (
    <>
      <p className="muted" role="status">{t("If the address is eligible, a code will arrive by email. Check your spam folder too.")}</p>
      <label>
        {t("Six-digit code")}
        <input type="text" inputMode="numeric" autoComplete="one-time-code" required
          pattern="[0-9]{6}" maxLength={6} value={value}
          onChange={(event) => onChange(event.target.value)} />
      </label>
      <button className="btn-outline" type="button" disabled={busy || !canResend}
        onClick={() => { setCanResend(false); void onResend(); }}>
        {t("Resend code")}
      </button>
    </>
  );
}
