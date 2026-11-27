"use client";

import { translateError, translateQuest } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Penguin } from "@/components/Penguin";
import { ProgressSteps } from "@/components/ProgressSteps";
import { useHabiton } from "@/context/AppContext";
import { API } from "@/lib/api";
import { goalLabel, recoveryGoal } from "@/lib/habitGoals";
import { hoursLeft } from "@/lib/dates";
export default function RecoveryDetail() {
  const { locale, t } = useLocale();
  const params = useParams<{ id: string }>(),
    router = useRouter(),
    { recoveries, refresh } = useHabiton();
  const [id] = useState(params.id),
    [notes, setNotes] = useState(["", "", ""]),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = recoveries.find((v) => v.id === id);
  useEffect(() => {
    if (!r) void refresh().catch(() => {});
  }, [r, refresh]);
  async function action(type: "accept" | "micro" | "step" | "original") {
    setBusy(true);
    setError("");
    try {
      await API.recoveryAction(
        id,
        type,
        type === "accept" ? {} : { confirmed, notes },
      );
      await refresh();
      setConfirmed(false);
      setNotes(["", "", ""]);
      if (type !== "accept") router.push(`/recovery/${id}/success`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save recovery");
    } finally {
      setBusy(false);
    }
  }
  if (!r)
    return (
      <Shell navigation={false}>
        <p>{t("Loading recovery session...")}</p>
        <Link href="/today">{t("Back to Today")}</Link>
      </Shell>
    );
  const micro = recoveryGoal(r, "micro");
  const step = recoveryGoal(r, "step");
  const original = recoveryGoal(r, "original");
  const microLabel = goalLabel(locale, micro);
  const current =
    r.status === "accepted"
      ? {
          name: "Micro-quest",
          label: microLabel,
          description: translateQuest(locale, r.micro_text, r.micro_minutes),
          action: "micro" as const,
        }
      : r.status === "micro_completed"
        ? {
            name: "Step-up",
            label: goalLabel(locale, step),
            description: translateQuest(locale, r.step_text, r.step_minutes),
            action: "step" as const,
          }
        : {
            name: "Original goal",
            label: goalLabel(locale, original),
            description: t("Complete your full habit: {habit}.", { habit: r.habit_title }),
            action: "original" as const,
          };
  return (
    <Shell navigation={false}>
      <Link href="/today" className="back-link">
        {t("← Today")}
      </Link>
      <p className="eyebrow">{t("RECOVERY · YOUR COMEBACK")}</p>
      <div className="welcome-row">
        <div>
          <h1>
            {r.status === "completed"
              ? t("Your rhythm is back!")
              : r.status === "offered"
                ? t("Start small. Build back.")
                : t("One step at a time.")}
          </h1>
          <p className="muted">
            {r.habit_title} · {t("Your progress is still here.")}
          </p>
        </div>
        <Penguin
          mood={r.status === "completed" ? "happy" : "thinking"}
          size="sm"
        />
      </div>
      <div className="card quest-highlight">
        <p className="card-label">{t("YOUR MICRO-QUEST")}</p>
        <h2>
          {microLabel && `${microLabel} · `}{r.habit_title}
        </h2>
        <p>{translateQuest(locale, r.micro_text, r.micro_minutes)}</p>
        {(r.status === "offered" || r.status === "accepted") && (
          <div className="small-status">
            {t("⏳ {count} hours left in the recovery window", {
              count: hoursLeft(r.expires_at),
            })}
          </div>
        )}
      </div>
      <div className="card">
        <h3>{t("How you return to your goal")}</h3>
        <ProgressSteps recovery={r} />
        <p className="limit-line">
          {t(
            "🛡️ {count} of 3 recovery windows left (rolling 30 days, max 2 in a row)",
            { count: r.remaining_windows },
          )}
        </p>
      </div>
      {r.status === "offered" ? (
        <>
          <p className="gentle-message">
            {t("You can start now. No need to wait for a manual review.")}
          </p>
          <button
            disabled={busy}
            className="btn-primary"
            onClick={() => action("accept")}
          >
            {t("Accept micro-quest")}
          </button>
        </>
      ) : r.status === "expired" ? (
        <div className="error">
          {t("Recovery window expired. Your history and XP remain saved.")}
        </div>
      ) : r.status === "completed" ? (
        <Link href={`/recovery/${id}/success`} className="btn-primary">
          {t("View your comeback 🎉")}
        </Link>
      ) : (
        <>
          <div className="card">
            <div className="eyebrow">
              {t(current.name).toUpperCase()}
              {current.label && ` · ${current.label}`}
            </div>
            <h2>{t("Do the task. Then tell us.")}</h2>
            <p className="muted">{current.description}</p>
            <div className="form-stack">
              {notes.map((n, i) => (
                <label key={i}>
                  {t("Note {count} (optional)", { count: i + 1 })}
                  <input
                    value={n}
                    onChange={(e) =>
                      setNotes((a) =>
                        a.map((v, j) => (i === j ? e.target.value : v)),
                      )
                    }
                    maxLength={180}
                    placeholder={t("A small thing I learned or did...")}
                  />
                </label>
              ))}
              <label className="confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>{t("I really completed this step.")}</span>
              </label>
            </div>
          </div>
          <button
            className="btn-primary"
            disabled={!confirmed || busy}
            onClick={() => action(current.action)}
          >
            {busy
              ? t("Saving...")
              : t(`Record ${current.name.toLowerCase()} completion`)}
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {translateError(locale, error)}
        </p>
      )}
      <Link href="/today" className="btn-outline">
        {t("Back to Today")}
      </Link>
    </Shell>
  );
}
