"use strict";
// Acquisition only: provider identities, no canonical joins or forecasting writes.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const BASE = "data/raw/xgot/fotmob";
const TARGETS = ["2024/2025", "2025/2026"].flatMap(season => [
  { leagueId: 55, competition: "serie-a", season, expectedMatches: 380 },
  { leagueId: 42, competition: "champions-league", season, expectedMatches: 189 }
]);
const valid = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const save = (file, value) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(value, null, 2) + "\n");
};
const unpack = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, file))));

async function acquire(url, rawPath) {
  if (fs.existsSync(path.join(ROOT, rawPath))) return unpack(rawPath);
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { accept: "application/json" } });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const raw = { url, retrievedAt: new Date().toISOString(), status: response.status, payload };
      fs.mkdirSync(path.dirname(path.join(ROOT, rawPath)), { recursive: true });
      fs.writeFileSync(path.join(ROOT, rawPath), zlib.gzipSync(JSON.stringify(raw)));
      return raw;
    } catch (e) { error = e; }
  }
  throw error;
}

function project(raw, fixture, target, rawPath) {
  const d = raw.payload, g = d.general;
  if (String(g?.matchId) !== String(fixture.id) || g.finished !== true ||
    Number(g.parentLeagueId || g.leagueId) !== target.leagueId) throw Error("match-identity-or-completion-mismatch");
  if (String(g.homeTeam?.id) !== String(fixture.home.id) || String(g.awayTeam?.id) !== String(fixture.away.id) ||
    g.matchTimeUTCDate?.slice(0, 10) !== fixture.status.utcTime.slice(0, 10)) throw Error("calendar-detail-mismatch");
  const stats = (d.content?.stats?.Periods?.All?.stats || []).flatMap(s => s.stats || []);
  const stat = (key, i) => {
    const values = stats.filter(s => s.key === key).map(s => s.rawStats?.[i]?.value);
    return values.length && values.every(valid) && new Set(values).size === 1 ? values[0] : null;
  };
  const shotmap = d.content?.shotmap?.shots;
  const shots = Array.isArray(shotmap) ? shotmap : [];
  const extraTime = shots.some(s => /extra/i.test(s.period || ""));
  const teams = [fixture.home, fixture.away].map((t, i) => ({
    providerTeamId: String(t.id), name: t.name, xgot: stat("expected_goals_on_target", i),
    shots: stat("total_shots", i), shotsOnTarget: stat("ShotsOnTarget", i)
  }));
  const players = Object.values(d.content?.playerStats || {}).map(p => {
    const fields = (p.stats || []).flatMap(g => Object.values(g.stats || {}));
    const value = key => { const v = fields.find(s => s.key === key)?.stat?.value; return valid(v) ? v : null; };
    // The display label and key differ across historical payload versions.
    const observed = fields.filter(s => ["expected_goals_on_target", "expected_goals_on_target_variant", "expected_goalsontarget"].includes(s.key));
    const xgot = observed.length === 1 && valid(observed[0].stat?.value) ? observed[0].stat.value : null;
    return { providerPlayerId: String(p.id), providerTeamId: String(p.teamId), name: p.name,
      minutes: value("minutes_played"), xgot, xgotFaced: value("expected_goals_on_target_faced"),
      isGoalkeeper: p.isGoalkeeper === true, shots: value("total_shots"), shotsOnTarget: value("ShotsOnTarget") };
  });
  return {
    provider: "FotMob", providerMatchId: String(fixture.id), competition: target.competition, season: target.season,
    date: g.matchTimeUTCDate.slice(0, 10), fixtureId: null, canonicalIdentityStatus: "deferred-step-2",
    scope: "provider-All-period", hasExtraTimeShotEvents: extraTime, predictiveUseApproved: false,
    coverage: { teamXgotPresent: teams.every(t => t.xgot !== null), shotmapPresent: Array.isArray(shotmap),
      shotXgotPresent: shots.length > 0 && shots.every(s => valid(s.expectedGoalsOnTarget)),
      playerXgotObservations: players.filter(p => p.xgot !== null).length },
    teams, players,
    shots: shots.map(s => ({ id: String(s.id), providerTeamId: String(s.teamId), providerPlayerId: String(s.playerId),
      period: s.period, minute: s.min, isOwnGoal: s.isOwnGoal, isOnTarget: s.isOnTarget, isBlocked: s.isBlocked,
      isSavedOffLine: s.isSavedOffLine, xg: valid(s.expectedGoals) ? s.expectedGoals : null,
      xgot: valid(s.expectedGoalsOnTarget) ? s.expectedGoalsOnTarget : null })),
    source: { url: raw.url, retrievedAt: raw.retrievedAt, rawPath,
      sha256: hash(fs.readFileSync(path.join(ROOT, rawPath))), modelVersion: null }
  };
}

