"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  translate,
  type Locale,
  type TranslationValues,
} from "@/lib/translations";

const storageKey = "habiton-language";
const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "ru") setLocale("ru");
    } catch {
      // The current session can still use either language.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function chooseLocale(next: Locale) {
    setLocale(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The preference stays available for the current session.
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale: chooseLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  const { locale, setLocale } = context;
  return {
    locale,
    setLocale,
    t: (message: string, values?: TranslationValues) =>
      translate(locale, message, values),
  };
}

export function LanguageSelect() {
  const { locale, setLocale, t } = useLocale();
  return (
    <label>
      {t("Language")}
      <select
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value === "ru" ? "ru" : "en")
        }
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="ru" lang="ru">
          Русский
        </option>
      </select>
    </label>
  );
}
