import assert from 'node:assert/strict';
import fs from 'node:fs';
import {championsShirtNumber} from '../js/components/champions-shirt-numbers.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('data/sources/champions-shirt-numbers-2026-27.json');
const db=read('data/normalized/champions-registered-squads-2026-27.json');
const md3=read('data/sources/champions-md03-squads-2026-27.json');
assert.equal(championsShirtNumber(source,{id:'barcelona'},'Garcia'),null);
assert.equal(championsShirtNumber(source,{id:'bayern-munchen'},{canonicalPlayerId:null,suppliedName:'Karl'}),42);
const block1=source.records.filter(r=>(r.block||1)===1),block2=source.records.filter(r=>r.block===2);
assert.equal(block1.length,106);assert.equal(block2.length,237);assert.equal(source.unmatched.length,8);
assert.equal(new Set(source.records.map(p=>p.stablePlayerId)).size,343);
assert(source.records.every(r=>r.status==='accepted'&&r.shirtNumber===r.existingConfirmedNumber));
for(const row of source.records){
 const team=md3.teams.find(t=>t.teamId===row.teamId);const p=team.players.find(p=>p.playerId===row.playerId);assert(p);assert.equal(p.shirtNumber,row.shirtNumber);
 assert.equal(championsShirtNumber(source,{id:row.teamId},{playerId:row.playerId}),row.shirtNumber);
 for(const aliasId of row.playerIdAliases||[])assert.equal(championsShirtNumber(source,{id:row.teamId},{playerId:aliasId}),row.shirtNumber);
 for(const name of row.aliases)assert.equal(championsShirtNumber(source,{id:row.teamId},name),row.shirtNumber);
 assert.equal(championsShirtNumber(source,{id:'other-team'},{playerId:row.playerId}),null);
 assert.equal(championsShirtNumber(source,{id:row.teamId},{playerId:'unknown',name:row.canonicalName}),null);
 assert.equal(championsShirtNumber(source,{id:row.teamId},{playerId:row.playerId},99),99);
}
assert.equal(db.teams.length,36);
assert.deepEqual(db.shirtNumbers,source);
let populated=0;
for(const team of db.teams)for(const p of team.players){
 const record=source.records.find(r=>r.teamId===team.id&&(r.playerId===p.id||r.playerIdAliases?.includes(p.id)));
 if(record){assert.equal(p.shirtNumber,record.shirtNumber);populated++;}
 else assert.equal(p.shirtNumber,undefined);
}
assert.equal(populated,279);
console.log(JSON.stringify({accepted:source.records.length,block1:block1.length,block2:block2.length,registeredNumbers:populated,unmatched:source.unmatched.length,conflicts:source.records.filter(r=>r.status==='conflict').length}));
