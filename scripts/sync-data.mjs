// Syncs UEFA Champions League data from football-data.org into:
//   data/teams.json      (36 clubs: id, names, crest path, country, venue)
//   data/schedule.json   (189 matches: dates, teams, scores, legs, ties)
//   data/standings.json  (the 36-row league phase table, in the API's order)
//   data/scorers.json    (top scorers)
//   public/crests/*.png  (club crests, downloaded once)
//
// Idempotent: run it any time. Used both for the initial load and for the
// recurring auto-update (the workflow commits only if files actually change).
//
// Token resolution: env FOOTBALL_DATA_TOKEN, else a FOOTBALL_DATA_TOKEN=...
// line in a local .env.local file.
//
// Season: defaults to whatever football-data considers current. Set CL_SEASON
// (e.g. CL_SEASON=2026) to pin a specific one — that is the single switch to
// flip once the 2026/27 season is published; see CHAMPIONS_MIGRATION.md §5.2.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataDir = join(root, "data");
const crestDir = join(root, "public", "crests");

function resolveToken() {
  if (process.env.FOOTBALL_DATA_TOKEN) return process.env.FOOTBALL_DATA_TOKEN.trim();
  const envPath = join(root, ".env.local");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("FOOTBALL_DATA_TOKEN="));
    if (line) return line.split("=").slice(1).join("=").trim();
  }
  return null;
}

const TOKEN = resolveToken();
if (!TOKEN) {
  console.error("Missing FOOTBALL_DATA_TOKEN (env or .env.local).");
  process.exit(1);
}

const API = "https://api.football-data.org/v4";

/** Build a query string, folding in the pinned season when there is one. */
function qs(extra = {}) {
  const p = new URLSearchParams(extra);
  if (process.env.CL_SEASON) p.set("season", process.env.CL_SEASON);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Spanish names for clubs whose English/official name differs. Everything not
// listed falls back to the API's shortName, which is already right for most
// clubs ("Arsenal", "Chelsea", "Ajax"…). Keep this list short and only for
// names that genuinely change in Spanish.
const ES_NAMES = {
  "Bayern Munich": "Bayern Múnich",
  "FC Bayern München": "Bayern Múnich",
  "Inter Milan": "Inter de Milán",
  "FC Internazionale Milano": "Inter de Milán",
  "AC Milan": "Milan",
  "SSC Napoli": "Nápoles",
  "Napoli": "Nápoles",
  "FC Porto": "Oporto",
  "Porto": "Oporto",
  "Sporting CP": "Sporting de Lisboa",
  "Juventus FC": "Juventus",
  "AFC Ajax": "Ajax",
  "Club Atlético de Madrid": "Atlético de Madrid",
  "Atlético Madrid": "Atlético de Madrid",
  "Bayer 04 Leverkusen": "Bayer Leverkusen",
  "Borussia Dortmund": "Borussia Dortmund",
  "Paris Saint-Germain FC": "Paris Saint-Germain",
  "Olympique de Marseille": "Olympique de Marsella",
  "Olympique Marseille": "Olympique de Marsella",
  "Royal Antwerp FC": "Antwerp",
  "Feyenoord Rotterdam": "Feyenoord",
  "PSV": "PSV Eindhoven",
  "Galatasaray SK": "Galatasaray",
  "Beşiktaş JK": "Besiktas",
  "Slavia Praha": "Slavia de Praga",
  "SK Slavia Praha": "Slavia de Praga",
  "Sparta Praha": "Sparta de Praga",
  "Crvena Zvezda": "Estrella Roja",
  "FK Crvena Zvezda": "Estrella Roja",
  "Young Boys": "Young Boys",
  "Athletic Club": "Athletic de Bilbao",
  "Girona FC": "Girona",
  "Villarreal CF": "Villarreal",
  "Real Madrid CF": "Real Madrid",
  "FC Barcelona": "Barcelona",
  "Bodø/Glimt": "Bodø/Glimt",
  "FC København": "Copenhague",
  "FC Copenhagen": "Copenhague",
  "Club Brugge KV": "Brujas",
  "Club Brugge": "Brujas",
  "Union Saint-Gilloise": "Union Saint-Gilloise",
  "Shakhtar Donetsk": "Shajtar Donetsk",
  "Dinamo Zagreb": "Dinamo de Zagreb",
  "GNK Dinamo Zagreb": "Dinamo de Zagreb",
  "Red Bull Salzburg": "RB Salzburgo",
  "RB Leipzig": "RB Leipzig",
  "VfB Stuttgart": "Stuttgart",
  "Eintracht Frankfurt": "Eintracht Fráncfort",
  "Borussia Mönchengladbach": "Borussia Mönchengladbach",
  "Olympiacos FC": "Olympiacos",
  "PAOK": "PAOK",
  "Qarabağ Ağdam FK": "Qarabag",
  "Malmö FF": "Malmö",
};

const STAGE_MAP = {
  LEAGUE_STAGE: "league",
  // football-data still labels the standings block GROUP_STAGE for backwards
  // compatibility; if it ever does the same on matches, map it to the league
  // phase rather than dropping the fixture.
  GROUP_STAGE: "league",
  PLAYOFFS: "po",
  PLAYOFF_ROUND: "po",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  FINAL: "final",
};

function mapStatus(s) {
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  return "scheduled";
}

function mapWinner(w) {
  if (w === "HOME_TEAM") return "home";
  if (w === "AWAY_TEAM") return "away";
  return null;
}

const int = (x) => (Number.isInteger(x) ? x : 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- HTTP -------------------------------------------------------------------

// The free tier allows 10 requests/minute. Serialise every call through one
// chain with a fixed gap so a burst (36 team lookups on the first run) can't
// trip the limit and poison the whole sync.
const MIN_GAP_MS = 6500;
let gate = Promise.resolve();
let lastCall = 0;
function throttle() {
  gate = gate.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
  });
  return gate;
}

