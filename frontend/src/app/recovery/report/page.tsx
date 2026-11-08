
"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Shell } from "@/components/Shell";
import { useHabiton } from "@/context/AppContext";
import { API } from "@/lib/api";
import { localDay } from "@/lib/dates";

export default function Report() {
  const router = useRouter();
  const { habits, refresh } = useHabiton();

  const [habitId, setHabitId] = useState("");
  const [date, setDate] = useState(localDay(-1));
  const [reason, setReason] = useState("exams");
  const [workload, setWorkload] = useState("high");
  const [energy, setEnergy] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () =>
      habits.find((h) => h.id === habitId) ||
      habits.find((h) => h.streak >= 3) ||
      habits[0],
    [habitId, habits]
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selected) return;

    setBusy(true);
    setError("");

    try {
      const res = await API.reportMiss(selected.id, {
        missed_date: date,
        reason,
        workload,
        energy,
      });

      await refresh();

      router.push(`/recovery/${res.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not report a missed day"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell navigation={false}>
      <Link href="/today" className="back-link">
        ← Today
      </Link>

      <p className="eyebrow">RECOVERY · STEP 1</p>

      {/* Header with penguin */}
      <div className="welcome-row">
        <div>
          <h1>A miss is a moment.</h1>

          <p className="muted">
            Tell us what got in the way.
            Your earlier effort still matters.
          </p>
        </div>

        <div className="recovery-penguin">
          <Image
            src="/images/penguin-sad.png"
            alt="Habiton penguin resting under a rain cloud"
            width={150}
            height={150}
            className="recovery-penguin-image"
            priority
          />
        </div>
      </div>

      {/* Recovery form */}
      <form className="form-stack" onSubmit={submit}>
        <label>
          Which habit did you miss?

          <select
            value={selected?.id || ""}
            onChange={(e) => setHabitId(e.target.value)}
          >
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.title} — {habit.streak}-day streak
              </option>
            ))}
          </select>
        </label>

        <label>
          Missed date

          <input
            type="date"
            value={date}
            max={localDay()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <p className="form-section-title">
          What got in the way?
        </p>

        <div className="choice-grid">
          {[
            { id: "exams", name: "📚 Exams / deadlines" },
            { id: "fatigue", name: "😴 Tired / low energy" },
            { id: "other", name: "🌦️ Something else" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`choice ${
                reason === option.id ? "selected" : ""
              }`}
              onClick={() => setReason(option.id)}
            >
              {reason === option.id ? "●" : "○"}{" "}
              {option.name}
            </button>
          ))}
        </div>

        {/* Today's capacity */}
        <div className="card soft-card">
          <p className="form-section-title">
            Today's capacity
          </p>

          <label>
            Workload

            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label>
            Energy: {energy} / 5

            <input
              type="range"
              min={1}
              max={5}
              value={energy}
              onChange={(e) =>
                setEnergy(Number(e.target.value))
              }
            />
          </label>
        </div>

        <p className="gentle-message">
          ⏰ Your 48-hour window begins when you submit
          this report. A micro-quest appears immediately.
        </p>

        <button
          type="submit"
          className="btn-orange"
          disabled={busy || !selected}
        >
          {busy
            ? "Preparing your quest..."
            : "Get my recovery quest"}
        </button>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Shell>
  );
}
