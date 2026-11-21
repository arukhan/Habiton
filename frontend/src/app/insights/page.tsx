
"use client";

import { dayCount, habitCount, translateError } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";

import Image from "next/image";
import Link from "next/link";

import { useHabiton } from "@/context/AppContext";
import { Shell } from "@/components/Shell";
import { niceDate } from "@/lib/dates";

export default function Insights() {
  const { locale, t } = useLocale();

  const { insights, habits, insightsError } = useHabiton();

  if (!insights) {
    return (
      <Shell>
        {insightsError ? (
          <p role="alert">{translateError(locale, insightsError)}</p>
        ) : (
          <p role="status">{t("Loading insights…")}</p>
        )}
      </Shell>
    );
  }

  const history = insights?.history || [];
  const bestStreak = insights?.best_streak ?? 0;

  // One bar per calendar day. Values come from the current user's backend
  // and use the count of completed habits, never minutes.
  const dailyCompletion = insights?.daily_completion ?? [];

  // Latest 20 records for the timeline
  const timelineHistory = history.slice(0, 20);

  return (
    <Shell>
      {insightsError && <p role="alert">{translateError(locale, insightsError)}</p>}
      {/* Page header */}
      <p className="eyebrow">{t("YOUR REAL PROGRESS")}</p>

      <div className="welcome-row">
        <div>
          <h1>{t("Your progress.")}</h1>

          <p className="muted">
            {t("Every comeback matters. Every step is recorded honestly.")}
          </p>
        </div>

        {/* Penguin with graduation cap */}
        <div className="insights-penguin">
          <Image
            src="/images/penguin-insights.png"
            alt={t("Habiton penguin celebrating your progress")}
            width={150}
            height={150}
            className="insights-penguin-image"
            priority
          />
        </div>
      </div>

      <Link href="/hero-log" className="btn-outline">
        {t("Open Hero’s Log")}
      </Link>

      {/* Personal summary */}
      <div className="card">
        <p className="eyebrow">{t("PERSONAL SUMMARY")}</p>

        <div className="stat-row stats">
          <div>
            <b>{insights?.perfect_days ?? 0}</b>
            <span>{t("Perfect days (last 14)")}</span>
          </div>

          <div>
            <b>{insights?.recoveries || 0}</b>
            <span>{t("Recoveries")}</span>
          </div>

          <div>
            <b>{insights?.step_ups || 0}</b>
            <span>{t("Step-ups")}</span>
          </div>
        </div>

        <p className="muted">
          {t("{habits} · Best streak: {days}", { habits: habitCount(locale, habits.length), days: dayCount(locale, bestStreak) })}
        </p>
      </div>

      {/* Daily completion chart — each bar represents one calendar day. */}
      <div className="card">
        <h2>{t("Daily completion")}</h2>
        <p className="muted">
          {t("The percentage of your habits completed each day. 100% means all habits for that day were completed.")}
        </p>

        <div className="daily-chart" role="list" aria-label={t("Habit completion by day")}>
          {dailyCompletion.map((day) => (
            <div
              role="listitem"
              className="daily-chart-column"
              key={day.date}
              title={day.total_habits > 0
                ? t("{date}: {completed} of {total} habits ({percent}%)", { date: locale === "ru" ? niceDate(day.date, locale) : day.date, completed: day.completed_habits, total: day.total_habits, percent: day.percentage })
                : t("{date}: no habits yet", {date: locale === "ru" ? niceDate(day.date, locale) : day.date})}
            >
              <span className="daily-chart-percentage">
                {day.total_habits ? `${day.percentage}%` : "—"}
              </span>
              <div className="daily-chart-track">
                {day.total_habits > 0 && day.percentage > 0 && (
                  <div
                    className={`daily-chart-fill${day.percentage === 100 ? " daily-chart-full" : ""}`}
                    style={{ height: `${day.percentage}%` }}
                  />
                )}
              </div>
              <small>{niceDate(day.date, locale)}</small>
            </div>
          ))}
        </div>
        <p className="muted daily-chart-note">
          {t("Full = 100% of the day's habits. Partial = 1–99%. No bar = 0%.")}
        </p>
      </div>

      {/* Activity timeline */}
      <section className="card">
        <h2>{t("Activity timeline")}</h2>

        <div className="history-list">
          {timelineHistory.map((item, index) => (
            <div key={index}>
              <span className="history-date">
                {niceDate(item.date, locale)}
              </span>

              <span>
                {item.habit_title} ·{" "}
                {t(item.kind.replaceAll("_", " "))}
              </span>

              <b>{item.kind === "full" ? t("Completed") : t(item.kind.replaceAll("_", " "))}</b>
            </div>
          ))}
        </div>

        {history.length === 0 && (
          <p className="muted">
            {t("Complete your first quest to start your story.")}
          </p>
        )}
      </section>
    </Shell>
  );
}
