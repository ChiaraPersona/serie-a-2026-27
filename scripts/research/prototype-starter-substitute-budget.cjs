'use strict';
// Experimental standalone model; writes only its research directory.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const vm = require('node:vm'), zlib = require('node:zlib'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { namedFunction, playerStages } = require('./audit-shot-components.cjs');
const { tail, compare } = require('./diagnose-individual-shots.cjs');
const root = path.resolve(__dirname, '../..');
const CONFIG = Object.freeze({ version: 'STARTER_SUBSTITUTE_JOINT_BUDGET_PROTOTYPE_V1', minutesPerOutfieldSlot: 90,
  compatibility: 'SAME_CANONICAL_BROAD_ROLE_ONLY', minimumNamedBenchSamples: 2, minimumCurrentShotObservations: 2,
  entrantCapacity: '90_TIMES_PRIOR_NAMED_BENCH_ENTRY_FREQUENCY',
  benchMatchup: 'SAME_ROLE_MEAN_OF_CURRENT_PROJECTED_STARTERS_FACTORS_EXPLICIT_PROXY',
  starterAllocation: 'PRESERVE_ORIGINAL_RELATIVE_ALLOCATION_REMOVE_COMMON_TEAM_SCALE',
  benchBaseline: 'ARCHIVED_EXISTING_ROLE_REGULARIZATION_AND_CURRENT_SIGNAL_FUNCTIONS',
  missingPolicy: 'ABSTAIN_TEAM_IF_RESIDUAL_MINUTES_OR_POSITIVE_MINUTE_RATE_IS_UNKNOWN',
  production: false, validation: 'EXPLORATORY_RETROSPECTIVE_AFTER_PRIOR_DIAGNOSIS' });
