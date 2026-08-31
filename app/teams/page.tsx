"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useTimezone } from "@/lib/timezone";
import { searchKey, sortedMatches, teamById, teamName, teams } from "@/lib/data";
import { standingsAround, teamStanding } from "@/lib/standings";
import { useFavorite } from "@/lib/favorite";
import type { Team } from "@/lib/types";
import MatchDayList from "@/components/MatchDayList";
import LeagueTable from "@/components/LeagueTable";
import { Crest } from "@/components/TeamBadge";
import TeamRoad from "@/components/TeamRoad";
import TeamCompare from "@/components/TeamCompare";
import FavoriteStar from "@/components/FavoriteStar";
import { STAR_PATH } from "@/components/StarMark";

export default function TeamsPage() {
  const { locale, t } = useI18n();
  const { mode } = useTimezone();
  const { favorite } = useFavorite();
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) => {
        // The visitor's club first, then alphabetically. Thirty-six tiles is
        // enough that scrolling to your own every time is the main friction.
        if (a.id === favorite) return -1;
        if (b.id === favorite) return 1;
        return teamName(a, locale).localeCompare(teamName(b, locale));
      }),
    [locale, favorite],
  );

  const visibleTeams = useMemo(() => {
    const q = searchKey(query.trim());
    if (!q) return sortedTeams;
    // Club names and code only. The API gives `country` in English only
    // ("Spain", "Czech Republic"), so offering to search by country in a
    // Spanish UI just failed silently.
    return sortedTeams.filter((tm) =>
      searchKey(`${tm.en} ${tm.es} ${tm.tla}`).includes(q),
    );
  }, [sortedTeams, query]);

  // Nothing picked yet opens on the visitor's own club rather than on an empty
  // page, while any explicit choice still wins.
  const shownId = selected ?? favorite;
  const team: Team | undefined = teamById(shownId);

  const teamMatches = useMemo(() => {
    if (!team) return [];
    return sortedMatches().filter(
      (m) => m.home === team.id || m.away === team.id,
    );
  }, [team]);

  const standing = team ? teamStanding(team.id) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("teams.title")}</h1>
        <p className="text-sm text-muted">{t("teams.subtitle")}</p>
      </div>

      <input
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("teams.search")}
      />

      {visibleTeams.length === 0 ? (
        <p className="text-sm text-muted">{t("teams.noneFound")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleTeams.map((tm) => {
            const active = tm.id === shownId;
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => setSelected(tm.id)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  active
                    ? "border-accent bg-highlight text-ink"
                    : "border-line bg-surface hover:border-accent/50"
                }`}
              >
                <Crest team={tm} size={24} />
                <span className="truncate">{teamName(tm, locale)}</span>
                {tm.id === favorite && (
                  <span className="ml-auto shrink-0 text-gold">
                    <svg
                      width={12}
                      height={12}
                      viewBox="-12 -12 24 24"
                      aria-hidden
                      focusable="false"
                    >
                      <path d={STAR_PATH} fill="currentColor" />
                    </svg>
                    <span className="sr-only">{t("favorite.badge")}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {team && (
        <div className="space-y-4 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Crest team={team} size={48} />
            <div>
              <h2 className="text-2xl font-extrabold leading-tight">
                {teamName(team, locale)}
              </h2>
              <p className="text-sm text-muted">
                {[team.country, team.venue].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <FavoriteStar teamId={team.id} />
              <span className="text-[0.68rem] text-muted">
                {t("favorite.local")}
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">
              {t("teams.matches")} · 🕒{" "}
              {t(mode === "stadium" ? "common.tzStadium" : "common.tzLocal")}
            </h3>
            <MatchDayList matches={teamMatches} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">{t("road.title")}</h3>
            <TeamRoad teamId={team.id} />
          </div>

          {standing && (
            <div>
              <h3 className="mb-2 text-sm font-bold">
                {t("teams.tableAround")}
              </h3>
              <LeagueTable
                rows={standingsAround(team.id)}
                highlight={team.id}
                favorite={favorite ?? undefined}
              />
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold">{t("compare.title")}</h3>
            <TeamCompare teamId={team.id} />
          </div>
        </div>
      )}
    </div>
  );
}
