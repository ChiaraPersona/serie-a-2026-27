import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bookingsMarkup} from '../js/pages/reading-detail/bookings.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const id='ucl-2026-27-md04-01';
const prediction=read('data/generated/champions-shared-scenarios.json').fixtures.find(f=>f.fixtureId===id);
const fixture=read('data/normalized/champions-md04-probable-individuals-2026-27.json').fixtures.find(f=>f.fixtureId===id);
const evidence={lineups:fixture.teams.map(t=>({status:t.status,players:t.players.filter(p=>p.projectedRole==='starter').map(p=>({id:p.playerId}))}))};
assert.match(bookingsMarkup({prediction},evidence),/Candidati ammonizione N\/D/);
// A ranking must stay fixture-scoped and cannot reintroduce a nonstarter.
const source=read('data/normalized/champions-player-markets-md01-2026-27.json').fixtures[0];
const before=JSON.stringify(source),candidate=source.likelyBooked[0];
const eligible={lineups:[{status:'official',players:[{id:candidate.playerId}]}]};
const html=bookingsMarkup({prediction:source},eligible);
assert(html.includes(candidate.name));assert.match(html,/Indice comparativo, non probabilità/);
assert(!html.includes('Quota'));assert(!html.includes('data-rd-pick'));
assert(!bookingsMarkup({prediction:source},{lineups:[{status:'official',players:[]}]}).includes(candidate.name));
assert.equal(JSON.stringify(source),before);
console.log('PASS fixture-scoped Champions bookings, missing ranking and official starter exclusions');
