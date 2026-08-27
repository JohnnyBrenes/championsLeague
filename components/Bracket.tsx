"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { teamById, teamName } from "@/lib/data";
import { bracketRounds, championId, tieFeeders } from "@/lib/bracket";
import type { Tie } from "@/lib/types";
import { Crest } from "./TeamBadge";

function SideRow({
  teamId,
  goals,
  pens,
  isWinner,
}: {
  teamId: number | null;
  /** Aggregate goals for this side, or the match score in the final. */
  goals: number | null;
  /** Shootout goals, when the tie was settled on penalties. */
  pens: number | null;
  isWinner: boolean;
}) {
  const { locale, t } = useI18n();
  const team = teamById(teamId);

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${
        isWinner ? "bg-highlight font-bold text-gold" : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Crest team={team} size={18} />
        <span
          className={
            team ? "truncate" : "text-[0.72rem] italic leading-tight text-muted"
          }
        >
          {team ? teamName(team, locale) : t("common.tbd")}
        </span>
      </span>
      <span className="tabular-nums text-muted">
        {goals ?? ""}
        {pens != null && (
          <span className="ml-1 text-[0.72rem] font-bold text-gold">
            ({pens})
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * One knockout tie.
 *
 * The prominent number is the AGGREGATE, because that is what decides who goes
 * through — the individual legs are shown small underneath. A tie can be won
 * by a club that lost the second leg, so leading with a single match score
 * would actively mislead.
 */
function TieCard({ tie }: { tie: Tie }) {
  const { t } = useI18n();
  const twoLegs = tie.legs.length > 1;
  const decider = tie.legs[tie.legs.length - 1];
  const pens = decider.penalties;

  // Penalties are recorded on the deciding leg, whose home side may be the
  // tie's away side; re-orient them like the aggregate.
  const reversed = decider.home !== tie.home;
  const homePens = pens ? (reversed ? pens.away : pens.home) : null;
  const awayPens = pens ? (reversed ? pens.home : pens.away) : null;

  const homeGoals = tie.aggregate ? tie.aggregate.home : null;
  const awayGoals = tie.aggregate ? tie.aggregate.away : null;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {twoLegs && (
        <div className="bg-highlight/70 px-3 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
          {tie.pending ? t("bracket.inProgress") : t("common.aggregate")}
        </div>
      )}
      <SideRow
        teamId={tie.home}
        goals={homeGoals}
        pens={homePens}
        isWinner={tie.winner != null && tie.winner === tie.home}
      />
      <div className="border-t border-line" />
      <SideRow
        teamId={tie.away}
        goals={awayGoals}
        pens={awayPens}
        isWinner={tie.winner != null && tie.winner === tie.away}
      />
      {twoLegs && (
        <div className="border-t border-line px-3 py-1 text-[0.62rem] text-muted">
          {tie.legs.map((leg, i) => {
            const played = leg.score.home !== null;
            // Each leg is printed from the tie's point of view, not the
            // match's, so the two lines read down the same column.
            const flip = leg.home !== tie.home;
            const h = flip ? leg.score.away : leg.score.home;
            const a = flip ? leg.score.home : leg.score.away;
            return (
              <span key={leg.id} className={i > 0 ? "ml-2" : ""}>
                {t(`leg.${i === 0 ? "firstShort" : "secondShort"}`)}{" "}
                {played ? `${h}–${a}` : "·"}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Connector {
  /** Cubic-bezier path data, in container pixel coordinates. */
  d: string;
  /** The feeding tie is already decided → emphasize the live path. */
  highlight: boolean;
}

export default function Bracket() {
  const { locale, t } = useI18n();
  const rounds = bracketRounds();
  const champion = teamById(championId());

  // Connectors link each tie to the earlier ties that feed it. We measure the
  // rendered card positions and draw curves in an SVG overlay, so the wiring
  // stays correct whatever the responsive layout does.
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Re-measure whenever a result or the locale could shift card geometry.
  const signature =
    rounds
      .flatMap((r) => r.ties.map((tie) => `${tie.id}:${tie.winner ?? ""}`))
      .join("|") + `|${locale}`;

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const c = container.getBoundingClientRect();

    const feeders = tieFeeders();
    const decided = new Set(
      bracketRounds()
        .flatMap((r) => r.ties)
        .filter((tie) => tie.winner != null)
        .map((tie) => tie.id),
    );

    const next: Connector[] = [];
    for (const [toId, fromIds] of feeders) {
      const toEl = cardRefs.current.get(toId);
      if (!toEl) continue;
      const g = toEl.getBoundingClientRect();
      for (const fromId of fromIds) {
        const fromEl = cardRefs.current.get(fromId);
        if (!fromEl) continue;
        const f = fromEl.getBoundingClientRect();
        // Right-middle of the feeder → left-middle of the successor.
        const sx = f.right - c.left;
        const sy = f.top - c.top + f.height / 2;
        const ex = g.left - c.left;
        const ey = g.top - c.top + g.height / 2;
        const mx = (sx + ex) / 2; // horizontal-tangent control points → smooth S
        next.push({
          d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`,
          highlight: decided.has(fromId),
        });
      }
    }
    setSize({ w: container.offsetWidth, h: container.offsetHeight });
    setConnectors(next);
  }, []);

  useEffect(() => {
    measure();
  }, [measure, signature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  if (rounds.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
        {t("bracket.notDrawn")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-4">
        <div ref={containerRef} className="relative flex w-max gap-6">
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0"
            width={size.w}
            height={size.h}
            aria-hidden
          >
            {connectors.map((conn, i) => (
              <path
                key={i}
                d={conn.d}
                fill="none"
                stroke={
                  conn.highlight ? "var(--color-gold)" : "var(--color-muted)"
                }
                strokeOpacity={conn.highlight ? 0.9 : 0.28}
                strokeWidth={conn.highlight ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            ))}
          </svg>
          {rounds.map((round) => (
            <div
              key={round.stage}
              className="relative z-10 flex min-w-[200px] flex-col"
            >
              <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted">
                {t(`stage.${round.stage}`)}
              </h3>
              {/* Cards distribute in the space below the title — keeping the
                  title out of the flow centers each tie on its two feeders. */}
              <div className="flex flex-1 flex-col justify-around gap-3">
                {round.ties.map((tie) => (
                  <div
                    key={tie.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(tie.id, el);
                      else cardRefs.current.delete(tie.id);
                    }}
                  >
                    <TieCard tie={tie} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-[220px] max-w-xs">
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          🏆 {t("bracket.champion")}
        </h3>
        <div className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-4 text-center font-extrabold text-amber-900">
          {champion ? (
            <>
              <Crest team={champion} size={28} />
              <span>{teamName(champion, locale)}</span>
            </>
          ) : (
            <span className="italic opacity-80">{t("common.tbd")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
