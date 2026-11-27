
"use client";

import { useLocale } from "@/context/LocaleContext";

import { goalLabel, habitGoal } from "@/lib/habitGoals";
import type { Habit } from "@/types";
import {
  BookOpen,
  Check,
  Footprints,
  Droplets,
  Brain,
  Trash2,
} from "lucide-react";

interface HabitCardProps {
  habit: Habit;
  onToggle: () => void;
  onArchive?: () => void;
  busy?: boolean;
  readOnly?: boolean;
}

export function HabitCard({
  habit,
  onToggle,
  onArchive,
  busy = false,
  readOnly = false,
}: HabitCardProps) {
  const { locale, t } = useLocale();
  const target = goalLabel(locale, habitGoal(habit));

  const category = habit.category.toLowerCase();

  const Icon = category.includes("health")
    ? Droplets
    : category.includes("fitness")
      ? Footprints
      : category.includes("mind")
        ? Brain
        : BookOpen;

  return (
    <article className="habit-card">
      <span className="habit-icon">
        <Icon size={20} />
      </span>

      <div className="habit-info">
        <strong className={habit.completed_today ? "habit-title-completed" : undefined}>{habit.title}</strong>

        {(target || !readOnly) && (
          <small>
            {target}
            {!readOnly && <>{target && " · "}🔥 {t("{count}-day streak", { count: habit.streak })}</>}
          </small>
        )}
      </div>

      {onArchive && !readOnly && (
        <button
          type="button"
          className="icon-action"
          aria-label={t("Archive {habit}", { habit: habit.title })}
          title={t("Archive habit")}
          disabled={busy}
          onClick={onArchive}
        >
          <Trash2 size={16} />
        </button>
      )}

      <button
        type="button"
        className={`check-button ${
          habit.completed_today ? "done" : ""
        }`}
        onClick={onToggle}
        disabled={busy || readOnly}
        aria-pressed={habit.completed_today}
        aria-label={
          habit.completed_today
            ? t("Undo completion of {habit}", { habit: habit.title })
            : t("Complete {habit}", { habit: habit.title })
        }
        title={readOnly ? t("Past and future days are read-only") :
          habit.completed_today
            ? t("Undo completion")
            : t("Mark as completed")
        }
      >
        {habit.completed_today && <Check size={17} />}
      </button>
    </article>
  );
}
