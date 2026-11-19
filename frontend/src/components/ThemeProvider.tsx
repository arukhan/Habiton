"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "lavender" | "sage" | "blue" | "rose" | "peach";
export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeName;
  mode: ThemeMode;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
};

const THEME_KEY = "habiton-theme-v1";
const MODE_KEY = "habiton-mode-v1";
const ThemeContext = createContext<ThemeContextValue | null>(null);

const names: ThemeName[] = ["lavender", "sage", "blue", "rose", "peach"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Render the same default on the server and the first client render.
  // Read saved preferences only after mounting to avoid a hydration mismatch.
  const [theme, setTheme] = useState<ThemeName>("lavender");
  const [mode, setMode] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const savedMode = localStorage.getItem(MODE_KEY);
      if (savedTheme && names.includes(savedTheme as ThemeName)) setTheme(savedTheme as ThemeName);
      if (savedMode === "dark" || savedMode === "light") setMode(savedMode);
    } catch { /* Storage may be unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.habitonTheme = theme;
    document.documentElement.dataset.habitonMode = mode;
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(MODE_KEY, mode);
    } catch { /* Theme still works for the current session. */ }
  }, [theme, mode, ready]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeSettings must be used within ThemeProvider");
  return context;
}
