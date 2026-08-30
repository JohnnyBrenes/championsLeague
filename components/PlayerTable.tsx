"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { teamById, teamName } from "@/lib/data";
import type { Scorer } from "@/lib/types";
import { Crest } from "./TeamBadge";

const INITIAL = 10;

/** Medal colour for the top three; everyone else gets the neutral badge. */
function rankBadge(i: number): string {
  if (i === 0) return "bg-gold text-amber-900";
  if (i === 1) return "bg-zinc-300 text-zinc-800";
  if (i === 2) return "bg-amber-700 text-amber-50";
  return "bg-line text-muted";
}

export default function PlayerTable({
  title,
  note,
  rows,
  metric,
  metricLabel,
}: {
  title: string;
  /** Scope caveat shown under the heading, when the data needs one. */
  note?: string;
  rows: Scorer[];
  metric: (s: Scorer) => number | null;
  metricLabel: string;
}) {
  const { locale, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, INITIAL);
  const hidden = rows.length - INITIAL;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {/* A caveat about the source's coverage only means something next to
            actual rows; over an empty table it is noise. */}
        {note && rows.length > 0 && (
          <p className="text-[0.7rem] text-muted">{note}</p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
          {t("players.empty")}
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[0.66rem] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-2 py-2 text-left font-semibold">
                    {t("players.player")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {metricLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s, i) => {
                  const team = teamById(s.team);
                  const value = metric(s);
                  return (
                    <tr key={`${s.name}-${i}`} className="border-t border-line">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${rankBadge(i)}`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex items-center gap-1.5">
                          <Crest team={team} size={18} />
                          <span className="font-semibold">{s.name}</span>
                          {team && (
                            <span className="text-xs text-muted">
                              {teamName(team, locale)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-lg font-extrabold tabular-nums">
                        {/* A dash, not a zero: the feed reports assists as null
                            for a third of the players, and null means "not
                            recorded", which is not the same as none. */}
                        {value ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-accent-soft transition hover:border-accent"
            >
              {expanded
                ? t("players.showLess")
                : `${t("players.showMore")} (${hidden})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
