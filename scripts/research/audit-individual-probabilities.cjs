'use strict';
// Diagnostic only: reads canonical inputs and writes a separate audit directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const receipts = new Map();
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function read(file) {
  const bytes = fs.readFileSync(path.join(root, file));
  receipts.set(file, hash(bytes));
  return JSON.parse(bytes);
}
const valid = x => typeof x === 'number' && Number.isFinite(x);
const prob = x => valid(x) && x >= 0 && x <= 1;
const avg = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const round = x => valid(x) ? +x.toFixed(4) : null;
function add(counts, key) { counts[key] = (counts[key] || 0) + 1; }
function summary(rows) {
  return {
    n: rows.length,
    matches: new Set(rows.map(r => r.matchId)).size,
    meanProbability: round(avg(rows.map(r => r.p))),
    observedRate: round(avg(rows.map(r => r.y))),
    brier: round(avg(rows.map(r => (r.p - r.y) ** 2))),
    calibrationBins: Array.from({ length: 5 }, (_, i) => {
      const bin = rows.filter(r => Math.min(4, Math.floor(r.p * 5)) === i);
      return { from: i / 5, to: (i + 1) / 5, n: bin.length,
        meanProbability: round(avg(bin.map(r => r.p))), observedRate: round(avg(bin.map(r => r.y))) };
    })
  };
}
const predictions = read('data/normalized/predictions.json');
const matches = read('data/normalized/matches.json');
const matchMap = new Map(matches.map(m => [m.id, m]));
const serieA = { fixtures: predictions.predictions.length, withAllPlayers: 0, withoutAllPlayers: 0,
  playerRows: 0, shotsComplete: 0, sotComplete: 0, missing: {}, byMatchday: {} };
for (const f of predictions.predictions) {
  const rows = f.shooters?.allPlayers;
  if (!Array.isArray(rows)) { serieA.withoutAllPlayers++; continue; }
  serieA.withAllPlayers++;
  const md = String(Number(f.matchId.match(/md-(\d+)/)?.[1]));
  const group = serieA.byMatchday[md] ||= { fixtures: 0, players: 0, shotsComplete: 0, sotComplete: 0 };
  group.fixtures++;
  for (const p of rows) {
    serieA.playerRows++; group.players++;
    const shots = ['over05', 'over15', 'over25'].every(k => prob(p.shotProbabilities?.[k]));
    const sot = ['over05', 'over15'].every(k => prob(p.shotOnTargetProbabilities?.[k]));
    if (shots) { serieA.shotsComplete++; group.shotsComplete++; } else add(serieA.missing, 'SHOTS_PROBABILITIES_ABSENT_OR_INVALID');
    if (sot) { serieA.sotComplete++; group.sotComplete++; } else add(serieA.missing, 'SOT_PROBABILITIES_ABSENT_OR_INVALID');
  }
}
const champions = {};
for (const md of [4, 5]) {
  const d = read(`data/normalized/champions-md0${md}-probable-individuals-2026-27.json`);
  const result = { fixtures: d.fixtures.length, starters: 0, withProbabilities: 0, missing: 0, blockers: {}, examples: [] };
  for (const f of d.fixtures) for (const t of f.teams) for (const p of t.players) {
    if (p.projectedRole !== 'starter') continue;
    result.starters++;
    if (['shotsOver05', 'shotsOver15', 'shotsOver25', 'sotOver05', 'sotOver15'].every(k => prob(p.eventProbabilities?.[k]))) result.withProbabilities++;
    else {
      result.missing++;
      for (const reason of p.blockers?.length ? p.blockers : ['NO_EXPLICIT_BLOCKER']) add(result.blockers, reason);
      if (result.examples.length < 8) result.examples.push({ fixtureId: f.fixtureId, playerId: p.playerId, role: p.role, blockers: p.blockers });
    }
  }
  champions[md] = result;
}
// Exact IDs only; latest immutable MD6 snapshots, no historical regeneration.
const snapshots = read('data/predictions/snapshots/2026-27/md-06.json');
const { canonicalMatchHash, toKickoffUtc } = require('../predictions/snapshot-core');
const historical = { scope: 'Serie A MD6 only; archived V2, not certification of current engine',
  fixtures: snapshots.snapshots.length, exclusions: {}, rows: [], metrics: {} };
