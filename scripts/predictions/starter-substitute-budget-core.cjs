'use strict';
// Pure budget primitives promoted unchanged from the tested prototype.
const assert=require('node:assert/strict');
const CONFIG=Object.freeze({minimumNamedBenchSamples:2,minimumCurrentShotObservations:2});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const sum=xs=>xs.reduce((s,x)=>s+x,0);
const mean=xs=>xs.length?sum(xs)/xs.length:null;
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

function individualEvidence(member, current) {
  const historic = member.previousSeason?.totals;
  const historical = finite(historic?.minutes) && historic.minutes > 0 && finite(historic.per90?.shots);
  const observedCurrent = finite(current?.minutes) && current.minutes > 0 && current.shotsCoverage >= CONFIG.minimumCurrentShotObservations && finite(current.shots);
  return historical ? (observedCurrent ? 'OBSERVED_HISTORICAL_AND_CURRENT' : 'OBSERVED_HISTORICAL') : observedCurrent ? 'OBSERVED_CURRENT_WITH_EXISTING_ROLE_REGULARIZATION' : null;
}

module.exports={cappedMinutes,allocateMinutes,rotationEvidence,jointBudget,individualEvidence};
