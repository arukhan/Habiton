"use client";

import { useLocale } from "@/context/LocaleContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartNoAxesColumn, UserRound } from "lucide-react";
const links = [
  { href: "/today", name: "Today", Icon: CalendarDays },
  { href: "/insights", name: "Insights", Icon: ChartNoAxesColumn },
  { href: "/profile", name: "You", Icon: UserRound },
];
export function Navigation() {
  const { t } = useLocale();
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label={t("Main navigation")}>
      {links.map(({ href, name, Icon }) => (
        <Link
          className={path.startsWith(href) ? "selected" : ""}
          href={href}
          key={href}
        >
          <span>
            <Icon size={19} />
          </span>
          {t(name)}
        </Link>
      ))}
    </nav>
  );
}
