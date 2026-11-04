'use strict';
// Descriptive presentation only. No forecast, selection or source archive is written.
const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto'),assert=require('assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('data/sources/champions-pilot-match-stats-2025-27.json');
const calendar=read('data/normalized/champions-league-2026-27.json');
const channels=read('data/normalized/champions-attack-channels-2025-26.json');
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const rows=[],files=new Map(),quarantine=[];
function raw(file){if(!fs.existsSync(file))return null;if(!files.has(file)){const bytes=fs.readFileSync(file),text=file.endsWith('.gz')?zlib.gunzipSync(bytes).toString():bytes.toString();files.set(file,{value:JSON.parse(text),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}return files.get(file);}
function statsFor(payload,id){const t=payload.boxscore?.teams?.find(t=>String(t.team.id)===String(id));return Object.fromEntries((t?.statistics||[]).map(s=>[s.name,number(s.displayValue)]));}
for(const match of source.matches){
 const members=['home','away'].map(side=>({side,team:source.teams.find(t=>String(t.espnTeamId)===String(match[side].providerTeamId))})).filter(r=>r.team);
 if(!members.length)continue;
 const file=match.source.rawFile||`data/raw/champions-pilot/espn/summaries/${match.season}/${match.league}/${match.eventId}.json.gz`;
 const snapshot=raw(file),payload=snapshot?.value.payload||snapshot?.value;
 for(const {side,team}of members){
  const opponent=side==='home'?'away':'home',s=match[side],stats={...s.statistics},extra=payload?statsFor(payload,team.espnTeamId):{};
  if(payload?.header){const competition=payload.header.competitions?.[0];if(competition?.date?.slice(0,10)!==match.date.slice(0,10)||!competition?.competitors?.some(c=>String(c.team.id)===String(team.espnTeamId))){quarantine.push({eventId:match.eventId,teamId:team.id,reason:'RAW_IDENTITY_OR_DATE_MISMATCH'});continue;}}
  if(payload?.content?.stats){
   const actual=payload.general?.[side+'Team']?.id;
   if(actual!==undefined&&String(actual)!==String(team.espnTeamId)){quarantine.push({eventId:match.eventId,teamId:team.id,reason:'RAW_TEAM_ID_MISMATCH'});continue;}
   const list=payload.content.stats.Periods?.All?.stats?.flatMap(g=>g.stats)||[],i=side==='home'?0:1;
   extra.possessionPct=number(list.find(s=>s.key==='BallPossesion')?.stats[i]);
   const passing=list.find(s=>s.key==='accurate_passes')?.rawStats?.[i];extra.accuratePasses=number(passing?.value);extra.totalPasses=number(passing?.total);
  }
  if(payload?.boxscore){const other=statsFor(payload,match[opponent].providerTeamId);if(!valid(other.possessionPct)||!valid(extra.possessionPct)||Math.abs(extra.possessionPct+other.possessionPct-100)>.5)extra.possessionPct=null;}
  rows.push({teamId:team.id,eventId:String(match.eventId),date:match.date.slice(0,10),season:match.season,competition:match.league,
   goals:number(s.score),goalsAgainst:number(match[opponent].score),shots:number(stats.totalShots),shotsAgainst:number(match[opponent].statistics.totalShots),sot:number(stats.shotsOnTarget),corners:number(stats.wonCorners),fouls:number(stats.foulsCommitted),
   possessionPct:valid(extra.possessionPct)&&extra.possessionPct<=100?extra.possessionPct:null,
   accuratePasses:valid(extra.accuratePasses)&&extra.totalPasses>0&&extra.accuratePasses<=extra.totalPasses?extra.accuratePasses:null,totalPasses:extra.totalPasses>0?extra.totalPasses:null,
   crosses:extra.totalCrosses>0?extra.totalCrosses:null,longBalls:extra.totalLongBalls>0?extra.totalLongBalls:null,
   formation:payload?.rosters?.find(r=>String(r.team.id)===String(team.espnTeamId))?.formation||payload?.content?.lineup?.[side+'Team']?.formation||null,
   source:{...match.source,...(snapshot?{file,sha256:snapshot.sha256}:{}),retrievedAt:snapshot?.value.retrievedAt||match.source.retrievedAt}});
 }
}
// Certified calendar reports are a separate Champions sample, including Sabah.
for(const fixture of calendar.fixtures.filter(f=>f.status==='finished'&&f.matchReport)){
 const report=fixture.matchReport;
 for(const [i,side]of ['home','away'].entries()){
  const team=source.teams.find(t=>t.name===fixture[side+'Team']);if(!team)continue;
  const stats=report.observedTeamStatistics?.[side]||{},other=report.observedTeamStatistics?.[i?'home':'away']||{};
  const detail=report.detailedReportSource||{};
  rows.push({teamId:team.id,eventId:fixture.id,date:fixture.date,season:'2026-27',competition:'uefa.champions',goals:fixture.score?.[side]??null,goalsAgainst:fixture.score?.[i?'home':'away']??null,
   shots:stats.totalShots??report.statistics?.shots?.[i]??null,shotsAgainst:other.totalShots??report.statistics?.shots?.[i?0:1]??null,sot:stats.shotsOnTarget??report.statistics?.shotsOnTarget?.[i]??null,corners:stats.wonCorners??report.statistics?.corners?.[i]??null,fouls:stats.foulsCommitted??report.statistics?.fouls?.[i]??null,
   possessionPct:valid(stats.possessionPct)&&valid(other.possessionPct)&&Math.abs(stats.possessionPct+other.possessionPct-100)<=.5?stats.possessionPct:null,accuratePasses:stats.totalPasses>0?stats.accuratePasses??null:null,totalPasses:stats.totalPasses>0?stats.totalPasses:null,crosses:stats.totalCrosses>0?stats.totalCrosses:null,longBalls:stats.totalLongBalls>0?stats.totalLongBalls:null,
   formation:report.actualLineups?.[side]?.formation||null,source:{...detail,url:detail.url||report.statistics?.sourceUrl||report.sourceUrl,retrievedAt:detail.retrievedAt||null}});
 }
}
function sample(selected){
 const metrics={};for(const key of ['goals','goalsAgainst','shots','shotsAgainst','sot','corners','fouls','possessionPct','crosses','longBalls']){const values=selected.map(r=>r[key]).filter(valid);metrics[key]={n:values.length,mean:values.length?values.reduce((n,v)=>n+v,0)/values.length:null};}
 const passing=selected.filter(r=>valid(r.accuratePasses)&&r.totalPasses>0),denominator=passing.reduce((n,r)=>n+r.totalPasses,0);
 metrics.passSuccessPct={n:passing.length,mean:denominator?passing.reduce((n,r)=>n+r.accuratePasses,0)/denominator*100:null};
 const formations={};for(const r of selected)if(/^\d(-\d)+$/.test(r.formation||''))formations[r.formation]=(formations[r.formation]||0)+1;
 return {matches:selected.length,from:selected.at(-1)?.date||null,to:selected[0]?.date||null,metrics,formations:Object.entries(formations).sort((a,b)=>b[1]-a[1]).map(([code,matches])=>({code,matches}))};
}
const fixtures=calendar.fixtures.map(f=>({fixtureId:f.id,date:f.date,teams:['home','away'].map(side=>{
 const team=source.teams.find(t=>t.name===f[side+'Team']);assert(team);
 const cutoff=f.date+'T00:00:00Z',seen=new Set();
 const eligible=rows.filter(r=>r.teamId===team.id&&r.date<f.date&&r.source.retrievedAt&&Date.parse(r.source.retrievedAt)<Date.parse(cutoff)).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.eventId.startsWith('ucl-'))-Number(a.eventId.startsWith('ucl-'))).filter(r=>{const key=r.competition+'|'+r.date;if(seen.has(key))return false;seen.add(key);return true;});
 const groups=[['champions-current','2026-27','uefa.champions'],['domestic-current','2026-27',team.league],['domestic-historical','2025-26',team.league]].filter(([id,,competition])=>id==='champions-current'||competition!=='uefa.champions').map(([id,season,competition])=>({id,season,competition,competitionLabel:competition==='uefa.champions'?'Champions League':team.leagueName,...sample(eligible.filter(r=>r.season===season&&r.competition===competition))}));
 return {teamId:team.id,team:team.name,samples:groups,attackChannels:channels.profiles.find(p=>p.team===team.name)?.attackChannels||null,attackChannelsSeason:'2025-26',predictionEligible:false};
})}));
const output={schemaVersion:1,informationalOnly:true,policy:{sourcesInternal:true,cutoff:'Match date and acquisition strictly before fixture date',metrics:'Observed descriptions; no inferred pressing, transition style or model activation',samples:'Seasons and competitions always separate'},fixtures};
fs.writeFileSync('data/generated/champions-tactical-profiles-2026-27.json',JSON.stringify(output,null,2)+'\n');
fs.writeFileSync('data/normalized/champions-tactical-evidence-2026-27.json',JSON.stringify({schemaVersion:1,informationalOnly:true,rows,quarantine},null,2)+'\n');
const latest=fixtures.filter(f=>calendar.fixtures.find(c=>c.id===f.fixtureId).matchday===4).flatMap(f=>f.teams);
console.log(JSON.stringify({teams:new Set(latest.map(t=>t.teamId)).size,rows:rows.length,quarantined:quarantine.length,md4WithObservedSample:latest.filter(t=>t.samples.some(s=>s.matches)).length,md4Possession:latest.filter(t=>t.samples.some(s=>s.metrics.possessionPct.n)).length}));
