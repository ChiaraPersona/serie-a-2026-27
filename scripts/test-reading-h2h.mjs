import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectHistoryRows,historyMarkup,disciplineEvents,cardKind} from '../js/pages/reading-detail/head-to-head.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const model={competition:'serie-a',fixture:{date:'2026-10-18'}};
const first={providerFixtureId:'TEST_A',date:'2026-09-10',competition:'Test',homeTeam:{name:'Squadra completa di casa'},awayTeam:{name:'Squadra completa ospite'},score:{home:2,away:1},goals:[{player:'Marcatore A',minute:'45+2',team:'Casa'}],bookings:[{player:'Ammonito A',minute:0,team:'Casa',type:'yellow-card'},{player:'Espulso A',minute:80,type:'red-card',text:'Second yellow card.'}],coverage:{missingFields:[]}};
const second={...first,providerFixtureId:'TEST_B',date:'2026-09-01',goals:[{player:'Marcatore B',minute:51,team:'Ospite'}],bookings:undefined};
const history={previousMeetings:[second,first,{...first,date:'2026-10-19'},first]};
const original=JSON.stringify(history),rows=selectHistoryRows(model,history),html=historyMarkup(rows);
assert.deepEqual(rows.map(r=>r.id),['TEST_A','TEST_B']);assert.equal(JSON.stringify(history),original);
assert(!html.includes(' open'));assert(!html.includes('role="tab"'));assert(!html.includes('Uso nel modello'));assert(!html.includes('https://'));
assert(html.includes('Squadra completa di casa'));assert(html.includes('45+2′'));assert(html.includes('0′'));
assert.equal(cardKind({type:'red-card'}),'dismissal');assert.equal(cardKind({type:'direct-red'}),'direct-red');
assert.equal(disciplineEvents(first).yellow.length,1);assert.equal(disciplineEvents(first).red[0].kind,'second-yellow');
assert(html.indexOf('Marcatore A')<html.indexOf('data-h2h-id="TEST_B"'));assert(html.indexOf('Marcatore B')>html.indexOf('data-h2h-id="TEST_B"'));
const unknown=historyMarkup(selectHistoryRows(model,{previousMeetings:[{...first,goals:undefined,bookings:undefined}]}));
assert(unknown.includes('Dettaglio marcatori N/D'));assert(unknown.includes('Dettaglio ammoniti N/D'));assert(unknown.includes('Dettaglio espulsioni N/D'));
const zero=historyMarkup(selectHistoryRows(model,{previousMeetings:[{...first,score:{home:0,away:0},goals:[],bookings:[],redCards:0}]}));assert(zero.includes('Nessun gol'));assert(zero.includes('Nessuna espulsione registrata'));
const archives={teams:read('data/sources/champions-team-history-map-2026-27.json'),details:read('data/sources/champions-head-to-head-details-2026-27.json'),older:read('data/sources/uefa-head-to-head-history-2020-23.json'),current:read('data/normalized/uefa-europe-history-2023-26.json')};
const before=JSON.stringify(archives),clModel={competition:'champions',fixture:{date:'2026-10-18'},home:{name:'Real Madrid'},away:{name:'Inter'}};
const cl=selectHistoryRows(clModel,null,archives);assert.equal(cl.length,5);assert.equal(cl[0].id,'2032726');assert.equal(cl[0].raw.goals[0].player,'Toni Kroos');assert.equal(JSON.stringify(archives),before);
const calendar=read('data/normalized/matches.json');
for(const f of read('data/generated/head-to-head/first-leg-2026-27.json').fixtures){
 const date=calendar.find(m=>m.id===f.fixtureId)?.date;
 const records=selectHistoryRows({...model,fixture:{date}},f);assert(records.length<=5);assert.equal(records.length,new Set(records.map(r=>r.id)).size);
 assert(records.every(r=>r.date<date));assert.deepEqual(records.map(r=>r.date),records.map(r=>r.date).sort().reverse());
 for(const r of records)assert.equal(r.raw,f.previousMeetings.find(m=>String(m.providerFixtureId)===r.id));
}
console.log('OK H2H: ultimi cinque, ID/eventi, cronologia, nomi completi, null/zero, minuti, espulsioni, chiusura iniziale e archivi immutati');
