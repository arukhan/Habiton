"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useHabiton } from "@/context/AppContext";
import { useLocale } from "@/context/LocaleContext";
import { API, ApiError } from "@/lib/api";
import { niceDate } from "@/lib/dates";
import { translateError } from "@/lib/translations";
import type { AdminPeriod, LegacyMetrics, Metrics } from "@/types";

const periods = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
] as const;

export default function Admin() {
  const { locale, t } = useLocale();
  const { user } = useHabiton();
  const canRequestMetrics = Boolean(user && user.is_admin !== false);
  const [days, setDays] = useState<AdminPeriod>(30);
  const [metrics, setMetrics] = useState<Metrics | LegacyMetrics | null>(null);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!canRequestMetrics) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setAccessDenied(false);
    API.metrics(days, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMetrics(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          setMetrics(null);
          setAccessDenied(true);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not load admin metrics",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [canRequestMetrics, days, revision]);

  const current =
    metrics && "window_days" in metrics && metrics.window_days === days
      ? metrics
      : null;
  const legacy = metrics && !("window_days" in metrics) ? metrics : null;
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const updated = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  });

  return (
    <Shell navigation={false}>
      <div className="admin-dashboard">
        <Link className="back-link" href="/profile">
          {t("← Profile")}
        </Link>
        <h1>{t("Product analytics")}</h1>

        {!canRequestMetrics || accessDenied ? (
          <section className="card">
            <h2>{t("Admin access only")}</h2>
            <p>
              {t("Only the configured administrator can view product metrics.")}
            </p>
          </section>
        ) : (
          <>
            <p className="muted">
              {t(
                "Demo accounts are excluded. Dates use the Asia/Almaty time zone.",
              )}
            </p>
            <div className="admin-period-controls">
              {user?.is_admin === true && !legacy && (
                <div
                  className="admin-period-buttons"
                  role="group"
                  aria-label={t("Reporting period")}
                >
                  {periods.map((period) => (
                    <button
                      key={period.days}
                      type="button"
                      aria-pressed={days === period.days}
                      onClick={() => setDays(period.days)}
                    >
                      {t(period.label)}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="profile-edit-button"
                disabled={busy}
                onClick={() => setRevision((value) => value + 1)}
              >
                {t("Refresh metrics")}
              </button>
            </div>

            {busy && (
              <p className="muted" role="status">
                {t("Loading metrics…")}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {translateError(locale, error)}
              </p>
            )}
            {legacy && (
              <section className="card" aria-labelledby="legacy-admin-overview">
                <h2 id="legacy-admin-overview">{t("Overview")}</h2>
                <p className="muted">
                  {t(
                    "The detailed dashboard will be available after the backend update.",
                  )}
                </p>
                {[
                  {
                    label: "Real users",
                    value: number.format(legacy.real_users),
                  },
                  {
                    label: "Created habits",
                    value: number.format(legacy.habits_created),
                  },
                  {
                    label: "Missed reports",
                    value: number.format(legacy.missed_reports),
                  },
                  {
                    label: "Eligible, 48h elapsed",
                    value: number.format(legacy.eligible_matured),
                  },
                  {
                    label: "Recovered within 48h",
                    value: number.format(legacy.recovered_within_48h),
                  },
                  {
                    label: "Recovery within 48 hours",
                    value:
                      legacy.eligible_matured > 0
                        ? percent.format(legacy.recovery_rate_percent / 100)
                        : "—",
                  },
                ].map(({ label, value }) => (
                  <div className="event-line" key={label}>
                    <span>{t(label)}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
                <details>
                  <summary>{t("Events (last 30 days)")}</summary>
                  {legacy.events_last_30_days.map(({ name, count }) => (
                    <div className="event-line" key={name}>
                      <span>{name}</span>
                      <strong>{number.format(count)}</strong>
                    </div>
                  ))}
                </details>
              </section>
            )}
            {current && (
              <>
                <p className="muted">
                  {t("Updated {date}", {
                    date: updated.format(new Date(current.updated_at)),
                  })}
                </p>

                <section className="card" aria-labelledby="admin-overview">
                  <h2 id="admin-overview">{t("Overview")}</h2>
                  <div className="stats-grid">
                    {[
                      {
                        label: "Active today",
                        value: current.daily_activity[0]?.active_users ?? 0,
                      },
                      {
                        label: "Active in this period",
                        value: current.active_users,
                      },
                      { label: "New registrations", value: current.signups },
                    ].map(({ label, value }) => (
                      <div className="card" key={label}>
                        <small>{t(label)}</small>
                        <b>{number.format(value)}</b>
                      </div>
                    ))}
                  </div>
                  <h3>{t("D7 retention")}</h3>
                  {current.retention_7d.eligible > 0 ? (
                    <p>
                      <strong>
                        {percent.format(
                          current.retention_7d.returned /
                            current.retention_7d.eligible,
                        )}
                      </strong>{" "}
                      {t(
                        "{returned} of {eligible} accounts returned on day 7.",
                        {
                          returned: number.format(
                            current.retention_7d.returned,
                          ),
                          eligible: number.format(
                            current.retention_7d.eligible,
                          ),
                        },
                      )}
                    </p>
                  ) : (
                    <p className="muted">
                      {t(
                        "No completed day-7 measurement windows in this period.",
                      )}
                    </p>
                  )}
                  <details>
                    <summary>{t("All-time totals")}</summary>
                    {[
                      { label: "Real users", value: current.real_users },
                      {
                        label: "Created habits",
                        value: current.habits_created,
                      },
                      {
                        label: "Missed reports",
                        value: current.missed_reports,
                      },
                    ].map(({ label, value }) => (
                      <div className="event-line" key={label}>
                        <span>{t(label)}</span>
                        <strong>{number.format(value)}</strong>
                      </div>
                    ))}
                  </details>
                </section>

                <section className="card" aria-labelledby="admin-recovery-kpi">
                  <h2 id="admin-recovery-kpi">
                    {t("Recovery within 48 hours")}
                  </h2>
                  {current.eligible_matured > 0 ? (
                    <p>
                      <strong>
                        {percent.format(current.recovery_rate_percent / 100)}
                      </strong>{" "}
                      {t(
                        "{recovered} of {eligible} eligible reports with closed windows.",
                        {
                          recovered: number.format(
                            current.recovered_within_48h,
                          ),
                          eligible: number.format(current.eligible_matured),
                        },
                      )}
                    </p>
                  ) : (
                    <p className="muted">
                      {t(
                        "No eligible reports with closed 48-hour windows in this period.",
                      )}
                    </p>
                  )}
                  <div className="event-line">
                    <span>{t("Open 48-hour windows")}</span>
                    <strong>{number.format(current.pending_48h)}</strong>
                  </div>
                </section>

                <section
                  className="card"
                  aria-labelledby="admin-recovery-funnel"
                >
                  <h2 id="admin-recovery-funnel">{t("Recovery funnel")}</h2>
                  <p className="muted">
                    {t(
                      "Unique users with a plan offered in this period. Percentages are relative to all users offered a plan.",
                    )}
                  </p>
                  {current.recovery_funnel.offered > 0 ? (
                    <ol className="recovery-funnel-stages">
                      {[
                        {
                          label: "Micro-quest offered",
                          count: current.recovery_funnel.offered,
                        },
                        {
                          label: "Micro-quest accepted",
                          count: current.recovery_funnel.accepted,
                        },
                        {
                          label: "Micro-quest completed",
                          count: current.recovery_funnel.completed,
                        },
                        {
                          label: "Original goal restored",
                          count: current.recovery_funnel.restored,
                        },
                      ].map(({ label, count }) => (
                        <li className="admin-funnel-stage" key={label}>
                          <div className="flex-between">
                            <span>{t(label)}</span>
                            <strong>
                              {number.format(count)} ·{" "}
                              {percent.format(
                                count / current.recovery_funnel.offered,
                              )}
                            </strong>
                          </div>
                          <progress
                            aria-hidden="true"
                            value={count}
                            max={current.recovery_funnel.offered}
                          />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">
                      {t("No recovery plans were offered in this period.")}
                    </p>
                  )}
                </section>

                <section className="card" aria-labelledby="admin-daily">
                  <h2 id="admin-daily">{t("Daily activity")}</h2>
                  <div className="admin-table-wrapper">
                    <table aria-labelledby="admin-daily">
                      <thead>
                        <tr>
                          <th scope="col">{t("Date")}</th>
                          <th scope="col">{t("Active users")}</th>
                          <th scope="col">{t("Completion actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.daily_activity.map((day) => (
                          <tr key={day.date}>
                            <th scope="row">
                              <time dateTime={day.date}>
                                {niceDate(day.date, locale)}
                              </time>
                            </th>
                            <td>{number.format(day.active_users)}</td>
                            <td>{number.format(day.completion_actions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <details className="card">
                  <summary>{t("Recorded events")}</summary>
                  {current.event_counts.length === 0 ? (
                    <p className="muted">
                      {t("No events recorded in this period.")}
                    </p>
                  ) : (
                    current.event_counts.map(({ name, count }) => (
                      <div className="event-line" key={name}>
                        <span>{name}</span>
                        <strong>{number.format(count)}</strong>
                      </div>
                    ))
                  )}
                </details>

                <details className="card">
                  <summary>{t("How these metrics are counted")}</summary>
                  <ul>
                    <li>
                      {t(
                        "Activity means a recorded sign-in, registration, or habit or recovery action. Simply opening a page does not count.",
                      )}
                    </li>
                    <li>
                      {t(
                        "D7 includes accounts whose seventh calendar day fell in the selected period and has ended. A recorded action on that day counts as a return.",
                      )}
                    </li>
                    <li>
                      {t(
                        "The 48-hour rate counts reports, so one person can contribute more than once. A micro-quest completed before the deadline counts as a recovery.",
                      )}
                    </li>
                  </ul>
                </details>
              </>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
