// Core data model for the UEFA Champions League app.
//
// Shaped after what football-data.org actually returns (verified 2026-08-27,
// see CHAMPIONS_MIGRATION.md §5.2), not after the competition regulations —
// where the two differ, the API wins, because the sync has to round-trip.

/**
 * Competition phases. The league phase replaced the group stage in 2024/25:
 * one 36-team table, 8 matches each. 1st–8th go straight to the round of 16,
 * 9th–24th play a two-legged play-off, 25th–36th are out.
 */
export type Stage = "league" | "po" | "r16" | "qf" | "sf" | "final";

/** Every stage except the league phase is a knockout tie. */
export type KnockoutStage = Exclude<Stage, "league">;

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Team {
  /**
   * football-data numeric id. The stable key everywhere — `tla` is display-only
   * because the API can leave it null and clubs from different countries can
   * collide on the same three letters.
   */
  id: number;
  /** Three-letter code for compact UI, e.g. "RMA". May be empty. */
  tla: string;
  /** Official name from the API, e.g. "Real Madrid CF". */
  en: string;
  /** Spanish name — curated where it differs, e.g. "Bayern Múnich". */
  es: string;
  /** Short form for narrow cards, e.g. "Real Madrid". */
  short: string;
  /** Local path to the downloaded crest, e.g. "/crests/86.png". */
  crest: string;
  /** Country name, e.g. "Spain". */
  country: string;
  /** Three-letter area code from the API, e.g. "ESP". */
  countryCode: string;
  /** Home stadium. Only available via /teams/{id}, never on a match. */
  venue?: string;
  /** Club colours as free text, e.g. "White / Purple". Used for fallbacks. */
  colors?: string;
}

export interface MatchScore {
  home: number | null;
  away: number | null;
}

export interface Match {
  /** Stable id, e.g. "CL-551981". */
  id: string;
  /** football-data numeric match id. */
  apiId: number;
  stage: Stage;
  /**
   * League phase: matchday 1–8. Knockout ties: 1 = first leg, 2 = second leg
   * (verified against all 22 ties of 2025/26 — it always matches the
   * chronological order). Absent on the final, which is a single match.
   */
  matchday?: number;
  /** 1 = first leg, 2 = second leg. Absent in the league phase and the final. */
  leg?: 1 | 2;
  /**
   * Id shared by both legs of the same tie, e.g. "r16-64-86". Derived from the
   * stage plus the sorted team ids, so it is stable across syncs and does not
   * depend on fixture order.
   */
  tieId?: string;
  /** ISO 8601 timestamp (UTC). Formatted for display in lib/time.ts. */
  datetime: string;
  /** Team ids, or null while a knockout slot is undecided. */
  home: number | null;
  away: number | null;
  /** Label for an undecided slot, e.g. "9.º" or "W-PO1". */
  homeLabel?: string;
  awayLabel?: string;
  /**
   * The on-pitch result: 90 minutes plus extra time, EXCLUDING any shootout.
   * football-data's `fullTime` folds the shootout in (the 2026 final reads
   * 5-4 for a match that finished 1-1), so the sync unpacks it.
   */
  score: MatchScore;
  /** Score after 90 minutes, when the tie went beyond it. */
  regularTime?: MatchScore;
  /** Goals scored in extra time only. */
  extraTime?: MatchScore;
  /** Shootout result, present only when the match was decided on penalties. */
  penalties?: { home: number; away: number };
  /**
   * Winner of THIS match. Not the winner of the tie — over two legs the
   * aggregate decides, and it can contradict both individual results.
   */
  winner?: "home" | "away" | null;
  status: MatchStatus;
}

/**
 * A knockout tie: one match for the final, two legs for every other round.
 * Derived in lib/bracket.ts, never stored.
 */
export interface Tie {
  id: string;
  stage: KnockoutStage;
  legs: Match[];
  /** Team ids as they line up in the tie (the first leg's home side first). */
  home: number | null;
  away: number | null;
  /** Combined score over both legs, once at least one leg has been played. */
  aggregate?: MatchScore;
  /** Team id of the side that advanced, or null while undecided. */
  winner: number | null;
  /** True while at least one leg is still to be played. */
  pending: boolean;
}

/** One row of the 36-team league phase table, as ordered by the API. */
export interface Standing {
  position: number;
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface Scorer {
  /** Player display name. */
  name: string;
  goals: number;
  assists: number | null;
  /** Team id, or null if unmapped. */
  team: number | null;
}

/** Where a league-phase position leads. */
export type Qualification = "r16" | "po" | "out";

/** 1st–8th qualify directly, 9th–24th to the play-off, 25th–36th are out. */
export function qualificationFor(position: number): Qualification {
  if (position <= 8) return "r16";
  if (position <= 24) return "po";
  return "out";
}
