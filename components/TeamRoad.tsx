"use client";

import { useI18n } from "@/lib/i18n";
import { teamById, teamName } from "@/lib/data";
import { roadForTeam } from "@/lib/bracket";
import { teamStanding } from "@/lib/standings";
import type { TeamTie } from "@/lib/bracket";
import { Crest } from "./TeamBadge";

const OUTCOME: Record<TeamTie["outcome"], { dot: string; key: string }> = {
  won: { dot: "bg-gold", key: "road.advanced" },
  lost: { dot: "bg-live", key: "road.eliminated" },
  pending: { dot: "bg-muted", key: "road.pending" },
};

/**
 * A club's route through the knockout stage, as a vertical timeline.
 *
 * Reads top-down in the order the rounds are played, with the club's own
 * aggregate first in every score — the point is to follow one club, not to
 * re-read the bracket from its own point of view.
 */
export default function TeamRoad({ teamId }: { teamId: number }) {
  const { locale, t } = useI18n();
  const road = roadForTeam(teamId);
  const standing = teamStanding(teamId);

  // Nothing drawn yet, or the league phase ended the run. Say which, instead of
  // rendering an empty box.
  if (road.length === 0) {
    const message =
      standing?.qualification === "out"
        ? t("road.outInLeague")
        : t("road.notDrawn");
    return (
      <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        {message}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {road.map(({ tie, opponent, aggregate, outcome }) => {
        const rival = teamById(opponent);
        const style = OUTCOME[outcome];
        return (
          <li
            key={tie.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
              title={t(style.key)}
              aria-hidden
            />
            <span className="w-24 shrink-0 text-[0.68rem] font-bold uppercase tracking-wide text-muted">
              {t(`stage.${tie.stage}`)}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Crest team={rival} size={20} />
              <span className="truncate text-sm">
                {rival ? teamName(rival, locale) : t("common.tbd")}
              </span>
            </span>
            <span className="shrink-0 text-right">
              {aggregate ? (
                <span className="font-bold tabular-nums">
                  {aggregate.for}–{aggregate.against}
                </span>
              ) : (
                <span className="text-xs italic text-muted">
                  {t("road.pending")}
                </span>
              )}
              <span className="block text-[0.62rem] text-muted">
                {t(style.key)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
