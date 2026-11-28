'use strict';
// Internal experiment: no builders, production writes, or changes to frozen forecasts.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const zlib = require('node:zlib'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const CONFIG = { alphaGrid: [0, 0.05, 0.1, 0.2, 0.4, 0.7, 1, 1.5, 2], minTrainingMatchdays: 2,
  minTrainingFixtures: 15, minTrainingPlayers: 200, maximumMinutes: 90, production: false,
  status: 'EXPLORATORY_TEMPORAL_REPLAY_AFTER_PRIOR_AUDIT', selection: 'NO_AUTOMATIC_BEST_VARIANT_SELECTION' };
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const finite = x => typeof x === 'number' && Number.isFinite(x);
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const round = x => finite(x) ? +x.toFixed(6) : null;
function logPMF(mu, k, alpha = 0) {
  if (!(finite(mu) && mu >= 0 && Number.isInteger(k) && k >= 0 && finite(alpha) && alpha >= 0)) return null;
  if (mu === 0) return k === 0 ? 0 : -Infinity;
  if (alpha === 0) {
    let factorial = 0; for (let i = 2; i <= k; i++) factorial += Math.log(i);
    return -mu + k * Math.log(mu) - factorial;
  }
  const size = 1 / alpha;
  let value = -size * Math.log1p(mu / size) + k * Math.log(mu / (size + mu));
  for (let i = 1; i <= k; i++) value += Math.log((size + i - 1) / i);
  return value;
}
function tail(mu, threshold, alpha = 0) {
  if (!(finite(mu) && mu >= 0 && Number.isInteger(threshold) && threshold >= 1 && finite(alpha) && alpha >= 0)) return null;
  let cumulative = 0;
  for (let k = 0; k < threshold; k++) cumulative += Math.exp(logPMF(mu, k, alpha));
  return Math.min(1, Math.max(0, 1 - cumulative));
}
function fitAlpha(rows) {
  assert(rows.length);
  const grid = CONFIG.alphaGrid.map(alpha => ({ alpha, nll: -mean(rows.map(r => logPMF(r.mu, r.actual, alpha))) }));
  assert(grid.every(g => finite(g.nll)));
  return { alpha: grid.reduce((best, g) => g.nll < best.nll ? g : best, grid[0]).alpha, grid };
}
function correlation(xs, ys) {
  if (xs.length < 3) return null;
  const a = mean(xs), b = mean(ys);
  const den = Math.sqrt(xs.reduce((s, x) => s + (x - a) ** 2, 0) * ys.reduce((s, y) => s + (y - b) ** 2, 0));
  return den ? round(xs.reduce((s, x, i) => s + (x - a) * (ys[i] - b), 0) / den) : null;
}
function describe(rows) {
  const eligible = rows.filter(r => finite(r.expectedMinutes) && r.expectedMinutes > 0 && finite(r.actualMinutes) && r.actualMinutes > 0 && r.actualMinutes <= 90);
  return { n: rows.length, matches: new Set(rows.map(r => r.matchId)).size,
    predictedShots: round(mean(rows.map(r => r.mu))), observedShots: round(mean(rows.map(r => r.actual))),
    countMAE: round(mean(rows.map(r => Math.abs(r.mu - r.actual)))), countBias: round(mean(rows.map(r => r.mu - r.actual))),
    predictedZeroRate: round(mean(rows.map(r => Math.exp(-r.mu)))), observedZeroRate: round(mean(rows.map(r => Number(r.actual === 0)))),
    predictedFourPlus: round(mean(rows.map(r => tail(r.mu, 4)))), observedFourPlus: round(mean(rows.map(r => Number(r.actual >= 4)))),
    momentAlphaDiagnostic: rows.length ? round(Math.max(0, rows.reduce((s, r) => s + (r.actual - r.mu) ** 2 - r.actual, 0) / rows.reduce((s, r) => s + r.mu ** 2, 0))) : null,
    minutes: { n: eligible.length, predictedMean: round(mean(eligible.map(r => r.expectedMinutes))), observedMean: round(mean(eligible.map(r => r.actualMinutes))),
      bias: round(mean(eligible.map(r => r.expectedMinutes - r.actualMinutes))), mae: round(mean(eligible.map(r => Math.abs(r.expectedMinutes - r.actualMinutes)))),
      minuteErrorShotErrorCorrelation: correlation(eligible.map(r => r.expectedMinutes - r.actualMinutes), eligible.map(r => r.mu - r.actual)),
      oracleActualMinutesCountMAE: round(mean(eligible.map(r => Math.abs(r.mu * r.actualMinutes / r.expectedMinutes - r.actual)))),
      sameSampleOriginalCountMAE: round(mean(eligible.map(r => Math.abs(r.mu - r.actual)))),
      oracleWarning: 'POSTMATCH_DIAGNOSTIC_ONLY_NOT_A_FORECAST_OR_CAUSAL_EFFECT' } };
}
function compare(rows, variant, threshold) {
  const usable = rows.filter(r => finite(r.original[threshold]) && finite(r[variant]?.probabilities[threshold]));
  const clusters = new Map(), diffs = [];
  for (const r of usable) {
    const y = Number(r.actual >= threshold), original = r.original[threshold], alternative = r[variant].probabilities[threshold];
    const delta = (alternative - y) ** 2 - (original - y) ** 2; diffs.push(delta);
    const c = clusters.get(r.matchId) || { n: 0, sum: 0 }; c.n++; c.sum += delta; clusters.set(r.matchId, c);
  }
  const gs = [...clusters.values()], samples = [];
  let seed = 20261128;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  if (gs.length >= 10) for (let b = 0; b < 2000; b++) {
    let sum = 0, n = 0;
    for (let i = 0; i < gs.length; i++) { const g = gs[Math.floor(random() * gs.length)]; sum += g.sum; n += g.n; }
    samples.push(sum / n);
  }
  samples.sort((a, b) => a - b);
  return { n: usable.length, matches: gs.length,
    originalBrier: round(mean(usable.map(r => (r.original[threshold] - Number(r.actual >= threshold)) ** 2))),
    alternativeBrier: round(mean(usable.map(r => (r[variant].probabilities[threshold] - Number(r.actual >= threshold)) ** 2))),
    pairedDelta: round(mean(diffs)), pairedFixtureBootstrap95: samples.length ? [round(samples[49]), round(samples[1949])] : null };
}
function temporalSplit(rows, version, md) {
  return { train: rows.filter(r => r.modelVersion === version && r.matchday < md), test: rows.filter(r => r.modelVersion === version && r.matchday === md) };
}
function run() {
  const receipts = new Map();
  const read = f => { const b = fs.readFileSync(path.join(root, f)); receipts.set(f, hash(b)); return JSON.parse(b); };
  const audit = read('output/individual-probability-audit/expanded.json');
  const matches = read('data/normalized/matches.json');
  const completeMDs = [...new Set(matches.map(m => m.matchday))].filter(md => {
    const fs = matches.filter(m => m.matchday === md); return fs.length === 10 && fs.every(m => m.status === 'finished');
  });
  const historic = audit.rows.filter(r => r.competition === 'serie-a' && r.target === 'shots1Plus');
  const sources = new Map(), archiveReceipts = [], rows = [], exclusions = {};
  function source(id) {
    if (sources.has(id)) return sources.get(id);
    let data, bytes;
    if (/^[a-f0-9]{40}:/.test(id)) {
      bytes = cp.execFileSync('git', ['show', id], { cwd: root, maxBuffer: 128 * 1024 * 1024 }); data = JSON.parse(bytes);
    } else {
      const file = id.split('#')[0]; bytes = fs.readFileSync(path.join(root, file)); receipts.set(file, hash(bytes));
      data = JSON.parse(file.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes);
    }
    const archived = audit.archives.find(a => a.sourceId === id);
    if (archived?.sha256) assert.equal(hash(id.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes), archived.sha256, `Archive mismatch: ${id}`);
    sources.set(id, data); archiveReceipts.push({ sourceId: id, fileBytesSha256: hash(bytes) }); return data;
  }
  for (const r of historic) {
    const d = source(r.sourceId);
    const prediction = d.predictions?.find(p => p.matchId === r.matchId) || (d.publishedPrediction?.matchId === r.matchId ? d.publishedPrediction : null);
    const hits = (prediction?.shooters?.allPlayers || []).filter(p => p.playerId === r.playerId && p.teamId === r.teamId);
    if (hits.length !== 1 || !finite(hits[0].projectedShots)) { exclusions.NO_EXACT_ORIGINAL_PROJECTION = (exclusions.NO_EXACT_ORIGINAL_PROJECTION || 0) + 1; continue; }
    const p = hits[0];
    const original = { 1: p.shotProbabilities?.over05, 2: p.shotProbabilities?.over15, 3: p.shotProbabilities?.over25 };
    if (!Object.values(original).every(x => finite(x) && x >= 0 && x <= 1)) { exclusions.MISSING_THRESHOLD = (exclusions.MISSING_THRESHOLD || 0) + 1; continue; }
    const maxProbabilityError = Math.max(...[1, 2, 3].map(t => Math.abs(tail(p.projectedShots, t) - original[t])));
    rows.push({ ...r, mu: p.projectedShots, original, maxProbabilityError,
      expectedMinutes: p.expectedMinutes, role: p.teamProfileRole || p.detailedRole || p.role || 'N/D',
      stability: p.playerBaselineStability?.level || 'N/D', allocationClass: p.allocationClass || 'N/D' });
  }
  const versions = [...new Set(rows.map(r => r.modelVersion))].sort();
  const diagnostics = Object.fromEntries(versions.map(v => {
    const rs = rows.filter(r => r.modelVersion === v);
    const group = fn => Object.fromEntries([...new Set(rs.map(fn))].sort().map(k => [k, describe(rs.filter(r => fn(r) === k))]));
    return [v, { overall: describe(rs), byRole: group(r => r.role), byStability: group(r => r.stability),
      byExpectedMinutes: group(r => !finite(r.expectedMinutes) ? 'N/D' : r.expectedMinutes < 60 ? '<60' : r.expectedMinutes < 75 ? '60-74' : '75+'),
      byExpectedVolume: group(r => r.mu < 1 ? '<1' : r.mu < 2 ? '1-2' : '2+'),
      byActualMinutesPostmatchDiagnostic: group(r => r.actualMinutes < 60 ? '<60' : r.actualMinutes < 75 ? '60-74' : '75+') }];
  }));
  const folds = [], heldoutRows = [], skipped = [];
  for (const version of versions) {
    const eligible = rows.filter(r => completeMDs.includes(r.matchday));
    for (const md of [...new Set(eligible.filter(r => r.modelVersion === version).map(r => r.matchday))].sort((a, b) => a - b)) {
      const { train, test } = temporalSplit(eligible, version, md);
      const trainingMDs = [...new Set(train.map(r => r.matchday))];
      if (train.length < CONFIG.minTrainingPlayers || new Set(train.map(r => r.matchId)).size < CONFIG.minTrainingFixtures || trainingMDs.length < CONFIG.minTrainingMatchdays) {
        skipped.push({ version, md, reason: 'INSUFFICIENT_PRIOR_COMPLETE_SAME_VERSION_SAMPLE' }); continue;
      }
      assert(Math.max(...train.map(r => Date.parse(r.kickoffAt))) < Math.min(...test.map(r => Date.parse(r.kickoffAt))));
      const fitted = fitAlpha(train);
      const minuteTrain = train.filter(r => finite(r.expectedMinutes) && r.expectedMinutes > 0 && finite(r.actualMinutes) && r.actualMinutes > 0 && r.actualMinutes <= 90);
      const minuteFactor = minuteTrain.length ? minuteTrain.reduce((s, r) => s + r.actualMinutes, 0) / minuteTrain.reduce((s, r) => s + r.expectedMinutes, 0) : null;
      const evaluated = test.map(r => {
        const adjustedMinutes = finite(minuteFactor) && r.expectedMinutes > 0 ? Math.min(90, r.expectedMinutes * minuteFactor) : null;
        const adjustedMu = adjustedMinutes === null ? null : r.mu * adjustedMinutes / r.expectedMinutes;
        return { ...r,
          negativeBinomial: { alpha: fitted.alpha, mu: r.mu, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, tail(r.mu, t, fitted.alpha)])) },
          minuteCorrection: { minuteFactor, adjustedMinutes, mu: adjustedMu, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, adjustedMu === null ? null : tail(adjustedMu, t)])) } };
      });
      heldoutRows.push(...evaluated);
      folds.push({ version, testMatchday: md, trainingMDs, trainingPlayers: train.length,
        testPlayers: test.length, fitted, minuteFactor, minuteTrainingPlayers: minuteTrain.length,
        comparisons: Object.fromEntries(['negativeBinomial', 'minuteCorrection'].map(v => [v, Object.fromEntries([1, 2, 3].map(t => [t, compare(evaluated, v, t)]))])) });
    }
  }
  const comparisons = Object.fromEntries(versions.map(version => [version, Object.fromEntries(['negativeBinomial', 'minuteCorrection'].map(v => [v,
    Object.fromEntries([1, 2, 3].map(t => [t, compare(heldoutRows.filter(r => r.modelVersion === version), v, t)]))]))]));
  const countComparisons = Object.fromEntries(versions.map(version => [version, Object.fromEntries(['negativeBinomial', 'minuteCorrection'].map(v => {
    const rs = heldoutRows.filter(r => r.modelVersion === version && finite(r[v].mu));
    return [v, { n: rs.length, originalNegativeLogLikelihood: round(-mean(rs.map(r => logPMF(r.mu, r.actual, 0)))),
      alternativeNegativeLogLikelihood: round(-mean(rs.map(r => logPMF(r[v].mu, r.actual, v === 'negativeBinomial' ? r[v].alpha : 0)))),
      note: 'Lower is better; exploratory descriptive count score, no independent validation claim.' }];
  }))]));
  // Empty count scores must remain unknown rather than the numeric coercion of null.
  for (const vs of Object.values(countComparisons)) for (const s of Object.values(vs)) if (!s.n) {
    s.originalNegativeLogLikelihood = null; s.alternativeNegativeLogLikelihood = null;
  }
  const probabilityConsistency = { n: rows.length, maximumAbsoluteError: Math.max(...rows.map(r => r.maxProbabilityError)),
    aboveRoundingTolerance: rows.filter(r => r.maxProbabilityError > 0.006).length,
    note: 'Original mean serialized to two decimal places; published probabilities may use full precision.' };
  assert.equal(probabilityConsistency.aboveRoundingTolerance, 0, 'Archived mean and published Poisson probabilities are incompatible');
  for (const [f, before] of receipts) assert.equal(hash(fs.readFileSync(path.join(root, f))), before, `Input changed: ${f}`);
  const report = { generatedAt: new Date().toISOString(), productionChanged: false, statisticallyApproved: false,
    config: CONFIG, completeMDs, exclusions, probabilityConsistency, diagnostics, comparisons, countComparisons, folds, skipped,
    rows, heldoutRows, archiveReceipts, inputHashes: Object.fromEntries(receipts),
    limitations: ['Retrospective exploratory temporal replay after earlier audits; fresh prospective confirmation still required.',
      'True minutes rescaling is a postmatch oracle diagnostic, not a usable forecasting input or a causal attribution.',
      'Negative binomial changes dispersion only; minute correction changes expected exposure only. Neither changes production.',
      'No mixing of engine versions. Incomplete matchdays excluded from training and temporal tests.',
      'Bootstrap resamples paired fixtures; repeated players across fixtures still create dependence.',
      'Two fixed experimental alternatives across three thresholds; no selection of a winning variant or multiplicity-adjusted claim.',
      'Role and stability subgroups are descriptive, not independently validated models.',
      'Serialized rounded mean may differ slightly from original full-precision mean. Published probabilities remain the comparator.'] };
  const out = path.join(root, 'output/individual-shots-diagnosis'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Diagnosi minuti e distribuzione dei tiri', '',
    'Analisi separata per versione. Originali recuperati dagli stessi archivi prepartita dell’audit; nessuna media dedotta o inventata dalle quote.', '',
    '## Minuti e conteggi', '',
    '| Versione | N | Minuti previsti | Minuti reali | MAE minuti | Tiri previsti | Tiri reali | MAE tiri | MAE usando minuti reali (solo diagnostica) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...Object.entries(diagnostics).map(([v, d]) => { const s = d.overall; return `| ${v} | ${s.n} | ${s.minutes.predictedMean} | ${s.minutes.observedMean} | ${s.minutes.mae} | ${s.predictedShots} | ${s.observedShots} | ${s.countMAE} | ${s.minutes.oracleActualMinutesCountMAE} |`; }), '',
    'L’uso dei minuti reali è un confronto a posteriori: non rappresenta una previsione ottenibile prima della gara e non dimostra un rapporto causale.', '',
    '## Frequenza degli zeri e delle code', '',
    '| Versione | P(0) Poisson | Zeri osservati | P(4+) Poisson | 4+ osservati |', '|---|---:|---:|---:|---:|',
    ...Object.entries(diagnostics).map(([v, d]) => `| ${v} | ${d.overall.predictedZeroRate} | ${d.overall.observedZeroRate} | ${d.overall.predictedFourPlus} | ${d.overall.observedFourPlus} |`), '',
    '## Verifica sulle giornate successive', '',
    'Stima solo su almeno due giornate complete precedenti, 15 gare e 200 giocatori-gara della stessa versione. Binomiale negativa: media originale invariata, dispersione scelta per verosimiglianza dei conteggi sulle sole gare di training. Correzione minuti: rapporto minuti reali/previsti delle sole gare di training, con limite di 90 minuti.', '',
    '| Versione | Variante | Soglia | N | Brier originale | Brier alternativa | Differenza | IC 95% per gara |', '|---|---|---:|---:|---:|---:|---:|---|',
    ...Object.entries(comparisons).flatMap(([v, vs]) => Object.entries(vs).flatMap(([variant, ts]) => Object.entries(ts).map(([t, s]) => `| ${v} | ${variant} | ${t}+ | ${s.n} | ${s.originalBrier ?? 'N/D'} | ${s.alternativeBrier ?? 'N/D'} | ${s.pairedDelta ?? 'N/D'} | ${JSON.stringify(s.pairedFixtureBootstrap95)} |`))), '',
    'Differenza negativa = errore minore. Gruppi per ruolo, volume e stabilità, parametri di ogni fold e righe verificabili in latest.json.', '',
    '## Interpretazione', '',
    'Nella versione 4.16, il minutaggio medio previsto è inferiore a quello osservato, mentre i tiri medi previsti sono superiori: un eccesso medio di minuti non spiega la sovrastima dei tiri. Questo non identifica da solo una causa nella baseline, nei matchup o nella riconciliazione.', '',
    'Nel campione 4.13 il segno dell’errore cambia tra ruoli e stabilità: la correzione uniforme rischia di peggiorare gruppi già adeguati. Le differenze tra sottogruppi sono descrittive, senza nuove soglie operative.', '',
    'La binomiale negativa riduce leggermente il Brier sulle tre soglie nelle giornate di verifica 9–11, ma tutti gli intervalli della differenza includono zero. La correzione uniforme dei minuti peggiora il Brier. Nessuna alternativa viene promossa.', '',
    '## Limiti', '', ...report.limitations.map(x => `- ${x}`), '',
    'Nessun aggiornamento a sito, formule operative, quote, probabilità DUO o snapshot prospettici già congelati.'];
  fs.writeFileSync(path.join(out, 'latest.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ versions: Object.fromEntries(Object.entries(diagnostics).map(([v, d]) => [v, d.overall])), comparisons,
    foldParameters: folds.map(f => ({ version: f.version, md: f.testMatchday, alpha: f.fitted.alpha, minuteFactor: f.minuteFactor })), probabilityConsistency, exclusions }));
  return report;
}
if (require.main === module) run();
module.exports = { logPMF, tail, fitAlpha, describe, compare, temporalSplit, run };
