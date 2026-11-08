
"use client";

import Image from "next/image";
import { useHabiton } from "@/context/AppContext";

export type Mood =
  | "hello"
  | "sad"
  | "thinking"
  | "happy"
  | "hero";

type HeroClass = "Warrior" | "Mage" | "Priest";

type PenguinSize = "sm" | "md" | "lg";

interface PenguinProps {
  mood?: Mood;
  size?: PenguinSize;
  caption?: boolean;
}

const settings: Record<
  Mood,
  {
    symbol: string;
    title: string;
    line: string;
  }
> = {
  hello: {
    symbol: "👋",
    title: "Hi, adventurer!",
    line: "Small steps, real growth.",
  },

  sad: {
    symbol: "💜",
    title: "It happens.",
    line: "One missed day doesn't erase your effort.",
  },

  thinking: {
    symbol: "🌱",
    title: "One small step",
    line: "Your comeback starts here.",
  },

  happy: {
    symbol: "🎉",
    title: "You did it!",
    line: "Your progress is still yours.",
  },

  hero: {
    symbol: "✨",
    title: "Your penguin hero",
    line: "Level up at your own pace.",
  },
};

const moodImages: Record<Exclude<Mood, "hero">, string> = {
  hello: "/images/penguin-today.png",
  sad: "/images/penguin-sad.png",
  thinking: "/penguin-icon.png",
  happy: "/images/penguin-success.png",
};

const heroImages: Record<HeroClass, string> = {
  Warrior: "/images/penguin-warrior.png",
  Mage: "/images/penguin-mage.png",
  Priest: "/images/penguin-priest.png",
};

export function Penguin({
  mood = "hello",
  size = "md",
  caption = false,
}: PenguinProps) {
  const { user } = useHabiton();

  const setting = settings[mood];

  const heroClass: HeroClass =
    user?.hero_class === "Warrior" ||
    user?.hero_class === "Mage" ||
    user?.hero_class === "Priest"
      ? user.hero_class
      : "Mage";

  const imageSrc =
    mood === "hero"
      ? heroImages[heroClass]
      : moodImages[mood];

  return (
    <div
      className={`penguin-holder penguin-${mood} penguin-${size}`}
      aria-label={`${setting.title}. ${setting.line}`}
    >
      <div className="penguin-photo">
        <Image
          src={imageSrc}
          alt={`${mood === "hero" ? heroClass : mood} Habiton penguin`}
          width={260}
          height={260}
          priority={mood === "hello"}
        />
      </div>

      {caption && (
        <div className="penguin-caption">
          <strong>{setting.title}</strong>
          <small>{setting.line}</small>
        </div>
      )}
    </div>
  );
}
