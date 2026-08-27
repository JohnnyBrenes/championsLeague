import { matches } from "./data";
import type { KnockoutStage, Match, Tie } from "./types";

/** Knockout rounds in the order they are played. */
export const KNOCKOUT_ORDER: KnockoutStage[] = ["po", "r16", "qf", "sf", "final"];

export interface BracketRound {
  stage: KnockoutStage;
  ties: Tie[];
}

function isFinished(m: Match): boolean {
  return (
    m.status === "finished" && m.score.home !== null && m.score.away !== null
  );
}

/** Winner side of a single match, covering extra time and penalties. */
function matchWinner(m: Match): "home" | "away" | null {
  if (!isFinished(m)) return null;
  if (m.winner === "home" || m.winner === "away") return m.winner;
  const h = m.score.home as number;
  const a = m.score.away as number;
  if (h > a) return "home";
  if (a > h) return "away";
  if (m.penalties) {
    if (m.penalties.home > m.penalties.away) return "home";
    if (m.penalties.away > m.penalties.home) return "away";
  }
  return null;
}

/**
 * Build one tie from its legs.
 *
 * Everything is expressed from the point of view of the FIRST leg's home side,
 * so `aggregate.home` always belongs to `tie.home`. That matters because the
 * second leg is played the other way round: its `score.home` counts towards the
 * tie's away side.
 *
 * `score` already includes extra time (the sync strips only the shootout), so
 * summing the two legs gives the aggregate UEFA uses. There is no away-goals
 * rule — it was abolished in 2021 — so a level aggregate is settled by the
 * shootout in the second leg.
 */
function buildTie(id: string, stage: KnockoutStage, legs: Match[]): Tie {
  const ordered = [...legs].sort(
    (a, b) =>
      Date.parse(a.datetime) - Date.parse(b.datetime) ||
      (a.leg ?? 0) - (b.leg ?? 0),
  );
  const first = ordered[0];
  const home = first.home;
  const away = first.away;

  const played = ordered.filter(isFinished);
  const pending = played.length < ordered.length;

  let aggregate: { home: number; away: number } | undefined;
  if (played.length > 0) {
    let h = 0;
    let a = 0;
    for (const m of played) {
      // A leg is "reversed" when the tie's home side is playing away in it.
      const reversed = m.home !== home;
      h += (reversed ? m.score.away : m.score.home) as number;
      a += (reversed ? m.score.home : m.score.away) as number;
    }
    aggregate = { home: h, away: a };
  }

  let winner: number | null = null;
  if (!pending && aggregate) {
    if (aggregate.home > aggregate.away) winner = home;
    else if (aggregate.away > aggregate.home) winner = away;
    else {
      // Level on aggregate: the decider is the shootout in the last leg.
      const last = ordered[ordered.length - 1];
      const side = matchWinner(last);
      if (side) winner = side === "home" ? last.home : last.away;
    }
  }

  return { id, stage, legs: ordered, home, away, aggregate, winner, pending };
}

/**
 * Every knockout tie, grouped by round.
 *
 * Ties are keyed by the `tieId` the sync stamps on both legs. Matches whose
 * teams are not drawn yet carry no `tieId` and are skipped — before a draw the
 * round simply has nothing to show.
 */
let roundsMemo: BracketRound[] | null = null;
let feedersMemo: Map<string, string[]> = new Map();
export function bracketRounds(): BracketRound[] {
  if (roundsMemo) return roundsMemo;

  const byTie = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.stage === "league" || !m.tieId) continue;
    const list = byTie.get(m.tieId);
    if (list) list.push(m);
    else byTie.set(m.tieId, [m]);
  }

  const ties = new Map<KnockoutStage, Tie[]>();
  for (const [id, legs] of byTie) {
    const stage = legs[0].stage as KnockoutStage;
    const tie = buildTie(id, stage, legs);
    const bucket = ties.get(stage);
    if (bucket) bucket.push(tie);
    else ties.set(stage, [tie]);
  }

  feedersMemo = computeFeeders(ties);
  const order = treeOrder(ties);
  roundsMemo = KNOCKOUT_ORDER.map((stage) => ({
    stage,
    ties: (ties.get(stage) ?? []).sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        Date.parse(a.legs[0].datetime) - Date.parse(b.legs[0].datetime),
    ),
  })).filter((r) => r.ties.length > 0);

  return roundsMemo;
}

