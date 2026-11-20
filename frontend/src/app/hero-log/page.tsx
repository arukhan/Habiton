"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useHabiton } from "@/context/AppContext";
import { useLocale } from "@/context/LocaleContext";
import { niceDate } from "@/lib/dates";
import type { User } from "@/types";

const journal = {
  full: {
    label: "Habit completed",
    lines: {
      Warrior: "I showed up for another round of training. That effort counts.",
      Mage: "I’ve added another completed quest to my spellbook.",
      Priest: "I made room for one thing that matters today.",
    },
  },
  recovery: {
    label: "Micro-quest",
    lines: {
      Warrior: "I’m back on the trail. One small step was enough to start.",
      Mage: "A tiny spell was enough to get the adventure moving again.",
      Priest: "I gave myself a gentler way to return, and it worked.",
    },
  },
  step_up: {
    label: "Step-up",
    lines: {
      Warrior:
        "I took on a little more today. My next step feels within reach.",
      Mage: "I practiced a stronger spell. My full quest feels closer.",
      Priest: "I found a pace I could keep as I moved closer to my goal.",
    },
  },
} satisfies Record<
  string,
  { label: string; lines: Record<User["hero_class"], string> }
>;

function isJournalKind(kind: string): kind is keyof typeof journal {
  return Object.hasOwn(journal, kind);
}

export default function HeroLog() {
  const { user, insights } = useHabiton();
  const { locale, t } = useLocale();
  const heroClass = user?.hero_class ?? "Mage";
  const entries = (insights?.history ?? []).flatMap((activity) =>
    isJournalKind(activity.kind)
      ? [{ activity, entry: journal[activity.kind] }]
      : [],
  );

  return (
    <Shell>
      <Link href="/insights" className="back-link">
        {t("← Insights")}
      </Link>
      <h1>{t("Hero’s Log")}</h1>
      <p className="muted">
        {t("Your penguin remembers the steps you completed.")}
      </p>

      {insights &&
        (entries.length ? (
          <ol className="hero-log-entries">
            {entries.map(({ activity, entry }, index) => (
              <li className="card" key={index}>
                <div className="flex-between">
                  <span className="card-label">{t(entry.label)}</span>
                  <time dateTime={activity.date}>
                    {niceDate(activity.date, locale)}
                  </time>
                </div>
                <h2>{activity.habit_title}</h2>
                {activity.minutes > 0 && (
                  <span className="muted">
                    {t("{count} min", { count: activity.minutes })}
                  </span>
                )}
                <p>{t(entry.lines[heroClass])}</p>
              </li>
            ))}
          </ol>
        ) : (
          <section className="empty">
            <h2>{t("Your Hero’s Log is empty.")}</h2>
            <p>
              {t(
                "Complete a habit or a recovery step to add your first entry.",
              )}
            </p>
            <Link href="/today" className="btn-primary">
              {t("Back to Today")}
            </Link>
          </section>
        ))}
    </Shell>
  );
}
