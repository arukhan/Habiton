"use client";

import { translateError } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Penguin } from "@/components/Penguin";
import { API } from "@/lib/api";
import { useHabiton } from "@/context/AppContext";

import { HabitGoalFields } from "@/components/HabitGoalFields";
import { habitInput } from "@/lib/habitGoals";
import type { HabitGoal } from "@/types";
const starterHabits = [
  { title: "Read", category: "Reading", minutes: 10 },
  { title: "Take a walk", category: "Fitness", minutes: 15 },
  { title: "Review notes", category: "Study", minutes: 10 },
];

export default function CreateHabit() {
  const { locale, t } = useLocale();

  const router = useRouter();
  const { refresh } = useHabiton();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Study");
  const [goal, setGoal] = useState<HabitGoal>({ type: "minutes", amount: 30 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseStarter(starter: (typeof starterHabits)[number]) {
    setTitle(t(starter.title));
    setCategory(starter.category);
    setGoal({ type: "minutes", amount: starter.minutes });
    setError("");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await API.createHabit(habitInput(title, category, goal));
      await refresh();
      router.push("/today");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create habit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell navigation={false}>
      <Link href="/today" className="back-link">
        {t("← Today")}
      </Link>
      <Penguin mood="hero" size="sm" />
      <p className="eyebrow">{t("NEW ADVENTURE")}</p>
      <h1>{t("Start with one small habit.")}</h1>
      <p className="muted">
        {t("Choose a goal that fits your real life. You can grow it later.")}
      </p>

      <section className="card" aria-labelledby="starter-habits-heading">
        <h2 id="starter-habits-heading">{t("Starter habits")}</h2>
        <p className="muted">
          {t("Pick a starting point. You can edit the details before saving.")}
        </p>
        <div className="class-choices starter-habit-choices">
          {starterHabits.map((starter) => (
            <button
              key={starter.title}
              type="button"
              disabled={busy}
              onClick={() => chooseStarter(starter)}
            >
              {t(starter.title)} ·{" "}
              {t("{count} min", { count: starter.minutes })}
            </button>
          ))}
        </div>
      </section>

      <form className="form-stack space-top" onSubmit={submit}>
        <label>
          {t("Habit name")}
          <input
            value={title}
            required
            minLength={2}
            maxLength={100}
            placeholder={t("Read for 20 minutes")}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          {t("Category")}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "Study",
              "Reading",
              "Fitness",
              "Health",
              "Mindfulness",
              "Other",
            ].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
        <HabitGoalFields goal={goal} category={category} onChange={setGoal} />
        <div className="gentle-message">
          {t(
            "💜 Consistency is not perfection. If you miss a day after building a streak, Habiton can offer a smaller recovery quest.",
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t("Saving...") : t("Create habit")}
        </button>
        <Link href="/today" className="btn-outline">
          {t("Cancel")}
        </Link>
        {error && (
          <p className="error" role="alert">
            {translateError(locale, error)}
          </p>
        )}
      </form>
    </Shell>
  );
}
