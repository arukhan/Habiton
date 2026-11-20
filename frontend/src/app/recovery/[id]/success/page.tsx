"use client";

import { dayCount } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Flame } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Penguin } from "@/components/Penguin";
import { ProgressSteps } from "@/components/ProgressSteps";
import { useHabiton } from "@/context/AppContext";
export default function Success() {
  const { locale, t } = useLocale();
  const { id } = useParams<{ id: string }>();
  const { recoveries } = useHabiton();
  const r = recoveries.find((x) => x.id === id);
  if (!r)
    return (
      <Shell navigation={false}>
        <Link href="/today">{t("← Today")}</Link>
        <h2>{t("Recovery not found")}</h2>
      </Shell>
    );
  const step =
    r.status === "micro_completed"
      ? "MICRO-QUEST COMPLETE"
      : r.status === "step_completed"
        ? "STEP-UP COMPLETE"
        : "ORIGINAL GOAL COMPLETE";
  return (
    <Shell navigation={false}>
      <Link href="/today" className="back-link">
        {t("← Today")}
      </Link>
      <div className="success-penguin">
        <Penguin mood="happy" size="lg" caption />
      </div>
      <p className="eyebrow">{t("RECOVERY RECORDED")}</p>
      <h1>
        {r.status === "completed"
          ? t("Back to your rhythm!")
          : t("Streak kept!")}
      </h1>
      <p className="muted">
        {t("You made space for one meaningful step. Keep building gently.")}
      </p>
      <div className="saved-banner">
        <Flame size={20} />{" "}
        {t("{days} saved", { days: dayCount(locale, r.streak_before) })}
      </div>
      <div className="card quest-highlight">
        <p className="card-label">{t(step)}</p>
        <h2>
          {t("{count} min", {
            count:
              r.status === "micro_completed"
                ? r.micro_minutes
                : r.status === "step_completed"
                  ? r.step_minutes
                  : r.original_minutes,
          })}{" "}
          · {r.habit_title}
        </h2>
        <p>
          {t(
            "Recovery, step-up and full sessions are recorded separately. We never turn a missed day into a full session.",
          )}
        </p>
      </div>
      <div className="card">
        <h3>{t("Your recovery progress")}</h3>
        <ProgressSteps recovery={r} />
      </div>
      <div className="card hero-log">
        <strong>{t("🐧 PENGUIN'S HERO LOG")}</strong>
        <p>
          “
          {t(r.hero_log || "Every small step counts. I'm proud you came back!")}
          ”
        </p>
      </div>
      <Link
        className="btn-primary"
        href={r.status === "completed" ? "/insights" : `/recovery/${id}`}
      >
        {r.status === "completed"
          ? t("View progress")
          : t("Continue the step-up plan")}
      </Link>
      <Link href="/hero-log" className="btn-outline">
        {t("Open Hero’s Log")}
      </Link>
      <Link href="/today" className="btn-outline">
        {t("Back to Today")}
      </Link>
    </Shell>
  );
}
