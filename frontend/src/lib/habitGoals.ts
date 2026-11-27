import { translate, type Locale } from "@/lib/translations";
import type { HabitGoal, HabitInput, Recovery } from "@/types";

export function habitGoal(habit: { goal?: HabitGoal; target_minutes: number }): HabitGoal {
  return habit.goal ?? { type: "minutes", amount: habit.target_minutes };
}

export function goalLabel(locale: Locale, goal: HabitGoal): string {
  switch (goal.type) {
    case "minutes":
      return translate(locale, "{count} min", { count: goal.amount });
    case "repetitions":
      if (goal.unit) return `${goal.amount} ${goal.unit}`;
      if (locale === "ru") {
        const lastTwo = goal.amount % 100;
        const last = goal.amount % 10;
        const unit = lastTwo >= 11 && lastTwo <= 14
          ? "повторений"
          : last === 1 ? "повтор" : last >= 2 && last <= 4 ? "повтора" : "повторений";
        return `${goal.amount} ${unit}`;
      }
      return `${goal.amount} ${goal.amount === 1 ? "rep" : "reps"}`;
    case "action":
      return "";
  }
}

export function recoveryGoal(recovery: Recovery, stage: "micro" | "step" | "original"): HabitGoal {
  return recovery.goals?.[stage] ?? { type: "minutes", amount: recovery[`${stage}_minutes`] };
}

export function habitInput(title: string, category: string, goal: HabitGoal): HabitInput {
  const microQuest = goal.micro_quest?.trim() || undefined;
  const cleanGoal: HabitGoal = { ...goal, micro_quest: microQuest };
  // Older API builds still accept ordinary minute goals during a rollout.
  if (goal.type === "minutes" && !microQuest) {
    return { title, category, goal: cleanGoal, target_minutes: goal.amount };
  }
  return { title, category, goal: cleanGoal };
}
