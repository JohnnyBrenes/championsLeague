"use client";

import { useI18n } from "@/lib/i18n";
import { teamName } from "@/lib/data";
import { CUT_LINES, type LeagueRow } from "@/lib/standings";
import type { Qualification } from "@/lib/types";
import { Crest } from "./TeamBadge";
import { STAR_PATH } from "./StarMark";

/**
 * Qualification zones. Colour alone never carries the meaning — every zone is
 * also named in the legend, and the table draws a heavier rule at the cuts.
 */
const ZONE: Record<Qualification, { bar: string; badge: string; key: string }> = {
  r16: { bar: "bg-gold", badge: "bg-gold text-amber-900", key: "table.direct16" },
  po: { bar: "bg-accent", badge: "bg-accent text-white", key: "table.playoff" },
  out: { bar: "bg-line", badge: "bg-line text-muted", key: "table.out" },
};

export function TableLegend() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted">
      {(Object.keys(ZONE) as Qualification[]).map((q) => (
        <span key={q} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-full ${ZONE[q].bar}`} />
          {t(ZONE[q].key)}
        </span>
      ))}
    </div>
  );
}

export default function LeagueTable({
  rows,
  highlight,
  favorite,
}: {
  rows: LeagueRow[];
  /** Team id to emphasise, when the table is shown inside a club's page. */
  highlight?: number;
  /**
   * The visitor's own club. Emphasised like `highlight`, and additionally
   * starred — on a club's page the emphasised row is simply the club being
   * read, which is not the same thing and must not claim to be.
   */
  favorite?: number;
}) {
  const { locale, t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[0.66rem] uppercase tracking-wide text-muted">
            <th className="px-2 py-2 text-right font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">
              {t("standings.team")}
            </th>
            <th className="px-2 py-2 font-semibold">{t("standings.p")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.w")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.d")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.l")}</th>
            <th className="hidden px-2 py-2 font-semibold sm:table-cell">
              {t("standings.gf")}
            </th>
            <th className="hidden px-2 py-2 font-semibold sm:table-cell">
              {t("standings.ga")}
            </th>
            <th className="px-2 py-2 font-semibold">{t("standings.gd")}</th>
            <th className="px-2 py-2 font-semibold">{t("standings.pts")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const zone = ZONE[r.qualification];
            // A heavier rule marks where qualification changes (after 8th and
            // 24th), so the three zones read as blocks and not as 36 stripes.
            const cut = CUT_LINES.includes(
              r.position as (typeof CUT_LINES)[number],
            );
            return (
              <tr
                key={r.teamId}
                className={`border-t ${
                  cut ? "border-b-2 border-b-muted/40" : ""
                } border-line ${
                  r.teamId === highlight || r.teamId === favorite
                    ? "bg-highlight font-semibold"
                    : ""
                }`}
              >
                <td className="py-2 pr-1 text-right">
                  <span className="flex items-center justify-end gap-1.5">
                    <span
                      className={`inline-block h-4 w-1 rounded-full ${zone.bar}`}
                      aria-hidden
                    />
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${zone.badge}`}
                      title={t(zone.key)}
                    >
                      {r.position}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2 text-left">
                  <span className="flex items-center gap-2">
                    <Crest team={r.team} size={20} />
                    <span className="truncate">{teamName(r.team, locale)}</span>
                    {r.teamId === favorite && (
                      <span
                        className="shrink-0 text-gold"
                        title={t("favorite.badge")}
                      >
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
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-muted">{r.played}</td>
                <td className="px-2 py-2 text-center">{r.won}</td>
                <td className="px-2 py-2 text-center">{r.drawn}</td>
                <td className="px-2 py-2 text-center">{r.lost}</td>
                <td className="hidden px-2 py-2 text-center text-muted sm:table-cell">
                  {r.gf}
                </td>
                <td className="hidden px-2 py-2 text-center text-muted sm:table-cell">
                  {r.ga}
                </td>
                <td className="px-2 py-2 text-center">
                  {r.gd > 0 ? `+${r.gd}` : r.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
