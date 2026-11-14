'use strict';
// Refresh only missing team-foul projections for scheduled fixtures in one round.
// Other forecasts, contracts and completed matches retain their original contents.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {buildProfiles} = require('./build-team-matchup-profiles');
const {teamFoulProjection} = require('./predictions/engine');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
function refresh(matchday) {
  assert(Number.isInteger(matchday) && matchday >= 1 && matchday <= 38, 'Specificare --matchday 1..38');
  const matches = read('data/normalized/matches.json');
  const fixtures = new Map(matches.filter(m => m.competition === 'serie-a' && m.season === '2026-27'
    && m.matchday === matchday && m.status === 'scheduled').map(m => [m.id, m]));
  const dataset = read('data/normalized/predictions.json');
  const before = structuredClone(dataset);
  const snapshot = buildProfiles({asOfMatchday: matchday});
  const profiles = new Map(snapshot.profiles.map(p => [p.teamId, p]));
  const discipline = new Map(read('data/normalized/team-referee-profiles.json').profiles.map(p => [p.teamId, p]));
  const changes = [];
  for (const prediction of dataset.predictions) {
    const fixture = fixtures.get(prediction.matchId);
    if (!fixture) continue;
    for (const team of prediction.teamProjections || []) {
      if (team.fouls != null) continue;
      assert([fixture.homeTeam, fixture.awayTeam].includes(team.teamId));
      const result = teamFoulProjection(discipline.get(team.teamId), profiles.get(team.teamId));
      if (!result.fouls || !result.basis) continue;
      team.fouls = result.fouls;
      team.foulsBasis = result.basis;
      changes.push({matchId: fixture.id, teamId: team.teamId, ...result});
    }
  }
  // Prove the refresh changed only the two fields declared above.
  const restored = structuredClone(dataset);
  for (const change of changes) {
    const team = restored.predictions.find(p => p.matchId === change.matchId).teamProjections.find(t => t.teamId === change.teamId);
    const original = before.predictions.find(p => p.matchId === change.matchId).teamProjections.find(t => t.teamId === change.teamId);
    for (const key of ['fouls', 'foulsBasis']) {
      if (Object.hasOwn(original, key)) team[key] = original[key];
      else delete team[key];
    }
  }
  assert.deepEqual(restored, before, 'Modifica fuori ambito');
  if (changes.length) fs.writeFileSync(path.join(root, 'data/normalized/predictions.json'), JSON.stringify(dataset, null, 2) + '\n');
  console.log(JSON.stringify({matchday, changes}, null, 2));
  return changes;
}
module.exports = {refresh};
if (require.main === module) {
  const i = process.argv.indexOf('--matchday');
  refresh(i < 0 ? null : Number(process.argv[i + 1]));
}
