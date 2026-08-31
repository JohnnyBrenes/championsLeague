"use client";

import { useI18n } from "@/lib/i18n";
import { useTimezone } from "@/lib/timezone";
import { formatTime } from "@/lib/time";
import { aggregateFor } from "@/lib/bracket";
import { teamById } from "@/lib/data";
import { isMarquee } from "@/lib/marquee";
import type { Match } from "@/lib/types";
import TeamBadge from "./TeamBadge";

function StageLabel({ match }: { match: Match }) {
  const { t } = useI18n();
  if (match.stage === "league") {
    return <>{`${t("common.matchday")} ${match.matchday ?? ""}`.trim()}</>;
  }
  const leg = match.leg ? ` · ${t(`leg.${match.leg === 1 ? "first" : "second"}`)}` : "";
  return (
    <>
      {t(`stage.${match.stage}`)}
      {leg}
    </>
  );
}

export default function MatchCard({ match }: { match: Match }) {
  const { locale, t } = useI18n();
  const { tz } = useTimezone();
  const { score, status } = match;
  const hasScore = score.home !== null && score.away !== null;
  // On a second leg the running aggregate is the number that actually decides
  // the tie, so it deserves a line of its own.
  const aggregate = match.leg === 2 ? aggregateFor(match) : null;
  // The free tier gives no venue per match, so we fall back to the home club's
  // ground — true for every round except the final, which is played at a
  // neutral stadium and therefore carries an explicit venue from the sync.
  const venue =
    match.venue ??
    (match.stage === "final" ? undefined : teamById(match.home)?.venue);
  const marquee = isMarquee(match);

  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-sm ${
        marquee ? "border-gold/45" : "border-line"
      }`}
    >
      <TeamBadge id={match.home} label={match.homeLabel} align="right" />

      <div className="min-w-[96px] text-center">
        {status === "live" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/20 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-live">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
            {t("status.live")}
          </span>
        )}
        {status === "finished" && (
          <span className="rounded-full bg-highlight px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-gold">
            {t("status.ft")}
          </span>
        )}

        {hasScore ? (
          <div className="text-xl font-extrabold">
            {score.home} – {score.away}
          </div>
        ) : (
          <div className="text-lg font-bold text-ink">
            {formatTime(match.datetime, locale, tz)}
          </div>
        )}

        {match.penalties && (
          <div className="text-[0.72rem] font-semibold text-muted">
            {match.penalties.home} – {match.penalties.away} {t("label.pens")}
          </div>
        )}

        {aggregate && (
          <div className="mt-0.5 text-[0.72rem] font-bold text-gold">
            {t("common.aggregate")} {aggregate.home}–{aggregate.away}
          </div>
        )}

        <div className="mt-0.5 text-[0.72rem] text-muted">
          <StageLabel match={match} />
        </div>
      </div>

      <TeamBadge id={match.away} label={match.awayLabel} align="left" />

      {(marquee || venue) && (
        <div className="col-span-3 mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.72rem] text-muted">
          {/* The gold border alone would be decoration; the badge is what
              actually says why this card looks different. */}
          {marquee && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 font-bold uppercase tracking-wide text-gold">
              {t("common.marquee")}
            </span>
          )}
          {venue && <span>{venue}</span>}
        </div>
      )}
    </div>
  );
}
