'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {collectRosterEvidence, estimateExpectedMinutes} = require('../../scripts/champions/substitute-minutes');
const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const ids = ['como','lille','manchester-united','roma','slavia-praha','shakhtar-donetsk','slovan-bratislava','sabah'];
const individuals = read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const fixtures = individuals.fixtures.filter(f => f.teams.some(t => ids.includes(t.teamId)));
const teams = fixtures.flatMap(f => f.teams.filter(t => ids.includes(t.teamId)).map(t => ({fixture: f, team: t})));
const providerIds = new Set(teams.flatMap(({team}) => team.players.filter(p => p.projectedRole === 'starter').map(p => p.providerPlayerId)).filter(Boolean).map(String));
const records = collectRosterEvidence(path.resolve(__dirname, '../..'), providerIds);
const output = teams.map(({fixture, team}) => ({teamId: team.teamId, fixtureId: fixture.fixtureId,
  targetShots: team.reconciliation.targetShots, targetSOT: team.reconciliation.targetSOT, reconciliation: team.reconciliation.status,
  benchStatus: team.benchStatus, starters: team.players.filter(p => p.projectedRole === 'starter').map(p => {
    const rows = records.get(String(p.providerPlayerId)) || [];
    const estimate = estimateExpectedMinutes(rows, 'starter', fixture.kickoffAt);
    return {playerId: p.playerId, providerPlayerId: p.providerPlayerId,
      exactStarts: estimate.sample?.exactStarterAppearances ?? 0,
      expectedMinutesIfConnected: estimate.expectedMinutes,
      minuteSampleMatchIds: estimate.sample?.matchIds || [],
      currentExpectedMinutes: p.expectedMinutes,
      shotsPer90: p.baseline?.candidate?.shots ?? null, sotPer90: p.baseline?.candidate?.sot ?? null,
      blockers: p.blockers};
  })}));
fs.writeFileSync('output/champions-md3-statistics-completion/targeted-evidence.json', JSON.stringify(output, null, 2) + '\n');
console.log(output.map(t => ({id:t.teamId,exactMinutes:t.starters.filter(p => p.expectedMinutesIfConnected !== null).length,
  outfieldRates:t.starters.filter(p => p.shotsPer90 !== null).length,
  missing:t.starters.filter(p => p.expectedMinutesIfConnected === null).map(p=>p.playerId)})));
