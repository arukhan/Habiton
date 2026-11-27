import { useLocale } from "@/context/LocaleContext";
import { goalLabel, recoveryGoal } from "@/lib/habitGoals";
import type { Recovery } from "@/types";
export function ProgressSteps({ recovery }: { recovery: Recovery }) {
  const { locale, t } = useLocale();
  const status = recovery.status;
  const completed =
    status === "completed"
      ? 3
      : status === "step_completed"
        ? 2
        : status === "micro_completed"
          ? 1
          : 0;
  return (
    <div className="recovery-steps" aria-label={t("Recovery progress")}>
      <div>
        <strong>{goalLabel(locale, recoveryGoal(recovery, "micro")) || t("One action")}</strong>
        <span>{completed >= 1 ? t("✓ Complete") : t("Micro-quest")}</span>
      </div>
      <div>
        <strong>{goalLabel(locale, recoveryGoal(recovery, "step")) || t("One action")}</strong>
        <span>{completed >= 2 ? t("✓ Complete") : t("Step-up")}</span>
      </div>
      <div>
        <strong>
          {goalLabel(locale, recoveryGoal(recovery, "original")) || t("One action")}
        </strong>
        <span>{completed >= 3 ? t("✓ Complete") : t("Original goal")}</span>
      </div>
    </div>
  );
}
