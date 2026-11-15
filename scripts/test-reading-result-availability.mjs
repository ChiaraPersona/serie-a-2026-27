import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readingResultsDestination} from '../js/pages/reading-detail/shell.mjs';
import {setReadingArtifacts} from '../js/pages/reading-detail/projected-artifacts.mjs?v=20261022-assets-v1';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const matches=read('data/normalized/matches.json').filter(m=>[6,8].includes(m.matchday));
try {
  for(const fixture of matches){
    const model={competition:'serie-a',fixture};
    setReadingArtifacts(null);
    const original=await readingResultsDestination(model,async file=>read(file));
    const projected=read(`data/generated/readings/matches/${fixture.id}.json`);
    const available=projected.artifacts['data/generated/reading-result-availability.json'];
    const archive=read(`data/normalized/schedina-md${String(fixture.matchday).padStart(2,'0')}.json`);
    assert.equal(available.fixtureId,fixture.id);
    assert.equal(available.matchday,archive.matchday);
    assert.equal(available.selectionsAvailable,Boolean(archive.marketCatalog?.matches?.find(m=>m.matchId===fixture.id)?.selections?.length));
    setReadingArtifacts(projected.artifacts);
    let reads=0;
    const result=await readingResultsDestination(model,async()=>{reads++;throw Error('Full archive requested');});
    assert.equal(result,original,fixture.id+' result link changed');
    assert.equal(reads,0,fixture.id+' downloaded the full archive');
  }
  const fixture=matches.find(m=>m.status==='finished');
  setReadingArtifacts({'data/generated/reading-result-availability.json':{fixtureId:'other-fixture',matchday:fixture.matchday,selectionsAvailable:true}});
  let fallbackReads=0;
  await readingResultsDestination({competition:'serie-a',fixture},async file=>{fallbackReads++;return read(file);});
  assert.equal(fallbackReads,1,'Mismatched projection must not grant a result link');
  console.log(`PASS ${matches.length} fixture result links identical; no archive requests; fixture-scoped fallback retained`);
} finally {setReadingArtifacts(null);}
