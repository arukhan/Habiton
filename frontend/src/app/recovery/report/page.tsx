
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Shell } from "@/components/Shell";
import { useHabiton } from "@/context/AppContext";
import { API } from "@/lib/api";


export default function Report() {
  const router = useRouter();
  const { habits, refresh } = useHabiton();

  const [habitId, setHabitId] = useState("");
  const [date, setDate] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
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

  useEffect(() => {
    if (!selected?.id) return;
    let cancelled = false;
    setDatesLoading(true);
    setDate("");
    setAvailableDates([]);
    API.missedDates(selected.id).then((result) => {
      if (cancelled) return;
      setAvailableDates(result.dates);
      setDate(result.dates[0] || "");
    }).catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Could not load missed days");
    }).finally(() => { if (!cancelled) setDatesLoading(false); });
    return () => { cancelled = true; };
  }, [selected?.id]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selected || !date || !availableDates.includes(date)) {
      setError("Please select an available missed date");
      return;
    }

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

          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={datesLoading || availableDates.length === 0}
            required
          >
            {availableDates.length === 0 && <option value="">
              {datesLoading ? "Loading missed dates..." : "No available missed dates"}
            </option>}
            {availableDates.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          <span className="missed-date-help">
            Only past dates without a recorded completion are selectable.
            Please confirm that you really missed the habit.
          </span>
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
          disabled={busy || datesLoading || !selected || !date}
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
