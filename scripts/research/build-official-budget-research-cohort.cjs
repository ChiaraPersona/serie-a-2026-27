'use strict';
// Reconstruct archived pre-match evidence only; no forecast builders or production writes.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { toKickoffUtc } = require('../predictions/snapshot-core');
const root = path.resolve(__dirname, '../..'), hash = x => crypto.createHash('sha256').update(x).digest('hex');
function run() {
  const matchFile = 'data/normalized/matches.json', input = fs.readFileSync(path.join(root, matchFile));
  const matches = JSON.parse(input), byId = new Map(matches.map(m => [m.id, m]));
  const git = args => cp.execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 });
  const log = git(['log', '--since=2026-09-20', '--format=%H %cI', '--', 'data/normalized/predictions.json']).toString().trim().split('\n')
    .sort((a, b) => Date.parse(b.split(' ')[1]) - Date.parse(a.split(' ')[1]));
  const selected = new Map(), archives = [], excluded = {}, json = (commit, file) => {
    const b = git(['show', `${commit}:${file}`]); archives.push({ sourceId: `${commit}:${file}`, sha256: hash(b) }); return JSON.parse(b);
  };
  let scanned = 0;
  // Reverse chronological commits; first qualifying archive per match is the last pre-match one.
  for (const line of log) {
    const [commit, availableAt] = line.trim().split(' '), at = Date.parse(availableAt);
    const data = json(commit, 'data/normalized/predictions.json');
    const possible = (data.predictions || []).filter(p => {
      const m = byId.get(p.matchId), k = m && toKickoffUtc(m);
      return m?.status === 'finished' && !selected.has(p.matchId) && Array.isArray(p.shooters?.allPlayers)
        && k && at < k && Date.parse(p.generatedAt) < k;
    });
    if (possible.length) {
      let official;
      try { official = json(commit, 'data/sources/official-lineups-2026-27.json'); } catch { official = { fixtures: [] }; }
      for (const p of possible) {
        const fixture = official.fixtures?.find(f => f.matchId === p.matchId);
        if (!fixture) continue;
        const m = byId.get(p.matchId), teams = [m.homeTeam, m.awayTeam];
        if (!teams.every(id => {
          const off = fixture.teams?.find(t => t.teamId === id), pool = p.shooters.allPlayers.filter(r => r.teamId === id);
          return off?.players?.length === 11 && pool.length === 10 && new Set(pool.map(r => r.playerId)).size === 10
            && pool.every(r => r.playerId && off.players.some(o => o.playerId === r.playerId));
        })) continue;
        selected.set(p.matchId, { prediction: p, commit, availableAt });
      }
    }
    if (++scanned % 25 === 0) console.log(`Official cohort: scanned ${scanned}/${log.length} archives, selected ${selected.size} fixtures`);
  }
  const fixtureAudit = [], rows = [], teams = [];
  for (const [id, source] of selected) {
    const m = byId.get(id), p = source.prediction;
    const modelVersion = `engine-${p.engineVersion}:player-${p.playerMarketModelVersion}`;
    fixtureAudit.push({ competition: 'serie-a', matchId: id, matchday: m.matchday, modelVersion, generatedAt: p.generatedAt,
      sourceId: `${source.commit}:data/normalized/predictions.json`, availableAt: source.availableAt,
      kickoffAt: new Date(toKickoffUtc(m)).toISOString(), evidenceClass: 'LAST_PREMATCH_GIT_ARCHIVE_MATCHING_CANONICAL_OFFICIAL_XI' });
    for (const side of ['home', 'away']) {
      const teamId = m[`${side}Team`], pool = p.shooters.allPlayers.filter(r => r.teamId === teamId), actual = m.playerStats?.[side] || [];
      const sumValid = actual.length && actual.every(o => Number.isInteger(o.shots) && o.shots >= 0 && typeof o.starter === 'boolean');
      const sum = values => values.reduce((a, b) => a + b, 0), observed = m.teamStats?.[side]?.shots;
      const verified = sumValid && sum(actual.map(o => o.shots)) === observed;
      teams.push({ matchId: id, matchday: m.matchday, modelVersion, teamId, finalSum: sum(pool.map(r => r.projectedShots)),
        observedTeamShots: observed ?? null, rosterSumVerified: Boolean(verified), actualRosterShots: verified ? observed : null,
        actualStarterShots: verified ? sum(actual.filter(o => o.starter).map(o => o.shots)) : null,
        actualSubstituteShots: verified ? sum(actual.filter(o => !o.starter).map(o => o.shots)) : null });
      for (const r of pool) {
        const hits = actual.filter(o => o.playerId === r.playerId);
        if (hits.length !== 1 || hits[0].starter !== true || !Number.isInteger(hits[0].shots)) continue;
        const probabilities = { 1: r.shotProbabilities?.over05, 2: r.shotProbabilities?.over15, 3: r.shotProbabilities?.over25 };
        if (!Object.values(probabilities).every(q => typeof q === 'number' && q >= 0 && q <= 1)) continue;
        rows.push({ competition: 'serie-a', matchId: id, matchday: m.matchday, modelVersion, teamId, playerId: r.playerId,
          target: 'shots1Plus', p: probabilities[1], actual: hits[0].shots, y: Number(hits[0].shots >= 1),
          original: probabilities, mu: r.projectedShots, expectedMinutes: r.expectedMinutes, actualMinutes: hits[0].minutes,
          sourceId: `${source.commit}:data/normalized/predictions.json`, availableAt: source.availableAt, kickoffAt: new Date(toKickoffUtc(m)).toISOString() });
      }
    }
  }
  const complete = [...new Set(matches.map(m => m.matchday))].filter(md => {
    const games = matches.filter(m => m.matchday === md); return games.length === 10 && games.every(m => m.status === 'finished');
  });
  const folds = [];
  for (const version of [...new Set(rows.map(r => r.modelVersion))]) for (const md of [...new Set(rows.filter(r => r.modelVersion === version && complete.includes(r.matchday)).map(r => r.matchday))]) {
    const prior = rows.filter(r => r.modelVersion === version && complete.includes(r.matchday) && r.matchday < md);
    if (prior.length < 200 || new Set(prior.map(r => r.matchId)).size < 15 || new Set(prior.map(r => r.matchday)).size < 2) continue;
    const t = teams.filter(t => t.modelVersion === version && complete.includes(t.matchday) && t.matchday < md && t.rosterSumVerified);
    const all = t.reduce((s, t) => s + t.actualRosterShots, 0), subs = t.reduce((s, t) => s + t.actualSubstituteShots, 0);
    folds.push({ version, testMatchday: md, trainingMatchdays: [...new Set(prior.map(r => r.matchday))], substituteShare: all > 0 ? subs / all : null });
  }
  assert.equal(hash(fs.readFileSync(path.join(root, matchFile))), hash(input));
  const report = { generatedAt: new Date().toISOString(), productionChanged: false,
    selectionRule: 'LAST_COMMIT_BEFORE_KICKOFF_WITH_BOTH_OFFICIAL_XIS_MATCHING_FORECAST_POOL; NO_SELECTION_USING_RESULTS',
    limitations: ['Git timestamp is local chronology evidence, not externally certified.', 'Actual results are used only for evaluation and prior-matchday controls.'],
    fixtureAudit, rows, teams, folds, archives, excluded, inputHashes: { [matchFile]: hash(input) } };
  const out = path.join(root, 'output/starter-substitute-budget-prototype'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'official-cohort-input.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ fixtures: fixtureAudit.length, players: rows.length, folds, output: 'output/starter-substitute-budget-prototype/official-cohort-input.json' }));
  return report;
}
if (require.main === module) run();
module.exports = { run };
