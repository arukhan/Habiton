
"use client";

import Image from "next/image";

import { useHabiton } from "@/context/AppContext";
import { Shell } from "@/components/Shell";
import { niceDate } from "@/lib/dates";

export default function Insights() {
  const { insights, habits } = useHabiton();

  const history = insights?.history || [];

  // Maximum value for scaling the chart
  const maxMinutes = Math.max(
    1,
    ...history.map((item) => item.minutes)
  );

  // Latest 12 history records for the chart
  const chartHistory = history.slice(0, 12).reverse();

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
            <b>{insights?.full_sessions || 0}</b>
            <span>Full sessions</span>
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

      {/* Session history chart */}
      <div className="card">
        <h2>Session history</h2>

        <p className="muted">
          Minutes per check-in
          (not a calendar of perfect days)
        </p>

        <div className="bar-chart">
          {chartHistory.map((item, index) => {
            const barHeight = Math.max(
              7,
              (item.minutes / maxMinutes) * 110
            );

            return (
              <div
                className="bar-chart-column"
                key={index}
                title={`${item.habit_title} · ${item.kind} · ${item.minutes} min`}
              >
                <div
                  className={`bar bar-${item.kind}`}
                  style={{ height: `${barHeight}px` }}
                />

                <small>{niceDate(item.date)}</small>
              </div>
            );
          })}
        </div>

        <div className="chart-legend">
          🟣 Full · 🟪 Recovery · 🟠 Step-up · ⚪ Missed
        </div>
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

              <b>
                {item.minutes
                  ? `${item.minutes} min`
                  : "—"}
              </b>
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