async function run({ offline = false, targets = TARGETS,
  normalizedRoot = "data/normalized/xgot-history-seasons", auditRoot = "data/analysis/xgot/seasons" } = {}) {
  const summaries = [];
  for (const target of targets) {
    const slug = target.season.replace("/", "-");
    const calendarPath = `${BASE}/calendars/${target.leagueId}-${slug}.json.gz`;
    const calendar = offline ? unpack(calendarPath) : await acquire(
      `https://www.fotmob.com/api/data/leagues?id=${target.leagueId}&season=${encodeURIComponent(target.season)}`, calendarPath);
    if (calendar.payload.details?.selectedSeason !== target.season || Number(calendar.payload.details?.id) !== target.leagueId) {
      throw Error(`Wrong calendar season or competition: ${calendarPath}`);
    }
    const fixtures = calendar.payload.fixtures?.allMatches;
    if (!Array.isArray(fixtures) || new Set(fixtures.map(f => String(f.id))).size !== fixtures.length) throw Error("Invalid calendar");
    const finished = fixtures.filter(f => f.status?.finished && !f.status.cancelled && !f.status.awarded);
    const rows = [], failures = [];
    let cursor = 0, done = 0;
    await Promise.all(Array.from({ length: offline ? 1 : 4 }, async () => {
      while (cursor < finished.length) {
        const fixture = finished[cursor++];
        const rawPath = `${BASE}/matches/${fixture.id}.json.gz`;
        try {
          const raw = offline ? unpack(rawPath) : await acquire(
            `https://www.fotmob.com/api/data/matchDetails?matchId=${fixture.id}`, rawPath);
          rows.push(project(raw, fixture, target, rawPath));
        } catch (e) { failures.push({ providerMatchId: String(fixture.id), rawPath, error: e.message }); }
        done++;
        if (done % 50 === 0) console.log(`${target.competition} ${target.season}: ${done}/${finished.length}`);
      }
    }));
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.providerMatchId.localeCompare(b.providerMatchId));
    failures.sort((a, b) => a.providerMatchId.localeCompare(b.providerMatchId));
    const summary = { competition: target.competition, season: target.season, expectedMatches: target.expectedMatches,
      calendarMatches: fixtures.length, finishedMatches: finished.length, acquiredMatches: rows.length,
      matchesWithTeamXgot: rows.filter(m => m.coverage.teamXgotPresent).length,
      matchesWithShotXgot: rows.filter(m => m.coverage.shotXgotPresent).length,
      playerXgotObservations: rows.reduce((n, m) => n + m.coverage.playerXgotObservations, 0), failures: failures.length,
      calendarComplete: target.expectedMatches ? fixtures.length === target.expectedMatches && finished.length === target.expectedMatches : null,
      acquisitionComplete: rows.length === finished.length,
      xgotCoverageComplete: rows.length === finished.length && rows.every(m => m.coverage.teamXgotPresent),
      canonicalIdentityValidationComplete: false, predictiveUseApproved: false };
    const calendarEvidence = { rawPath: calendarPath, url: calendar.url, retrievedAt: calendar.retrievedAt,
      sha256: hash(fs.readFileSync(path.join(ROOT, calendarPath))) };
    save(`${normalizedRoot}/${target.competition}-${slug}.json`, {
      schemaVersion: 1, summary, calendarEvidence, matches: rows });
    save(`${auditRoot}/${target.competition}-${slug}.json`, {
      schemaVersion: 1, summary, calendarEvidence, failures,
      expectedProviderMatchIds: finished.map(f => String(f.id)).sort(),
      missingTeamXgot: rows.filter(m => !m.coverage.teamXgotPresent).map(m => m.providerMatchId) });
    summaries.push(summary);
    console.log(JSON.stringify(summary));
  }
  save(`${auditRoot}/coverage.json`, { schemaVersion: 1, summaries });
  return summaries;
}
if (require.main === module) run({ offline: process.argv.includes("--offline") }).catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { run, project, TARGETS };
