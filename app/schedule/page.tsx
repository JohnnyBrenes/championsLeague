"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useTimezone } from "@/lib/timezone";
import { searchKey, sortedMatches, teamById, teamName, teams } from "@/lib/data";
import type { Match } from "@/lib/types";
import MatchDayList from "@/components/MatchDayList";

// A "round" = a league-phase matchday (j1…j8) or a knockout stage.
const ROUND_ORDER = [
  "j1", "j2", "j3", "j4", "j5", "j6", "j7", "j8",
  "po", "r16", "qf", "sf", "final",
];

function roundKey(m: Match): string {
  return m.stage === "league" ? `j${m.matchday}` : m.stage;
}

/** The round currently in play = round of the earliest not-yet-finished match. */
function currentRound(matches: Match[]): string {
  const next = matches.find((m) => m.status !== "finished");
  const target = next ?? matches[matches.length - 1];
  return target ? roundKey(target) : "";
}

export default function SchedulePage() {
  const { locale, t } = useI18n();
  const { mode } = useTimezone();
  const all = useMemo(() => sortedMatches(), []);

  const [team, setTeam] = useState("");
  // Default to the round being played right now.
  const [round, setRound] = useState(() => currentRound(all));
  const [query, setQuery] = useState("");

  const teamOptions = useMemo(
    () =>
      [...teams].sort((a, b) =>
        teamName(a, locale).localeCompare(teamName(b, locale)),
      ),
    [locale],
  );

  function roundLabel(key: string): string {
    return key[0] === "j"
      ? `${t("common.matchday")} ${key.slice(1)}`
      : t(`stage.${key}`);
  }

  const filtered = useMemo(() => {
    const q = searchKey(query.trim());
    const teamId = team ? Number(team) : null;
    return all.filter((m: Match) => {
      if (round && roundKey(m) !== round) return false;
      if (teamId !== null && m.home !== teamId && m.away !== teamId) return false;
      if (q) {
        const home = teamById(m.home);
        const away = teamById(m.away);
        const haystack = searchKey(
          [home?.en, home?.es, away?.en, away?.es, home?.venue]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [all, round, team, query]);

  const selectClass =
    "rounded-xl border border-line bg-surface px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("schedule.title")}</h1>
        <p className="text-sm text-muted">
          {t("schedule.subtitle")} · 🕒{" "}
          {t(mode === "stadium" ? "common.tzStadium" : "common.tzLocal")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={round}
          onChange={(e) => setRound(e.target.value)}
          aria-label={t("filters.allRounds")}
        >
          <option value="">{t("filters.allRounds")}</option>
          {ROUND_ORDER.map((r) => (
            <option key={r} value={r}>
              {roundLabel(r)}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          aria-label={t("filters.allTeams")}
        >
          <option value="">{t("filters.allTeams")}</option>
          {teamOptions.map((tm) => (
            <option key={tm.id} value={tm.id}>
              {teamName(tm, locale)}
            </option>
          ))}
        </select>

        <input
          className={`${selectClass} flex-1 min-w-[160px]`}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("filters.search")}
        />
      </div>

      <MatchDayList matches={filtered} />
    </div>
  );
}
