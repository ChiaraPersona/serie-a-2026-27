'use strict';
const { allocateMinutes, rotationEvidence, individualEvidence, jointBudget } = require('./starter-substitute-budget-core.cjs');
const { expectedMinutes, playerBaselineStability, scalePlayerVolume, poissonAtLeast, outsiderQualification } = require('./engine');
const { toKickoffUtc } = require('./snapshot-core');
const { rankShooterCandidates } = require('./rank-shooter-candidates');
const finite = Number.isFinite, sum = xs => xs.reduce((s, x) => s + x, 0), mean = xs => xs.length ? sum(xs) / xs.length : null;
const VERSION = 'starter-substitute-joint-budget-v1';
function apply({ prediction, match, matches, squads, officialLineups, probableLineups, teamMatchupProfiles, policy, now = new Date() }) {
  if (!policy?.enabled || !policy.fixtureIds?.includes(match.id)) return prediction;
  const kickoff = toKickoffUtc(match);
  if (match.status !== 'scheduled' || !kickoff || kickoff <= now.getTime()) return prediction;
  if (prediction.shooters?.starterSubstituteBudget?.version === VERSION) return prediction;
  const shooters = prediction.shooters;
  if (!Array.isArray(shooters?.allPlayers)) return prediction;
  const audits = [], updated = new Map();
  for (const projection of prediction.teamProjections || []) {
    const pool = shooters.allPlayers.filter(p => p.teamId === projection.teamId), squad = squads.get(projection.teamId)?.players || [];
    const audit = { teamId: projection.teamId, target: projection.shotsTotal?.central, status: 'ABSTAIN', reason: null }; audits.push(audit);
    const reject = reason => { audit.reason = reason; for (const p of pool) updated.set(p.playerId, { ...p, projectedShots: null,
      shotProbabilities: { over05: null, over15: null, over25: null }, qualifiedOutsider: false,
      shotsBudgetStatus: 'UNAVAILABLE', shotsBudgetReason: reason }); };
    const starters = pool.map(p => {
      const member = squad.find(s => s.id === p.playerId), baseline = p.playerBaselineStability?.value;
      if (!member || !finite(baseline) || !finite(p.shotsMatchupFactor) || !(p.minutesFactor > 0)) return null;
      const current = rotationEvidence(matches, projection.teamId, p.playerId, match.matchday, now.toISOString()).current;
      const minutes = expectedMinutes({ player: member, role: p.role }, current);
      return { playerId: p.playerId, role: p.role, expectedMinutes: minutes.expectedMinutes, minuteEvidence: minutes.evidence,
        baseline, matchup: p.shotsMatchupFactor, oldMinutesFactor: p.minutesFactor, source: p };
    });
    if (starters.length !== 10 || starters.some(p => !p)) { reject('STARTER_RATE_OR_ID_UNAVAILABLE'); continue; }
    const ids = new Set(pool.map(p => p.playerId)), off = officialLineups.fixtures?.find(f => f.matchId === match.id)?.teams.find(t => t.teamId === projection.teamId);
    const officialMatches = off?.players?.length === 11 && pool.every(p => off.players.some(o => o.playerId === p.playerId));
    const named = officialMatches && Array.isArray(off.substitutes) ? new Set(off.substitutes.map(p => p.playerId).filter(Boolean)) : null;
    const probable = probableLineups.teams?.find(t => t.matchId === match.id && t.teamId === projection.teamId);
    const unavailable = new Set(['unavailable', 'suspended'].flatMap(k => (probable?.[k] || []).map(p => p.playerId).filter(Boolean)));
    audit.lineupStatus = officialMatches ? 'official' : 'probable';
    audit.benchStatus = named ? 'OFFICIAL_NAMED_BENCH' : 'POTENTIAL_ROSTER_BENCH';
    const candidates = squad.filter(p => p.id && !ids.has(p.id) && ['Difensore', 'Centrocampista', 'Attaccante'].includes(p.role)
      && (!named || named.has(p.id)) && (named || !unavailable.has(p.id))).map(member => ({
        playerId: member.id, role: member.role, member,
        ...rotationEvidence(matches, projection.teamId, member.id, match.matchday, now.toISOString()),
        roleMatchupProxy: mean(starters.filter(s => s.role === member.role).map(s => s.matchup))
      }));
    const minutes = allocateMinutes(starters, candidates); audit.minutes = minutes;
    if (minutes.status !== 'COMPLETE') { reject(minutes.reason); continue; }
    const bench = []; let invalid = false;
    for (const a of minutes.allocations) {
      const p = candidates.find(p => p.playerId === a.playerId);
      if (!individualEvidence(p.member, p.current) || !finite(p.roleMatchupProxy)) { invalid = true; break; }
      const base = scalePlayerVolume([{ player: p.member, role: p.role }], 'shots', null)[0];
      const rate = playerBaselineStability({ historicalBaseline: base.value, historicalObserved: base.observed, historicalMinutes: base.minutes, current: p.current, key: 'shots' });
      bench.push({ playerId: p.playerId, role: p.role, expectedMinutes: a.minutes, baselinePer90: rate.value, matchupProxy: p.roleMatchupProxy,
        raw: rate.value * p.roleMatchupProxy * a.minutes / 90 });
    }
    if (invalid) { reject('BENCH_RATE_UNAVAILABLE'); continue; }
    const originalRaw = sum(starters.map(s => s.baseline * s.matchup * s.oldMinutesFactor)), originalScale = audit.target / originalRaw;
    const starterRates = starters.map(s => ({ ...s, source: undefined,
      raw: s.source.projectedShots / originalScale * Number((s.expectedMinutes / 90).toFixed(3)) / s.oldMinutesFactor }));
    const budget = jointBudget(audit.target, starterRates, bench); audit.budget = budget; audit.status = budget.status;
    if (budget.status !== 'COMPLETE') { reject(budget.reason); continue; }
    for (const s of budget.starters) {
      const old = pool.find(p => p.playerId === s.playerId), mu = Number(s.projectedShots.toFixed(4));
      const sotConsistent = !finite(old.projectedShotsOnTarget) || old.projectedShotsOnTarget <= mu;
      updated.set(s.playerId, { ...old, expectedMinutes: s.expectedMinutes,
        expectedMinutesByMetric: { shots: s.expectedMinutes, sot: old.expectedMinutes },
        projectedShots: mu, shotProbabilities: { over05: poissonAtLeast(mu, 1), over15: poissonAtLeast(mu, 2), over25: poissonAtLeast(mu, 3) },
        ...(sotConsistent ? {} : { projectedShotsOnTarget: null, shotOnTargetProbabilities: { over05: null, over15: null }, qualifiedSotOutsider: false }),
        shotsBudgetStatus: 'PRELIMINARY_USER_AUTHORIZED', shotsExpectedMinutesEvidence: s.minuteEvidence });
    }
  }
  shooters.allPlayers = shooters.allPlayers.map(p => updated.get(p.playerId) || p);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  for (const row of shooters.allPlayers) {
    if (!finite(row.projectedShots)) continue;
    const roleEligible = ['Difensore', 'Centrocampista'].includes(row.role) && row.allocationClass !== 'primary';
    if (!roleEligible || !finite(row.shotOnTargetProbabilities?.over05)) continue;
    const boost = row.baselineShots90 ? Number(((row.matchupAdjustedShots90 / row.baselineShots90 - 1) * 100).toFixed(1)) : 0;
    row.outsiderScore = Number(clamp(100 * (0.22 * clamp(row.baselineShots90 / 1.5, 0, 1)
      + 0.2 * clamp((row.matchupFactor - 0.94) / 0.24, 0, 1) + 0.17 * clamp((row.expectedMinutes - 60) / 30, 0, 1)
      + 0.13 * clamp(boost / 18, 0, 1) + 0.11 * row.shotProbabilities.over15 + 0.05 * row.shotOnTargetProbabilities.over05
      + 0.08 * clamp(((row.playerAllocationFactor || 1) - 0.85) / 0.3, 0, 1)
      + 0.04 * (row.allocationClass === 'secondary' ? clamp(teamMatchupProfiles?.get(row.teamId)?.offense?.secondaryShooterBreadth?.secondaryShooterShare || 0, 0, 1) : 0)), 0, 100).toFixed(1));
    const q = outsiderQualification(row, 'shots');
    row.outsiderConfidence = q.confidence; row.qualifiedOutsider = q.qualified;
    row.outsiderExclusionReasons = q.exclusionReasons; row.outsiderQualificationEvidence = q;
    if (row.outsiderEvidence) Object.assign(row.outsiderEvidence, { expectedMinutes: row.expectedMinutes,
      shots1PlusProbability: row.shotProbabilities.over05, shots2PlusProbability: row.shotProbabilities.over15 });
  }
  const sync = rows => (rows || []).map(p => ({ ...p, ...(updated.get(p.playerId) || {}) }));
  shooters.totalShots = rankShooterCandidates(shooters.allPlayers.filter(p => finite(p.projectedShots)), 'projectedShots', 'shotsOver05');
  shooters.shotsOnTarget = sync(shooters.shotsOnTarget).filter(p => finite(p.projectedShotsOnTarget));
  shooters.outsiders = shooters.allPlayers.filter(p => p.qualifiedOutsider && finite(p.projectedShots) && p.dataStatus !== 'role-baseline')
    .sort((a, b) => b.outsiderScore - a.outsiderScore || a.name.localeCompare(b.name, 'it')).slice(0, 5).map((p, i) => ({ ...p, outsiderRank: i + 1 }));
  shooters.sotOutsiders = sync(shooters.sotOutsiders).filter(p => finite(p.projectedShotsOnTarget));
  shooters.starterSubstituteBudget = { version: VERSION, status: 'PRELIMINARY_USER_AUTHORIZED', statisticallyValidated: false,
    sourcePolicy: 'data/sources/serie-a-starter-substitute-budget-policy.json', teams: audits,
    sotPolicy: 'Existing SOT model preserved; incompatible SOT greater than revised shots becomes unavailable.' };
  shooters.teamTotals = (shooters.teamTotals || []).map(t => { const audit = audits.find(a => a.teamId === t.teamId);
    return { ...t, projectedShots: audit?.status === 'COMPLETE' ? audit.budget.starterShots : null,
      projectedSubstituteShots: audit?.status === 'COMPLETE' ? audit.budget.substituteShots : null,
      jointProjectedShots: audit?.status === 'COMPLETE' ? audit.target : null }; });
  shooters.outsiderDiagnostics.shots = {
    qualified: shooters.allPlayers.filter(p => p.qualifiedOutsider).map(p => p.playerId),
    rejected: shooters.allPlayers.filter(p => p.outsiderScore != null && !p.qualifiedOutsider).map(p => ({ playerId: p.playerId, name: p.name, confidence: p.outsiderConfidence, reasons: p.outsiderExclusionReasons })) };
  return prediction;
}
module.exports = { apply, VERSION };
