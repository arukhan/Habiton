
"use client";

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

        <small>
          {habit.target_minutes} min daily
          {!readOnly && <> · 🔥 {habit.streak}-day streak</>}
        </small>
      </div>

      {onArchive && !readOnly && (
        <button
          type="button"
          className="icon-action"
          aria-label={`Archive ${habit.title}`}
          title="Archive habit"
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
            ? `Undo completion of ${habit.title}`
            : `Complete ${habit.title}`
        }
        title={readOnly ? "Past and future days are read-only" :
          habit.completed_today
            ? "Undo completion"
            : "Mark as completed"
        }
      >
        {habit.completed_today && <Check size={17} />}
      </button>
    </article>
  );
}