const targets = { shots1Plus: ['shots', 1], shots2Plus: ['shots', 2], shots3Plus: ['shots', 3], sot1Plus: ['shotsOnTarget', 1], sot2Plus: ['shotsOnTarget', 2] };
for (const s of snapshots.snapshots) {
  if (canonicalMatchHash(s) !== s.integrity?.sha256) { add(historical.exclusions, 'SNAPSHOT_HASH_INVALID'); continue; }
  const m = matchMap.get(s.matchId);
  const kickoff = toKickoffUtc({ date: s.kickoff?.date, kickoff: s.kickoff?.time });
  if (!kickoff || !(Date.parse(s.generatedAt) < kickoff)) { add(historical.exclusions, 'NO_PREMATCH_CHRONOLOGY'); continue; }
  if (m?.status !== 'finished' || !m.playerStats) { add(historical.exclusions, 'NO_FINISHED_PLAYER_STATS'); continue; }
  const observed = [...(m.playerStats.home || []), ...(m.playerStats.away || [])];
  for (const p of s.prediction.players || []) {
    if (!p.expectedStarter) { add(historical.exclusions, 'NOT_EXPECTED_STARTER'); continue; }
    const hits = observed.filter(o => o.playerId && o.playerId === p.playerId);
    if (hits.length !== 1) { add(historical.exclusions, 'NO_UNIQUE_CANONICAL_PLAYER'); continue; }
    const o = hits[0];
    if (o.starter !== true) { add(historical.exclusions, 'ACTUAL_NONSTARTER'); continue; }
    for (const [target, [field, threshold]] of Object.entries(targets)) {
      if (!prob(p.probabilities?.[target]) || !Number.isInteger(o[field]) || o[field] < 0) { add(historical.exclusions, 'MISSING_PROBABILITY_OR_OBSERVATION'); continue; }
      historical.rows.push({ matchId: s.matchId, playerId: p.playerId, target,
        p: p.probabilities[target], actual: o[field], y: Number(o[field] >= threshold),
        snapshotAt: s.generatedAt, engineVersion: s.engineVersion });
    }
  }
}
for (const target of Object.keys(targets)) historical.metrics[target] = summary(historical.rows.filter(r => r.target === target));
const contracts = {};
for (const md of [4, 5]) {
  const d = read(`data/normalized/schedina-champions-md0${md}.json`);
  const rows = (d.marketCatalog?.matches || []).flatMap(m => m.selections || []).filter(l => l.catalogOrigin === 'prediction-v2-player-forecast');
  contracts[md] = { rows: rows.length,
    withIndividualReference: rows.filter(l => valid(l.individualModelProbabilityPct)).length,
    unavailableContractProbability: rows.filter(l => l.modelProbabilityPct == null).length,
    statusCounts: rows.reduce((a, l) => { add(a, l.evStatus || 'UNSPECIFIED'); return a; }, {}) };
}
for (const [file, before] of receipts) assert.equal(hash(fs.readFileSync(path.join(root, file))), before, `Input changed: ${file}`);
assert(historical.rows.every(r => prob(r.p) && [0, 1].includes(r.y)));
assert.equal(serieA.withAllPlayers + serieA.withoutAllPlayers, serieA.fixtures);
for (const c of Object.values(champions)) assert.equal(c.withProbabilities + c.missing, c.starters);
for (const c of Object.values(contracts)) assert(c.withIndividualReference <= c.rows && c.unavailableContractProbability <= c.rows);
assert.equal(new Set(historical.rows.map(r => `${r.matchId}:${r.playerId}:${r.target}`)).size, historical.rows.length);
const report = { generatedAt: new Date().toISOString(), productionChanged: false, statisticalVerificationOnly: true,
  certifiedBookmakerSettlement: false, serieA, champions, contracts, historical,
  limitations: ['Single matchday; observations within a match are dependent.',
    'Snapshot chronology and hashes checked locally; not externally timestamped.',
    'Conditional on expected and actual starting; excludes actual nonstarters.',
    'No recalibration or current-engine approval from this sample.',
    'Current datasets are coverage evidence, not pre-match validation evidence.'],
  inputHashes: Object.fromEntries(receipts) };
const out = path.join(root, 'output/individual-probability-audit');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
const lines = ['# Audit probabilità individuali', '',
  `Serie A: ${serieA.withAllPlayers}/${serieA.fixtures} fixture con pool completo; ${serieA.playerRows} righe, ${serieA.shotsComplete} con probabilità tiri, ${serieA.sotComplete} con probabilità SOT.`, '',
  ...Object.entries(champions).map(([md, c]) => `Champions MD${md}: ${c.withProbabilities}/${c.starters} titolari con probabilità; ${c.missing} senza. Blocchi: ${JSON.stringify(c.blockers)}.`), '',
  '## Verifica storica Serie A MD6', '',
  '| Evento | N | Probabilità media | Frequenza osservata | Brier |', '|---|---:|---:|---:|---:|',
  ...Object.entries(historical.metrics).map(([k, v]) => `| ${k} | ${v.n} | ${v.meanProbability} | ${v.observedRate} | ${v.brier} |`), '',
  `Esclusioni: ${JSON.stringify(historical.exclusions)}.`, '',
  'Campione diagnostico di una giornata: non sufficiente per approvare o ricalibrare il modello corrente. Contratti DUO separati dalle probabilità individuali. Nessuna modifica ai dati pubblicati.', '',
  '## Interpretazione e passo successivo', '',
  'Le probabilità del singolo esistono già. Il catalogo DUO le mantiene come riferimento separato e non le trasferisce al contratto con sostituto. Le fixture Serie A senza allPlayers sono output con schema diverso o precedente, non giocatori con probabilità zero.', '',
  'MD5 Champions: i 36 portieri sono esclusi per la metrica; restano 53 titolari di movimento senza previsione. I motivi di blocco possono sovrapporsi: non sommarne i conteggi.', '',
  'Il controllo storico esclude 28 giocatori senza identità canonica univocamente confrontabile e 30 non titolari effettivi. Le cinque soglie sugli stessi 142 giocatori non sono 710 osservazioni indipendenti. I valori aggregati indicano una sovrastima nel campione; non dimostrano superiorità rispetto a un riferimento e non autorizzano correzioni automatiche.', '',
  'Passo successivo: estendere il campione con snapshot prepartita verificabili e statistiche individuali per ID, separando versioni del motore; valutare la calibrazione su giornate successive a quelle usate per stimarla. Per DUO serve una ricerca distinta su sostituzioni e contratto esatto.', '',
  'Dettaglio, fasce di calibrazione e hash degli input in latest.json.'];
fs.writeFileSync(path.join(out, 'latest.md'), lines.join('\n') + '\n');
console.log(JSON.stringify({ serieA, champions, contracts, historical: { exclusions: historical.exclusions, metrics: historical.metrics }, output: 'output/individual-probability-audit/latest.md' }));
