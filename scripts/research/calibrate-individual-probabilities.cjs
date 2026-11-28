'use strict';
// Research-only calibration and immutable prospective captures. No production imports or writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { toKickoffUtc, canonicalMatchHash } = require('../predictions/snapshot-core');
const { summarize } = require('./verify-individual-history.cjs');
const root = path.resolve(__dirname, '../..');
const OUTPUT = 'output/individual-probability-calibration';
const CONFIG = Object.freeze({ method: 'SHARED_SHOTS_LOGIT_INTERCEPT_V1', ridge: 5,
  minimumTrainingMatchdays: 2, minimumTrainingFixtures: 15, minimumTrainingPlayers: 200,
  prospectiveMinimumFixtures: 5, prospectiveMinimumPlayers: 100,
  targets: ['shots1Plus', 'shots2Plus', 'shots3Plus'], endpointPolicy: 'PRESERVE_EXACT_ZERO_AND_ONE',
  selection: 'FIXED_SINGLE_CANDIDATE_NO_HYPERPARAMETER_SEARCH', production: false });
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const finite = x => typeof x === 'number' && Number.isFinite(x);
const mean = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const round = x => finite(x) ? +x.toFixed(6) : null;
function adjust(p, intercept) {
  if (!finite(p) || p < 0 || p > 1) return null;
  if (p === 0 || p === 1) return p;
  return 1 / (1 + Math.exp(-(Math.log(p / (1 - p)) + intercept)));
}
function fit(rows) {
  assert(rows.length && rows.every(r => CONFIG.targets.includes(r.target) && finite(r.p) && r.p >= 0 && r.p <= 1 && [0, 1].includes(r.y)));
  const counts = new Map();
  for (const r of rows) { const k = `${r.matchId}:${r.playerId}`; counts.set(k, (counts.get(k) || 0) + 1); }
  const derivative = intercept => rows.reduce((s, r) => s + (r.p > 0 && r.p < 1 ? (adjust(r.p, intercept) - r.y) / counts.get(`${r.matchId}:${r.playerId}`) : 0), CONFIG.ridge * intercept);
  let lo = -8, hi = 8;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (derivative(mid) > 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
function split(rows, testMatchday, version) {
  return { train: rows.filter(r => r.modelVersion === version && r.matchday < testMatchday),
    test: rows.filter(r => r.modelVersion === version && r.matchday === testMatchday) };
}
function paired(rows, intercepts) {
  const transformed = rows.map(r => ({ ...r, p: adjust(r.p, intercepts.get(r.matchday)) }));
  const original = summarize(rows), calibrated = summarize(transformed);
  const clusters = new Map();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], delta = (transformed[i].p - r.y) ** 2 - (r.p - r.y) ** 2;
    const c = clusters.get(r.matchId) || { n: 0, delta: 0 }; c.n++; c.delta += delta; clusters.set(r.matchId, c);
  }
  const groups = [...clusters.values()], samples = [];
  let seed = 20261128;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  if (groups.length >= 10) for (let b = 0; b < 2000; b++) {
    let n = 0, sum = 0;
    for (let j = 0; j < groups.length; j++) { const c = groups[Math.floor(random() * groups.length)]; n += c.n; sum += c.delta; }
    samples.push(sum / n);
  }
  samples.sort((a, b) => a - b);
  return { original, calibrated, brierDelta: round(mean(rows.map((r, i) => (transformed[i].p - r.y) ** 2 - (r.p - r.y) ** 2))),
    pairedFixtureBootstrap95: samples.length ? [round(samples[49]), round(samples[1949])] : null,
    logLoss: { original: round(mean(rows.map(r => -r.y * Math.log(Math.max(1e-12, r.p)) - (1 - r.y) * Math.log(Math.max(1e-12, 1 - r.p))))),
      calibrated: round(mean(transformed.map(r => -r.y * Math.log(Math.max(1e-12, r.p)) - (1 - r.y) * Math.log(Math.max(1e-12, 1 - r.p))))) } };
}
function run(now = new Date()) {
  const receipts = new Map();
  const read = file => { const b = fs.readFileSync(path.join(root, file)); receipts.set(file, hash(b)); return JSON.parse(b); };
  const history = read('output/individual-probability-audit/expanded.json');
  const matches = read('data/normalized/matches.json');
  const predictions = read('data/normalized/predictions.json');
  const matchMap = new Map(matches.map(m => [m.id, m]));
  const completeMDs = [...new Set(matches.map(m => m.matchday))].filter(md => {
    const games = matches.filter(m => m.matchday === md); return games.length === 10 && games.every(m => m.status === 'finished');
  });
  const base = history.rows.filter(r => r.competition === 'serie-a' && completeMDs.includes(r.matchday));
  const shots = base.filter(r => CONFIG.targets.includes(r.target));
  const versions = [...new Set(shots.map(r => r.modelVersion))].sort();
  const folds = [], skipped = [], evaluations = {};
  for (const version of versions) {
    const available = [...new Set(shots.filter(r => r.modelVersion === version).map(r => r.matchday))].sort((a, b) => a - b);
    const heldout = [], intercepts = new Map();
    for (const md of available) {
      const { train, test } = split(shots, md, version);
      const trainingFixtures = new Set(train.map(r => r.matchId)).size;
      const trainingPlayers = new Set(train.map(r => `${r.matchId}:${r.playerId}`)).size;
      const trainingMDs = [...new Set(train.map(r => r.matchday))].sort((a, b) => a - b);
      if (trainingMDs.length < CONFIG.minimumTrainingMatchdays || trainingFixtures < CONFIG.minimumTrainingFixtures || trainingPlayers < CONFIG.minimumTrainingPlayers) {
        skipped.push({ version, testMatchday: md, reason: 'INSUFFICIENT_PRIOR_SAME_VERSION_COMPLETE_MATCHDAYS', trainingFixtures, trainingPlayers }); continue;
      }
      assert(train.every(r => r.matchday < md && r.modelVersion === version));
      assert(Math.max(...train.map(r => Date.parse(r.kickoffAt))) < Math.min(...test.map(r => Date.parse(r.kickoffAt))));
      const intercept = fit(train); intercepts.set(md, intercept); heldout.push(...test);
      folds.push({ version, testMatchday: md, trainingMDs, trainingFixtures, trainingPlayers,
        intercept, testPlayers: new Set(test.map(r => `${r.matchId}:${r.playerId}`)).size,
        targets: Object.fromEntries(CONFIG.targets.map(t => [t, paired(test.filter(r => r.target === t), new Map([[md, intercept]]))])) });
    }
    evaluations[version] = { evaluatedMatchdays: [...intercepts.keys()],
      targets: Object.fromEntries(CONFIG.targets.map(t => [t, paired(heldout.filter(r => r.target === t), intercepts)])) };
  }
  const sotDiagnostics = Object.fromEntries(versions.map(v => [v, Object.fromEntries(['sot1Plus', 'sot2Plus'].map(t => [t, summarize(base.filter(r => r.modelVersion === v && r.target === t))]))]));
  const out = path.join(root, OUTPUT); fs.mkdirSync(out, { recursive: true });
  const protocolFile = path.join(out, 'protocol.json');
  if (!fs.existsSync(protocolFile)) {
    const protocol = { ...CONFIG, createdAt: now.toISOString(), historicalStatus: 'EXPLORATORY_TEMPORAL_REPLAY_AFTER_PRIOR_AUDIT_NOT_UNTOUCHED_HOLDOUT',
      decision: 'NO_AUTOMATIC_PUBLICATION_OR_APPROVAL', futureEvaluation: 'FIRST_IMMUTABLE_CAPTURE_ONLY; evaluate all covered starters after results; preserve exclusions',
      bootstrap: 'FIXTURE_CLUSTERS_PAIRED_2000_REPLICATES_FIXED_SEED; DOES_NOT_FULLY_MODEL_REPEATED_PLAYERS_ACROSS_MATCHES' };
    protocol.integrity = { sha256: canonicalMatchHash(protocol) };
    fs.writeFileSync(protocolFile, JSON.stringify(protocol, null, 2) + '\n', { flag: 'wx' });
  }
  const protocol = read(`${OUTPUT}/protocol.json`);
  assert.equal(canonicalMatchHash(protocol), protocol.integrity.sha256);
  for (const [k, v] of Object.entries(CONFIG)) assert.deepEqual(protocol[k], v, `Protocol mismatch: ${k}`);
  const captured = [], notCaptured = [], prospectiveParameters = {};
  for (const p of predictions.predictions) {
    const m = matchMap.get(p.matchId), kickoff = m && toKickoffUtc(m);
    if (!m || m.status !== 'scheduled') continue;
    if (!finite(kickoff) || kickoff <= now.getTime() || !(Date.parse(p.generatedAt) <= now.getTime())) {
      notCaptured.push({ matchId: p.matchId, reason: 'NOT_VERIFIABLY_FUTURE_AT_CAPTURE' }); continue;
    }
    const version = `engine-${p.engineVersion}:player-${p.playerMarketModelVersion}`;
    const train = shots.filter(r => r.modelVersion === version && r.matchday < m.matchday);
    const trainingPlayers = new Set(train.map(r => `${r.matchId}:${r.playerId}`)).size;
    const trainingFixtures = new Set(train.map(r => r.matchId)).size;
    if (trainingPlayers < CONFIG.prospectiveMinimumPlayers || trainingFixtures < CONFIG.prospectiveMinimumFixtures) {
      notCaptured.push({ matchId: p.matchId, reason: 'INSUFFICIENT_SAME_VERSION_TRAINING' }); continue;
    }
    const intercept = fit(train);
    prospectiveParameters[version] = { intercept, trainingPlayers, trainingFixtures, matchdays: [...new Set(train.map(r => r.matchday))],
      status: 'SMALL_SAMPLE_EXPERIMENTAL_NOT_HISTORICALLY_VALIDATED' };
    const players = (p.shooters?.allPlayers || []).map(r => {
      const original = { shots1Plus: r.shotProbabilities?.over05 ?? null, shots2Plus: r.shotProbabilities?.over15 ?? null, shots3Plus: r.shotProbabilities?.over25 ?? null };
      return { playerId: r.playerId, teamId: r.teamId, expectedMinutes: r.expectedMinutes ?? null, original,
        calibrated: Object.fromEntries(Object.entries(original).map(([t, q]) => [t, adjust(q, intercept)])) };
    }).filter(r => r.playerId && r.teamId && Object.values(r.original).every(q => finite(q) && q >= 0 && q <= 1));
    if (!players.length) { notCaptured.push({ matchId: p.matchId, reason: 'NO_COMPLETE_INDIVIDUAL_SHOTS_FORECAST' }); continue; }
    const dir = path.join(out, 'prospective', p.matchId); fs.mkdirSync(dir, { recursive: true });
    const filename = path.join(dir, 'first.json');
    if (fs.existsSync(filename)) {
      const prior = JSON.parse(fs.readFileSync(filename));
      assert.equal(canonicalMatchHash(prior), prior.integrity?.sha256);
      assert.equal(prior.protocolHash, protocol.integrity.sha256);
      captured.push({ matchId: p.matchId, status: 'EXISTING_FIRST_PRESERVED', players: prior.players.length }); continue;
    }
    const snapshot = { protocolHash: protocol.integrity.sha256, competition: 'serie-a', matchId: p.matchId, matchday: m.matchday,
      modelVersion: version, capturedAt: now.toISOString(), kickoffAt: new Date(kickoff).toISOString(), predictionGeneratedAt: p.generatedAt,
      state: 'RESEARCH_ONLY_NOT_PUBLISHED', probabilitySemantics: 'INDIVIDUAL_PLAYER_CONDITIONAL_ON_START_NOT_DUO',
      parameters: prospectiveParameters[version], trainingThroughMatchday: Math.max(...train.map(r => r.matchday)),
      inputHashes: Object.fromEntries(receipts), players };
    snapshot.integrity = { sha256: canonicalMatchHash(snapshot) };
    fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
    captured.push({ matchId: p.matchId, status: 'NEW_IMMUTABLE_CAPTURE', players: players.length });
  }
  for (const [file, before] of receipts) assert.equal(hash(fs.readFileSync(path.join(root, file))), before, `Input changed: ${file}`);
  const findings = Object.fromEntries(Object.entries(evaluations).map(([v, e]) => [v,
    !e.evaluatedMatchdays.length ? 'INSUFFICIENT_COMPLETE_MATCHDAYS_FOR_TEMPORAL_VERIFICATION'
      : Object.values(e.targets).every(s => s.pairedFixtureBootstrap95?.[1] < 0) ? 'EXPLORATORY_IMPROVEMENT_REQUIRES_FRESH_PROSPECTIVE_CONFIRMATION'
        : 'NO_CONSISTENT_IMPROVEMENT_SHOWN_DO_NOT_PROMOTE']));
  const report = { generatedAt: now.toISOString(), productionChanged: false, statisticallyApproved: false, findings,
    method: CONFIG, protocolHash: protocol.integrity.sha256, completeMDs, folds, skipped, evaluations, sotDiagnostics,
    prospectiveParameters, captured, notCaptured, inputHashes: Object.fromEntries(receipts),
    limitations: ['Retrospective temporal replay after inspecting aggregate historical results; not an untouched confirmatory holdout.',
      'One shared logit shift across shots thresholds preserves ordering; player-match weight is one across targets.',
      'Versions never pooled. Historical fold thresholds are fixed; no hyperparameter search.',
      'Current 4.16 has too few complete matchdays for historical calibration verification.',
      'SOT is diagnostic only. DUO, odds, EV and operational engines are unchanged.',
      'New prospective forecasts are frozen once; no standing automation or automatic builder integration is installed.'] };
  fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Calibrazione sperimentale dei tiri individuali', '',
    'Una correzione additiva sulle log-odds, condivisa tra le soglie 1+/2+/3+, stimata soltanto sulle giornate complete precedenti della stessa versione. Penalizzazione fissa 5; peso totale uno per giocatore-gara. Nessuna ricerca della variante migliore.', '',
    'Verifica temporale retrospettiva esplorativa: i risultati aggregati del campione erano già stati esaminati. La verifica prospettica nuova resta distinta.', '',
    '| Versione | Giornate verifica | Evento | N | Brier originale | Brier calibrato | Differenza | IC 95% differenza per gara |',
    '|---|---|---|---:|---:|---:|---:|---|',
    ...Object.entries(evaluations).flatMap(([v, e]) => Object.entries(e.targets).map(([t, s]) => `| ${v} | ${e.evaluatedMatchdays.join(', ') || 'Nessuna'} | ${t} | ${s.original.n} | ${s.original.brier ?? 'N/D'} | ${s.calibrated.brier ?? 'N/D'} | ${s.brierDelta ?? 'N/D'} | ${JSON.stringify(s.pairedFixtureBootstrap95)} |`)), '',
    'Differenza negativa: errore inferiore con calibrazione. Intervalli ottenuti ricampionando gare intere; non eliminano tutta la dipendenza tra giocatori ripetuti.', '',
    ...Object.entries(findings).map(([v, f]) => `${v}: ${f}.`), '',
    '## Prova prospettica', '',
    `Fixture congelate o preservate: ${captured.length}. Fixture non ammesse: ${notCaptured.length}.`, '',
    ...captured.map(c => `- ${c.matchId}: ${c.players} giocatori, ${c.status}.`),
    ...notCaptured.map(c => `- Esclusa ${c.matchId}: ${c.reason}.`), '',
    'La 4.16 usa solo la giornata completa MD12 per la nuova ipotesi sperimentale: nessun trasferimento dei parametri 4.13. Nessuna approvazione statistica.', '',
    '## Tiri in porta', '',
    'Diagnostica per versione e fasce di probabilità in latest.json, senza calibrazione SOT o trasferimento della correzione dei tiri.', '',
    '## Limiti e integrità', '', ...report.limitations.map(s => `- ${s}`), '',
    'Input verificati per hash prima e dopo. File prospettici immutabili in prospective/<fixture>/first.json; protocollo in protocol.json. Nessuna modifica al sito o ai pronostici pubblicati.'];
  fs.writeFileSync(path.join(out, 'latest.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ evaluations: Object.fromEntries(Object.entries(evaluations).map(([v, e]) => [v, { matchdays: e.evaluatedMatchdays,
    targets: Object.fromEntries(Object.entries(e.targets).map(([t, s]) => [t, { n: s.original.n, originalBrier: s.original.brier, calibratedBrier: s.calibrated.brier, delta: s.brierDelta, ci: s.pairedFixtureBootstrap95 }])) }])), captured, notCaptured, prospectiveParameters }));
  return report;
}
if (require.main === module) run();
module.exports = { CONFIG, adjust, fit, split, paired, run };
