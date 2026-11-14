'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseStatmuseHtml}=require('./parse-statmuse-game');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function build(){
 const manifest=read('data/sources/serie-a-shot-events-manifest-2026-27.json'),fixtures=read('data/normalized/matches.json');
 const official=read('data/sources/official-lineups-2026-27.json'),events=read('data/sources/serie-a-coach-changes-2026-27.json').events.map(event=>{
  const rawSnapshot=`data/raw/serie-a-technical-context/club-statements/${event.teamId}-${event.publishedDate}-${event.type}.html`;
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rawSnapshot))).digest('hex');
  return {...event,rawSnapshot,sha256};
 });
 const observations=[],names=new Map();
 for(const source of manifest.sources){
  const html=zlib.gunzipSync(fs.readFileSync(path.join(root,source.rawSnapshot))).toString('utf8');
  if(crypto.createHash('sha256').update(html).digest('hex')!==source.sha256)throw Error('Snapshot changed '+source.fixtureId);
  const raw=parseStatmuseHtml(html),f=fixtures.find(f=>f.id===source.fixtureId);
  if(!f||String(raw.gameData.gameId)!==source.providerFixtureId||raw.playByPlay.gameDate!==f.date)throw Error('Fixture conflict '+source.fixtureId);
  for(const side of ['home','away']){
   const teamId=f[side+'Team'],t=raw.gameData[side+'Team'],heads=(t.coaches||[]).filter(c=>c.role==='headCoach');
   const headCoachId=heads.length===1?String(heads[0].coachId):null;
   const officialCoach=official.fixtures.find(m=>m.matchId===f.id)?.teams.find(t=>t.teamId===teamId)?.coach||null;
   if(headCoachId&&officialCoach){const values=names.get(headCoachId)||new Set();values.add(officialCoach);names.set(headCoachId,values);}
   const players=f.playerStats?.[side]||[],starters=players.filter(p=>p.starter),ids=starters.map(p=>p.playerId).filter(Boolean);
   const minutes=players.filter(p=>Number.isFinite(p.minutes)&&p.minutes>0).map(p=>({playerId:p.playerId,minutes:p.minutes}));
   observations.push({fixtureId:f.id,matchday:f.matchday,date:f.date,teamId,headCoachId,
    benchCoaches:(t.coaches||[]).map(c=>({id:String(c.coachId),role:c.role})),
    starterIds:ids,lineupComplete:starters.length===11&&new Set(ids).size===11,
    minutes:minutes.filter(p=>p.playerId),minutesComplete:minutes.length>0&&minutes.every(p=>!!p.playerId),
    formation:f.formations?.[side]||null,originalFormation:t.formation||null,
    evidence:{sourceUrl:source.url,rawSnapshot:source.rawSnapshot,sha256:source.sha256}});
  }
 }
 for(const event of events)if(event.type==='appointment'){const n=names.get(event.headCoachId)||new Set();n.add(event.name);names.set(event.headCoachId,n);}
 const coachNames=Object.fromEntries([...names].map(([id,set])=>[id,[...set].sort((a,b)=>b.length-a.length)[0]]));
 for(const row of observations)row.headCoachName=row.headCoachId?coachNames[row.headCoachId]||null:null;
 const changes=[];
 for(const teamId of new Set(observations.map(r=>r.teamId))){let last=null;for(const r of observations.filter(r=>r.teamId===teamId).sort((a,b)=>a.date.localeCompare(b.date))){
  if(!r.headCoachId)continue;
  if(last&&last.headCoachId!==r.headCoachId)changes.push({teamId,previousCoachId:last.headCoachId,headCoachId:r.headCoachId,firstObservedDate:r.date,firstObservedFixtureId:r.fixtureId});
  last=r;
 }}
 const data={schemaVersion:1,season:'2026-27',summary:{fixtures:manifest.sources.length,observations:observations.length,
  knownHeadCoaches:observations.filter(r=>r.headCoachId).length,completeLineups:observations.filter(r=>r.lineupComplete).length,observedChanges:changes.length},
  coachNames,coachEvents:events,observedChanges:changes,observations};
 fs.writeFileSync(path.join(root,'data/normalized/serie-a-technical-context-2026-27.json'),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({summary:data.summary,changes},null,2));return data;
}
module.exports={build};if(require.main===module)build();
