"use client";

import { translateError } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { API } from "@/lib/api";
import type { Metrics } from "@/types";
export default function Admin() {
  const { locale, t } = useLocale();
  const [metrics, setMetrics] = useState<Metrics | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const load = () =>
      API.metrics()
        .then(setMetrics)
        .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);
  const funnel = metrics?.recovery_funnel;
  const stages = funnel && [
    { label: "Micro-quest offered", count: funnel.offered },
    { label: "Micro-quest accepted", count: funnel.accepted },
    { label: "Micro-quest completed", count: funnel.completed },
    { label: "Original goal restored", count: funnel.restored },
  ];

  return (
    <Shell navigation={false}>
      <Link className="back-link" href="/profile">
        {t("← Profile")}
      </Link>
      <p className="eyebrow">{t("INTERNAL METRICS · REAL USERS ONLY")}</p>
      <h1>{t("Product health.")}</h1>
      <p className="muted">
        {t("Demo accounts excluded. Data refreshes every 20 seconds.")}
      </p>
      {error && (
        <p className="error">
          {translateError(locale, error)} ·{" "}
          {t("Set ADMIN_EMAIL in your .env for this account.")}
        </p>
      )}
      {metrics && (
        <>
          <div className="stats-grid">
            {[
              { l: "Real users", v: metrics.real_users },
              { l: "Created habits", v: metrics.habits_created },
              { l: "Missed reports", v: metrics.missed_reports },
              { l: "Eligible, 48h elapsed", v: metrics.eligible_matured },
              { l: "Recovered within 48h", v: metrics.recovered_within_48h },
              {
                l: "48h Recovery Rate",
                v: `${metrics.recovery_rate_percent.toFixed(1)}%`,
              },
            ].map((x) => (
              <div className="card" key={x.l}>
                <small>{t(x.l)}</small>
                <b>{x.v}</b>
              </div>
            ))}
          </div>
          {stages && (
            <section className="card" aria-labelledby="recovery-funnel-heading">
              <h2 id="recovery-funnel-heading">{t("Recovery funnel")}</h2>
              <p className="muted">
                {t(
                  "Unique users in recovery plans offered in the last 30 days. Demo accounts are excluded.",
                )}
              </p>
              <ol className="recovery-funnel-stages">
                {stages.map(({ label, count }) => (
                  <li className="event-line" key={label}>
                    <span>{t(label)}</span>
                    <strong>{count.toLocaleString(locale)}</strong>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <div className="card">
            <h2>{t("Events (last 30 days)")}</h2>
            {metrics.events_last_30_days.map((x) => (
              <div className="event-line" key={x.name}>
                <span>{x.name}</span>
                <strong>{x.count}</strong>
              </div>
            ))}
          </div>
          <p className="helper-text">
            {t(
              "KR1 denominator includes eligible reports only after their 48h measurement window has closed.",
            )}
          </p>
        </>
      )}
    </Shell>
  );
}
