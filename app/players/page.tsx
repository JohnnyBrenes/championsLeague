"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { scorers } from "@/lib/data";
import PlayerTable from "@/components/PlayerTable";

export default function PlayersPage() {
  const { t } = useI18n();

  // The feed is already ordered by goals; assists need their own ordering and
  // must drop the players the feed has no assist figure for, so an unknown
  // never masquerades as a zero at the bottom of the table.
  const byAssists = useMemo(
    () =>
      scorers
        .filter((s) => s.assists != null && s.assists > 0)
        .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0) || b.goals - a.goals),
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("players.title")}</h1>
        <p className="text-sm text-muted">{t("players.subtitle")}</p>
      </div>

      <PlayerTable
        title={`⚽ ${t("players.topScorers")}`}
        rows={scorers}
        metric={(s) => s.goals}
        metricLabel={t("players.goals")}
      />

      <PlayerTable
        title={`🅰️ ${t("players.topAssists")}`}
        note={t("players.assistsScope")}
        rows={byAssists}
        metric={(s) => s.assists}
        metricLabel={t("players.assists")}
      />

      <p className="text-center text-[0.7rem] text-muted">{t("players.note")}</p>
    </div>
  );
}
