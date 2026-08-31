import type { Match } from "./types";

/**
 * Which fixtures get flagged as the ones to watch.
 *
 * This is **editorial and subjective**, and there is no way around that: the
 * free feed carries no audience, coefficient or reputation figure, so "the
 * matches most of the world tunes in for" cannot be derived from the data. It
 * is a hand-kept list, and it is meant to be edited — one number per club, in
 * one place, is the whole knob.
 *
 * The scale is global following, not current form: a club that is having a bad
 * decade still fills stadiums and TV slots. Clubs absent from this season are
 * kept on purpose so the list survives next year's draw without an edit.
 *
 *   3 — the clubs a neutral anywhere in the world will stop to watch
 *   2 — continental heavyweights with a very large following
 *   0 — everyone else; nothing pejorative, just not a draw for neutrals
 */
const APPEAL: Record<number, 2 | 3> = {
  86: 3, // Real Madrid
  81: 3, // Barcelona
  5: 3, // Bayern Munich
  66: 3, // Manchester United
  64: 3, // Liverpool
  65: 3, // Manchester City
  524: 3, // Paris Saint-Germain
  109: 3, // Juventus
  98: 3, // Milan
  108: 3, // Inter
  57: 3, // Arsenal
  61: 3, // Chelsea

  4: 2, // Borussia Dortmund
  78: 2, // Atlético de Madrid
  113: 2, // Napoli
  100: 2, // Roma
  678: 2, // Ajax
  1903: 2, // Benfica
  503: 2, // Porto
  498: 2, // Sporting CP
  73: 2, // Tottenham
  516: 2, // Olympique de Marseille
  610: 2, // Galatasaray
  613: 2, // Fenerbahçe
  732: 2, // Celtic
};

/**
 * A fixture qualifies when the two sides add up to 5, i.e. a 3 against a 2 or
 * better. Tuned against the real 2026/27 league phase: 26 of 144 matches, about
 * three per matchday. Lower it and the badge is on a fifth of the calendar and
 * stops meaning anything; raise it to 6 and only eight matches all season keep
 * it.
 */
const THRESHOLD = 5;

function appeal(teamId: number | null): number {
  return teamId === null ? 0 : (APPEAL[teamId] ?? 0);
}

/**
 * From the quarter-finals on, the round carries the match: an elimination tie
 * that late is an event whoever reached it. Before that, the two clubs decide.
 */
export function isMarquee(match: Match): boolean {
  if (match.stage === "qf" || match.stage === "sf" || match.stage === "final") {
    return true;
  }
  return appeal(match.home) + appeal(match.away) >= THRESHOLD;
}
