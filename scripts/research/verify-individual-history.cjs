'use strict';
// Separate historical audit. Never runs builders or changes operational data.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { canonicalMatchHash, toKickoffUtc } = require('../predictions/snapshot-core');
const root = path.resolve(__dirname, '../..');
const targets = { shots1Plus: ['shots', 1], shots2Plus: ['shots', 2], shots3Plus: ['shots', 3], sot1Plus: ['sot', 1], sot2Plus: ['sot', 2] };
const finite = x => typeof x === 'number' && Number.isFinite(x);
const probability = x => finite(x) && x >= 0 && x <= 1;
const mean = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const round = x => finite(x) ? +x.toFixed(5) : null;
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function add(obj, k) { obj[k] = (obj[k] || 0) + 1; }
function prematch(availableAt, generatedAt, kickoff) {
  return finite(Date.parse(availableAt)) && finite(Date.parse(generatedAt)) && finite(kickoff)
    && Date.parse(availableAt) < kickoff && Date.parse(generatedAt) < kickoff;
}
function summarize(rows) {
  const bins = Array.from({ length: 5 }, (_, i) => {
    const rs = rows.filter(r => Math.min(4, Math.floor(r.p * 5)) === i);
    return { from: i / 5, to: (i + 1) / 5, n: rs.length, predicted: round(mean(rs.map(r => r.p))), observed: round(mean(rs.map(r => r.y))) };
  });
  // Resample entire fixtures, keeping dependent player observations together.
  const grouped = new Map();
  for (const r of rows) { const a = grouped.get(r.matchId) || []; a.push(r); grouped.set(r.matchId, a); }
  const clusters = [...grouped.values()].map(rs => ({ n: rs.length, gap: rs.reduce((s, r) => s + r.p - r.y, 0) }));
  let ci = null;
  if (clusters.length >= 10) {
    let seed = 20261128;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const samples = [];
    for (let b = 0; b < 1000; b++) {
      let gap = 0, n = 0;
      for (let i = 0; i < clusters.length; i++) { const c = clusters[Math.floor(random() * clusters.length)]; gap += c.gap; n += c.n; }
      samples.push(gap / n);
    }
    samples.sort((a, b) => a - b);
    ci = [round(samples[24]), round(samples[974])];
  }
  return { n: rows.length, matches: grouped.size,
    predicted: round(mean(rows.map(r => r.p))), observed: round(mean(rows.map(r => r.y))),
    gap: round(mean(rows.map(r => r.p - r.y))),
    brier: round(mean(rows.map(r => (r.p - r.y) ** 2))),
    gapFixtureBootstrap95: ci, bins };
}
function observedRows(candidate, actual) {
  const rows = [], exclusions = {};
  for (const p of candidate.players) {
    if (!p.playerId || !p.teamId) { add(exclusions, 'MISSING_CANONICAL_ID'); continue; }
    const hits = actual.filter(o => o.playerId === p.playerId && o.teamId === p.teamId);
    if (hits.length !== 1) { add(exclusions, 'NO_UNIQUE_EXACT_ID_AND_TEAM'); continue; }
    const o = hits[0];
    if (o.starter !== true) { add(exclusions, 'ACTUAL_NONSTARTER'); continue; }
    if (Number.isInteger(o.shots) && Number.isInteger(o.sot) && o.sot > o.shots) { add(exclusions, 'INCONSISTENT_SHOTS_AND_SOT'); continue; }
    for (const [target, [field, threshold]] of Object.entries(targets)) {
      if (!probability(p.probabilities?.[target])) { add(exclusions, 'PROBABILITY_UNAVAILABLE'); continue; }
      if (!Number.isInteger(o[field]) || o[field] < 0) { add(exclusions, 'OBSERVATION_UNAVAILABLE'); continue; }
      rows.push({ competition: candidate.competition, matchId: candidate.matchId, matchday: candidate.matchday,
        modelVersion: candidate.modelVersion, teamId: p.teamId, playerId: p.playerId,
        target, p: p.probabilities[target], actual: o[field], y: Number(o[field] >= threshold),
        expectedMinutes: p.expectedMinutes ?? null, actualMinutes: o.minutes ?? null,
        sourceId: candidate.sourceId, availableAt: candidate.availableAt, kickoffAt: candidate.kickoffAt });
    }
  }
  return { rows, exclusions };
}
function run() {
  const inputs = new Map(), archives = [], scan = {}, candidates = new Map();
  function read(file) { const b = fs.readFileSync(path.join(root, file)); inputs.set(file, hash(b)); return JSON.parse(b); }
  const matches = read('data/normalized/matches.json');
  const matchMap = new Map(matches.map(m => [m.id, m]));
  const championCalendar = read('data/normalized/champions-league-2026-27.json');
  const clFixtures = championCalendar.fixtures || championCalendar.matches || (Array.isArray(championCalendar) ? championCalendar : []);
  const clMap = new Map(clFixtures.map(f => [f.id || f.fixtureId || f.matchId, f]));
  const results = new Map();
  for (const md of [3, 4, 5]) for (const f of read(`data/sources/champions-results-md0${md}-2026-27.json`).fixtures) results.set(f.fixtureId, f);
  const rawRecovery = [];
  // Recover full-roster observations from already archived reports, not selected-market outcomes.
  const db4 = read('data/normalized/champions-md04-player-database-2026-27.json');
  const individuals4 = read('data/normalized/champions-md04-probable-individuals-2026-27.json');
  for (const f of results.values()) {
    if (f.playerEvidence?.length || !f.rawPath || !fs.existsSync(path.join(root, f.rawPath))) continue;
    const bytes = fs.readFileSync(path.join(root, f.rawPath)); inputs.set(f.rawPath, hash(bytes));
    const envelope = JSON.parse(require('node:zlib').gunzipSync(bytes));
    const payload = envelope.payload;
    const eventId = f.rawPath.match(/\/([0-9]+)\.json\.gz$/)?.[1];
    if (!eventId || String(payload?.header?.id) !== eventId) { add(scan, 'RAW_EVENT_ID_MISMATCH'); continue; }
    const fixture = individuals4.fixtures.find(x => x.fixtureId === f.fixtureId);
    if (!fixture) continue;
    const evidence = [], checks = [];
    for (const roster of payload.rosters || []) {
      const teamId = fixture.teams.find(t => t.venue === roster.homeAway)?.teamId;
      const team = db4.teams.find(t => t.teamId === teamId);
      if (!team) continue;
      const stat = (o, key) => (o.stats || []).find(x => x.name === key)?.value;
      for (const o of roster.roster || []) {
        const hits = team.players.filter(p => String(p.providerPlayerId || p.providerIds?.espn || '') === String(o.athlete?.id));
        if (hits.length !== 1) continue;
        evidence.push({ playerId: hits[0].playerId, teamId, starter: o.starter === true,
          statistics: { totalShots: stat(o, 'totalShots') ?? null, shotsOnTarget: stat(o, 'shotsOnTarget') ?? null },
          observationEvidence: f.rawPath });
      }
      const totals = payload.boxscore?.teams?.find(t => String(t.team?.id) === String(roster.team?.id));
      for (const metric of ['totalShots', 'shotsOnTarget']) {
        const values = (roster.roster || []).map(o => stat(o, metric));
        const total = totals?.statistics?.find(x => x.name === metric)?.displayValue;
        const expected = typeof total === 'string' && /^\d+$/.test(total) ? Number(total) : null;
        const sum = values.every(v => Number.isInteger(v) && v >= 0) ? values.reduce((a, b) => a + b, 0) : null;
        checks.push({ teamId, metric, sum, expected, passed: sum !== null && expected !== null && sum === expected });
      }
    }
    const passed = checks.length === 4 && checks.every(c => c.passed);
    rawRecovery.push({ fixtureId: f.fixtureId, file: f.rawPath, retrievedAt: envelope.retrievedAt, checks, passed, mappedPlayers: evidence.length });
    if (passed) f.playerEvidence = evidence;
  }
  function offer(c) {
    if (!prematch(c.availableAt, c.generatedAt, Date.parse(c.kickoffAt))) { add(scan, 'NOT_VERIFIABLY_PREMATCH'); return; }
    if (!c.players.some(p => Object.values(p.probabilities || {}).some(probability))) { add(scan, 'NO_INDIVIDUAL_PROBABILITIES'); return; }
    const key = `${c.competition}:${c.matchId}`;
    const old = candidates.get(key);
    if (!old || Date.parse(c.availableAt) < Date.parse(old.availableAt)) candidates.set(key, c);
  }
  function serieCandidate(p, availableAt, sourceId, evidenceClass) {
    const m = matchMap.get(p.matchId);
    if (!m || m.status !== 'finished' || !Array.isArray(p.shooters?.allPlayers)) return;
    const kickoff = toKickoffUtc(m);
    if (!finite(kickoff)) return;
    offer({ competition: 'serie-a', matchId: m.id, matchday: m.matchday,
      modelVersion: `engine-${p.engineVersion || 'unknown'}:player-${p.playerMarketModelVersion || 'unknown'}`,
      availableAt, generatedAt: p.generatedAt, kickoffAt: new Date(kickoff).toISOString(), sourceId, evidenceClass,
      players: p.shooters.allPlayers.map(p => ({ playerId: p.playerId, teamId: p.teamId,
        expectedMinutes: p.expectedMinutes,
        probabilities: { shots1Plus: p.shotProbabilities?.over05, shots2Plus: p.shotProbabilities?.over15,
          shots3Plus: p.shotProbabilities?.over25, sot1Plus: p.shotOnTargetProbabilities?.over05, sot2Plus: p.shotOnTargetProbabilities?.over15 } })) });
  }
  // All available ordinary snapshots, no hard-coded matchday limit.
  const snapshotDir = 'data/predictions/snapshots/2026-27';
  for (const file of fs.readdirSync(path.join(root, snapshotDir)).filter(f => /^md-\d+\.json$/.test(f)).sort()) {
    for (const s of read(`${snapshotDir}/${file}`).snapshots || []) {
      if (canonicalMatchHash(s) !== s.integrity?.sha256) { add(scan, 'INVALID_SNAPSHOT_HASH'); continue; }
      const m = matchMap.get(s.matchId), k = m && toKickoffUtc(m);
      if (!m || !finite(k) || m.status !== 'finished') continue;
      offer({ competition: 'serie-a', matchId: s.matchId, matchday: s.matchday,
        modelVersion: `engine-${s.engineVersion}:player-${String(s.modelVersion).replace('player-market-v', '')}`,
        availableAt: s.generatedAt, generatedAt: s.generatedAt, kickoffAt: new Date(k).toISOString(),
        sourceId: `${snapshotDir}/${file}#${s.snapshotId}`, evidenceClass: 'HASHED_LOCAL_SNAPSHOT',
        players: (s.prediction.players || []).filter(p => p.expectedStarter).map(p => ({ ...p, teamId: p.team })) });
    }
  }
  // Use production forecasts embedded in research captures; never use fitted experimental projections.
  for (const folder of ['spatial-prospective', 'player-spatial-prospective', 'player-spatial-v2-prospective']) {
    const manifest = read(`data/predictions/${folder}/manifest.json`);
    const seenBlobs = new Set();
    for (const entry of [...manifest.entries].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))) {
      const s = read(entry.file);
      if (canonicalMatchHash(s) !== s.integrity?.sha256 || s.integrity.sha256 !== entry.sha256) { add(scan, 'INVALID_CAPTURE_HASH'); continue; }
      if (s.publishedPrediction) serieCandidate(s.publishedPrediction, s.capturedAt, entry.file, 'HASHED_LOCAL_CAPTURE');
      const input = s.inputs?.find(i => i.file === 'data/normalized/predictions.json');
      if (!input || seenBlobs.has(input.blob)) continue;
      seenBlobs.add(input.blob);
      const zipped = fs.readFileSync(path.join(root, input.blob)); inputs.set(input.blob, hash(zipped));
      const b = require('node:zlib').gunzipSync(zipped);
      if (hash(b) !== input.sha256) { add(scan, 'INVALID_ARCHIVED_INPUT_HASH'); continue; }
      archives.push({ sourceId: input.blob, sha256: input.sha256, availableAt: s.capturedAt });
      for (const p of JSON.parse(b).predictions || []) serieCandidate(p, s.capturedAt, input.blob, 'HASHED_ARCHIVED_PRODUCTION_INPUT');
    }
  }
  const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  for (const file of ['data/normalized/predictions.json', ...[3, 4, 5].map(md => `data/normalized/champions-md0${md}-probable-individuals-2026-27.json`)]) {
    const log = git(['log', '--reverse', '--since=2026-09-20', '--format=%H %cI', '--', file]).trim().split('\n').filter(Boolean);
    let scanned = 0;
    for (const line of log) {
      const [commit, availableAt] = line.trim().split(' ');
      const text = git(['show', `${commit}:${file}`]);
      const d = JSON.parse(text); scanned++;
      const sourceId = `${commit}:${file}`;
      archives.push({ sourceId, availableAt, sha256: hash(text), evidenceClass: 'GIT_COMMIT_TIMESTAMP' });
      if (file.endsWith('/predictions.json')) for (const p of d.predictions || []) serieCandidate(p, availableAt, sourceId, 'GIT_COMMIT_TIMESTAMP');
      else for (const f of d.fixtures || []) {
        const actual = results.get(f.fixtureId);
        if (actual?.status !== 'finished') continue;
        const calendar = clMap.get(f.fixtureId);
        const canonicalKickoff = calendar?.kickoffAt || calendar?.startsAt || (calendar?.date && calendar?.kickoff ? new Date(toKickoffUtc(calendar)).toISOString() : null);
        const dates = [f.kickoffAt, canonicalKickoff].filter(v => finite(Date.parse(v)));
        if (!dates.length) { add(scan, 'CHAMPIONS_KICKOFF_UNAVAILABLE'); continue; }
        const kickoffAt = new Date(Math.min(...dates.map(Date.parse))).toISOString();
        offer({ competition: 'champions', matchId: f.fixtureId, matchday: d.matchday,
          modelVersion: `champions-existing-poisson-md${d.matchday}:implementation-unversioned`,
          // No invented generation timestamp: commit bounds availability of this entire payload.
          generatedAt: availableAt, availableAt, kickoffAt, sourceId, evidenceClass: 'GIT_COMMIT_TIMESTAMP',
          players: f.teams.flatMap(t => (t.players || []).filter(p => p.projectedRole === 'starter' || ['probable-starter', 'official-starter'].includes(p.availability)).map(p => ({
            playerId: p.playerId, teamId: t.teamId, expectedMinutes: p.expectedMinutes,
            probabilities: { shots1Plus: p.eventProbabilities?.shotsOver05, shots2Plus: p.eventProbabilities?.shotsOver15,
              shots3Plus: p.eventProbabilities?.shotsOver25, sot1Plus: p.eventProbabilities?.sotOver05, sot2Plus: p.eventProbabilities?.sotOver15 }
          }))) });
      }
      if (scanned % 25 === 0) console.log(`Scanned ${scanned}/${log.length}: ${file}`);
    }
    scan[file] = scanned;
  }
  const rows = [], fixtureAudit = [];
  for (const c of [...candidates.values()].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))) {
    let actual;
    if (c.competition === 'serie-a') {
      const m = matchMap.get(c.matchId);
      actual = ['home', 'away'].flatMap(side => (m.playerStats?.[side] || []).map(o => ({ ...o, teamId: m[`${side}Team`], sot: o.shotsOnTarget })));
    } else actual = (results.get(c.matchId).playerEvidence || []).map(o => ({ ...o, shots: o.statistics?.totalShots, sot: o.statistics?.shotsOnTarget }));
    const joined = observedRows(c, actual); rows.push(...joined.rows);
    const { players, ...metadata } = c;
    fixtureAudit.push({ ...metadata, predictedPlayers: players.length, evaluatedPlayers: new Set(joined.rows.map(r => r.playerId)).size,
      targetRows: joined.rows.length, exclusions: joined.exclusions });
  }
  assert.equal(new Set(rows.map(r => `${r.competition}:${r.matchId}:${r.playerId}:${r.target}`)).size, rows.length);
  assert(rows.every(r => prematch(r.availableAt, r.availableAt, Date.parse(r.kickoffAt)) && probability(r.p) && [0, 1].includes(r.y)));
  const groupedMetrics = group => {
    const groups = [...new Set(rows.map(group))].sort();
    return Object.fromEntries(groups.map(g => [g, Object.fromEntries(Object.keys(targets).map(t => [t, summarize(rows.filter(r => group(r) === g && r.target === t))]))]));
  };
  const byCompetition = groupedMetrics(r => r.competition);
  const byVersion = groupedMetrics(r => `${r.competition}:${r.modelVersion}`);
  const byMatchday = groupedMetrics(r => `${r.competition}:MD${String(r.matchday).padStart(2, '0')}`);
  // An online empirical comparator uses earlier dates only, separately within each version.
  const chronologicalReference = {};
  for (const version of Object.keys(byVersion)) {
    chronologicalReference[version] = {};
    const base = rows.filter(r => `${r.competition}:${r.modelVersion}` === version);
    for (const t of Object.keys(targets)) {
      const rs = base.filter(r => r.target === t), evaluated = [];
      for (const r of rs) {
        const prior = rs.filter(p => p.kickoffAt.slice(0, 10) < r.kickoffAt.slice(0, 10));
        if (prior.length < 50 || new Set(prior.map(p => p.matchId)).size < 5) continue;
        const q = mean(prior.map(p => p.y));
        evaluated.push({ model: (r.p - r.y) ** 2, reference: (q - r.y) ** 2 });
      }
      chronologicalReference[version][t] = { n: evaluated.length, modelBrier: round(mean(evaluated.map(r => r.model))),
        priorEmpiricalBrier: round(mean(evaluated.map(r => r.reference))),
        note: 'Prior calendar dates only; >=50 observations and >=5 fixtures; same model version; diagnostic comparator, not fitted calibration.' };
    }
  }
  const finishedCoverage = {
    serieA: matches.filter(m => m.status === 'finished').map(m => ({ matchId: m.id, matchday: m.matchday,
      status: candidates.has(`serie-a:${m.id}`) ? 'PREMATCH_CANDIDATE_FOUND' : 'NO_ELIGIBLE_PREMATCH_ALL_PLAYER_FORECAST' })),
    champions: [...results.values()].map(f => ({ matchId: f.fixtureId,
      status: candidates.has(`champions:${f.fixtureId}`) ? 'PREMATCH_CANDIDATE_FOUND' : 'NO_ELIGIBLE_PREMATCH_INDIVIDUAL_FORECAST' }))
  };
  for (const [file, before] of inputs) assert.equal(hash(fs.readFileSync(path.join(root, file))), before, `Input changed during audit: ${file}`);
  const report = { generatedAt: new Date().toISOString(), productionChanged: false, statisticallyApproved: false,
    certifiedBookmakerSettlement: false,
    selectionRule: 'FIRST_VERIFIABLY_AVAILABLE_FORECAST_PER_FIXTURE_WITH_ANY_INDIVIDUAL_PROBABILITY; no filling missing players from later revisions',
    chronologyEvidence: 'Local immutable hashes or Git commit timestamp; neither is an externally certified timestamp.',
    observationRule: 'Exact fixture, team and player IDs; actual starters only; null is never zero; SOT excludes woodwork.',
    limitations: ['Competitions and versions must be assessed separately; aggregate is descriptive only.',
      'Repeated players and correlated matches across dates are not fully captured by fixture bootstrap.',
      'Earliest forecasts may precede final official lineups; nonstarters are excluded, not counted as failures.',
      'Champions implementation has no embedded engine version: MD cohorts remain separate.',
      'No historical regeneration, no fitted calibration, no DUO probability inference.'],
    scan, rawRecovery, byCompetition, byVersion, byMatchday, chronologicalReference, finishedCoverage, fixtureAudit, rows,
    archives, inputHashes: Object.fromEntries(inputs) };
  const out = path.join(root, 'output/individual-probability-audit'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'expanded.json'), JSON.stringify(report, null, 2) + '\n');
  const pct = x => x === null ? 'N/D' : `${(x * 100).toFixed(1)}%`;
  const table = groups => ['| Campione | Evento | N | Gare | Prevista | Osservata | Brier |', '|---|---|---:|---:|---:|---:|---:|',
    ...Object.entries(groups).flatMap(([g, ts]) => Object.entries(ts).map(([t, s]) => `| ${g} | ${t} | ${s.n} | ${s.matches} | ${pct(s.predicted)} | ${pct(s.observed)} | ${s.brier ?? 'N/D'} |`))];
  const lines = ['# Verifica estesa delle probabilità individuali', '',
    `Giocatore-gara confrontabili: ${new Set(rows.map(r => `${r.competition}:${r.matchId}:${r.playerId}`)).size}; gare con osservazioni: ${new Set(rows.map(r => `${r.competition}:${r.matchId}`)).size}.`, '',
    'Prima previsione disponibile prima del calcio di inizio per ciascuna fixture; copie congelate e cronologia Git. Matching soltanto per ID di gara, squadra e giocatore. Non vengono completati giocatori mancanti con revisioni successive.', '',
    '## Riepilogo descrittivo per competizione', '', ...table(byCompetition), '',
    '## Versioni separate', '', ...table(byVersion), '',
    '## Giornate separate', '', ...table(byMatchday), '',
    '## Limiti', '', ...report.limitations.map(x => `- ${x}`), '',
    `Recupero dai referti completi già archiviati: ${rawRecovery.filter(r => r.passed).length}/${rawRecovery.length} gare ammesse dopo controllo di identità evento e somme individuali contro totali squadra. Nessun esito selezionato DUO usato come statistica del singolo.`, '',
    'Gli intervalli bootstrap per gara, il confronto cronologico con la frequenza empirica delle sole date precedenti, tutte le esclusioni e le prove di archivio sono in expanded.json. Gli hash e i timestamp sono prove locali, non certificazioni esterne. Nessuna modifica a modelli, quote, pronostici o sito.'];
  fs.writeFileSync(path.join(out, 'expanded.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ summary: Object.fromEntries(Object.entries(byCompetition).map(([c, ts]) => [c, Object.fromEntries(Object.entries(ts).map(([t, s]) => [t, { n: s.n, matches: s.matches, predicted: s.predicted, observed: s.observed }]))])), byMatchday: Object.keys(byMatchday),
    candidates: fixtureAudit.length, evaluatedFixtures: fixtureAudit.filter(f => f.targetRows).length,
    output: 'output/individual-probability-audit/expanded.md' }));
  return report;
}
if (require.main === module) run();
module.exports = { prematch, summarize, observedRows, run };