/**
 * Vertical display order for the bracket, so the two ties feeding a successor
 * sit adjacent to it and the connector lines never cross.
 *
 * The World Cup version could read the wiring off official slot labels ("W73").
 * Here there are none, so we recover it from the results themselves: a tie in
 * the next round contains the winners of exactly two ties in this one. That
 * only works for rounds already played — for anything still undrawn we fall
 * back to kickoff order, which is what `bracketRounds` does.
 */
function computeFeeders(ties: Map<KnockoutStage, Tie[]>): Map<string, string[]> {
  const feeders = new Map<string, string[]>();
  for (let i = 1; i < KNOCKOUT_ORDER.length; i++) {
    const prev = ties.get(KNOCKOUT_ORDER[i - 1]) ?? [];
    for (const tie of ties.get(KNOCKOUT_ORDER[i]) ?? []) {
      const sides = [tie.home, tie.away].filter((x): x is number => x != null);
      const found = prev
        .filter((p) => p.winner != null && sides.includes(p.winner))
        .map((p) => p.id);
      if (found.length) feeders.set(tie.id, found);
    }
  }
  return feeders;
}

function treeOrder(ties: Map<KnockoutStage, Tie[]>): Map<string, number> {
  const feeders = computeFeeders(ties);

  const byId = new Map<string, Tie>();
  for (const list of ties.values()) for (const t of list) byId.set(t.id, t);

  const order = new Map<string, number>();
  let seq = 0;
  const visit = (id: string | undefined) => {
    if (!id || order.has(id) || !byId.has(id)) return;
    order.set(id, seq++);
    for (const f of feeders.get(id) ?? []) visit(f);
  };
  for (const t of ties.get("final") ?? []) visit(t.id);
  return order;
}

/** The final, once it exists. */
export function finalTie(): Tie | null {
  return bracketRounds().find((r) => r.stage === "final")?.ties[0] ?? null;
}

/** Champion team id, once the final is decided. */
export function championId(): number | null {
  return finalTie()?.winner ?? null;
}

/** Every tie a club has played or is playing, oldest first. */
export function tiesForTeam(teamId: number): Tie[] {
  return bracketRounds()
    .flatMap((r) => r.ties)
    .filter((t) => t.home === teamId || t.away === teamId);
}

/**
 * Which ties feed each tie, keyed by tie id. Only known for rounds already
 * played — see `treeOrder`. Used to draw the bracket's connector lines.
 */
export function tieFeeders(): Map<string, string[]> {
  bracketRounds(); // ensure the memo is populated
  return feedersMemo;
}

/** Look up a tie by id. */
export function tieById(id: string | undefined): Tie | undefined {
  if (!id) return undefined;
  return bracketRounds()
    .flatMap((r) => r.ties)
    .find((t) => t.id === id);
}

/**
 * Running aggregate of a match's tie, oriented to THAT match's home and away
 * sides rather than the tie's.
 *
 * The second leg is played the other way round, so a tie aggregate of 3-1 in
 * favour of the first-leg host must be shown as 1-3 on the second leg's card.
 * Getting this backwards is the easiest mistake in the whole app, so the flip
 * lives here and nowhere else.
 */
export function aggregateFor(m: Match): { home: number; away: number } | null {
  const tie = tieById(m.tieId);
  if (!tie?.aggregate || tie.legs.length < 2) return null;
  const reversed = m.home !== tie.home;
  return reversed
    ? { home: tie.aggregate.away, away: tie.aggregate.home }
    : tie.aggregate;
}
