
"use client";

import { translateError } from "@/lib/translations";
import { useLocale } from "@/context/LocaleContext";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useHabiton } from "@/context/AppContext";
import { Navigation } from "./Navigation";
import { Penguin } from "./Penguin";

interface ShellProps {
  children: React.ReactNode;
  title?: string;
  navigation?: boolean;
}

export function Shell({
  children,
  title = "HABITON ✦",
  navigation = true,
}: ShellProps) {
  const { locale, t } = useLocale();

  const { user, loading, error } = useHabiton();
  const router = useRouter();

  // Redirect unauthenticated users to Login
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Loading screen
  if (loading) {
    return (
      <div className="full-loading">
        <Penguin mood="thinking" />
        <h2>{t("Getting your quests ready...")}</h2>
      </div>
    );
  }

  // Redirecting to Login
  if (!user) {
    return (
      <div className="full-loading">
        {t("Redirecting to login...")}
      </div>
    );
  }

  return (
    <main className="site-shell">
      <div className="app-frame">
        {/* Global Header */}
        <header className="topbar">
          <span>{title}</span>

          <span className="top-avatar">
            <Image
              src="/penguin-icon.png"
              alt={t("Habiton Penguin")}
              width={48}
              height={48}
              className="top-avatar-image"
              priority
            />
          </span>
        </header>

        {/* Main Content */}
        <div className="content">

          {error && (
            <div role="alert" className="error">
              {translateError(locale, error)}
            </div>
          )}

          {children}
        </div>

        {/* Bottom Navigation */}
        {navigation && <Navigation />}
      </div>

    </main>
  );
}
