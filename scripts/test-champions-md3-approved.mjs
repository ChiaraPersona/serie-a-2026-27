import assert from 'node:assert/strict';
import fs from 'node:fs';
import {settleMd3} from '../js/pages/champions-md3-approved.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const data=read('data/normalized/schedina-champions-md03.json'),cal=read('data/normalized/champions-league-2026-27.json');
assert.equal(data.slips.length,7);assert(data.slips.every(s=>s.legs.length===1));
assert(settleMd3(data,cal).slips.every(s=>['won','lost'].includes(s.legs[0].settlement.status)));
for(const status of ['scheduled','live','finished'])for(const [home,away] of [[2,0],[1,1],[0,2]]){
 const synthetic={fixtures:data.slips.map(s=>({id:s.legs[0].fixtureId,status,score:{home,away}}))};
 const result=settleMd3(data,synthetic);
 for(const s of result.slips){const l=s.legs[0];assert.equal(l.settlement.status,status!=='finished'?'pending':(l.selection==='1'?home>away:away>=home)?'won':'lost');}
}
assert(settleMd3(data,{fixtures:data.slips.map(s=>({id:s.legs[0].fixtureId,status:'finished',score:null}))}).slips.every(s=>s.legs[0].settlement.status==='pending'));
console.log('OK CL3 seven independent singles; official finish gate; 1/X2 win/loss/draw; missing score pending.');
