"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const { describeXgot } = require("./predictions/xgot.cjs");
const ROOT = path.resolve(__dirname, "..");
const RAW = "data/raw/champions-season-shots/2026-10-20/fotmob/matches";
const OUTPUT = "data/normalized/xgot-history.json";
const AUDIT = "data/analysis/xgot/history-audit.json";
// Team totals are published to two decimals; allow only half a rounding unit.
const TOLERANCE = 0.005001;
const identityInputs = new Map();
const read = file => {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  identityInputs.set(file, { path: file, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  return JSON.parse(bytes.toString("utf8"));
};
const numeric = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
const onTarget = s => s.isOnTarget === true && !s.isBlocked && !s.isSavedOffLine && !s.isOwnGoal;
const fields = p => (p?.stats || []).flatMap(g => Object.values(g.stats || {}));
const playerStat = (p, key) => fields(p).find(s => s.key === key)?.stat?.value;

function reconcile(d) {
  const reasons = [];
  const shots = d.content?.shotmap?.shots;
  const teams = d.header?.teams;
  if (!Array.isArray(shots) || teams?.length !== 2) return { reasons: ["missing-shotmap-or-teams"], teams: [] };
  const ids = shots.map(s => String(s.id));
  if (shots.some(s => !s.id) || new Set(ids).size !== ids.length) reasons.push("invalid-or-duplicate-shot-id");
  if (shots.some(s => !/^[1-9]\d*$/.test(String(s.playerId)))) reasons.push("invalid-provider-player-id");
  if (shots.some(s => !teams.some(t => String(t.id) === String(s.teamId)))) reasons.push("unknown-shot-team");
  // Only the All period is used: never add halves to an already complete total.
  if (shots.some(s => !["FirstHalf", "SecondHalf"].includes(s.period))) reasons.push("unsupported-extra-time-or-period");
  const stats = (d.content?.stats?.Periods?.All?.stats || []).flatMap(s => s.stats || []);
  function stat(key, i) {
    const values = stats.filter(s => s.key === key).map(s => s.rawStats?.[i]?.value);
    if (!values.length || values.some(v => !numeric(v)) || new Set(values).size !== 1) return null;
    return values[0];
  }
  const rows = teams.map((t, i) => {
    const all = shots.filter(s => String(s.teamId) === String(t.id) && !s.isOwnGoal);
    const target = all.filter(onTarget);
    const reportedXgot = stat("expected_goals_on_target", i);
    const reportedShots = stat("total_shots", i);
    const reportedSOT = stat("ShotsOnTarget", i);
    const invalid = all.some(s => !numeric(s.expectedGoalsOnTarget) || s.expectedGoalsOnTarget > 1);
    const summedXgot = invalid ? null : all.reduce((a, s) => a + s.expectedGoalsOnTarget, 0);
    if (invalid) reasons.push(`${t.id}:invalid-shot-xgot`);
    if (all.some(s => !onTarget(s) && s.expectedGoalsOnTarget !== 0)) reasons.push(`${t.id}:xgot-outside-on-target-scope`);
    if (reportedShots === null || all.length !== reportedShots) reasons.push(`${t.id}:shot-count-mismatch`);
    if (reportedSOT === null || target.length !== reportedSOT) reasons.push(`${t.id}:sot-count-mismatch`);
    if (reportedXgot === null || summedXgot === null || Math.abs(summedXgot - reportedXgot) > TOLERANCE) reasons.push(`${t.id}:xgot-total-mismatch`);
    return { providerTeamId: String(t.id), reportedXgot, summedXgot, reportedShots, shotmapShots: all.length,
      reportedSOT, shotmapSOT: target.length, shots: all };
  });
  return { reasons, teams: rows };
}

function identityMaps() {
  const acquisition = read("data/analysis/champions/season-shots-2026-10-20/fotmob-match-acquisition.json");
  const teamMap = new Map(acquisition.teams.map(t => [String(t.providerTeamId), t.teamId]));
  const playerMap = new Map();
  const shooting = read("data/normalized/champions-player-shooting-2026-27.json");
  for (const t of shooting.teams) for (const p of t.players) {
    if (!p.providerIds?.fotmob) continue;
    const key = `${t.id}|${p.providerIds.fotmob}`;
    if (playerMap.has(key) && playerMap.get(key) !== p.id) throw Error(`Ambiguous player ID ${key}`);
    playerMap.set(key, p.id);
  }
  // Existing explicit provider identities only; never infer IDs from player names.
  for (const file of fs.readdirSync(path.join(ROOT, "data/teams")).filter(f => f.endsWith(".json") && f !== "index.json")) {
    const t = read(`data/teams/${file}`);
    for (const p of t.squad || []) if (p.providerIds?.fotmob) {
      const key = `${t.id}|${p.providerIds.fotmob}`;
      if (playerMap.has(key) && playerMap.get(key) !== p.id) throw Error(`Ambiguous player ID ${key}`);
      playerMap.set(key, p.id);
    }
  }
  const directory = read("data/sources/champions-pilot-match-stats-2025-27.json").teams;
  const canonicalName = name => {
    const matches = directory.filter(t => t.name === name);
    return matches.length === 1 ? matches[0].id : null;
  };
  const fixtures = [...read("data/normalized/matches.json").map(f => ({ id: f.id, date: f.date,
    competition: "serie-a", home: f.homeTeam, away: f.awayTeam })),
  ...read("data/normalized/champions-league-2026-27.json").fixtures.map(f => ({ id: f.id, date: f.date,
    competition: "champions-league", home: canonicalName(f.homeTeam), away: canonicalName(f.awayTeam) }))];
  return { teamMap, playerMap, fixtures };
}

function build() {
  identityInputs.clear();
  const { teamMap, playerMap, fixtures } = identityMaps();
  const matches = [], quarantine = [], ledger = [];
  const summary = { inspectedArchiveFiles: 0, candidateMatches: 0, acceptedMatches: 0, quarantinedMatches: 0,
    canonicalFixtures: 0, playerObservations: 0, canonicalPlayerObservations: 0, competitions: {} };
  for (const file of fs.readdirSync(path.join(ROOT, RAW)).filter(f => f.endsWith(".json.gz")).sort()) {
    summary.inspectedArchiveFiles++;
    const rawPath = `${RAW}/${file}`;
    const bytes = fs.readFileSync(path.join(ROOT, rawPath));
    const raw = JSON.parse(zlib.gunzipSync(bytes));
    const d = raw.payload, g = d?.general;
    const league = g?.parentLeagueId || g?.leagueId;
    if (![42, 55].includes(league) || g.finished !== true) continue;
    summary.candidateMatches++;
    const competition = league === 55 ? "serie-a" : "champions-league";
    const providerMatchId = String(g.matchId), date = g.matchTimeUTCDate?.slice(0, 10);
    const source = { provider: "FotMob", providerMatchId, url: raw.url || null, retrievedAt: raw.retrievedAt || null,
      rawPath, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), modelVersion: null };
    ledger.push(source);
    const result = reconcile(d);
    if (file !== `${providerMatchId}.json.gz`) result.reasons.push("archive-match-id-mismatch");
    if (!/^2026-\d\d-\d\d$/.test(date || "")) result.reasons.push("invalid-season-date");
    if (raw.status !== 200 || !source.url || !source.retrievedAt) result.reasons.push("incomplete-acquisition-evidence");
    if (result.reasons.length) {
      quarantine.push({ providerMatchId, competition, date, reasons: result.reasons,
        teams: result.teams.map(({ shots, ...t }) => t), source });
      continue;
    }
    const teamIds = result.teams.map(t => teamMap.get(t.providerTeamId) || null);
    const candidates = fixtures.filter(f => f.competition === competition && f.date === date &&
      teamIds.every(Boolean) && f.home === teamIds[0] && f.away === teamIds[1]);
    const fixtureId = candidates.length === 1 ? candidates[0].id : null;
    const teams = result.teams.map((t, i) => {
      const players = [];
      // Only shooters with observed events: missing non-shooters are not imputed.
      for (const id of new Set(t.shots.map(s => String(s.playerId)))) {
        const events = t.shots.filter(s => String(s.playerId) === id);
        const ps = d.content?.playerStats?.[id];
        const playerId = playerMap.get(`${teamIds[i]}|${id}`) || null;
        const minutesValue = playerStat(ps, "minutes_played");
        const minutes = numeric(minutesValue) && minutesValue > 0 ? minutesValue : null;
        const value = describeXgot({ xgot: events.reduce((a, s) => a + s.expectedGoalsOnTarget, 0),
          shotsOnTarget: events.filter(onTarget).length, minutes });
        players.push({ providerPlayerId: id, playerId, identityStatus: playerId ? "mapped-existing-provider-id" : "unresolved",
          minutes, shots: events.length, shotsOnTarget: events.filter(onTarget).length, ...value,
          shotIds: events.map(s => String(s.id)) });
      }
      return { teamId: teamIds[i], providerTeamId: t.providerTeamId, reportedXgot: t.reportedXgot,
        xgot: t.summedXgot, shots: t.reportedShots, shotsOnTarget: t.reportedSOT, players,
        shotEvidence: t.shots.map(s => ({ id: String(s.id), providerPlayerId: String(s.playerId), period: s.period,
          isOnTarget: s.isOnTarget, isBlocked: s.isBlocked, isSavedOffLine: s.isSavedOffLine,
          xgot: s.expectedGoalsOnTarget })) };
    });
    matches.push({ providerMatchId, fixtureId, identityStatus: fixtureId ? "mapped-canonical-pair-and-date" : "unresolved-fixture",
      competition, season: "2026-27", date, scope: "regulation-time", verification: "single-provider-internal-reconciliation",
      availableAt: source.retrievedAt, teams, source });
    if (fixtureId) summary.canonicalFixtures++;
    for (const t of teams) for (const p of t.players) {
      summary.playerObservations++;
      if (p.playerId) summary.canonicalPlayerObservations++;
    }
    summary.competitions[competition] = (summary.competitions[competition] || 0) + 1;
  }
  summary.acceptedMatches = matches.length;
  summary.quarantinedMatches = quarantine.length;
  const output = { schemaVersion: 1, fullSeasonVerified: false, predictiveUseApproved: false,
    coverageNotice: "Partial local archive; shooters only. Internal consistency is not independent certification. Unresolved IDs remain null.",
    roundingTolerance: TOLERANCE, summary, matches };
  const audit = { schemaVersion: 1, summary, identityInputs: [...identityInputs.values()], sourceLedger: ledger, quarantine };
  for (const [file, value] of [[OUTPUT, output], [AUDIT, audit]]) {
    fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, file), JSON.stringify(value, null, 2) + "\n");
  }
  console.log(JSON.stringify(summary));
  return { output, audit };
}

if (require.main === module) build();
module.exports = { reconcile, build, TOLERANCE, onTarget };
