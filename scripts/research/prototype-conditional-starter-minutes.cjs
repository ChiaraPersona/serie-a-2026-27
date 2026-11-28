'use strict';
// Controlled follow-up: same joint budget, existing archived minute weights, recent-start-only minute input.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { baselineEngine, allocateMinutes, rotationEvidence, individualEvidence, jointBudget } = require('./prototype-starter-substitute-budget.cjs');
const { playerStages } = require('./audit-shot-components.cjs');
const { tail, compare } = require('./diagnose-individual-shots.cjs');
const root = path.resolve(__dirname, '../..'), hash = b => crypto.createHash('sha256').update(b).digest('hex');
const finite = x => typeof x === 'number' && Number.isFinite(x), mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const round = x => finite(x) ? +x.toFixed(6) : null;
function run() {
  const receipts = new Map(), archiveReceipts = [], cache = new Map(), models = new Map();
  const read = f => { const b = fs.readFileSync(path.join(root, f)); receipts.set(f, hash(b)); return JSON.parse(b); };
  const parent = read('output/starter-substitute-budget-prototype/official/latest.json');
  const cohort = read('output/starter-substitute-budget-prototype/official-cohort-input.json');
  const archived = id => {
    if (cache.has(id)) return cache.get(id);
    const b = cp.execFileSync('git', ['show', id], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 });
    archiveReceipts.push({ sourceId: id, sha256: hash(b) }); const d = id.endsWith('.js') ? b.toString() : JSON.parse(b); cache.set(id, d); return d;
  };
  const model = commit => { if (!models.has(commit)) models.set(commit, baselineEngine(archived(`${commit}:scripts/predictions/engine.js`))); return models.get(commit); };
  function protect(dir) { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const f = `${dir}/${e.name}`; if (e.isDirectory()) protect(f); else receipts.set(f, hash(fs.readFileSync(path.join(root, f)))); } }
  protect('output/individual-probability-calibration/prospective');
  for (const f of ['data/normalized/predictions.json', 'scripts/predictions/engine.js']) receipts.set(f, hash(fs.readFileSync(path.join(root, f))));
  const teams = [], rows = [];
  for (const [index, old] of parent.teams.entries()) {
    if (!old.rotationCandidates || !finite(old.target)) continue;
    const team = { matchId: old.matchId, matchday: old.matchday, teamId: old.teamId, modelVersion: old.modelVersion,
      projectedXiMatchesActual: old.projectedXiMatchesActual, actualStarterMinutes: old.actualStarterMinutes ?? null,
      actualSubstituteMinutes: old.actualSubstituteMinutes ?? null, originalJointStatus: old.status };
    teams.push(team);
    const prediction = archived(old.sourceId).predictions.find(p => p.matchId === old.matchId);
    const pool = prediction.shooters.allPlayers.filter(p => p.teamId === old.teamId);
    const squad = archived(`${old.contextCommit}:data/teams/${old.teamId}.json`).squad;
    const history = archived(`${old.contextCommit}:data/normalized/matches.json`);
    const starterInputs = pool.map(p => {
      const member = squad.find(s => s.id === p.playerId), stage = playerStages(p);
      if (!member || !stage || !(stage.minutesFactor > 0)) return null;
      const evidence = rotationEvidence(history, old.teamId, p.playerId, old.matchday, old.availableAt);
      const estimated = model(old.contextCommit).minutes({ ...member, role: p.role }, evidence.current);
      return { playerId: p.playerId, role: p.role, expectedMinutes: estimated.expectedMinutes, minuteEvidence: estimated.evidence,
        recentConditioning: evidence.current, stage, source: p };
    });
    if (starterInputs.some(p => !p)) { team.status = 'ABSTAIN'; team.reason = 'STARTER_RATE_OR_ID_UNAVAILABLE'; continue; }
    team.minutes = allocateMinutes(starterInputs, old.rotationCandidates);
    if (team.minutes.status !== 'COMPLETE') { team.status = 'ABSTAIN'; team.reason = team.minutes.reason; continue; }
    const bench = []; let reason = null;
    for (const a of team.minutes.allocations) {
      const candidate = old.rotationCandidates.find(p => p.playerId === a.playerId), member = squad.find(s => s.id === a.playerId);
      if (!member || !individualEvidence(member, candidate.current) || !finite(candidate.roleMatchupProxy)) { reason = 'BENCH_RATE_UNAVAILABLE'; break; }
      const baseline = model(old.contextCommit).rate(member, candidate.current);
      bench.push({ playerId: a.playerId, role: a.role, expectedMinutes: a.minutes, baselinePer90: baseline.value, matchupProxy: candidate.roleMatchupProxy,
        raw: baseline.value * candidate.roleMatchupProxy * a.minutes / 90 });
    }
    if (reason) { team.status = 'ABSTAIN'; team.reason = reason; continue; }
    const originalRawSum = starterInputs.reduce((s, p) => s + p.stage.rawFull, 0), originalScale = old.target / originalRawSum;
    const starters = starterInputs.map(p => ({ playerId: p.playerId, role: p.role, expectedMinutes: p.expectedMinutes,
      minuteEvidence: p.minuteEvidence, recentConditioning: p.recentConditioning,
      raw: p.source.projectedShots / originalScale * Number((p.expectedMinutes / 90).toFixed(3)) / p.stage.minutesFactor }));
    team.budget = jointBudget(old.target, starters, bench); team.status = team.budget.status;
    if (team.status !== 'COMPLETE') { team.reason = team.budget.reason; continue; }
    for (const p of team.budget.starters) {
      const original = cohort.rows.find(r => r.matchId === old.matchId && r.teamId === old.teamId && r.playerId === p.playerId);
      if (!original) continue;
      const previous = old.budget?.starters.find(s => s.playerId === p.playerId);
      rows.push({ ...original, conditionalBudget: { mu: p.projectedShots, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, tail(p.projectedShots, t)])) },
        previousJointBudget: { mu: previous?.projectedShots ?? null, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, previous ? tail(previous.projectedShots, t) : null])) } });
    }
    if ((index + 1) % 30 === 0) console.log(`Conditional minute prototype: ${index + 1}/${parent.teams.length} team fixtures`);
  }
  const versions = [...new Set(teams.map(t => t.modelVersion))], heldout = rows.filter(r => cohort.folds.some(f => f.version === r.modelVersion && f.testMatchday === r.matchday));
  const comparisons = Object.fromEntries(versions.map(v => [v, Object.fromEntries([1, 2, 3].map(t => [t, compare(heldout.filter(r => r.modelVersion === v), 'conditionalBudget', t)]))]));
  const common = heldout.filter(r => finite(r.previousJointBudget.mu)).map(r => ({ ...r, original: r.previousJointBudget.probabilities }));
  const versusPreviousJoint = Object.fromEntries(versions.map(v => [v, Object.fromEntries([1, 2, 3].map(t => [t, compare(common.filter(r => r.modelVersion === v), 'conditionalBudget', t)]))]));
  const coverage = Object.fromEntries(versions.map(v => {
    const ts = teams.filter(t => t.modelVersion === v), ok = ts.filter(t => t.status === 'COMPLETE'), mins = ok.filter(t => t.projectedXiMatchesActual && finite(t.actualStarterMinutes));
    return [v, { teams: ts.length, complete: ok.length, abstained: ts.length - ok.length,
      reasons: ts.filter(t => t.status !== 'COMPLETE').reduce((a, t) => { a[t.reason] = (a[t.reason] || 0) + 1; return a; }, {}),
      minutesOnIdenticalXiAndTeams: { n: mins.length, predictedStarterMinutes: round(mean(mins.map(t => t.minutes.starterMinutes))),
        actualStarterMinutes: round(mean(mins.map(t => t.actualStarterMinutes))), predictedSubstituteMinutes: round(mean(mins.map(t => t.minutes.substituteMinutes))),
        actualSubstituteMinutes: round(mean(mins.map(t => t.actualSubstituteMinutes))) } }];
  }));
  const minuteComparisonCommonTeams = Object.fromEntries(versions.map(v => {
    const common = teams.filter(t => t.modelVersion === v && t.status === 'COMPLETE' && t.projectedXiMatchesActual && finite(t.actualStarterMinutes)
      && parent.teams.some(p => p.matchId === t.matchId && p.teamId === t.teamId && p.status === 'COMPLETE'));
    const previous = common.map(t => parent.teams.find(p => p.matchId === t.matchId && p.teamId === t.teamId));
    return [v, { n: common.length, previousStarterMinutes: round(mean(previous.map(t => t.minutes.starterMinutes))),
      conditionalStarterMinutes: round(mean(common.map(t => t.minutes.starterMinutes))), actualStarterMinutes: round(mean(common.map(t => t.actualStarterMinutes))),
      previousStarterMinuteMAE: round(mean(previous.map((t, i) => Math.abs(t.minutes.starterMinutes - common[i].actualStarterMinutes)))),
      conditionalStarterMinuteMAE: round(mean(common.map(t => Math.abs(t.minutes.starterMinutes - t.actualStarterMinutes)))) }];
  }));
  for (const [f, before] of receipts) assert.equal(hash(fs.readFileSync(path.join(root, f))), before, `Protected input changed: ${f}`);
  const report = { generatedAt: new Date().toISOString(), productionChanged: false, statisticallyApproved: false,
    method: 'Existing archived expectedMinutes function and weights, supplied recent mean and sample count from valid recent STARTS only; same joint shot budget.',
    limitations: ['Post-diagnosis exploratory variant; no independent confirmatory validation or correction for multiple experiments.',
      'Starter baseline, serialized lineup role, matchup, team shot total and relative allocation per minute remain unchanged.',
      'Bench role proxies, capacity assumptions, availability uncertainty and abstention policy of first prototype remain.',
      'Versions remain separate; no current-engine validation without enough later complete matchdays.',
      'New coverage can differ: comparison against previous prototype is additionally paired on common players and common team minute budgets.',
      'Current features are reconstructed with exact archived IDs only; results assess the reconstructed prototype, not a causal isolation of one coefficient.',
      'No DUO inference, operational integration or modification of previous frozen forecasts.'], coverage, comparisons, versusPreviousJoint, minuteComparisonCommonTeams,
    teams, rows, heldout, inputHashes: Object.fromEntries(receipts), archiveReceipts };
  const out = path.join(root, 'output/starter-substitute-budget-prototype/conditional-minutes'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Budget con minutaggio condizionato alla titolarità', '', report.method, '',
    'Il modello operativo usa anche recentAverageMinutes calcolato su tutte le ultime gare di squadra, compresi panchina e assenza. Qui la funzione e i pesi esistenti ricevono invece media e numerosità delle sole recenti partenze da titolare con minuti noti. Nessun peso del motore operativo viene modificato.', '',
    '## Copertura', '', ...Object.entries(coverage).map(([v, c]) => `${v}: ${c.complete}/${c.teams} squadre-gara complete. Minuti su stessi undici e squadre: ${JSON.stringify(c.minutesOnIdenticalXiAndTeams)}.`), '',
    '## Confronto minuti sugli stessi casi', '',
    ...Object.entries(minuteComparisonCommonTeams).map(([v, c]) => `${v}: ${JSON.stringify(c)}.`), '',
    '## Confronto con probabilità originali', '',
    '| Versione | Soglia | N | Gare | Brier originale | Brier prototipo | Differenza | IC95% per gara |', '|---|---:|---:|---:|---:|---:|---:|---|',
    ...Object.entries(comparisons).flatMap(([v, ts]) => Object.entries(ts).map(([t, c]) => `| ${v} | ${t}+ | ${c.n} | ${c.matches} | ${c.originalBrier ?? 'N/D'} | ${c.alternativeBrier ?? 'N/D'} | ${c.pairedDelta ?? 'N/D'} | ${JSON.stringify(c.pairedFixtureBootstrap95)} |`)), '',
    'Confronto appaiato aggiuntivo contro il precedente budget sulle stesse righe in latest.json: versusPreviousJoint.', '',
    '## Limiti', '', ...report.limitations.map(x => `- ${x}`), '',
    'Nessuna modifica a sito, previsioni pubblicate o sette snapshot prospettici già congelati.'];
  fs.writeFileSync(path.join(out, 'latest.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ coverage, comparisons, versusPreviousJoint, heldout: heldout.length, output: 'output/starter-substitute-budget-prototype/conditional-minutes/latest.md' }));
  return report;
}
if (require.main === module) run();
module.exports = { run };
