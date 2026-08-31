"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useTimezone } from "@/lib/timezone";
import { useFavorite } from "@/lib/favorite";
import { sortedMatches, teamById } from "@/lib/data";
import { formatDateHeading } from "@/lib/time";
import MatchCard from "./MatchCard";

/**
 * The visitor's club, lifted out of the 144-match wall and put on the front
 * page: the next fixture, or the latest result once there is nothing left to
 * play. Renders nothing at all when no club has been chosen — this is a bonus
 * row, never a hole in the layout.
 */
export default function FavoriteMatch() {
  const { locale, t } = useI18n();
  const { tz } = useTimezone();
  const { favorite } = useFavorite();

  const { match, headingKey } = useMemo(() => {
    if (favorite === null) return { match: null, headingKey: "" };
    const own = sortedMatches().filter(
      (m) => m.home === favorite || m.away === favorite,
    );
    const next = own.find((m) => m.status !== "finished");
    if (next) return { match: next, headingKey: "favorite.next" };
    // Season over for this club (or knocked out): the last thing it played is
    // more useful than an empty card.
    const played = own.filter((m) => m.status === "finished");
    const last = played[played.length - 1] ?? null;
    return { match: last, headingKey: "favorite.last" };
  }, [favorite]);

  const team = teamById(favorite);
  if (!team || !match) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gold">
          {t(headingKey)}
        </h2>
        <span className="truncate text-xs text-muted">
          {formatDateHeading(match.datetime, locale, tz)}
        </span>
      </div>
      <MatchCard match={match} />
    </section>
  );
}
