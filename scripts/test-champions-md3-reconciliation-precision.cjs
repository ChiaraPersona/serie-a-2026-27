'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {projectDocumentedTeam} = require('./champions/current-season-offline');
const {scaleShotProjections} = require('./champions/player-volume-utils');

const frozen = JSON.parse(fs.readFileSync('data/normalized/champions-md03-probable-individuals-2026-27.json', 'utf8'));
const released = new Set(['fenerbahce', 'bayern-munchen', 'club-brugge']);
let unchanged = 0;
for (const team of frozen.fixtures.flatMap(fixture => fixture.teams)) {
  const original = team.reconciliation;
  const raw = original.players.length ? original.players : original.diagnostic?.unapprovedRaw || [];
  if (!raw.length) continue;
  const ids = new Set(raw.map(row => row.playerId));
  const players = team.players.filter(player => ids.has(player.playerId)).map(player => ({
    playerId: player.playerId,
    roleKey: player.uefaRole,
    expectedMinutes: player.expectedMinutes,
    per90: {shots: player.baseline.candidate.shots, shotsOnTarget: player.baseline.candidate.sot}
  }));
  assert.equal(players.length, raw.length, `${team.teamId}: input identity`);
  const input = {teamId: team.teamId, players, lineupVerified: true, benchVerified: true,
    targetShots: original.targetShots, targetSOT: original.targetSOT};
  const before = structuredClone(input);
  const result = projectDocumentedTeam(input);
  assert.deepEqual(input, before, `${team.teamId}: input mutated`);
  assert.deepEqual(projectDocumentedTeam(input), result, `${team.teamId}: non-idempotent`);
  if (released.has(team.teamId)) {
    assert.equal(original.status, 'blocked-existing-reconciliation-limit');
    assert.equal(result.status, 'offline-conditional-only', team.teamId);
    assert(Math.abs(result.shotsDifference) <= 0.02 && Math.abs(result.sotDifference) <= 0.02);
    assert(result.players.every(row => row.sot <= row.shots));
    for (const [key, target, field] of [['shots', original.targetShots, 'shots'], ['shotsOnTarget', original.targetSOT, 'sot']]) {
      const scaled = scaleShotProjections(players, key, target, 4);
      for (const row of result.players) assert.equal(row[field], scaled.find(item => item.player.playerId === row.playerId).projection,
        `${team.teamId}: arbitrary allocation`);
    }
    assert.equal(team.players.filter(player => player.projectedRole === 'starter' && player.uefaRole !== 'goalkeeper' && ids.has(player.playerId)).length, 10);
  } else if (original.status === 'offline-conditional-only') {
    assert.equal(result.status, original.status, team.teamId);
    assert.deepEqual(result.players, original.players, `${team.teamId}: previously usable projection changed`);
    unchanged++;
  } else {
    assert.equal(result.status, original.status, `${team.teamId}: unrelated blocker changed`);
  }
}
assert.equal(released.size, 3);
assert(unchanged > 15, 'operational-team regression coverage');
console.log(`OK: 3 rounding-only teams released; ${unchanged} operational team allocations unchanged; inputs, idempotence, conservation and factor allocation verified.`);