/**
 * Bounded retry for a flaky upstream. A single transient blip must NOT cost a
 * whole poll cycle, so we retry in-process instead of waiting for the next
 * scheduled run.
 */
async function fetchJSON(path, { tries = 3, backoffMs = 1500, timeoutMs = 15000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    await throttle();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(API + path, {
          headers: { "X-Auth-Token": TOKEN },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      lastErr = e;
      if (attempt < tries) await sleep(backoffMs * attempt);
    }
  }
  throw lastErr;
}

// Crests live on a plain CDN, not the API, so they are not rate limited and
// don't go through the throttle.
async function downloadCrest(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`empty crest for ${url}`);
  writeFileSync(dest, buf);
  return buf.length;
}

// --- Scores -----------------------------------------------------------------

/**
 * Unpack a football-data score into the on-pitch result plus its parts.
 *
 * `fullTime` is an aggregate that INCLUDES the shootout: the 2026 final reads
 * fullTime 5-4 for a match that actually finished 1-1 with PSG winning 4-3 on
 * penalties. So for a shootout we rebuild the on-pitch score from
 * regularTime + extraTime and derive the shootout as the remainder.
 */
function unpackScore(s) {
  const ft = s?.fullTime ?? {};
  const out = { score: { home: ft.home ?? null, away: ft.away ?? null } };
  if (!s) return out;

  if (s.regularTime && s.regularTime.home != null) {
    out.regularTime = { home: s.regularTime.home, away: s.regularTime.away };
  }
  if (s.extraTime && s.extraTime.home != null) {
    out.extraTime = { home: s.extraTime.home, away: s.extraTime.away };
  }

  if (s.duration === "PENALTY_SHOOTOUT") {
    const home = int(s.regularTime?.home) + int(s.extraTime?.home);
    const away = int(s.regularTime?.away) + int(s.extraTime?.away);
    out.score = { home, away };
    // Prefer the explicit shootout figures; fall back to fullTime minus the
    // on-pitch result, which is how the aggregate is built.
    let pHome = s.penalties?.home ?? int(ft.home) - home;
    let pAway = s.penalties?.away ?? int(ft.away) - away;
    if (pHome !== pAway) out.penalties = { home: pHome, away: pAway };
  }
  return out;
}

// --- Ties -------------------------------------------------------------------

/**
 * Group knockout matches into two-legged ties and stamp `tieId` / `leg`.
 *
 * The API exposes no tie or leg field, but `matchday` is 1 for the first leg
 * and 2 for the second — verified against all 22 ties of 2025/26, where it
 * agreed with the chronological order every time. We still sort by date and
 * use matchday only as a tiebreak, so a missing matchday degrades gracefully.
 *
 * The tie id is built from the stage plus the sorted team ids, which makes it
 * deterministic and stable across syncs (an id derived from fixture order
 * would shift the moment a match is rescheduled).
 */
