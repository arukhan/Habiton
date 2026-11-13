
"use client";

import Image from "next/image";
import { useState } from "react";
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

export default function Today() {
  const {
    user,
    habits,
    recoveries,
    refresh,
  } = useHabiton();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  // Week calendar
  const weekDays = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();

      date.setDate(date.getDate() + index - 3);

      return {
        day: date.toLocaleDateString(
          "en-US",
          { weekday: "short" }
        ).slice(0, 1),
        date: date.getDate(),
        isToday: index === 3,
      };
    }
  );

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
            YOUR DAILY ADVENTURE
          </div>

          <h1>
            Back on track,{" "}
            {user?.name?.split(" ")[0] || "Adventurer"}.
          </h1>

          <p className="muted">
            One step counts. Your penguin
            is cheering for you.
          </p>
        </div>

        <div className="today-penguin">
          <Image
            src="/images/penguin-today.png"
            alt="Happy Habiton penguin"
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
          {streak}-day streak
        </span>

        <span>
          ⭐ Level {user?.level ?? 1}
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
      <div className="weekday-row">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`weekday ${
              day.isToday ? "active" : ""
            }`}
          >
            <span>{day.day}</span>
            <strong>{day.date}</strong>
          </div>
        ))}
      </div>

      {/* Recovery section */}
      {recovery ? (
        <section className="card recovery-home">
          <span className="card-label">
            YOUR RECOVERY IS READY
          </span>

          <h2>Let's build back gently</h2>

          <p className="muted">
            {recovery.habit_title}: start small,
            then return to your goal.
          </p>

          <Link
            className="btn-orange"
            href={`/recovery/${recovery.id}`}
          >
            Continue recovery
            <ArrowRight size={17} />
          </Link>

          <p className="helper-text">
            {recovery.remaining_windows} of 3
            recoveries still available
          </p>
        </section>
      ) : (
        <section className="card recovery-home">
          <span className="card-label">
            MISSED A DAY?
          </span>

          <h2>A miss is a moment, not the end.</h2>

          <p className="muted">
            Keep what you've built.
            Return with a smaller micro-quest.
          </p>

          {eligible ? (
            <Link
              href="/recovery/report"
              className="btn-orange"
            >
              ⚡ Report a missed day
              <ArrowRight size={16} />
            </Link>
          ) : (
            <div className="gentle-message">
              <Sparkles size={16} />
              Recovery unlocks after
              3 completed days. Keep going!
            </div>
          )}

          <p className="helper-text">
            Your history and earned XP
            are always kept.
          </p>
        </section>
      )}

      {/* Habit list */}
      <div className="section-heading">
        <h2>Your habits</h2>

        <Link
          className="text-button"
          href="/habits/new"
        >
          <Plus size={16} />
          New habit
        </Link>
      </div>

      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          busy={busy}
          onToggle={() =>
            toggleHabit(
              habit.id,
              habit.completed_today
            )
          }
          onArchive={() => {
            if (
              window.confirm(
                `Archive ${habit.title}? Your history remains saved.`
              )
            ) {
              void perform(() =>
                API.archiveHabit(habit.id)
              );
            }
          }}
        />
      ))}

      {/* Empty state */}
      {habits.length === 0 && (
        <div className="empty">
          <BookOpen />

          <h3>
            Your story starts with one habit.
          </h3>

          <Link
            href="/habits/new"
            className="btn-primary"
          >
            Create your first habit
          </Link>

        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {/* Recovery history */}
      {recoveries.length > 0 && (
        <section className="recent-recovery">
          <h3>Recovery journey</h3>

          <p>
            Your completed quests stay
            in your history.
          </p>

          <Link
            href={`/recovery/${recoveries[0].id}`}
          >
            Open latest recovery →
          </Link>
        </section>
      )}

      {/* Footer */}
      <p className="footer-note">
        🐧 Progress is personal.
        No leaderboards, no punishment.
      </p>
    </Shell>
  );
}
