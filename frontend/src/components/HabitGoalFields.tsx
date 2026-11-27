"use client";

import { useId } from "react";
import { useLocale } from "@/context/LocaleContext";
import { goalLabel } from "@/lib/habitGoals";
import type { HabitGoal } from "@/types";

const goalOptions = [
  { type: "minutes", label: "Minutes" },
  { type: "repetitions", label: "Repetitions" },
  { type: "action", label: "One action" },
] as const;

export function HabitGoalFields({ goal, category, onChange }: {
  goal: HabitGoal;
  category: string;
  onChange: (goal: HabitGoal) => void;
}) {
  const { locale, t } = useLocale();
  const group = useId();

  function changeType(type: HabitGoal["type"]) {
    if (type === goal.type) return;
    if (type === "action") {
      onChange({ type, micro_quest: goal.micro_quest });
    } else {
      onChange({ type, amount: type === "minutes" ? 15 : 10, micro_quest: goal.micro_quest });
    }
  }

  let suggestion = t("Prepare one item you need for this habit.");
  if (goal.type === "repetitions" && goal.amount > 1) {
    const amount = Math.max(1, Math.floor(goal.amount / 3));
    suggestion = t("Try {target} instead of the full goal.", {
      target: goalLabel(locale, { ...goal, amount }),
    });
  } else if (goal.type === "minutes" && goal.amount >= 5) {
    suggestion = t("Try {count} minutes instead of the full goal.", {
      count: Math.min(Math.floor(goal.amount / 5), Math.ceil(goal.amount / 6)),
    });
  } else if (category === "Reading") {
    suggestion = t("Read one paragraph.");
  }

  return (
    <>
      <fieldset className="habit-goal-types">
        <legend>{t("Goal type")}</legend>
        <div className="habit-goal-options">
          {goalOptions.map(({ type, label }) => (
            <label key={type}>
              <input type="radio" name={group} value={type} checked={goal.type === type}
                onChange={() => changeType(type)} />
              <span>{t(label)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {goal.type !== "action" && (
        <label>
          {t(goal.type === "minutes" ? "How many minutes?" : "How many times?")}
          <input type="number" inputMode="numeric" min={1} max={goal.type === "minutes" ? 1440 : 10000}
            step={1} required value={goal.amount || ""}
            onChange={(event) => onChange({ ...goal, amount: Number(event.target.value) })} />
        </label>
      )}
      {goal.type === "repetitions" && (
        <label>
          {t("Unit (optional)")}
          <input maxLength={32} placeholder={t("For example, squats")} value={goal.unit ?? ""}
            onChange={(event) => onChange({ ...goal, unit: event.target.value })} />
        </label>
      )}
      <label>
        {t("Micro-quest (optional)")}
        <input maxLength={160} placeholder={suggestion} value={goal.micro_quest ?? ""}
          onChange={(event) => onChange({ ...goal, micro_quest: event.target.value })} />
        <small className="helper-text">
          {t("Add one smaller action for a missed day, or leave this blank for a suggested quest.")}
        </small>
      </label>
    </>
  );
}
