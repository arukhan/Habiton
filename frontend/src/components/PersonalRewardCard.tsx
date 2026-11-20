"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "@/context/LocaleContext";
import { API, ApiError } from "@/lib/api";
import { translateError } from "@/lib/translations";
import type { PersonalReward } from "@/types";

export function PersonalRewardCard() {
  const { locale, t } = useLocale();
  const [data, setData] = useState<PersonalReward | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let active = true;
    API.personalReward()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) {
          setSupported(false);
          return;
        }
        setError(e instanceof Error ? e.message : "Could not load your reward");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;

    setBusy(true);
    setError("");
    try {
      setData(await API.startPersonalReward(name));
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your reward");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  const reward = data?.reward;
  const ready = Boolean(data && reward && reward.progress >= data.goal);

  return (
    <section className="card" aria-labelledby="personal-reward-heading">
      <h2 id="personal-reward-heading">{t("Personal reward")}</h2>
      {data && (
        <>
          <p className="muted">
            {t(
              "Choose something you can treat yourself to after {count} new habit completions.",
              { count: data.goal },
            )}
          </p>
          {reward && (
            <>
              <p>
                <strong>{reward.title}</strong>
              </p>
              <label>
                {t("{current} of {goal} completions", {
                  current: reward.progress,
                  goal: data.goal,
                })}
                <progress
                  className="personal-reward-progress"
                  value={reward.progress}
                  max={data.goal}
                />
              </label>
              {ready && (
                <p role="status">{t("Reward unlocked! Time to enjoy it.")}</p>
              )}
            </>
          )}
          {(!reward || ready) && (
            <form className="form-stack" onSubmit={save}>
              <label>
                {t("Reward name")}
                <input
                  value={title}
                  maxLength={80}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy || !title.trim()}
              >
                {t(busy ? "Saving..." : "Set reward")}
              </button>
            </form>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {translateError(locale, error)}
        </p>
      )}
    </section>
  );
}
