"use client";

import { useI18n } from "@/lib/i18n";
import { teamName } from "@/lib/data";
import {
  biggestWins,
  bestDefences,
  highestScoring,
  longestWinStreaks,
  mostCleanSheets,
  mostGoalsFor,
  mostWins,
  totals,
  type TeamRecord,
} from "@/lib/records";
import { Crest } from "@/components/TeamBadge";
import MatchCard from "@/components/MatchCard";

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="text-2xl font-extrabold tabular-nums text-gold">
        {value}
      </div>
      <div className="text-[0.68rem] leading-tight text-muted">{label}</div>
    </div>
  );
}

/** A small leaderboard: three or five clubs against one number. */
function Board({
  title,
  rows,
  suffix,
}: {
  title: string;
  rows: TeamRecord[];
  /** Extra context under the value, e.g. "en 12 partidos". */
  suffix?: (r: TeamRecord) => string;
}) {
  const { locale } = useI18n();
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <ol>
        {rows.map((r, i) => (
          <li
            key={r.team.id}
            className={`flex items-center gap-2.5 px-4 py-2 text-sm ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="w-4 shrink-0 text-right text-[0.68rem] font-bold text-muted">
              {i + 1}
            </span>
            <Crest team={r.team} size={20} />
            <span className="min-w-0 flex-1 truncate">
              {teamName(r.team, locale)}
            </span>
            <span className="shrink-0 text-right">
              <span className="font-bold tabular-nums">{r.display ?? r.value}</span>
              {suffix && (
                <span className="block text-[0.6rem] leading-tight text-muted">
                  {suffix(r)}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RecordsPage() {
  const { t } = useI18n();
  const g = totals();
  const inMatches = (r: TeamRecord) => `${r.played} ${t("records.inMatches")}`;

  if (g.matches === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{t("records.title")}</h1>
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
          {t("records.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("records.title")}</h1>
        <p className="text-sm text-muted">{t("records.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        <Tile value={g.matches} label={t("records.matches")} />
        <Tile value={g.goals} label={t("records.goals")} />
        <Tile value={g.average} label={t("records.average")} />
        <Tile
          value={`${Math.round((g.homeWins / g.matches) * 100)}%`}
          label={t("records.homeWins")}
        />
        <Tile
          value={`${Math.round((g.draws / g.matches) * 100)}%`}
          label={t("records.draws")}
        />
        <Tile value={g.goalless} label={t("records.goalless")} />
        <Tile value={g.extraTime} label={t("records.extraTime")} />
        <Tile value={g.shootouts} label={t("records.shootouts")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Board
          title={t("records.mostGoals")}
          rows={mostGoalsFor()}
          suffix={inMatches}
        />
        <Board
          title={t("records.bestDefence")}
          rows={bestDefences()}
          suffix={(r) =>
            `${r.total} ${t("records.inN")} ${r.played} ${t("records.inMatches")}`
          }
        />
        <Board
          title={t("records.cleanSheets")}
          rows={mostCleanSheets()}
          suffix={inMatches}
        />
        <Board
          title={t("records.mostWins")}
          rows={mostWins()}
          suffix={inMatches}
        />
        <Board title={t("records.winStreak")} rows={longestWinStreaks()} />
      </div>

      <p className="text-[0.7rem] text-muted">{t("records.note")}</p>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          {t("records.biggestWins")}
        </h2>
        <div className="space-y-2.5">
          {biggestWins(3).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          {t("records.highestScoring")}
        </h2>
        <div className="space-y-2.5">
          {highestScoring(3).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
