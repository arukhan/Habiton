
"use client";

import Image from "next/image";

import { useHabiton } from "@/context/AppContext";
import { Shell } from "@/components/Shell";
import { niceDate } from "@/lib/dates";

export default function Insights() {
  const { insights, habits } = useHabiton();

  const history = insights?.history || [];

  // One bar per calendar day. Values come from the current user's backend
  // and use the count of completed habits, never minutes.
  const dailyCompletion = insights?.daily_completion ?? [];

  // Latest 20 records for the timeline
  const timelineHistory = history.slice(0, 20);

  return (
    <Shell>
      {/* Page header */}
      <p className="eyebrow">YOUR REAL PROGRESS</p>

      <div className="welcome-row">
        <div>
          <h1>Your progress.</h1>

          <p className="muted">
            Every comeback matters.
            Every step is recorded honestly.
          </p>
        </div>

        {/* Penguin with graduation cap */}
        <div className="insights-penguin">
          <Image
            src="/images/penguin-insights.png"
            alt="Habiton penguin celebrating your progress"
            width={150}
            height={150}
            className="insights-penguin-image"
            priority
          />
        </div>
      </div>

      {/* Personal summary */}
      <div className="card">
        <p className="eyebrow">PERSONAL SUMMARY</p>

        <div className="stat-row stats">
          <div>
            <b>{insights?.perfect_days ?? 0}</b>
            <span>Perfect days (last 14)</span>
          </div>

          <div>
            <b>{insights?.recoveries || 0}</b>
            <span>Recoveries</span>
          </div>

          <div>
            <b>{insights?.step_ups || 0}</b>
            <span>Step-ups</span>
          </div>
        </div>

        <p className="muted">
          {habits.length} habits · Best streak{" "}
          {insights?.best_streak || 0} days
        </p>
      </div>

      {/* Daily completion chart — each bar represents one calendar day. */}
      <div className="card">
        <h2>Daily completion</h2>
        <p className="muted">
          The percentage of your habits completed each day. 100% means all
          habits for that day were completed.
        </p>

        <div className="daily-chart" role="list" aria-label="Habit completion by day">
          {dailyCompletion.map((day) => (
            <div
              role="listitem"
              className="daily-chart-column"
              key={day.date}
              title={day.total_habits > 0
                ? `${day.date}: ${day.completed_habits} of ${day.total_habits} habits (${day.percentage}%)`
                : `${day.date}: no habits yet`}
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
              <small>{niceDate(day.date)}</small>
            </div>
          ))}
        </div>
        <p className="muted daily-chart-note">
          Full = 100% of the day's habits. Partial = 1–99%. No bar = 0%.
        </p>
      </div>

      {/* Activity timeline */}
      <section className="card">
        <h2>Activity timeline</h2>

        <div className="history-list">
          {timelineHistory.map((item, index) => (
            <div key={index}>
              <span className="history-date">
                {niceDate(item.date)}
              </span>

              <span>
                {item.habit_title} ·{" "}
                {item.kind.replaceAll("_", " ")}
              </span>

              <b>{item.kind === "full" ? "Completed" : item.kind.replaceAll("_", " ")}</b>
            </div>
          ))}
        </div>

        {history.length === 0 && (
          <p className="muted">
            Complete your first quest to start your story.
          </p>
        )}
      </section>
    </Shell>
  );
}
