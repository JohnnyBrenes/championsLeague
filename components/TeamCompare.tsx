"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { matchesBetween, teamName, teams } from "@/lib/data";
import { teamStanding } from "@/lib/standings";
import type { LeagueRow } from "@/lib/standings";
import { Crest } from "./TeamBadge";
import MatchCard from "./MatchCard";

/** Stats compared, in the order the table shows them. */
const STATS: {
  key: string;
  get: (r: LeagueRow) => number;
  /** false when a LOWER number is better (goals against). */
  higherIsBetter?: boolean;
}[] = [
  { key: "standings.pts", get: (r) => r.points, higherIsBetter: true },
  { key: "standings.p", get: (r) => r.played, higherIsBetter: true },
  { key: "standings.w", get: (r) => r.won, higherIsBetter: true },
  { key: "standings.d", get: (r) => r.drawn, higherIsBetter: true },
  { key: "standings.l", get: (r) => r.lost, higherIsBetter: false },
  { key: "standings.gf", get: (r) => r.gf, higherIsBetter: true },
  { key: "standings.ga", get: (r) => r.ga, higherIsBetter: false },
  { key: "standings.gd", get: (r) => r.gd, higherIsBetter: true },
];

function Side({ row }: { row: LeagueRow }) {
  const { locale, t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Crest team={row.team} size={40} />
      <span className="text-sm font-bold leading-tight">
        {teamName(row.team, locale)}
      </span>
      {/* "#9" rather than an ordinal: "9.º" is Spanish notation and would be
          wrong in the English locale. */}
      <span className="text-[0.68rem] text-muted">
        #{row.position} ·{" "}
        {t(
          `table.${
            row.qualification === "r16"
              ? "direct16"
              : row.qualification === "po"
                ? "playoff"
                : "out"
          }`,
        )}
      </span>
    </div>
  );
}

export default function TeamCompare({ teamId }: { teamId: number }) {
  const { locale, t } = useI18n();
  const [rivalId, setRivalId] = useState<number | null>(null);

  const options = useMemo(
    () =>
      teams
        .filter((x) => x.id !== teamId)
        .sort((a, b) => teamName(a, locale).localeCompare(teamName(b, locale))),
    [teamId, locale],
  );

  const mine = teamStanding(teamId);
  const theirs = rivalId != null ? teamStanding(rivalId) : undefined;
  const headToHead = useMemo(
    () => (rivalId != null ? matchesBetween(teamId, rivalId) : []),
    [teamId, rivalId],
  );

  if (!mine) return null;

  return (
    <div className="space-y-3">
      <select
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm sm:w-auto"
        value={rivalId ?? ""}
        onChange={(e) => setRivalId(e.target.value ? Number(e.target.value) : null)}
        aria-label={t("compare.pick")}
      >
        <option value="">{t("compare.pick")}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {teamName(o, locale)}
          </option>
        ))}
      </select>

      {theirs && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-4 py-4">
            <Side row={mine} />
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {t("common.vs")}
            </span>
            <Side row={theirs} />
          </div>

          <table className="w-full border-collapse text-sm">
            <tbody>
              {STATS.map((s) => {
                const a = s.get(mine);
                const b = s.get(theirs);
                // A draw highlights neither side, so the eye only stops where
                // there is an actual difference.
                const aWins = a === b ? false : s.higherIsBetter ? a > b : a < b;
                const bWins = a !== b && !aWins;
                const cell = "px-4 py-1.5 tabular-nums";
                return (
                  <tr key={s.key} className="border-t border-line">
                    <td
                      className={`${cell} text-right ${aWins ? "font-bold text-gold" : ""}`}
                    >
                      {a > 0 && s.key === "standings.gd" ? `+${a}` : a}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[0.66rem] uppercase tracking-wide text-muted">
                      {t(s.key)}
                    </td>
                    <td
                      className={`${cell} text-left ${bWins ? "font-bold text-gold" : ""}`}
                    >
                      {b > 0 && s.key === "standings.gd" ? `+${b}` : b}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {theirs && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            {t("compare.headToHead")}
          </h4>
          {headToHead.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
              {t("compare.neverMet")}
            </p>
          ) : (
            <div className="space-y-2.5">
              {headToHead.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
