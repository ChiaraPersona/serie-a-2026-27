'use strict';
// Serialized-input interventions in an isolated VM. Original forecasts and frozen experiments are read-only.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const vm = require('node:vm'), zlib = require('node:zlib'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { tail, compare } = require('./diagnose-individual-shots.cjs');
const root = path.resolve(__dirname, '../..');
const VARIANTS = ['historicalPriorOnly', 'noIndividualMatchup', 'noReconciliation', 'uniformAllocation', 'legacyTeamTarget', 'substituteBudget'];
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const round = x => typeof x === 'number' && Number.isFinite(x) ? +x.toFixed(6) : null;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const sum = a => a.reduce((s, x) => s + x, 0);
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function namedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const rest = source.slice(start), next = rest.slice(1).search(/^function /m);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function allocationEngine(source) {
  const clean = source.match(/^const cleanName = .*$/m)?.[0];
  const reconcile = namedFunction(source, 'reconcilePlayerVolumes');
  assert(clean && reconcile, 'Archived allocation implementation unavailable');
  const offense = namedFunction(source, 'teamOffensiveAllocation') || '';
  const code = `const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const round=(x,n=1)=>Number(x.toFixed(n));const sum=a=>a.reduce((s,x)=>s+x,0);\n${clean}\n${offense}\n${reconcile}\nthis.replay=(rows,target,profile)=>{reconcilePlayerVolumes(rows,'projectedShots',target,null,profile);return rows.map(r=>r.projectedShots);};`;
  const context = vm.createContext({});
  vm.runInContext(code, context, { timeout: 3000 });
  return { codeHash: hash(code), apply(rows, target, profile) {
    context.rows = JSON.parse(JSON.stringify(rows)); context.target = target; context.profile = profile;
    return Array.from(vm.runInContext('replay(rows,target,profile)', context, { timeout: 3000 }));
  } };
}
function playerStages(p) {
  const baseline = p.playerBaselineStability?.value;
  if (![baseline, p.baselineShots90, p.minutesFactor, p.shotsMatchupFactor, p.projectedShots].every(finite)) return null;
  return { historicalPriorPer90: p.baselineShots90, stabilizedPer90: baseline, minutesFactor: p.minutesFactor,
    matchupFactor: p.shotsMatchupFactor, historicalPriorExposure: p.baselineShots90 * p.minutesFactor,
    baselineExposure: baseline * p.minutesFactor,
    rawFull: baseline * p.minutesFactor * p.shotsMatchupFactor,
    final: p.projectedShots };
}
function countSummary(rs, key) {
  const usable = rs.filter(r => finite(r[key]));
  return { n: usable.length, predicted: round(mean(usable.map(r => r[key]))), observed: round(mean(usable.map(r => r.actual))),
    bias: round(mean(usable.map(r => r[key] - r.actual))), mae: round(mean(usable.map(r => Math.abs(r[key] - r.actual)))) };
}
function reserveBudget(mu, originalSum, target, substituteShare) {
  if (![mu, originalSum, target, substituteShare].every(finite) || mu < 0 || originalSum <= 0 || target < 0 || substituteShare < 0 || substituteShare > 1) return null;
  return mu / originalSum * target * (1 - substituteShare);
}
function run() {
  const receipts = new Map(), archiveReceipts = [], cache = new Map(), engineCache = new Map(), metadataCache = new Map();
  const read = f => { const bytes = fs.readFileSync(path.join(root, f)); receipts.set(f, hash(bytes)); return JSON.parse(bytes); };
  const audit = read('output/individual-probability-audit/expanded.json');
  const diagnosis = read('output/individual-shots-diagnosis/latest.json');
  const matches = read('data/normalized/matches.json');
  const matchMap = new Map(matches.map(m => [m.id, m]));
  const git = args => cp.execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 });
  function archived(id) {
    if (cache.has(id)) return cache.get(id);
    let bytes, data;
    if (/^[a-f0-9]{40}:/.test(id)) { bytes = git(['show', id]); data = JSON.parse(bytes); }
    else { bytes = fs.readFileSync(path.join(root, id)); receipts.set(id, hash(bytes)); data = JSON.parse(id.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes); }
    const proof = audit.archives.find(a => a.sourceId === id);
    if (proof) assert.equal(hash(id.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes), proof.sha256);
    archiveReceipts.push({ sourceId: id, sha256: hash(bytes) }); cache.set(id, data); return data;
  }
  function metadata(f) {
    const commit = /^[a-f0-9]{40}:/.test(f.sourceId) ? f.sourceId.split(':')[0] : git(['rev-list', '-1', `--before=${f.availableAt}`, 'HEAD']).toString().trim();
    if (metadataCache.has(commit)) return metadataCache.get(commit);
    const engineSource = git(['show', `${commit}:scripts/predictions/engine.js`]).toString();
    const hasAllocation = engineSource.includes('function teamOffensiveAllocation(');
    const profileBytes = hasAllocation ? git(['show', `${commit}:data/normalized/team-matchup-profiles-2026-27.json`]) : Buffer.from('{"profiles":[]}');
    const profileData = JSON.parse(profileBytes);
    const engineHash = hash(engineSource);
    if (!engineCache.has(engineHash)) engineCache.set(engineHash, allocationEngine(engineSource));
    const value = { commit, engineHash, engine: engineCache.get(engineHash), profiles: profileData.profiles,
      hasAllocation, engineVersion: engineSource.match(/const ENGINE_VERSION = ["']([^"']+)/)?.[1] };
    archiveReceipts.push({ sourceId: `${commit}:scripts/predictions/engine.js`, sha256: engineHash });
    if (hasAllocation) archiveReceipts.push({ sourceId: `${commit}:data/normalized/team-matchup-profiles-2026-27.json`, sha256: hash(profileBytes) });
    metadataCache.set(commit, value); return value;
  }
  const rebuiltCache = new Map();
  function rebuildProfiles(commit, md) {
    const key = `${commit}:${md}`;
    if (rebuiltCache.has(key)) return rebuiltCache.get(key);
    const bytesCache = new Map(), modules = new Map();
    function bytes(file) {
      if (bytesCache.has(file)) return bytesCache.get(file);
      const b = git(['show', `${commit}:${file}`]); bytesCache.set(file, b);
      archiveReceipts.push({ sourceId: `${commit}:${file}`, sha256: hash(b), purpose: 'READ_ONLY_ASOF_PROFILE_REPLAY' }); return b;
    }
    function relative(file) {
      const rel = path.relative(root, path.resolve(String(file))).replaceAll('\\', '/');
      assert(!rel.startsWith('../') && !path.isAbsolute(rel), 'Read outside archived workspace'); return rel;
    }
    const readOnlyFs = Object.freeze({ readFileSync(file, encoding) { const b = bytes(relative(file)); return encoding ? b.toString(typeof encoding === 'string' ? encoding : encoding.encoding) : b; },
      existsSync(file) { try { bytes(relative(file)); return true; } catch { return false; } } });
    function load(file) {
      if (modules.has(file)) return modules.get(file).exports;
      if (file.endsWith('.json')) return JSON.parse(bytes(file));
      const module = { exports: {} }; modules.set(file, module);
      const requireArchived = name => {
        if (['fs', 'node:fs'].includes(name)) return readOnlyFs;
        if (['path', 'node:path'].includes(name)) return path;
        if (['zlib', 'node:zlib'].includes(name)) return zlib;
        assert(name.startsWith('.'), `Unapproved archived module dependency: ${name}`);
        let rel = path.posix.normalize(path.posix.join(path.posix.dirname(file), name));
        if (!/\.(js|cjs|json)$/.test(rel)) rel += '.js';
        assert(!rel.startsWith('../'), 'Archived module outside workspace'); return load(rel);
      };
      const filename = path.join(root, file);
      const context = vm.createContext({ module, exports: module.exports, require: requireArchived,
        __filename: filename, __dirname: path.dirname(filename), Buffer, console: { log() {} } });
      vm.runInContext(bytes(file).toString(), context, { timeout: 30000 }); return module.exports;
    }
    try {
      const builder = load('scripts/build-team-matchup-profiles.js');
      const profiles = builder.buildProfiles({ asOfMatchday: md }).profiles;
      rebuiltCache.set(key, profiles); return profiles;
    } catch (e) { rebuiltCache.set(key, null); return null; }
  }
  const rows = [], teams = [], failures = [], stages = [];
  const frozenRoots = ['output/individual-probability-calibration/prospective'];
  function treeReceipts(dir) {
    if (!fs.existsSync(path.join(root, dir))) return;
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const f = `${dir}/${e.name}`; if (e.isDirectory()) treeReceipts(f); else receipts.set(f, hash(fs.readFileSync(path.join(root, f))));
    }
  }
  frozenRoots.forEach(treeReceipts);
  for (const f of audit.fixtureAudit.filter(f => f.competition === 'serie-a')) {
    const d = archived(f.sourceId);
    const prediction = d.predictions?.find(p => p.matchId === f.matchId) || (d.publishedPrediction?.matchId === f.matchId ? d.publishedPrediction : null);
    if (!prediction?.shooters?.allPlayers) { failures.push({ matchId: f.matchId, reason: 'NO_ARCHIVED_FULL_POOL' }); continue; }
    const actualRows = diagnosis.rows.filter(r => r.matchId === f.matchId);
    let meta;
    try { meta = metadata(f); } catch (e) { failures.push({ matchId: f.matchId, reason: 'ARCHIVED_IMPLEMENTATION_OR_PROFILE_UNAVAILABLE', error: e.message.slice(0, 140) }); }
    for (const projection of prediction.teamProjections || []) {
      const pool = prediction.shooters.allPlayers.filter(p => p.teamId === projection.teamId);
      const traced = pool.map(playerStages), target = projection.shotsTotal?.central;
      const observedTeam = matchMap.get(f.matchId)?.teamStats?.[projection.venue]?.shots;
      if (!pool.length || traced.some(t => !t) || !finite(target)) { failures.push({ matchId: f.matchId, teamId: projection.teamId, reason: 'MISSING_SERIALIZED_COMPONENTS' }); continue; }
      const raw = traced.map(t => t.rawFull), baseline = traced.map(t => t.baselineExposure), historical = traced.map(t => t.historicalPriorExposure);
      const team = { matchId: f.matchId, matchday: f.matchday, modelVersion: f.modelVersion, teamId: projection.teamId,
        observedTeamShots: finite(observedTeam) ? observedTeam : null,
        rawSum: sum(raw), baselineExposureSum: sum(baseline), target,
        finalSum: sum(traced.map(t => t.final)), expansion: target - sum(raw),
        legacyTarget: projection.legacyVolumeProjection?.shotsTotal?.central ?? null };
      const observedRoster = matchMap.get(f.matchId)?.playerStats?.[projection.venue] || [];
      const rosterValid = observedRoster.length > 0 && observedRoster.every(p => Number.isInteger(p.shots) && p.shots >= 0 && typeof p.starter === 'boolean');
      team.actualRosterShots = rosterValid ? sum(observedRoster.map(p => p.shots)) : null;
      team.rosterSumVerified = rosterValid && team.actualRosterShots === observedTeam;
      team.actualStarterShots = team.rosterSumVerified ? sum(observedRoster.filter(p => p.starter).map(p => p.shots)) : null;
      team.actualSubstituteShots = team.rosterSumVerified ? sum(observedRoster.filter(p => !p.starter).map(p => p.shots)) : null;
      teams.push(team);
      for (let i = 0; i < pool.length; i++) {
        const actual = actualRows.find(r => r.playerId === pool[i].playerId && r.teamId === projection.teamId);
        if (actual) stages.push({ ...actual, ...traced[i], reconciliationDelta: traced[i].final - traced[i].rawFull });
      }
      const variants = { noReconciliation: raw, uniformAllocation: sum(raw) > 0 ? raw.map(v => v * target / sum(raw)) : null };
      let maximumError = null;
      let profile = meta && (Array.isArray(meta.profiles) ? meta.profiles : Object.values(meta.profiles)).find(p => p.teamId === projection.teamId);
      if (!meta || !f.modelVersion.includes(`engine-${meta.engineVersion}:`)) failures.push({ matchId: f.matchId, teamId: projection.teamId, reason: 'IMPLEMENTATION_VERSION_NOT_VERIFIED' });
      else if (!profile && meta.hasAllocation) failures.push({ matchId: f.matchId, teamId: projection.teamId, reason: 'NO_ARCHIVED_TEAM_PROFILE' });
      else {
      const replay = (values, total = target, prof = profile) => meta.engine.apply(pool.map((p, i) => ({ ...p, projectedShots: values[i] })), total, prof);
      let reproduced = replay(raw); maximumError = Math.max(...reproduced.map((v, i) => Math.abs(v - traced[i].final)));
      if (maximumError > 0.015 && meta.hasAllocation) {
        const rebuilt = rebuildProfiles(meta.commit, f.matchday)?.find(p => p.teamId === projection.teamId);
        if (rebuilt) {
          const candidate = replay(raw, target, rebuilt), error = Math.max(...candidate.map((v, i) => Math.abs(v - traced[i].final)));
          if (error < maximumError) { profile = rebuilt; reproduced = candidate; maximumError = error; team.profileReconstructedAsOfMatchday = f.matchday; }
        }
      }
      team.replayMaximumError = maximumError; team.profileCommit = meta.commit;
      // Rounded historical priors and serialized matchup factors cannot justify claiming bit-exact counterfactuals.
      if (maximumError > 0.015) failures.push({ matchId: f.matchId, teamId: projection.teamId, reason: 'ORIGINAL_REPLAY_OUTSIDE_ROUNDING_TOLERANCE', maximumError });
      else {
      const historicalWithMatchup = historical.map((value, i) => value * traced[i].matchupFactor);
      Object.assign(variants, { historicalPriorOnly: replay(historicalWithMatchup), noIndividualMatchup: replay(baseline),
        legacyTeamTarget: finite(team.legacyTarget) ? replay(raw, team.legacyTarget) : null });
      }
      }
      const sums = Object.fromEntries(Object.entries(variants).map(([k, vs]) => [k, vs ? sum(vs) : null])); team.variantSums = sums;
      for (const name of ['historicalPriorOnly', 'noIndividualMatchup', 'uniformAllocation']) {
        if (variants[name]) assert(Math.abs(sum(variants[name]) - target) <= pool.length * 0.0051, `Team target not conserved: ${name}`);
      }
      for (let i = 0; i < pool.length; i++) {
        const actual = actualRows.find(r => r.playerId === pool[i].playerId && r.teamId === projection.teamId);
        if (!actual) continue;
        const row = { ...actual, role: pool[i].teamProfileRole || pool[i].role || 'N/D', replayMaximumError: maximumError };
        for (const name of VARIANTS) {
          const mu = variants[name]?.[i];
          row[name] = { mu: finite(mu) ? mu : null, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, finite(mu) ? tail(mu, t) : null])) };
        }
        rows.push(row);
      }
    }
  }
  const versions = [...new Set(stages.map(r => r.modelVersion))].sort();
  const complete = [...new Set(matches.map(m => m.matchday))].filter(md => { const games = matches.filter(m => m.matchday === md); return games.length === 10 && games.every(m => m.status === 'finished'); });
  const folds = [];
  for (const version of versions) for (const md of [...new Set(rows.filter(r => r.modelVersion === version && complete.includes(r.matchday)).map(r => r.matchday))].sort((a, b) => a - b)) {
    const prior = rows.filter(r => r.modelVersion === version && complete.includes(r.matchday) && r.matchday < md);
    if (prior.length < 200 || new Set(prior.map(r => r.matchId)).size < 15 || new Set(prior.map(r => r.matchday)).size < 2) continue;
    const priorTeams = teams.filter(t => t.modelVersion === version && complete.includes(t.matchday) && t.matchday < md && t.rosterSumVerified);
    const totalShots = sum(priorTeams.map(t => t.actualRosterShots)), benchShots = sum(priorTeams.map(t => t.actualSubstituteShots));
    const substituteShare = totalShots > 0 ? benchShots / totalShots : null;
    for (const r of rows.filter(r => r.modelVersion === version && r.matchday === md)) {
      const t = teams.find(t => t.matchId === r.matchId && t.teamId === r.teamId);
      const mu = substituteShare === null ? null : reserveBudget(r.mu, t.finalSum, t.target, substituteShare);
      r.substituteBudget = { mu, probabilities: Object.fromEntries([1, 2, 3].map(k => [k, mu === null ? null : tail(mu, k)])) };
    }
    folds.push({ version, testMatchday: md, priorPlayers: prior.length, priorFixtures: new Set(prior.map(r => r.matchId)).size,
      trainingMatchdays: [...new Set(prior.map(r => r.matchday))], substituteShare, priorTeamShots: totalShots, priorSubstituteShots: benchShots,
      fittedParameters: 'Component interventions fixed; substitute budget learned only from verified prior same-version team totals. Post-diagnosis exploratory addition.' });
  }
  const heldout = rows.filter(r => folds.some(f => f.version === r.modelVersion && f.testMatchday === r.matchday));
  const stageSummary = Object.fromEntries(versions.map(v => {
    const rs = stages.filter(r => r.modelVersion === v), ts = teams.filter(t => t.modelVersion === v && finite(t.observedTeamShots));
    return [v, { stages: Object.fromEntries(['historicalPriorExposure', 'baselineExposure', 'rawFull', 'final'].map(k => [k, countSummary(rs, k)])),
      meanReconciliationIncrement: round(mean(rs.map(r => r.reconciliationDelta))),
      teams: { n: ts.length, observedMean: round(mean(ts.map(t => t.observedTeamShots))), rawMean: round(mean(ts.map(t => t.rawSum))),
        verifiedRosterTeams: ts.filter(t => t.rosterSumVerified).length,
        starterMean: round(mean(ts.filter(t => t.rosterSumVerified).map(t => t.actualStarterShots))),
        substituteMean: round(mean(ts.filter(t => t.rosterSumVerified).map(t => t.actualSubstituteShots))),
        targetMean: round(mean(ts.map(t => t.target))), targetBias: round(mean(ts.map(t => t.target - t.observedTeamShots))),
        targetMAE: round(mean(ts.map(t => Math.abs(t.target - t.observedTeamShots)))),
        rawMAE: round(mean(ts.map(t => Math.abs(t.rawSum - t.observedTeamShots)))),
        expansionTeams: ts.filter(t => t.expansion > 0).length,
        caveat: 'Actual team totals include substitutes; serialized player pools contain projected starting outfield players only.' } }];
  }));
  const comparisons = Object.fromEntries(versions.map(v => [v, Object.fromEntries(VARIANTS.map(name => [name,
    Object.fromEntries([1, 2, 3].map(t => [t, compare(heldout.filter(r => r.modelVersion === v), name, t)]))]))]));
  const commonComparisons = Object.fromEntries(versions.map(v => {
    const common = heldout.filter(r => r.modelVersion === v && VARIANTS.every(name => finite(r[name]?.mu)));
    return [v, { n: common.length, matches: new Set(common.map(r => r.matchId)).size,
      variants: Object.fromEntries(VARIANTS.map(name => [name, Object.fromEntries([1, 2, 3].map(t => [t, compare(common, name, t)]))])) }];
  }));
  const replayFailures = failures.reduce((a, f) => { a[f.reason] = (a[f.reason] || 0) + 1; return a; }, {});
  for (const [file, before] of receipts) assert.equal(hash(fs.readFileSync(path.join(root, file))), before, `Read-only input or frozen forecast changed: ${file}`);
  const report = { generatedAt: new Date().toISOString(), productionChanged: false, statisticallyApproved: false,
    definitions: { historicalPriorOnly: 'Replace current-regularized baseline by serialized historical role prior; rerun original allocation with unchanged team target.',
      noIndividualMatchup: 'Set individual matchup to one; rerun original allocation with unchanged team target. Team-level matchup remains in team target.',
      noReconciliation: 'Use stabilized baseline times original minutes and matchup without team scaling or redistribution.',
      uniformAllocation: 'Keep original raw player proportions and original team target; remove specialized redistribution.',
      legacyTeamTarget: 'Use archived legacyVolumeProjection target and rerun original allocation. Not a full no-team-matchup replay.',
      substituteBudget: 'Retain original player shares but reserve the empirical prior same-version substitute shot share from the full team target; fitted on earlier complete matchdays only. Added after structural diagnosis, exploratory.' },
    replayRule: 'Archived implementation in isolated VM; original outputs must reproduce within 0.015 shots/player. Historical prior and some factors serialized with rounding; interventions are serialized-input approximations, not full engine reruns.',
    stageSummary, comparisons, commonComparisons, folds, replayFailures, failures, teams, stages, rows, heldout,
    allocationReplayPlayers: rows.filter(r => finite(r.replayMaximumError) && r.replayMaximumError <= 0.015).length,
    protectedFrozenFiles: [...receipts.keys()].filter(f => f.startsWith(frozenRoots[0])),
    inputHashes: Object.fromEntries(receipts), archiveReceipts,
    limitations: ['Exploratory retrospective interventions after prior audits, not untouched confirmatory holdout.',
      'Fixed variants; no picking an apparent winning threshold and no automatic promotion.',
      'Teams lacking verified replay are excluded only from interventions requiring allocation replay; direct raw and uniform-share interventions remain available.',
      'Common original comparator uses identical players for each intervention; coverage can differ for unavailable legacy targets.',
      'Removing reconciliation changes total volume; removing matchup or baseline with reconciliation conserves team volume and changes player shares.',
      'Fixture-paired bootstrap does not fully account for repeated players or multiple variant comparisons.',
      'No approval, publication, changes to engine formulas, or edits of frozen prospective forecasts.'] };
  const out = path.join(root, 'output/individual-shot-components'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Baseline, matchup e riconciliazione dei tiri', '',
    `Giocatori-gara con traccia: ${stages.length}; con almeno una variante calcolabile: ${rows.length}; con replay di allocazione verificato: ${report.allocationReplayPlayers}; confronti temporali: ${heldout.length}.`, '',
    '## Definizioni delle varianti', '', ...Object.entries(report.definitions).map(([k, v]) => `- ${k}: ${v}`), '',
    report.replayRule, '', '## Passaggi della previsione', '',
    '| Versione | Passaggio | N | Tiri previsti | Tiri osservati | Bias | MAE |', '|---|---|---:|---:|---:|---:|---:|',
    ...Object.entries(stageSummary).flatMap(([v, d]) => Object.entries(d.stages).map(([k, s]) => `| ${v} | ${k} | ${s.n} | ${s.predicted} | ${s.observed} | ${s.bias} | ${s.mae} |`)), '',
    '## Totale squadra, titolari e subentrati', '',
    '| Versione | Squadre-gara con somme verificate | Totale squadra previsto | Totale reale | Tiri titolari reali | Tiri subentrati reali |',
    '|---|---:|---:|---:|---:|---:|',
    ...Object.entries(stageSummary).map(([v, d]) => `| ${v} | ${d.teams.verifiedRosterTeams} | ${d.teams.targetMean} | ${d.teams.observedMean} | ${d.teams.starterMean} | ${d.teams.substituteMean} |`), '',
    'La riconciliazione attribuisce il totale squadra ai soli giocatori di movimento dell’undici proiettato. Il totale reale comprende i subentrati; le somme di tutti i giocatori sono state verificate contro i totali squadra prima di stimare la quota dei subentrati. Il budget dei subentrati del test usa soltanto le giornate complete precedenti della stessa versione, mai quelle di verifica.', '',
    '## Confronti sulle giornate successive', '',
    '| Versione | Variante | Soglia | N | Brier originale | Brier variante | Differenza | IC95% per gara |', '|---|---|---:|---:|---:|---:|---:|---|',
    ...Object.entries(comparisons).flatMap(([v, vs]) => Object.entries(vs).flatMap(([name, ts]) => Object.entries(ts).map(([t, s]) => `| ${v} | ${name} | ${t}+ | ${s.n} | ${s.originalBrier ?? 'N/D'} | ${s.alternativeBrier ?? 'N/D'} | ${s.pairedDelta ?? 'N/D'} | ${JSON.stringify(s.pairedFixtureBootstrap95)} |`))), '',
    '## Campione comune a tutte le varianti', '',
    ...Object.entries(commonComparisons).map(([v, d]) => `${v}: ${d.n} giocatori-gara in ${d.matches} gare. Confronti appaiati sullo stesso campione per tutte le varianti in latest.json, campo commonComparisons.`), '',
    `Esclusioni dal replay: ${JSON.stringify(replayFailures)}. Nessun valore mancante sostituito con un dato corrente o inventato.`, '',
    'Differenza negativa = errore inferiore. Le varianti sono interventi su input serializzati, con arrotondamenti, e non una validazione del modello nuovo.', '',
    '## Esito della diagnosi', '',
    'Nella 4.16 il passaggio dai tiri grezzi alla riconciliazione aumenta la media individuale da 1,085 a 1,431, contro 1,167 osservati nel campione confrontabile. Il totale squadra resta vicino al totale reale: il disallineamento si trova soprattutto tra volume dell’intera squadra e volume assegnato ai titolari.', '',
    'Togliere la riconciliazione o il matchup non produce un miglioramento uniforme delle soglie. La baseline storica e la distribuzione uniforme mostrano piccoli vantaggi su alcune soglie, senza una conferma generale corretta per i confronti multipli. Anche la semplice riserva media per i subentrati non migliora uniformemente.', '',
    'La prossima ipotesi tecnica è un budget distinto di minuti e tiri per titolari e subentrati, basato su giocatori e sostituzioni plausibili, conservando il totale squadra. Questo esperimento non lo certifica né trasferisce probabilità individuali ai contratti DUO.', '',
    'I 142 giocatori-gara della vecchia 4.12 non espongono tutti i componenti necessari: nessuna traccia mancante è stata inventata. Otto squadre-gara restano fuori dai replay di allocazione perché il controllo di riproduzione supera la tolleranza; restano ammesse alle varianti dirette che non richiedono quel replay.', '',
    '## Limiti', '', ...report.limitations.map(s => `- ${s}`), '',
    `Verificati invariati anche ${report.protectedFrozenFiles.length} file di previsioni prospettiche già congelate. Dettagli di squadra, controlli di conservazione dei volumi e archivi in latest.json.`];
  fs.writeFileSync(path.join(out, 'latest.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ stages: stages.length, allocationReplayPlayers: report.allocationReplayPlayers, heldout: heldout.length, replayFailures,
    commonSample: Object.fromEntries(Object.entries(commonComparisons).map(([v, d]) => [v, { n: d.n, matches: d.matches }])),
    protectedFrozenFiles: report.protectedFrozenFiles.length, output: 'output/individual-shot-components/latest.md' }));
  return report;
}
if (require.main === module) run();
module.exports = { namedFunction, allocationEngine, playerStages, countSummary, reserveBudget, run };