const finite = x => typeof x === 'number' && Number.isFinite(x);
const sum = xs => xs.reduce((s, x) => s + x, 0);
const mean = xs => xs.length ? sum(xs) / xs.length : null;
const round = x => finite(x) ? +x.toFixed(6) : null;
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function cappedMinutes(demand, candidates) {
  assert(finite(demand) && demand >= 0);
  const allocations = candidates.map(c => ({ playerId: c.playerId, minutes: 0, weight: c.weight, capacity: c.capacity }));
  let remaining = demand;
  for (let iteration = 0; iteration <= allocations.length && remaining > 1e-8; iteration++) {
    const active = allocations.filter(c => finite(c.weight) && c.weight > 0 && finite(c.capacity) && c.capacity - c.minutes > 1e-8);
    const totalWeight = sum(active.map(c => c.weight));
    if (!active.length || !(totalWeight > 0)) break;
    let assigned = 0;
    for (const c of active) { const value = Math.min(c.capacity - c.minutes, remaining * c.weight / totalWeight); c.minutes += value; assigned += value; }
    remaining = Math.max(0, remaining - assigned);
  }
  return { allocations, unassignedMinutes: remaining };
}
function allocateMinutes(starters, bench) {
  if (starters.length !== 10 || new Set(starters.map(p => p.playerId)).size !== 10 || new Set(bench.map(p => p.playerId)).size !== bench.length || starters.some(p => !p.playerId || !p.role || !finite(p.expectedMinutes) || p.expectedMinutes < 0 || p.expectedMinutes > 90)) return { status: 'ABSTAIN', reason: 'INCOMPLETE_OR_DUPLICATE_PLAYER_MINUTE_BUDGET' };
  const roles = [...new Set(starters.map(p => p.role))], allocations = [], slots = [], unresolved = [];
  for (const role of roles) {
    const same = starters.filter(p => p.role === role), demand = sum(same.map(p => 90 - p.expectedMinutes));
    const selected = bench.filter(p => p.role === role && p.namedBenchSamples >= CONFIG.minimumNamedBenchSamples && p.entries > 0);
    const result = cappedMinutes(demand, selected.map(p => ({ playerId: p.playerId,
      weight: p.totalEntryMinutes / p.namedBenchSamples, capacity: 90 * p.entries / p.namedBenchSamples })));
    for (const a of result.allocations.filter(a => a.minutes > 1e-8)) {
      allocations.push({ ...a, role });
      for (const starter of same) if (demand > 0 && starter.expectedMinutes < 90) slots.push({ starterId: starter.playerId, substituteId: a.playerId, role,
        minutes: a.minutes * (90 - starter.expectedMinutes) / demand, interpretation: 'ROLE_COMPATIBLE_EXPECTED_EXPOSURE_NOT_ACTUAL_PAIRED_SUBSTITUTION' });
    }
    if (result.unassignedMinutes > 1e-6) unresolved.push({ role, minutes: result.unassignedMinutes });
  }
  const starterMinutes = sum(starters.map(p => p.expectedMinutes)), substituteMinutes = sum(allocations.map(p => p.minutes)), unassignedMinutes = sum(unresolved.map(r => r.minutes));
  assert(Math.abs(starterMinutes + substituteMinutes + unassignedMinutes - 900) < 1e-5);
  return { status: unassignedMinutes > 1e-6 ? 'ABSTAIN' : 'COMPLETE', reason: unassignedMinutes > 1e-6 ? 'UNASSIGNED_ROLE_MINUTES' : null,
    starterMinutes, substituteMinutes, unassignedMinutes, allocations, slots, unresolved };
}
function rotationEvidence(history, teamId, playerId, md, availableAt) {
  const games = history.filter(m => m.status === 'finished' && m.matchday < md && m.date < availableAt.slice(0, 10) && [m.homeTeam, m.awayTeam].includes(teamId))
    .sort((a, b) => a.matchday - b.matchday || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let namedBenchSamples = 0, entries = 0, totalEntryMinutes = 0, minutes = 0, shots = 0, shotsCoverage = 0, starterAppearances = 0, starterMinutes = 0;
  const evidenceMatchIds = [], shotSequence = [];
  for (const m of games) {
    const side = m.homeTeam === teamId ? 'home' : 'away';
    const rows = (m.playerStats?.[side] || []).filter(p => p.playerId === playerId);
    if (rows.length > 1) continue;
    const p = rows[0];
    const unused = (m.didNotPlay?.[side] || []).some(p => p.playerId === playerId);
    if (p?.starter === false || unused) namedBenchSamples++;
    if (p?.starter === false && finite(p.minutes) && p.minutes > 0 && p.minutes <= 90) { entries++; totalEntryMinutes += p.minutes; }
    if (p && finite(p.minutes) && p.minutes > 0 && p.minutes <= 90) {
      minutes += p.minutes;
      if (p.starter === true) { starterAppearances++; starterMinutes += p.minutes; }
      if (Number.isInteger(p.shots) && p.shots >= 0) { shots += p.shots; shotsCoverage++; shotSequence.push(p.shots); }
      evidenceMatchIds.push(m.id);
    }
  }
  const recentStarterMinutes = games.slice(-5).flatMap(m => {
    const side = m.homeTeam === teamId ? 'home' : 'away', found = (m.playerStats?.[side] || []).filter(p => p.playerId === playerId);
    return found.length === 1 && found[0].starter === true && finite(found[0].minutes) && found[0].minutes > 0 && found[0].minutes <= 90 ? [found[0].minutes] : [];
  });
  return { namedBenchSamples, entries, totalEntryMinutes, evidenceMatchIds,
    current: { minutes, shots: shotsCoverage ? shots : null, shotsCoverage, shotsSequence: shotSequence,
      starterAppearances, starterMinutes, recentTeamMatches: recentStarterMinutes.length, recentStarts: recentStarterMinutes.length,
      recentAverageMinutes: mean(recentStarterMinutes), minuteConditioning: 'VALID_RECENT_STARTS_ONLY_NO_DNP_OR_BENCH_ZEROS' } };
}
function jointBudget(target, starters, bench) {
  if (!(finite(target) && target >= 0) || starters.some(p => !finite(p.raw) || p.raw < 0) || bench.some(p => !finite(p.raw) || p.raw < 0)) return { status: 'ABSTAIN', reason: 'UNKNOWN_INDIVIDUAL_RATE' };
  const rawTotal = sum([...starters, ...bench].map(p => p.raw));
  if (!(rawTotal > 0)) return { status: 'ABSTAIN', reason: 'ZERO_OR_UNKNOWN_RAW_TOTAL' };
  const scale = target / rawTotal;
  const result = { status: 'COMPLETE', scale,
    starters: starters.map(p => ({ ...p, projectedShots: p.raw * scale })), bench: bench.map(p => ({ ...p, projectedShots: p.raw * scale })) };
  result.starterShots = sum(result.starters.map(p => p.projectedShots)); result.substituteShots = sum(result.bench.map(p => p.projectedShots));
  assert(Math.abs(result.starterShots + result.substituteShots - target) < 1e-8);
  return result;
}
function baselineEngine(source) {
  const prior = source.match(/const PLAYER_VOLUME_PRIORS = Object\.freeze\([\s\S]*?\);/)?.[0];
  const scale = namedFunction(source, 'scalePlayerVolume'), stability = namedFunction(source, 'playerBaselineStability'), minutes = namedFunction(source, 'expectedMinutes');
  assert(prior && scale && stability && minutes, 'Archived baseline implementation unavailable');
  const context = vm.createContext({});
  vm.runInContext(`const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const round=(x,n=1)=>Number(x.toFixed(n));const sum=a=>a.reduce((s,x)=>s+x,0);\n${prior}\n${scale}\n${stability}\n${minutes}\nthis.rate=(player,current)=>{const item=scalePlayerVolume([{role:player.role,player}],'shots',null)[0];return playerBaselineStability({historicalBaseline:item.value,historicalObserved:item.observed,historicalMinutes:item.minutes,current,key:'shots'});};this.minutes=(player,current)=>expectedMinutes({role:player.role,player},current);`, context, { timeout: 3000 });
  return { rate(player, current) { context.player = player; context.current = current; return vm.runInContext('rate(player,current)', context, { timeout: 3000 }); },
    minutes(player, current) { context.player = player; context.current = current; return vm.runInContext('minutes(player,current)', context, { timeout: 3000 }); } };
}
function individualEvidence(member, current) {
  const historic = member.previousSeason?.totals;
  const historical = finite(historic?.minutes) && historic.minutes > 0 && finite(historic.per90?.shots);
  const observedCurrent = finite(current?.minutes) && current.minutes > 0 && current.shotsCoverage >= CONFIG.minimumCurrentShotObservations && finite(current.shots);
  return historical ? (observedCurrent ? 'OBSERVED_HISTORICAL_AND_CURRENT' : 'OBSERVED_HISTORICAL') : observedCurrent ? 'OBSERVED_CURRENT_WITH_EXISTING_ROLE_REGULARIZATION' : null;
}
function run({ officialCohort = false } = {}) {
  const receipts = new Map(), archiveReceipts = [], archiveCache = new Map(), modelCache = new Map();
  const read = f => { const b = fs.readFileSync(path.join(root, f)); receipts.set(f, hash(b)); return JSON.parse(b); };
  const audit = read(officialCohort ? 'output/starter-substitute-budget-prototype/official-cohort-input.json' : 'output/individual-probability-audit/expanded.json');
  const diagnosis = officialCohort ? audit : read('output/individual-shots-diagnosis/latest.json');
  const components = officialCohort ? audit : read('output/individual-shot-components/latest.json');
  const matches = read('data/normalized/matches.json');
  const git = args => cp.execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 });
  const archived = id => {
    if (archiveCache.has(id)) return archiveCache.get(id);
    let bytes;
    if (/^[a-f0-9]{40}:/.test(id)) bytes = git(['show', id]);
    else { bytes = fs.readFileSync(path.join(root, id)); receipts.set(id, hash(bytes)); if (id.endsWith('.gz')) bytes = zlib.gunzipSync(bytes); }
    const proof = audit.archives.find(a => a.sourceId === id); if (proof) assert.equal(hash(bytes), proof.sha256);
    archiveReceipts.push({ sourceId: id, sha256: hash(bytes) }); const data = JSON.parse(bytes); archiveCache.set(id, data); return data;
  };
  function model(commit) {
    if (modelCache.has(commit)) return modelCache.get(commit);
    const source = git(['show', `${commit}:scripts/predictions/engine.js`]).toString();
    archiveReceipts.push({ sourceId: `${commit}:scripts/predictions/engine.js`, sha256: hash(source) });
    const result = baselineEngine(source); modelCache.set(commit, result); return result;
  }
  function protect(dir) {
    if (!fs.existsSync(path.join(root, dir))) return;
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const f = `${dir}/${e.name}`; if (e.isDirectory()) protect(f); else receipts.set(f, hash(fs.readFileSync(path.join(root, f))));
    }
  }
  protect('output/individual-probability-calibration/prospective');
  for (const f of ['data/normalized/predictions.json', 'scripts/predictions/engine.js']) receipts.set(f, hash(fs.readFileSync(path.join(root, f))));
  const teams = [], rows = [], exclusions = [], roleSet = new Set(['Difensore', 'Centrocampista', 'Attaccante']);
  const fixtures = audit.fixtureAudit.filter(f => f.competition === 'serie-a' && components.teams.some(t => t.matchId === f.matchId));
  for (const [index, f] of fixtures.entries()) {
    const data = archived(f.sourceId), prediction = data.predictions?.find(p => p.matchId === f.matchId) || data.publishedPrediction;
    if (!prediction?.shooters?.allPlayers) continue;
    const commit = /^[a-f0-9]{40}:/.test(f.sourceId) ? f.sourceId.split(':')[0] : git(['rev-list', '-1', `--before=${f.availableAt}`, 'HEAD']).toString().trim();
    let history, official;
    try { history = archived(`${commit}:data/normalized/matches.json`); official = archived(`${commit}:data/sources/official-lineups-2026-27.json`); }
    catch { exclusions.push({ matchId: f.matchId, reason: 'ARCHIVED_HISTORY_OR_LINEUPS_UNAVAILABLE' }); continue; }
    for (const projection of prediction.teamProjections || []) {
      const pool = prediction.shooters.allPlayers.filter(p => p.teamId === projection.teamId);
      const starters = pool.map(p => ({ playerId: p.playerId, role: p.role, expectedMinutes: p.expectedMinutes, stage: playerStages(p), source: p }));
      const teamRecord = { matchId: f.matchId, matchday: f.matchday, teamId: projection.teamId, modelVersion: f.modelVersion,
        sourceId: f.sourceId, contextCommit: commit, availableAt: f.availableAt, target: projection.shotsTotal?.central };
      teams.push(teamRecord);
      if (starters.length !== 10 || starters.some(s => !s.stage || !roleSet.has(s.role))) { teamRecord.status = 'ABSTAIN'; teamRecord.reason = 'INCOMPLETE_STARTER_COMPONENTS'; continue; }
      let squad;
      try { squad = archived(`${commit}:data/teams/${projection.teamId}.json`).squad; }
      catch { teamRecord.status = 'ABSTAIN'; teamRecord.reason = 'ARCHIVED_ROSTER_UNAVAILABLE'; continue; }
      if (new Set(squad.filter(p => p.id).map(p => p.id)).size !== squad.filter(p => p.id).length) { teamRecord.status = 'ABSTAIN'; teamRecord.reason = 'DUPLICATE_ROSTER_ID'; continue; }
      const actualMatch = matches.find(m => m.id === f.matchId);
      const observedRoster = actualMatch?.playerStats?.[projection.venue] || [];
      if (observedRoster.length && observedRoster.every(p => squad.some(s => s.id === p.playerId) && finite(p.minutes) && p.minutes >= 0 && p.minutes <= 90)) {
        const outfield = observedRoster.filter(p => squad.find(s => s.id === p.playerId).role !== 'Portiere');
        const actualStarterIds = outfield.filter(p => p.starter).map(p => p.playerId);
        teamRecord.projectedXiMatchesActual = actualStarterIds.length === 10 && actualStarterIds.every(id => starters.some(s => s.playerId === id));
        teamRecord.actualOutfieldMinutes = sum(outfield.map(p => p.minutes));
        teamRecord.actualMinuteStatus = Math.abs(teamRecord.actualOutfieldMinutes - 900) <= 1 ? 'STANDARD_900_MINUTE_ACCOUNTING' : 'NON_STANDARD_OR_INCONSISTENT_TOTAL_MINUTES';
        if (teamRecord.actualMinuteStatus === 'STANDARD_900_MINUTE_ACCOUNTING') {
          teamRecord.actualStarterMinutes = sum(outfield.filter(p => p.starter).map(p => p.minutes));
          teamRecord.actualSubstituteMinutes = sum(outfield.filter(p => !p.starter).map(p => p.minutes));
        }
      }
      const starterIds = new Set(starters.map(p => p.playerId));
      const officialTeam = official.fixtures?.find(g => g.matchId === f.matchId)?.teams?.find(t => t.teamId === projection.teamId);
      const officialOutfield = (officialTeam?.players || []).map(p => p.playerId).filter(id => squad.find(p => p.id === id)?.role !== 'Portiere');
      const officialMatches = officialOutfield.length === 10 && officialOutfield.every(id => starterIds.has(id));
      const confirmedBench = officialMatches && Array.isArray(officialTeam.substitutes) ? new Set(officialTeam.substitutes.map(p => p.playerId).filter(Boolean)) : null;
      teamRecord.benchStatus = confirmedBench ? 'OFFICIAL_NAMED_BENCH_WITH_MATCHING_XI' : 'POTENTIAL_ROSTER_BENCH_AVAILABILITY_UNCONFIRMED';
      const candidates = [], rejected = [];
      for (const p of squad) {
        if (!p.id || starterIds.has(p.id) || !roleSet.has(p.role) || (confirmedBench && !confirmedBench.has(p.id))) continue;
        if (['injured', 'suspended', 'unavailable', 'infortunato', 'squalificato'].includes(p.status)) { rejected.push({ playerId: p.id, reason: 'EXPLICITLY_UNAVAILABLE' }); continue; }
        const evidence = rotationEvidence(history, projection.teamId, p.id, f.matchday, f.availableAt);
        const sameRole = starters.filter(s => s.role === p.role);
        const roleMatchupProxy = mean(sameRole.map(s => s.stage.matchupFactor));
        candidates.push({ playerId: p.id, role: p.role, name: p.name, ...evidence, roleMatchupProxy, member: p });
      }
      const minutes = allocateMinutes(starters, candidates);
      teamRecord.minutes = minutes; teamRecord.candidateCount = candidates.length; teamRecord.rejectedCandidates = rejected;
      teamRecord.rotationCandidates = candidates.map(({ member, ...p }) => p);
      if (minutes.status !== 'COMPLETE') { teamRecord.status = 'ABSTAIN'; teamRecord.reason = minutes.reason; continue; }
      const bench = []; let unknown = null;
      for (const allocated of minutes.allocations) {
        const candidate = candidates.find(p => p.playerId === allocated.playerId), evidenceType = individualEvidence(candidate.member, candidate.current);
        if (!evidenceType || !finite(candidate.roleMatchupProxy)) { unknown = { playerId: candidate.playerId, reason: 'BENCH_BASELINE_OR_MATCHUP_PROXY_UNAVAILABLE' }; break; }
        const baseline = model(commit).rate(candidate.member, candidate.current);
        if (!finite(baseline.value) || baseline.value < 0) { unknown = { playerId: candidate.playerId, reason: 'BENCH_BASELINE_INVALID' }; break; }
        bench.push({ playerId: candidate.playerId, role: candidate.role, expectedMinutes: allocated.minutes,
          baselinePer90: baseline.value, baselineEvidence: baseline, individualEvidenceType: evidenceType, matchupProxy: candidate.roleMatchupProxy,
          raw: baseline.value * candidate.roleMatchupProxy * allocated.minutes / 90 });
      }
      if (unknown) { teamRecord.status = 'ABSTAIN'; teamRecord.reason = unknown.reason; teamRecord.unknown = unknown; continue; }
      const rawSum = sum(starters.map(s => s.stage.rawFull)), originalScale = projection.shotsTotal.central / rawSum;
      const rawStarters = starters.map(s => ({ playerId: s.playerId, role: s.role, expectedMinutes: s.expectedMinutes,
        baselinePer90: s.stage.stabilizedPer90, matchupFactor: s.stage.matchupFactor,
        raw: s.source.projectedShots / originalScale }));
      const budget = jointBudget(projection.shotsTotal.central, rawStarters, bench);
      teamRecord.budget = budget; teamRecord.status = budget.status; teamRecord.reason = budget.reason || null;
      if (budget.status !== 'COMPLETE') continue;
      const observed = components.teams.find(t => t.matchId === f.matchId && t.teamId === projection.teamId);
      teamRecord.actualStarterShots = observed?.actualStarterShots ?? null; teamRecord.actualSubstituteShots = observed?.actualSubstituteShots ?? null;
      for (const s of budget.starters) {
        const actual = diagnosis.rows.find(r => r.matchId === f.matchId && r.teamId === projection.teamId && r.playerId === s.playerId);
        if (!actual) continue;
        const priorControl = components.folds.find(fold => fold.version === f.modelVersion && fold.testMatchday === f.matchday);
        const controlMu = priorControl && observed?.finalSum > 0 ? actual.mu / observed.finalSum * projection.shotsTotal.central * (1 - priorControl.substituteShare) : null;
        rows.push({ ...actual, jointBudget: { mu: s.projectedShots, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, tail(s.projectedShots, t)])) },
          empiricalReserveControl: { mu: controlMu, probabilities: Object.fromEntries([1, 2, 3].map(t => [t, controlMu === null ? null : tail(controlMu, t)])) } });
      }
    }
    if ((index + 1) % 15 === 0) console.log(`Reconstructed ${index + 1}/${fixtures.length} fixtures`);
  }
  const versions = [...new Set(teams.map(t => t.modelVersion))].sort();
  const heldout = rows.filter(r => components.folds.some(f => f.version === r.modelVersion && f.testMatchday === r.matchday));
  const comparisons = Object.fromEntries(versions.map(v => [v, Object.fromEntries([1, 2, 3].map(t => [t, compare(heldout.filter(r => r.modelVersion === v), 'jointBudget', t)]))]));
  const empiricalReserveComparisons = Object.fromEntries(versions.map(v => [v, Object.fromEntries([1, 2, 3].map(t => [t, compare(heldout.filter(r => r.modelVersion === v), 'empiricalReserveControl', t)]))]));
  const strictXiRows = heldout.filter(r => teams.some(t => t.matchId === r.matchId && t.teamId === r.teamId && t.projectedXiMatchesActual));
  const strictXiComparisons = Object.fromEntries(versions.map(v => [v, Object.fromEntries([1, 2, 3].map(t => [t, compare(strictXiRows.filter(r => r.modelVersion === v), 'jointBudget', t)]))]));
  const coverage = Object.fromEntries(versions.map(v => {
    const ts = teams.filter(t => t.modelVersion === v), complete = ts.filter(t => t.status === 'COMPLETE');
    const minuteTeams = complete.filter(t => finite(t.actualStarterMinutes) && t.projectedXiMatchesActual);
    return [v, { teams: ts.length, complete: complete.length, abstained: ts.length - complete.length,
      reasons: ts.filter(t => t.status !== 'COMPLETE').reduce((a, t) => { a[t.reason] = (a[t.reason] || 0) + 1; return a; }, {}),
      expectedStarterMinutes: round(mean(complete.map(t => t.minutes.starterMinutes))), expectedSubstituteMinutes: round(mean(complete.map(t => t.minutes.substituteMinutes))),
      minuteComparisonIdenticalXiAndTeams: { n: minuteTeams.length,
        expectedStarterMinutes: round(mean(minuteTeams.map(t => t.minutes.starterMinutes))),
        actualStarterMinutes: round(mean(minuteTeams.map(t => t.actualStarterMinutes))),
        expectedSubstituteMinutes: round(mean(minuteTeams.map(t => t.minutes.substituteMinutes))),
        actualSubstituteMinutes: round(mean(minuteTeams.map(t => t.actualSubstituteMinutes))) },
      observedMinuteStatus: complete.reduce((a, t) => { const k = t.actualMinuteStatus || 'IDENTITY_OR_MINUTES_UNAVAILABLE'; a[k] = (a[k] || 0) + 1; return a; }, {}),
      predictedStarterShots: round(mean(complete.map(t => t.budget.starterShots))), actualStarterShots: round(mean(complete.filter(t => finite(t.actualStarterShots)).map(t => t.actualStarterShots))),
      predictedSubstituteShots: round(mean(complete.map(t => t.budget.substituteShots))), actualSubstituteShots: round(mean(complete.filter(t => finite(t.actualSubstituteShots)).map(t => t.actualSubstituteShots))) }];
  }));
  for (const [file, before] of receipts) assert.equal(hash(fs.readFileSync(path.join(root, file))), before, `Protected input changed: ${file}`);
  const report = { generatedAt: new Date().toISOString(), evaluationCohort: officialCohort ? 'LAST_PREMATCH_MATCHING_OFFICIAL_XI' : 'FIRST_AVAILABLE_PREMATCH_FORECAST', config: CONFIG, productionChanged: false, statisticallyApproved: false,
    coverage, comparisons, empiricalReserveComparisons, strictXiComparisons, teams, rows, heldout, exclusions, archiveReceipts, inputHashes: Object.fromEntries(receipts),
    limitations: ['Retrospective exploratory prototype after inspecting historical results. No independent confirmatory validation.',
      'Starter baseline, minutes, matchup and relative allocation are preserved. Common team normalization is replaced by joint starter-plus-substitute normalization.',
      'Bench roles use canonical broad role; specific player-to-player substitution pairings are unknown.',
      'Bench matchup is an explicit same-role proxy from projected starters, not a measured individual matchup.',
      'Historical named-bench entry frequency is a capacity constraint, not a calibrated game-specific entry probability.',
      'Potential roster bench has unconfirmed availability unless an archived official named bench matches the projected XI.',
      'No role-only shots imputation: individual historical evidence or at least two observed current shooting appearances required; current-only players retain existing engine role regularization, explicitly tagged.',
      'Fixed formulas with no tuning or winner selection. Comparison uses identical players and original probabilities on each eligible team.',
      'Minute diagnostic requires exact full-XI agreement and total observed outfield minutes within one minute of 900; other totals are excluded without assuming they are necessarily wrong.',
      'Main player evaluation conditions on each compared player actually starting; a separate strict full-XI cohort is also reported.',
      'No DUO probability, odds, EV, operational integration, or changes to existing frozen prospective forecasts.'] };
  const out = path.join(root, 'output/starter-substitute-budget-prototype', officialCohort ? 'official' : ''); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = ['# Prototipo del budget tiri: titolari e subentranti', '',
    `Campione: ${report.evaluationCohort}. Modello interno sperimentale: conserva baseline, matchup, minuti e quote relative dei titolari; aggiunge minuti e tiri delle riserve prima della normalizzazione comune al totale squadra.`, '',
    'I minuti residui per ruolo sono ripartiti con le precedenti presenze dalla panchina dei giocatori disponibili in rosa. Il limite per ogni riserva è 90 volte la frequenza storica di ingresso quando nominata in panchina. Dati e identità mancanti producono astensione, non uno zero. Per le baseline sono ammessi dati individuali storici oppure almeno due osservazioni correnti; il solo prior di ruolo non basta.', '',
    '## Copertura e budget', '',
    '| Versione | Squadre-gara | Complete | Astensioni | Minuti titolari | Minuti riserve | Tiri riserve previsti | Tiri riserve reali |', '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...Object.entries(coverage).map(([v, c]) => `| ${v} | ${c.teams} | ${c.complete} | ${c.abstained} | ${c.expectedStarterMinutes} | ${c.expectedSubstituteMinutes} | ${c.predictedSubstituteShots} | ${c.actualSubstituteShots} |`), '',
    '## Controllo del minutaggio sullo stesso campione', '',
    ...Object.entries(coverage).map(([v, c]) => { const m = c.minuteComparisonIdenticalXiAndTeams; return `${v}: sullo stesso undici e sulle stesse ${m.n} squadre-gara, minuti riserve previsti ${m.expectedSubstituteMinutes}, osservati ${m.actualSubstituteMinutes}; minuti titolari previsti ${m.expectedStarterMinutes}, osservati ${m.actualStarterMinutes}. Altri stati di copertura dei minuti: ${JSON.stringify(c.observedMinuteStatus)}.`; }), '',
    '## Confronto temporale', '',
    officialCohort ? 'Giornate complete successive ad almeno due giornate complete della stessa versione, 15 gare e 200 giocatori-gara negli archivi ufficiali. Solo dati precedenti alla fixture negli input di ciascuna previsione.' : 'Stesse giornate di verifica della precedente analisi delle componenti; solo dati delle giornate precedenti negli input di ciascuna fixture.', '',
    '| Versione | Soglia | N | Gare | Brier originale | Brier prototipo | Differenza | IC95% per gara |', '|---|---:|---:|---:|---:|---:|---:|---|',
    ...Object.entries(comparisons).flatMap(([v, ts]) => Object.entries(ts).map(([t, c]) => `| ${v} | ${t}+ | ${c.n} | ${c.matches} | ${c.originalBrier ?? 'N/D'} | ${c.alternativeBrier ?? 'N/D'} | ${c.pairedDelta ?? 'N/D'} | ${JSON.stringify(c.pairedFixtureBootstrap95)} |`)), '',
    'Differenza negativa = errore minore. Non basta migliorare una soglia per promuovere il modello; valutare anche astensioni e ipotesi sulle riserve. Il controllo con la semplice quota empirica dei subentrati, sulle stesse righe, è in latest.json (empiricalReserveComparisons). Il sottocampione con l’intero undici previsto coincidente con quello effettivo è separato in strictXiComparisons.', '',
    '## Astensioni', '', ...Object.entries(coverage).map(([v, c]) => `${v}: ${JSON.stringify(c.reasons)}`), '',
    '## Ipotesi e limiti', '', ...report.limitations.map(s => `- ${s}`), '',
    'Dettaglio verificabile di candidati, minuti, slot, baseline, budget dei tiri e hash degli archivi in latest.json. Nessuna modifica ai pronostici pubblicati.'];
  fs.writeFileSync(path.join(out, 'latest.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ evaluationCohort: report.evaluationCohort, coverage, comparisons, fixtures: fixtures.length, heldout: heldout.length, output: path.relative(root, path.join(out, 'latest.md')) }));
  return report;
}
if (require.main === module) run({ officialCohort: process.argv.includes('--official-cohort') });
module.exports = { CONFIG, cappedMinutes, allocateMinutes, rotationEvidence, jointBudget, baselineEngine, individualEvidence, run };
