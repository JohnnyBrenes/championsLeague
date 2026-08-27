"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import TimezoneToggle from "./TimezoneToggle";
import StarMark from "./StarMark";

const NAV = [
  { href: "/", key: "nav.today" },
  { href: "/schedule", key: "nav.schedule" },
  { href: "/teams", key: "nav.teams" },
  { href: "/table", key: "nav.table" },
  { href: "/goleadores", key: "nav.scorers" },
  { href: "/bracket", key: "nav.bracket" },
  { href: "/records", key: "nav.records" },
] as const;

export default function Header() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-accent-dark to-night text-white">
      {/* Floodlight: a soft radial glow spilling in from the top right, the way
          a stadium light washes the stand. Pure decoration, so it is aria-hidden
          and never intercepts clicks. */}
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-accent/35 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-5xl px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <StarMark size={30} className="shrink-0 text-gold" />
            <span>
              <span className="block text-xl font-extrabold leading-tight tracking-tight">
                {t("app.title")}
              </span>
              <span className="block text-xs font-medium opacity-85">
                {t("app.subtitle")}
              </span>
            </span>
          </Link>
          <div className="flex flex-col items-end gap-1.5">
            <LanguageSwitcher />
            <TimezoneToggle />
          </div>
        </div>
        <p className="mt-1 text-sm opacity-90">{t("app.tagline")}</p>

        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-gold/30">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-gold opacity-100"
                    : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
