import { useLocale } from "@/context/LocaleContext";
import type { Recovery } from "@/types";
export function ProgressSteps({ recovery }: { recovery: Recovery }) {
  const { t } = useLocale();
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
        <strong>{t("{count} min", { count: recovery.micro_minutes })}</strong>
        <span>{completed >= 1 ? t("✓ Complete") : t("Micro-quest")}</span>
      </div>
      <div>
        <strong>{t("{count} min", { count: recovery.step_minutes })}</strong>
        <span>{completed >= 2 ? t("✓ Complete") : t("Step-up")}</span>
      </div>
      <div>
        <strong>
          {t("{count} min", { count: recovery.original_minutes })}
        </strong>
        <span>{completed >= 3 ? t("✓ Complete") : t("Original goal")}</span>
      </div>
    </div>
  );
}
