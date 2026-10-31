'use strict';
// Refresh current identities only. Historical official lineups keep their coach.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
function sync() {
  const details = read('data/sources/team-pages/team-details-2026-27.json');
  const index = read('data/teams/index.json');
  for (const summary of index.teams) {
    const source = details.teams[summary.id];
    if (!source?.coach) throw Error('Missing coach: ' + summary.id);
    const file = `data/teams/${summary.id}.json`, team = read(file);
    for (const target of [team, summary]) {
      target.coach = source.coach;
      if (source.coachHistory) target.coachHistory = source.coachHistory;
      if (source.coachVerifiedOn) target.coachVerifiedOn = source.coachVerifiedOn;
      for (const lineup of [target.probableLineup, target.projectedLineup]) {
        if (lineup?.status === 'probable') lineup.coach = source.coach;
      }
    }
    write(file, team);
  }
  write('data/teams/index.json', index);
  console.log(`Allenatori sincronizzati: ${index.teams.length}; formazioni ufficiali storiche preservate.`);
}
module.exports = { sync };
if (require.main === module) sync();
