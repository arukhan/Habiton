
"use client";

import { translateError } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Flame,
  Plus,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";

import { Shell } from "@/components/Shell";
import { HabitCard } from "@/components/HabitCard";
import { API } from "@/lib/api";
import { useHabiton } from "@/context/AppContext";
import { localDay, niceDate } from "@/lib/dates";
import type { WeekDay, Habit } from "@/types";

export default function Today() {
  const { locale, t } = useLocale();

  const {
    user,
    habits,
    recoveries,
    refresh,
  } = useHabiton();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [week, setWeek] = useState<WeekDay[]>([]);
  const [selectedDay, setSelectedDay] = useState(localDay());
  const [weekLoading, setWeekLoading] = useState(true);
  const today = localDay();
  const isToday = selectedDay === today;

  useEffect(() => {
    let mounted = true;
    API.week().then((data) => {
      if (mounted) setWeek(data.days);
    }).catch((e: unknown) => {
      if (mounted) setError(e instanceof Error ? e.message : "Could not load calendar");
    }).finally(() => {
      if (mounted) setWeekLoading(false);
    });
    return () => { mounted = false; };
  }, [habits]);

  const activeDay = week.find((d) => d.date === selectedDay);
  const selectedHabits = useMemo(() => {
    if (isToday || weekLoading) return habits;
    return (activeDay?.habits ?? []).map((item): Habit => ({
      ...item,
      streak: 0,
      best_streak: 0,
      consecutive_recoveries: 0,
      completed_today: item.completed,
    }));
  }, [isToday, weekLoading, habits, activeDay]);

  // Find active recovery
  const recovery = recoveries.find((r) =>
    [
      "offered",
      "accepted",
      "micro_completed",
      "step_completed",
    ].includes(r.status)
  );

  // Highest current streak
  const streak = Math.max(
    0,
    ...habits.map((habit) => habit.streak)
  );

  // Recovery unlocks after 3-day streak
  const eligible = habits.find(
    (habit) => habit.streak >= 3
  );

  // Perform API request and refresh all data
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");

    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  }

  // Complete or undo a habit
  async function toggleHabit(
    habitId: string,
    completedToday: boolean
  ) {
    await perform(() =>
      completedToday
        ? API.undoCompleteHabit(habitId)
        : API.completeHabit(habitId)
    );
  }

  // Current week, Monday to Sunday (Asia/Almaty date from API).
  // Calendar labels come from ISO dates to avoid client timezone shifts.
  const weekDays = week.length ? week : Array.from({ length: 7 }, (_, i) => {
    const utc = new Date(`${today}T12:00:00Z`);
    const weekday = (utc.getUTCDay() + 6) % 7;
    utc.setUTCDate(utc.getUTCDate() - weekday + i);
    return { date: utc.toISOString().slice(0, 10), habits: [] as WeekDay["habits"] };
  });

  // XP progress
  const xpInLevel = user?.xp_in_level ?? 0;
  const xpNext = user?.xp_next ?? 100;
  const xpProgress = Math.min(
    100,
    (xpInLevel / xpNext) * 100
  );

  return (
    <Shell>
      {/* Welcome header */}
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            {t("YOUR DAILY ADVENTURE")}
          </div>

          <h1>
            {t("Back on track, {name}.", { name: user?.name?.split(" ")[0] || t("Adventurer") })}
          </h1>

          <p className="muted">
            {t("One step counts. Your penguin is cheering for you.")}
          </p>
        </div>

        <div className="today-penguin">
          <Image
            src="/images/penguin-today.png"
            alt={t("Happy Habiton penguin")}
            width={120}
            height={120}
            className="today-penguin-image"
            priority
          />
        </div>
      </div>

      {/* XP and streak */}
      <div className="game-strip">
        <span>
          <Flame size={18} />
          {t("{count}-day streak", {count: streak})}
        </span>

        <span>
          ⭐ {t("Level {count}", { count: user?.level ?? 1 })}
        </span>

        <div className="game-strip-progress">
          <div
            style={{
              width: `${xpProgress}%`,
            }}
          />
        </div>

        <small>
          {xpInLevel} / {xpNext} XP
        </small>
      </div>

      {/* Week calendar */}
      <div className="weekday-row" aria-label={t("Habits for this week")}>
        {weekDays.map((day) => {
          const utc = new Date(`${day.date}T12:00:00Z`);
          const label = utc.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { weekday: "short", timeZone: "UTC" });
          return (
            <button
              key={day.date}
              type="button"
              className={`weekday ${selectedDay === day.date ? "active" : ""}`}
              onClick={() => setSelectedDay(day.date)}
              aria-pressed={selectedDay === day.date}
              aria-label={t("View {date}", { date: locale === "ru" ? niceDate(day.date, locale) : day.date })}
            >
              <span>{locale === "ru" ? label : label.slice(0, 1)}</span>
              <strong>{utc.getUTCDate()}</strong>
            </button>
          );
        })}
      </div>

      {/* Recovery section */}
      {recovery ? (
        <section className="card recovery-home">
          <span className="card-label">
            {t("YOUR RECOVERY IS READY")}
          </span>

          <h2>{t("Let's build back gently")}</h2>

          <p className="muted">
            {t("{habit}: start small, then return to your goal.", { habit: recovery.habit_title })}
          </p>

          <Link
            className="btn-orange"
            href={`/recovery/${recovery.id}`}
          >
            {t("Continue recovery")}
            <ArrowRight size={17} />
          </Link>

          <p className="helper-text">
            {t("{count} of 3 recoveries still available", { count: recovery.remaining_windows })}
          </p>
        </section>
      ) : (
        <section className="card recovery-home">
          <span className="card-label">
            {t("MISSED A DAY?")}
          </span>

          <h2>{t("A miss is a moment, not the end.")}</h2>

          <p className="muted">
            {t("Keep what you've built. Return with a smaller micro-quest.")}
          </p>

          {eligible ? (
            <Link
              href="/recovery/report"
              className="btn-orange"
            >
              {t("⚡ Report a missed day")}
              <ArrowRight size={16} />
            </Link>
          ) : (
            <div className="gentle-message">
              <Sparkles size={16} />
              {t("Recovery unlocks after 3 completed days. Keep going!")}
            </div>
          )}

          <p className="helper-text">
            {t("Your history and earned XP are always kept.")}
          </p>
        </section>
      )}

      {/* Habit list */}
      <div className="section-heading">
        <h2>{isToday ? t("Your habits") : t("Habits · {date}", { date: locale === "ru" ? niceDate(selectedDay, locale) : selectedDay })}</h2>

        {isToday && <Link className="text-button" href="/habits/new">
          <Plus size={16} /> {t("New habit")}
        </Link>}
      </div>

      {selectedHabits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          busy={busy}
          readOnly={!isToday}
          onToggle={() =>
            toggleHabit(
              habit.id,
              habit.completed_today
            )
          }
          onArchive={isToday ? () => {
            if (
              window.confirm(
                t("Archive {habit}? Your history remains saved.", { habit: habit.title })
              )
            ) {
              void perform(() =>
                API.archiveHabit(habit.id)
              );
            }
          } : undefined}
        />
      ))}

      {/* Empty state */}
      {selectedHabits.length === 0 && !weekLoading && (
        <div className="empty">
          <BookOpen />

          <h3>{isToday ? t("Your story starts with one habit.") :
            t("No habits were scheduled for this day.")}</h3>

          {isToday && <Link href="/habits/new" className="btn-primary">
            {t("Create your first habit")}
          </Link>}

        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="error" role="alert">
          {translateError(locale, error)}
        </div>
      )}

      {/* Recovery history */}
      {recoveries.length > 0 && (
        <section className="recent-recovery">
          <h3>{t("Recovery journey")}</h3>

          <p>
            {t("Your completed quests stay in your history.")}
          </p>

          <Link
            href={`/recovery/${recoveries[0].id}`}
          >
            {t("Open latest recovery →")}
          </Link>
        </section>
      )}

    </Shell>
  );
}
