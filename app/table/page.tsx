"use client";

import { useI18n } from "@/lib/i18n";
import { leagueTable } from "@/lib/standings";
import { useFavorite } from "@/lib/favorite";
import LeagueTable, { TableLegend } from "@/components/LeagueTable";

export default function TablePage() {
  const { t } = useI18n();
  const { favorite } = useFavorite();
  const rows = leagueTable();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("table.title")}</h1>
        <p className="text-sm text-muted">{t("table.subtitle")}</p>
        <div className="mt-2">
          <TableLegend />
        </div>
      </div>

      <LeagueTable rows={rows} favorite={favorite ?? undefined} />

      <p className="text-center text-[0.7rem] text-muted">{t("table.note")}</p>
    </div>
  );
}
