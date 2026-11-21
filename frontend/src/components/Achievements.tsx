"use client";

import { Award, Flame, Footprints } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import type { Achievements as AchievementProgress } from "@/types";

const badges = [
  {
    id: "first_step",
    title: "First step",
    description: "Complete any habit.",
    Icon: Footprints,
  },
  {
    id: "three_days",
    title: "Three days in a row",
    description: "Complete one habit on three consecutive days.",
    Icon: Flame,
  },
  {
    id: "comeback",
    title: "Hero’s comeback",
    description: "Complete a recovery micro-quest after a missed day.",
    Icon: Award,
  },
] as const;

export function Achievements({ progress }: { progress: AchievementProgress }) {
  const { t } = useLocale();

  return (
    <section className="card" aria-labelledby="achievements-heading">
      <h2 id="achievements-heading">{t("Hero achievements")}</h2>
      {badges.map(({ id, title, description, Icon }) => (
        <div key={id} className="profile-habit-row achievement-row">
          <Icon size={18} aria-hidden="true" />
          <div>
            <strong>{t(title)}</strong>
            <small>{t(description)}</small>
          </div>
          <span className="small-note">
            {t(progress[id] ? "Unlocked" : "Locked")}
          </span>
        </div>
      ))}
    </section>
  );
}
