import { matches, teamById, teams } from "./data";
import type { Match, Team } from "./types";

/**
 * Tournament records, derived entirely from the fixtures we already hold.
 *
 * Nothing here needs an extra API call — which matters, because the free tier
 * exposes no match events (no cards, no minute-by-minute, no MVP). Everything
 * below is arithmetic over scores.
 *
 * Scores exclude penalty shootouts throughout: `Match.score` is the on-pitch
 * result, so a shootout never inflates a club's goal tally. Extra time DOES
 * count, because those are real goals.
 */

function isPlayed(m: Match): boolean {
  return (
    m.status === "finished" && m.score.home !== null && m.score.away !== null
  );
}

const played = (): Match[] => matches.filter(isPlayed);

export interface Totals {
  matches: number;
  goals: number;
  /** Average goals per match, to one decimal. */
  average: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  extraTime: number;
  shootouts: number;
  /** Matches that ended without a goal. */
  goalless: number;
}

export function totals(): Totals {
  const ms = played();
  let goals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let extraTime = 0;
  let shootouts = 0;
  let goalless = 0;

  for (const m of ms) {
    const h = m.score.home as number;
    const a = m.score.away as number;
    goals += h + a;
    if (h > a) homeWins += 1;
    else if (a > h) awayWins += 1;
    else draws += 1;
    if (m.extraTime) extraTime += 1;
    if (m.penalties) shootouts += 1;
    if (h + a === 0) goalless += 1;
  }

  return {
    matches: ms.length,
    goals,
    average: ms.length ? Math.round((goals / ms.length) * 10) / 10 : 0,
    homeWins,
    draws,
    awayWins,
    extraTime,
    shootouts,
    goalless,
  };
}

export interface TeamRecord {
  team: Team;
  value: number;
  /** Matches the value was accumulated over, so a deep run is visible. */
  played: number;
  /** Raw total behind a per-match value, for context under the figure. */
  total?: number;
  /** Pre-formatted figure, when the raw number would render ragged ("1.2"). */
  display?: string;
}

/** Per-club tallies over every match played, knockouts included. */
interface Tally {
  gf: number;
  ga: number;
  cleanSheets: number;
  played: number;
  wins: number;
}

function tallies(): Map<number, Tally> {
  const map = new Map<number, Tally>();
  for (const t of teams) {
    map.set(t.id, { gf: 0, ga: 0, cleanSheets: 0, played: 0, wins: 0 });
  }
  for (const m of played()) {
    const h = m.score.home as number;
    const a = m.score.away as number;
    for (const [id, scored, conceded] of [
      [m.home, h, a],
      [m.away, a, h],
    ] as const) {
      if (id == null) continue;
      const t = map.get(id);
      if (!t) continue;
      t.played += 1;
      t.gf += scored;
      t.ga += conceded;
      if (conceded === 0) t.cleanSheets += 1;
      if (scored > conceded) t.wins += 1;
    }
  }
  return map;
}

function rank(
  pick: (t: Tally) => number,
  order: "desc" | "asc",
  limit: number,
): TeamRecord[] {
  const rows: TeamRecord[] = [];
  for (const [id, t] of tallies()) {
    const team = teamById(id);
    // A club that never played can't hold a record — it would otherwise top
    // the "fewest goals conceded" list with a perfect zero.
    if (!team || t.played === 0) continue;
    rows.push({ team, value: pick(t), played: t.played });
  }
  rows.sort((a, b) =>
    order === "desc" ? b.value - a.value : a.value - b.value,
  );
  return rows.slice(0, limit);
}

export const mostGoalsFor = (limit = 5) => rank((t) => t.gf, "desc", limit);
export const mostCleanSheets = (limit = 5) =>
  rank((t) => t.cleanSheets, "desc", limit);
export const mostWins = (limit = 5) => rank((t) => t.wins, "desc", limit);

/**
 * Best defence, as goals conceded PER MATCH.
 *
 * Ranking by the raw total would be backwards: a club knocked out in the
 * league phase plays 8 matches and a finalist plays 17, so the "fewest
 * conceded" list would reward going out early. The ratio compares defences
 * regardless of how far each club went.
 */
export function bestDefences(limit = 5): TeamRecord[] {
  const rows: TeamRecord[] = [];
  for (const [id, t] of tallies()) {
    const team = teamById(id);
    if (!team || t.played === 0) continue;
    rows.push({
      team,
      value: t.ga / t.played,
      // Fixed to two decimals so the column lines up: raw numbers would show
      // "0.47" next to "1.2".
      display: (t.ga / t.played).toFixed(2),
      played: t.played,
      total: t.ga,
    });
  }
  rows.sort((a, b) => a.value - b.value);
  return rows.slice(0, limit);
}

/**
 * Longest run of consecutive wins, per club, across the whole competition.
 * A draw or a defeat breaks the run; a two-legged tie counts as the two
 * matches it actually is.
 */
export function longestWinStreaks(limit = 5): TeamRecord[] {
  const byTeam = new Map<number, Match[]>();
  for (const m of played()) {
    for (const id of [m.home, m.away]) {
      if (id == null) continue;
      const list = byTeam.get(id);
      if (list) list.push(m);
      else byTeam.set(id, [m]);
    }
  }

  const rows: TeamRecord[] = [];
  for (const [id, ms] of byTeam) {
    const team = teamById(id);
    if (!team) continue;
    ms.sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
    let best = 0;
    let run = 0;
    for (const m of ms) {
      const scored = (m.home === id ? m.score.home : m.score.away) as number;
      const conceded = (m.home === id ? m.score.away : m.score.home) as number;
      if (scored > conceded) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    rows.push({ team, value: best, played: ms.length });
  }
  rows.sort((a, b) => b.value - a.value);
  return rows.slice(0, limit);
}

/** Matches with the widest winning margin. */
export function biggestWins(limit = 5): Match[] {
  return [...played()]
    .sort(
      (a, b) =>
        Math.abs((b.score.home as number) - (b.score.away as number)) -
        Math.abs((a.score.home as number) - (a.score.away as number)),
    )
    .slice(0, limit);
}

/** Matches with the most goals in total. */
export function highestScoring(limit = 5): Match[] {
  return [...played()]
    .sort(
      (a, b) =>
        (b.score.home as number) +
        (b.score.away as number) -
        ((a.score.home as number) + (a.score.away as number)),
    )
    .slice(0, limit);
}
