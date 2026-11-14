import assert from 'node:assert/strict';
import fs from 'node:fs';
import {latestReferenceLineups} from '../js/pages/reading-detail/champions-lineup-reference.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const history=read('data/generated/champions-lineup-references.json'),scenarios=read('data/generated/champions-shared-scenarios.json');
const before=JSON.stringify(history);
for(const f of scenarios.fixtures.filter(f=>f.matchday===5)){
 const model={competition:'champions',fixture:{id:f.fixtureId,date:f.date,status:'scheduled'},prediction:f};
 const empty=f.teamProjections.map(t=>({side:{id:t.teamId},status:null,players:[]}));
 const refs=latestReferenceLineups(model,history,empty);
 for(const [i,l] of refs.entries()){
  assert.equal(l.status,'reference');assert.equal(l.players.length,11);assert(l.reference.date<f.date);
  const latest=history.records.filter(r=>r.teamId===f.teamProjections[i].teamId&&r.date<f.date).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.status==='official')-Number(a.status==='official'))[0];
  assert.equal(l.reference.fixtureId,latest.fixtureId);assert.equal(l.reference.status,latest.status);
  assert(l.players.every(p=>!('projectedShots' in p.source)));assert.deepEqual(l.bench,[]);
 }
 const official=refs.map(l=>({...l,status:'official'})),probable=refs.map(l=>({...l,status:'probable'}));
 assert.deepEqual(latestReferenceLineups(model,history,official),official);
 assert.deepEqual(latestReferenceLineups(model,history,probable),probable);
 assert.equal(latestReferenceLineups({...model,fixture:{...model.fixture,status:'finished'}},history,empty),empty);
 assert.deepEqual(latestReferenceLineups(model,{records:history.records.map(r=>({...r,date:f.date}))},empty),empty);
}
assert.equal(JSON.stringify(history),before);
console.log('PASS MD5 latest canonical XI references, official/probable precedence, no future leakage or forecast transfer');
