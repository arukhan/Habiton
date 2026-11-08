
"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Flame,
  BookOpen,
  Shield,
  LogOut,
  Star,
} from "lucide-react";

import { Shell } from "@/components/Shell";
import { useHabiton } from "@/context/AppContext";

type HeroClass = "Warrior" | "Mage" | "Priest";

const penguinImages: Record<HeroClass, string> = {
  Warrior: "/images/penguin-warrior.png",
  Mage: "/images/penguin-mage.png",
  Priest: "/images/penguin-priest.png",
};

const classDescriptions: Record<HeroClass, string> = {
  Warrior: "A brave penguin who never gives up.",
  Mage: "A curious penguin who grows through learning.",
  Priest: "A caring penguin who values balance and healing.",
};

export default function Profile() {
  const {
    user,
    habits,
    insights,
    updateProfile,
    logout,
  } = useHabiton();

  const [error, setError] = useState("");

  const selectedClass: HeroClass =
    user?.hero_class === "Warrior" ||
    user?.hero_class === "Mage" ||
    user?.hero_class === "Priest"
      ? user.hero_class
      : "Mage";

  async function setClass(cls: HeroClass) {
    setError("");

    try {
      await updateProfile({ hero_class: cls });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not update class"
      );
    }
  }

  async function changeName() {
    const value = window.prompt(
      "Your hero's name",
      user?.name || ""
    );

    if (value && value.trim().length > 1) {
      try {
        await updateProfile({ name: value.trim() });
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not save"
        );
      }
    }
  }

  return (
    <Shell>
      <p className="eyebrow">YOUR PENGUIN COMPANION</p>
      <h1>A little more you.</h1>

      <div className="card profile-hero">

        {/* Penguin character and user info */}
        <div className="profile-top">
          <div className="profile-penguin">
            <Image
              src={penguinImages[selectedClass]}
              alt={`${selectedClass} Penguin`}
              width={160}
              height={160}
              className="profile-penguin-image"
              priority
            />
          </div>

          <div>
            <div className="level-bubble">
              Level {user?.level || 1}
            </div>

            <strong>{user?.name}</strong>
            <small>{selectedClass} · Penguin</small>
            <small>{user?.email}</small>

            <button
              className="text-button"
              onClick={changeName}
            >
              Edit name
            </button>
          </div>
        </div>

        {/* RPG class selection */}
        <p className="eyebrow">CHOOSE YOUR PATH</p>

        <div className="class-choices">
          {(["Warrior", "Mage", "Priest"] as const).map(
            (cls) => (
              <button
                key={cls}
                className={
                  selectedClass === cls ? "selected" : ""
                }
                onClick={() => setClass(cls)}
              >
                {cls === "Warrior"
                  ? "⚔️"
                  : cls === "Mage"
                    ? "🪄"
                    : "🌿"}{" "}
                {cls}
              </button>
            )
          )}
        </div>

        <p className="class-description">
          {classDescriptions[selectedClass]}
        </p>

        {/* XP progress */}
        <div className="flex-between small-note">
          <span>
            XP {user?.xp_in_level || 0} /{" "}
            {user?.xp_next || 100}
          </span>

          <span>Level {user?.level || 1}</span>
        </div>

        <div className="progress">
          <div
            style={{
              width: `${
                Math.min(
                  100,
                  ((user?.xp_in_level || 0) /
                    (user?.xp_next || 100)) *
                    100
                )
              }%`,
            }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="stat-row boxed">
        <div>
          <BookOpen size={19} />
          <small>Habits</small>
          <b>{habits.length}</b>
        </div>

        <div>
          <Flame size={19} />
          <small>Best streak</small>
          <b>{insights?.best_streak || 0} days</b>
        </div>

        <div>
          <Shield size={19} />
          <small>Recoveries</small>
          <b>{insights?.recoveries || 0}</b>
        </div>
      </div>

      {/* Growth */}
      <div className="card">
        <div className="eyebrow">YOUR GROWTH</div>

        <h2>
          <Star size={17} /> Personal progress
        </h2>

        <p className="muted">
          Complete habits to earn +20 XP.
          Micro-quests and step-ups each earn +10 XP.
        </p>

        <p className="muted">
          No leaderboards. Your only competition
          is yesterday.
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        className="logout"
        onClick={() => void logout()}
      >
        <LogOut size={18} />
        Log out
      </button>

      <p className="footer-note">
        Your pace. Your space. Every day.
      </p>
    </Shell>
  );
}
