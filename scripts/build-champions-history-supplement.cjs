'use strict';
// Recover observed history cells from archived provider evidence only.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const keys={shots:'total_shots',shotsOnTarget:'ShotsOnTarget',corners:'corners',fouls:'fouls',yellowCards:'yellow_cards',redCards:'red_cards',expectedGoals:'expected_goals'};
function observed(payload,i){
 const all=payload.content?.stats?.Periods?.All?.stats?.flatMap(g=>g.stats||[])||[];
 return Object.fromEntries(Object.entries(keys).map(([key,input])=>{
  const values=[...new Set(all.filter(s=>s.key===input).map(s=>s.rawStats?.[i]?.value).filter(valid))];
  return [key,values.length===1?values[0]:null];
 }));
}
function build(){
 const source=read('data/sources/champions-pilot-match-stats-2025-27.json'),calendar=read('data/normalized/champions-league-2026-27.json');
 const history=require('./build-champions-team-history.cjs').projectHistory(source,calendar);
 const index=new Map(),rawCache=new Map(),entries=[],missing=[];
 const dir='data/normalized/xgot-current-seasons';
 const archives=[...fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.json')).map(f=>dir+'/'+f),'data/normalized/xgot-history.json','data/normalized/xgot-reconciled-history.json'];
 for(const file of archives){
  for(const m of read(file).matches||[])for(const [i,t]of (m.teams||[]).entries()){
   const key=String(t.providerTeamId)+'|'+m.date.slice(0,10)+'|'+i;
   if(!index.has(key))index.set(key,new Map());index.get(key).set(String(m.providerMatchId),m);
  }
 }
 // Shotmap reconciliation can omit a match that still has valid team xG.
 // Index archived Champions calendars as well, then verify the raw match below.
 for(const season of ['2023-2024','2024-2025','2025-2026','2026-2027']){
  const file=`data/raw/xgot/fotmob/calendars/42-${season}.json.gz`;if(!fs.existsSync(path.join(root,file)))continue;
  const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,file)))),p=raw.payload||raw;
  for(const m of p.fixtures?.allMatches||p.matches?.allMatches||[]){
   if(!m.status?.finished||!m.status.utcTime)continue;
   const rawPath=`data/raw/xgot/fotmob/matches/${m.id}.json.gz`;if(!fs.existsSync(path.join(root,rawPath)))continue;
   for(const [i,t]of [m.home,m.away].entries()){
    const key=String(t.id)+'|'+m.status.utcTime.slice(0,10)+'|'+i;if(!index.has(key))index.set(key,new Map());
    if(!index.get(key).has(String(m.id)))index.get(key).set(String(m.id),{providerMatchId:String(m.id),source:{rawPath}});
   }
  }
 }
 for(const m of source.matches.filter(m=>m.source?.provider==='FotMob'&&m.source.rawFile)){
  for(const [i,side]of ['home','away'].entries()){
   const team=source.teams.find(t=>String(t.espnTeamId)===String(m[side].providerTeamId));if(!team)continue;
   const key=String(team.statisticsProviderIds.FotMob)+'|'+m.date.slice(0,10)+'|'+i;
   if(!index.has(key))index.set(key,new Map());const id=String(m.eventId).replace(/^fotmob:/,'');
   index.get(key).set(id,{providerMatchId:id,source:{...m.source,rawPath:m.source.rawFile}});
  }
 }
 // ESPN summaries already certify both provider identities; recover explicit reds
 // omitted by the compact pilot projection, never from missing event lists.
 for(const m of source.matches.filter(m=>m.source?.provider==='ESPN')){
  const base=`data/raw/champions-pilot/espn/summaries/${m.season}/${m.league}`;
  const paths=[`${base}/${m.eventId}.json.gz`];
  if(fs.existsSync(path.join(root,base)))for(const sub of fs.readdirSync(path.join(root,base),{withFileTypes:true}).filter(d=>d.isDirectory()))paths.push(`${base}/${sub.name}/${m.eventId}.json.gz`);
  const file=paths.filter(f=>fs.existsSync(path.join(root,f))).find(f=>{const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,f))));return r.retrievedAt===m.source.retrievedAt;})||paths.find(f=>fs.existsSync(path.join(root,f)));
  if(!file)continue;
  const bytes=fs.readFileSync(path.join(root,file)),raw=JSON.parse(zlib.gunzipSync(bytes)),p=raw.payload||raw,c=p.header?.competitions?.[0];
  if(c?.date?.slice(0,10)!==m.date.slice(0,10)||String(p.header.id)!==String(m.eventId))continue;
  if(!['home','away'].every(side=>c.competitors?.some(t=>t.homeAway===side&&String(t.team.id)===String(m[side].providerTeamId)&&Number(t.score)===m[side].score)))continue;
  const extract=side=>{
   const s=Object.fromEntries((p.boxscore?.teams?.find(t=>String(t.team.id)===String(m[side].providerTeamId))?.statistics||[]).filter(s=>s.displayValue!==''&&s.displayValue!==null).map(s=>[s.name,Number(s.displayValue)]));
   const meaningful=['totalShots','shotsOnTarget','wonCorners','foulsCommitted'].some(k=>valid(s[k])&&s[k]>0);
   return {redCards:meaningful&&valid(s.redCards)?s.redCards:null};
  };
  for(const side of ['home','away']){const team=source.teams.find(t=>String(t.espnTeamId)===String(m[side].providerTeamId));if(!team)continue;
   entries.push({teamId:team.id,fixtureId:`${m.league}:${m.eventId}`,date:m.date,stats:extract(side),statsAgainst:extract(side==='home'?'away':'home'),source:{provider:'ESPN',url:raw.url||m.source.summaryUrl,retrievedAt:raw.retrievedAt,rawPath:file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),identity:'Exact event ID, both provider team IDs, date, venue and scores'}});
  }
 }
 for(const team of source.teams)for(const row of history.teams[team.id]){
  const i=row.venue==='Casa'?0:1,providerId=String(team.statisticsProviderIds.FotMob);
  const candidates=[...(index.get(providerId+'|'+row.date.slice(0,10)+'|'+i)?.values()||[])];
  if(candidates.length!==1){missing.push({teamId:team.id,fixtureId:row.id,reason:'NO_UNIQUE_ARCHIVED_MATCH'});continue;}
  const m=candidates[0],file=m.source?.rawPath;if(!file||!fs.existsSync(path.join(root,file)))continue;
  if(!rawCache.has(file)){const bytes=fs.readFileSync(path.join(root,file));rawCache.set(file,{raw:JSON.parse(zlib.gunzipSync(bytes)),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
  const cached=rawCache.get(file),p=cached.raw.payload||cached.raw,g=p.general,h=p.header;
  const otherTeam=source.teams.find(t=>t.name===row.opponent||calendar.teamBranding?.some(b=>b.team===row.opponent&&(b.id===t.id||b.slug===t.id)));
  if(!g?.finished||String(g.matchId)!==String(m.providerMatchId)||g.matchTimeUTCDate?.slice(0,10)!==row.date.slice(0,10)||String(h?.teams?.[i]?.id)!==providerId||h.teams[i].score!==row.goalsFor||h.teams[1-i].score!==row.goalsAgainst||String(g[i?'awayTeam':'homeTeam']?.id)!==providerId||(otherTeam&&String(h.teams[1-i].id)!==String(otherTeam.statisticsProviderIds.FotMob))){missing.push({teamId:team.id,fixtureId:row.id,reason:'IDENTITY_OR_SCORE_MISMATCH'});continue;}
  const stats=observed(p,i),statsAgainst=observed(p,1-i);
  // Never infer zero dismissals from absent card events.
  for(const [s,indexSide]of [[stats,i],[statsAgainst,1-i]])if(s.redCards===null){const n=h.status?.[indexSide?'numberOfAwayRedCards':'numberOfHomeRedCards'];if(valid(n))s.redCards=n;}
  entries.push({teamId:team.id,fixtureId:row.id,date:row.date,stats,statsAgainst,source:{provider:'FotMob',providerMatchId:String(m.providerMatchId),providerTeamIds:h.teams.map(t=>String(t.id)),url:cached.raw.url||m.source.url,retrievedAt:cached.raw.retrievedAt,rawPath:file,sha256:cached.sha256,identity:'Exact canonical provider team ID, date, venue, score, unique archived match; opponent ID checked when canonical'}});
 }
 const output={schemaVersion:1,role:'DESCRIPTIVE_HISTORY_ONLY',entries,missing};
 fs.writeFileSync(path.join(root,'data/sources/champions-team-history-supplement.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({verifiedRows:entries.length,missing:missing.length}));return output;
}
module.exports={build,observed};if(require.main===module)build();
