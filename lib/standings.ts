import { matches, standings, teamById, teams } from "./data";
import { qualificationFor } from "./types";
import type { Match, Qualification, Standing, Team } from "./types";

export interface LeagueRow extends Standing {
  team: Team;
  /** Where this position leads: round of 16, play-off, or out. */
  qualification: Qualification;
}

/** Positions after which the table draws a dividing line. */
export const CUT_LINES = [8, 24] as const;

function blank(team: Team): Standing {
  return {
    position: 0,
    teamId: team.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

function apply(row: Standing, scored: number, conceded: number) {
  row.played += 1;
  row.gf += scored;
  row.ga += conceded;
  row.gd = row.gf - row.ga;
  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}

function isPlayed(m: Match): boolean {
  return (
    (m.status === "finished" || m.status === "live") &&
    m.score.home !== null &&
    m.score.away !== null
  );
}

/**
 * League table computed from the fixtures we hold.
 *
 * Only a fallback. UEFA's later tiebreakers — goals scored away, away wins,
 * disciplinary points and the club coefficient — cannot be derived from this
 * data, so two clubs level on points and goal difference may come out in the
 * wrong order here. Whenever the API's table is available it wins; see
 * `leagueTable()`.
 */
function computedTable(): Standing[] {
  const rows = new Map<number, Standing>();
  for (const team of teams) rows.set(team.id, blank(team));

  for (const m of matches) {
    if (m.stage !== "league" || !isPlayed(m)) continue;
    const home = m.home != null ? rows.get(m.home) : undefined;
    const away = m.away != null ? rows.get(m.away) : undefined;
    if (!home || !away) continue;
    apply(home, m.score.home as number, m.score.away as number);
    apply(away, m.score.away as number, m.score.home as number);
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        (teamById(a.teamId)?.en ?? "").localeCompare(teamById(b.teamId)?.en ?? ""),
    )
    .map((row, i) => ({ ...row, position: i + 1 }));
}

/**
 * The 36-team league phase table.
 *
 * The API's ordering is the source of truth because it applies the full UEFA
 * tiebreaker chain, including the club coefficient we have no access to. We
 * only compute locally when the committed table is missing or incomplete
 * (before the first matchday, or if the standings endpoint failed during a sync
 * while the fixtures still updated).
 */
export function leagueTable(): LeagueRow[] {
  const source = standings.length === teams.length ? standings : computedTable();
  return source
    .map((row) => {
      const team = teamById(row.teamId);
      return team
        ? { ...row, team, qualification: qualificationFor(row.position) }
        : null;
    })
    .filter((r): r is LeagueRow => r !== null)
    .sort((a, b) => a.position - b.position);
}

/** One club's row, or undefined if it is not in the table. */
export function teamStanding(teamId: number): LeagueRow | undefined {
  return leagueTable().find((r) => r.teamId === teamId);
}

/**
 * A window of the table centred on one club — the league-phase equivalent of
 * showing a team its group. Clamped to the table's ends so the window always
 * has `size` rows when there are enough.
 */
export function standingsAround(teamId: number, size = 7): LeagueRow[] {
  const table = leagueTable();
  const i = table.findIndex((r) => r.teamId === teamId);
  if (i === -1) return [];
  const half = Math.floor(size / 2);
  const start = Math.min(Math.max(0, i - half), Math.max(0, table.length - size));
  return table.slice(start, start + size);
}

/** True once every league-phase match has been played. */
export function leaguePhaseComplete(): boolean {
  const league = matches.filter((m) => m.stage === "league");
  return league.length > 0 && league.every((m) => m.status === "finished");
}
