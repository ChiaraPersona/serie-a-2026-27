'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseStatmuseHtml}=require('./parse-statmuse-game');
const {loadPlayerIdentities}=require('./player-identity');
const {normalizeMatch}=require('./shot-events/normalize.cjs');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const save=(file,d)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),JSON.stringify(d,null,2)+'\n')};
function build(){
 const fixtures=read('data/normalized/matches.json').filter(f=>f.competition==='serie-a'&&f.status==='finished');
 const results=read('data/sources/match-results-2026-27.json'),identities=loadPlayerIdentities(root);
 const rosters=Object.fromEntries([...new Set(fixtures.flatMap(f=>[f.homeTeam,f.awayTeam]))].map(t=>[t,read(`data/teams/${t}.json`)]));
 const manifestPath='data/sources/serie-a-shot-events-manifest-2026-27.json';
 const previous=fs.existsSync(path.join(root,manifestPath))?read(manifestPath):null;
 const audit=fs.existsSync(path.join(root,'output/goal-coordinate-audit-2026-10-29/local-coverage.json'))?read('output/goal-coordinate-audit-2026-10-29/local-coverage.json'):null;
 const matches=[],sources=[],missing=[];
 for(const fixture of fixtures){
  const result=results.matches.find(m=>m.matchId===fixture.id),prior=previous?.sources.find(s=>s.fixtureId===fixture.id);
  const evidence=audit?.matches.find(m=>m.matchId===fixture.id)?.report;
  let html,origin;
  if(prior&&fs.existsSync(path.join(root,prior.rawSnapshot))){html=zlib.gunzipSync(fs.readFileSync(path.join(root,prior.rawSnapshot))).toString('utf8');origin=prior.originalFile;
   if(crypto.createHash('sha256').update(html).digest('hex')!==prior.sha256)throw Error('Raw snapshot integrity failed: '+fixture.id);}
  else if(evidence&&fs.existsSync(path.join(root,evidence.file))){html=fs.readFileSync(path.join(root,evidence.file),'utf8');origin=evidence.file;}
  else{missing.push(fixture.id);continue;}
  const raw=parseStatmuseHtml(html);
  const expectedId=/-(\d+)\/?$/.exec(result.sourceUrl||'')?.[1];
  if(String(raw.gameData.gameId)!==expectedId)throw Error('Conflicting provider fixture ID: '+fixture.id);
  const match=normalizeMatch({raw,result,fixture,rosters,identities});
  const rawSnapshot=`data/raw/serie-a-shot-events/2026-27/${expectedId}.html.gz`;
  fs.mkdirSync(path.dirname(path.join(root,rawSnapshot)),{recursive:true});
  fs.writeFileSync(path.join(root,rawSnapshot),zlib.gzipSync(html));
  sources.push({fixtureId:fixture.id,provider:'StatMuse',providerFixtureId:expectedId,url:result.sourceUrl,rawSnapshot,
   originalFile:origin,sha256:crypto.createHash('sha256').update(html).digest('hex')});
  matches.push(match);
 }
 const summary={finishedFixtures:fixtures.length,reports:matches.length,usableFixtures:matches.filter(m=>m.usable).length,
  shots:matches.flatMap(m=>m.events).filter(e=>!e.ownGoal).length,goals:matches.flatMap(m=>m.events).filter(e=>e.isGoal).length,
  reconciledGoals:matches.flatMap(m=>m.events).filter(e=>e.goalStatus==='reconciled').length,
  usableShots:matches.filter(m=>m.usable).flatMap(m=>m.events).filter(e=>e.usable&&!e.ownGoal).length,
  excluded:matches.flatMap(m=>m.excluded).length,xgEvents:0,missing};
 save(manifestPath,{schemaVersion:1,season:'2026-27',coordinateSystem:{x:[0,10000],y:[0,6000],homeAttacks:'increasing-x',awayAttacks:'decreasing-x',metres:false},
  rendererEvidence:'output/goal-coordinate-audit-2026-10-29/raw/shot-renderer.js',sources});
 save('data/normalized/serie-a-shot-events-2026-27.json',{schemaVersion:1,competition:'serie-a',season:'2026-27',summary,matches});
 console.log(JSON.stringify(summary,null,2));
}
module.exports={build};if(require.main===module)build();
