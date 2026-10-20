'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {collectRosterEvidence, chronologicalEvidence, estimateExpectedMinutes} = require('../../scripts/champions/substitute-minutes');
const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const fixture = read('data/normalized/champions-md03-probable-individuals-2026-27.json').fixtures.find(f => f.fixtureId === 'ucl-2026-27-md03-01');
const team = fixture.teams.find(t => t.teamId === 'slavia-praha');
const starters = team.players.filter(p => p.projectedRole === 'starter');
const ids = new Set(starters.map(p => p.providerPlayerId).filter(Boolean).map(String));
const evidence = collectRosterEvidence(path.resolve(__dirname, '../..'), ids);
const database = read('data/normalized/champions-md03-player-database-2026-27.json').teams.find(t => t.teamId === team.teamId);
const result = starters.map(p => {
  const records = chronologicalEvidence(evidence.get(String(p.providerPlayerId)) || [], fixture.kickoffAt);
  const estimate = estimateExpectedMinutes(records, 'starter', fixture.kickoffAt);
  const member = database.players.find(x => x.playerId === p.playerId);
  return {playerId: p.playerId, name: p.canonicalName || p.sourceName, providerPlayerId: p.providerPlayerId,
    eligibleHistoricalMatchIds: estimate.sample?.matchIds || [], exactStarts: estimate.sample?.exactStarterAppearances ?? 0,
    expectedMinutesIfConnected: estimate.expectedMinutes, historicalShotsPer90: member?.previousSeason?.totals?.per90?.shots ?? null,
    historicalSOTPer90: member?.previousSeason?.totals?.per90?.shotsOnTarget ?? null,
    localCurrentShotsPer90: member?.currentSeason?.totals?.per90?.shots ?? null,
    localCurrentSOTPer90: member?.currentSeason?.totals?.per90?.shotsOnTarget ?? null};
});
fs.writeFileSync('output/champions-md3-reconciliation-pilot/slavia-evidence.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({exactMinuteEstimates: result.filter(p => Number.isFinite(p.expectedMinutesIfConnected)).length,
  missing: result.filter(p => !Number.isFinite(p.expectedMinutesIfConnected)).map(p => p.playerId)}));
