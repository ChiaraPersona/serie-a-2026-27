import assert from 'node:assert/strict';
import fs from 'node:fs';
import {championsStandingsDiscipline, fixtureDiscipline} from '../js/pages/champions-standings-discipline.mjs';

const report = {
  observedTeamStatistics: {
    home: {penaltyKickShots: 1, yellowCards: 1, redCards: 1},
    away: {penaltyKickShots: 0, yellowCards: 0, redCards: 0}
  },
  bookingEvents: [{team: 'home', eventType: 'yellow-card'}, {team: 'home', eventType: 'second-yellow-card'}]
};
assert.deepEqual(fixtureDiscipline(report, 'home'), {penalties: 1, cards: 2});
assert.deepEqual(fixtureDiscipline(report, 'away'), {penalties: 0, cards: 0});
assert.deepEqual(fixtureDiscipline(null, 'home'), {penalties: null, cards: null});
const fixture = {status: 'finished', homeTeam: 'A', awayTeam: 'B', matchReport: report};
const totals = championsStandingsDiscipline([fixture, {...fixture, status: 'scheduled'}]);
assert.deepEqual(totals.get('A'), {penaltiesFor: 1, penaltiesAgainst: 0, cardsFor: 0, cardsAgainst: 2});
assert.deepEqual(totals.get('B'), {penaltiesFor: 0, penaltiesAgainst: 1, cardsFor: 2, cardsAgainst: 0});
const incomplete = championsStandingsDiscipline([fixture, {...fixture, matchReport: null}]);
assert.equal(incomplete.get('A').penaltiesFor, null);
assert.equal(incomplete.get('B').cardsFor, null);
const conflict = structuredClone(report);
conflict.observedTeamStatistics.home.yellowCards = 0;
assert.equal(fixtureDiscipline(conflict, 'home').cards, null);

const calendar = JSON.parse(fs.readFileSync(new URL('../data/normalized/champions-league-2026-27.json', import.meta.url)));
const actual = championsStandingsDiscipline(calendar.fixtures);
assert.equal(actual.size, 36);
for (const key of ['penaltiesFor', 'penaltiesAgainst']) assert.equal([...actual.values()].filter(row => row[key] !== null).length, 36);
for (const key of ['cardsFor', 'cardsAgainst']) assert.equal([...actual.values()].filter(row => row[key] !== null).length, 34);
assert.equal(actual.get('Inter').cardsAgainst, null);
assert.equal(actual.get('Bayern München').cardsAgainst, null);
assert.equal(actual.get('Viking').cardsFor, null);
assert.equal(actual.get('Shakhtar Donetsk').cardsFor, null);
const penaltiesFor = [...actual.values()].reduce((sum, row) => sum + row.penaltiesFor, 0);
assert.equal(penaltiesFor, [...actual.values()].reduce((sum, row) => sum + row.penaltiesAgainst, 0));
console.log('OK: rigori 36/36 squadre; C+ e C- 34/36, conflitti e dati mancanti preservati come N/D.');
