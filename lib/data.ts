import teamsData from "@/data/teams.json";
import scheduleData from "@/data/schedule.json";
import standingsData from "@/data/standings.json";
import scorersData from "@/data/scorers.json";
import type { Locale } from "./i18n";
import type { Match, Scorer, Standing, Team } from "./types";

export const teams: Team[] = teamsData as Team[];
export const matches: Match[] = scheduleData as Match[];
export const standings: Standing[] = standingsData as Standing[];
export const scorers: Scorer[] = scorersData as Scorer[];

const TEAM_BY_ID = new Map(teams.map((t) => [t.id, t]));

export function teamById(id: number | null | undefined): Team | undefined {
  return id == null ? undefined : TEAM_BY_ID.get(id);
}

export function teamName(team: Team, locale: Locale): string {
  return locale === "es" ? team.es : team.en;
}

/** Compact name for narrow cards; falls back to the full name. */
export function teamShortName(team: Team, locale: Locale): string {
  return locale === "es" ? team.es : team.short || team.en;
}

/** Matches sorted chronologically. */
export function sortedMatches(): Match[] {
  return [...matches].sort(
    (a, b) => Date.parse(a.datetime) - Date.parse(b.datetime),
  );
}

export type Translate = (key: string) => string;

/**
 * Text for a knockout slot that has no team yet.
 *
 * Unlike the World Cup — where every slot carried an official label ("1A",
 * "W73") from the day the draw was published — the Champions League bracket
 * only exists once each round is drawn, so most of the time there is simply
 * nothing to name. We still understand a "W-<tieId>" label so a future round
 * can be shown as "Ganador de …" when we do know the wiring.
 */
export function slotLabelText(
  label: string | undefined,
  t: Translate,
): string {
  if (!label) return t("common.tbd");
  const winner = label.match(/^W-(.+)$/);
  if (winner) return `${t("label.winner")} ${winner[1]}`;
  return label;
}