function assignTies(matches) {
  const groups = new Map();
  for (const m of matches) {
    if (m.stage === "league") continue;
    if (m.stage === "final") {
      m.tieId = "final";
      continue;
    }
    if (m.home == null || m.away == null) continue; // slot not drawn yet
    const pair = [m.home, m.away].sort((a, b) => a - b);
    const key = `${m.stage}-${pair[0]}-${pair[1]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  let odd = 0;
  for (const [tieId, legs] of groups) {
    legs.sort(
      (a, b) =>
        Date.parse(a.datetime) - Date.parse(b.datetime) ||
        (a.matchday ?? 0) - (b.matchday ?? 0),
    );
    if (legs.length !== 2) odd += 1;
    legs.forEach((m, i) => {
      m.tieId = tieId;
      m.leg = i + 1;
    });
  }
  if (odd) {
    console.warn(`⚠ ${odd} tie(s) did not have exactly 2 legs — check the feed.`);
  }
  return groups.size;
}

// --- Teams ------------------------------------------------------------------

/**
 * Build the 36 clubs from /competitions/CL/teams.
 *
 * One call returns everything we need — stadium, country and club colours —
 * for every participant. The obvious-looking alternative, /teams/{id} per club,
 * is worse twice over: it costs 36 rate-limited calls (~4 min) and the free
 * tier answers 403 for clubs whose domestic league is not covered, which is a
 * third of a Champions League field (Slavia, Qarabağ, Kairat, Paphos…).
 */
function buildTeams(apiTeams) {
  return apiTeams
    .map((t) => {
      const en = t.name ?? t.shortName ?? String(t.id);
      const short = t.shortName ?? en;
      return {
        id: t.id,
        tla: t.tla ?? "",
        en,
        es: ES_NAMES[en] ?? ES_NAMES[short] ?? short,
        short,
        crest: "",
        country: t.area?.name ?? "",
        countryCode: t.area?.code ?? "",
        venue: t.venue ?? undefined,
        colors: t.clubColors ?? undefined,
      };
    })
    .sort((a, b) => a.en.localeCompare(b.en));
}

/**
 * Fallback when /competitions/CL/teams is unavailable: the match feed still
 * names both sides, so we can keep the app coherent, topped up with whatever
 * the committed teams.json already knew (venues, colours).
 */
function teamsFromMatches(apiMatches, previous) {
  const prev = new Map(previous.map((t) => [t.id, t]));
  const byId = new Map();
  for (const m of apiMatches) {
    for (const tm of [m.homeTeam, m.awayTeam]) {
      if (!tm?.id || byId.has(tm.id)) continue;
      const en = tm.name ?? tm.shortName ?? String(tm.id);
      const short = tm.shortName ?? en;
      byId.set(tm.id, {
        ...(prev.get(tm.id) ?? {}),
        id: tm.id,
        tla: tm.tla ?? "",
        en,
        es: ES_NAMES[en] ?? ES_NAMES[short] ?? short,
        short,
        crest: prev.get(tm.id)?.crest ?? "",
        country: prev.get(tm.id)?.country ?? "",
        countryCode: prev.get(tm.id)?.countryCode ?? "",
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.en.localeCompare(b.en));
}

async function fetchCrests(teams, crestUrls) {
  mkdirSync(crestDir, { recursive: true });
  let downloaded = 0;
  for (const t of teams) {
    const url = crestUrls.get(t.id);
    if (!url) continue;
    const ext = url.endsWith(".svg") ? "svg" : "png";
    const file = `${t.id}.${ext}`;
    t.crest = `/crests/${file}`;
    const dest = join(crestDir, file);
    if (existsSync(dest)) continue; // crests are static; never re-download
    try {
      const bytes = await downloadCrest(url, dest);
      downloaded += 1;
      console.log(`  crest ${file} (${bytes} B)`);
    } catch (e) {
      console.warn(`  crest failed for ${t.en} (${e.message})`);
      t.crest = ""; // the UI falls back to a monogram
    }
  }
  return downloaded;
}

// --- Match window -----------------------------------------------------------

// When MATCH_WINDOW_ONLY=1, only hit the API if a match is currently in
// progress (kickoff − 15 min … kickoff + 3 h). Lets the workflow poll often
// but stay a no-op outside actual match times.
function withinMatchWindow() {
  const schedulePath = join(dataDir, "schedule.json");
  if (!existsSync(schedulePath)) return true; // nothing to compare against yet
  const existing = JSON.parse(readFileSync(schedulePath, "utf8"));
  const now = Date.now();
  const PRE = 15 * 60 * 1000;
  const POST = 180 * 60 * 1000;
  return existing.some((m) => {
    const k = Date.parse(m.datetime);
    return now >= k - PRE && now <= k + POST;
  });
}

function readJSON(name, fallback) {
  const p = join(dataDir, name);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(name, value) {
  writeFileSync(join(dataDir, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

// --- Main -------------------------------------------------------------------

async function main() {
  if (process.env.MATCH_WINDOW_ONLY === "1" && !withinMatchWindow()) {
    console.log("Outside match window — skipping API call.");
    return;
  }

  const apiMatches = (await fetchJSON(`/competitions/CL/matches${qs()}`)).matches ?? [];
  if (apiMatches.length === 0) throw new Error("empty match list");

  // --- clubs ---
  // Prefer the competition-wide team list (one call, complete data); fall back
  // to what the match feed names so a hiccup here can't sink the whole sync.
  let teams;
  const crestUrls = new Map();
  try {
    const apiTeams = (await fetchJSON(`/competitions/CL/teams${qs()}`)).teams ?? [];
    if (apiTeams.length === 0) throw new Error("empty team list");
    teams = buildTeams(apiTeams);
    for (const t of apiTeams) if (t.crest) crestUrls.set(t.id, t.crest);
  } catch (e) {
    console.warn(`/competitions/CL/teams unavailable (${e.message}); deriving clubs from the fixtures.`);
    teams = teamsFromMatches(apiMatches, readJSON("teams.json", []));
  }
  for (const m of apiMatches) {
    for (const tm of [m.homeTeam, m.awayTeam]) {
      if (tm?.id && tm.crest && !crestUrls.has(tm.id)) crestUrls.set(tm.id, tm.crest);
    }
  }

  const newCrests = await fetchCrests(teams, crestUrls);
  const noVenue = teams.filter((t) => !t.venue).length;
  if (noVenue) console.warn(`⚠ ${noVenue} club(s) without a stadium in the feed.`);

  // --- matches ---
  const matches = apiMatches
    .map((m) => {
      const stage = STAGE_MAP[m.stage];
      if (!stage) {
        console.warn(`⚠ unknown stage "${m.stage}" on match ${m.id} — treated as league.`);
      }
      const { score, regularTime, extraTime, penalties } = unpackScore(m.score);
      const match = {
        id: `CL-${m.id}`,
        apiId: m.id,
        stage: stage ?? "league",
        datetime: m.utcDate,
        home: m.homeTeam?.id ?? null,
        away: m.awayTeam?.id ?? null,
        score,
        winner: mapWinner(m.score?.winner),
        status: mapStatus(m.status),
      };
      if (m.matchday != null) match.matchday = m.matchday;
      if (regularTime) match.regularTime = regularTime;
      if (extraTime) match.extraTime = extraTime;
      if (penalties) {
        match.penalties = penalties;
        // The API sometimes leaves `winner` null on a shootout; the penalties
        // are unambiguous, so use them rather than showing an undecided tie.
        if (!match.winner) {
          match.winner = penalties.home > penalties.away ? "home" : "away";
        }
      }
      return match;
    })
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

  const tieCount = assignTies(matches);

  // --- league table ---
  // Taken straight from the API: the later UEFA tiebreakers (away goals, away
  // wins, disciplinary points, club coefficient) cannot be computed from the
  // data we hold, so the API's order is the source of truth.
  let standings = readJSON("standings.json", []);
  try {
    const raw = await fetchJSON(`/competitions/CL/standings${qs()}`);
    const table = raw.standings?.find((s) => s.type === "TOTAL")?.table ?? [];
    if (table.length) {
      standings = table.map((r) => ({
        position: r.position,
        teamId: r.team.id,
        played: r.playedGames,
        won: r.won,
        drawn: r.draw,
        lost: r.lost,
        gf: r.goalsFor,
        ga: r.goalsAgainst,
        gd: r.goalDifference,
        points: r.points,
      }));
    }
  } catch (e) {
    console.warn(`standings unavailable (${e.message}); keeping committed table.`);
  }

  // --- scorers ---
  let scorers = readJSON("scorers.json", []);
  try {
    const raw = await fetchJSON(`/competitions/CL/scorers${qs({ limit: 30 })}`);
    const list = (raw.scorers ?? []).map((s) => ({
      name: s.player?.name ?? "—",
      goals: s.goals ?? 0,
      assists: s.assists ?? null,
      team: s.team?.id ?? null,
    }));
    // Never replace a good list with an empty one.
    if (list.length) scorers = list;
  } catch (e) {
    console.warn(`scorers unavailable (${e.message}); keeping committed list.`);
  }

  writeJSON("teams.json", teams);
  writeJSON("schedule.json", matches);
  writeJSON("standings.json", standings);
  writeJSON("scorers.json", scorers);

  const byStage = matches.reduce((acc, m) => {
    acc[m.stage] = (acc[m.stage] || 0) + 1;
    return acc;
  }, {});
  console.log(`\nSynced ${teams.length} clubs, ${matches.length} matches, ${tieCount} ties.`);
  console.log("By stage:", byStage);
  console.log(`Standings rows: ${standings.length} · scorers: ${scorers.length} · new crests: ${newCrests}`);
  console.log(`Finished matches: ${matches.filter((m) => m.status === "finished").length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
