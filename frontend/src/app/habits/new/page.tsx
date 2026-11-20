"use client";

import { translateError } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Penguin } from "@/components/Penguin";
import { API } from "@/lib/api";
import { useHabiton } from "@/context/AppContext";

const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

export default function CreateHabit() {
  const { locale, t } = useLocale();

  const router = useRouter();
  const { refresh } = useHabiton();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Study");
  const [target, setTarget] = useState(30);
  const [customMinutes, setCustomMinutes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!Number.isInteger(target) || target < 1 || target > 1440) {
      setError("Choose a daily goal between 1 and 1440 minutes.");
      return;
    }
    setBusy(true);
    try {
      await API.createHabit({ title, category, target_minutes: target });
      await refresh();
      router.push("/today");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create habit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell navigation={false}>
      <Link href="/today" className="back-link">{t("← Today")}</Link>
      <Penguin mood="hero" size="sm" />
      <p className="eyebrow">{t("NEW ADVENTURE")}</p>
      <h1>{t("Start with one small habit.")}</h1>
      <p className="muted">{t("Choose a goal that fits your real life. You can grow it later.")}</p>

      <form className="form-stack space-top" onSubmit={submit}>
        <label>
          {t("Habit name")}
          <input value={title} required minLength={2} maxLength={100}
            placeholder={t("Read for 20 minutes")} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          {t("Category")}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {["Study", "Reading", "Fitness", "Health", "Mindfulness", "Other"].map((v) => (
              <option key={v} value={v}>{t(v)}</option>
            ))}
          </select>
        </label>
        <label>
          {t("Daily goal in minutes")}
          <select
            value={customMinutes ? "custom" : String(target)}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setCustomMinutes(true);
              } else {
                setCustomMinutes(false);
                setTarget(Number(e.target.value));
              }
            }}
          >
            {MINUTE_OPTIONS.map((n) => <option key={n} value={n}>{t("{count} minutes", {count: n})}</option>)}
            <option value="custom">{t("Custom minutes…")}</option>
          </select>
        </label>
        {customMinutes && (
          <label>
            {t("Custom goal (1–1440 minutes)")}
            <input type="number" min={1} max={1440} step={1} required
              value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </label>
        )}
        <div className="gentle-message">
          {t("💜 Consistency is not perfection. If you miss a day after building a streak, Habiton can offer a smaller recovery quest.")}
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t("Saving...") : t("Create habit")}
        </button>
        <Link href="/today" className="btn-outline">{t("Cancel")}</Link>
        {error && <p className="error" role="alert">{translateError(locale, error)}</p>}
      </form>
    </Shell>
  );
}
