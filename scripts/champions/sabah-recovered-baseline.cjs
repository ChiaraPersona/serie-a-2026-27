'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const base='data/raw/xgot/sabah-recovery-2026-11-14';
const ids=[5785662,5785676,5787762,5787774,5954865,5954875,5987802,5987809];
const league='uefa.champions_qual';
function apply(source){
 const team=source.teams.find(t=>t.id==='sabah');assert(team);
 // Exact provider crosswalk, observed in the archived team fixture calendar.
 Object.assign(team,{league,leagueName:'Qualificazioni UEFA Champions League',baselineKind:'uefa-fallback',statisticsProviderIds:{...team.statisticsProviderIds,FotMob:'951893'}});
 const calendar=JSON.parse(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,base,'team.json.gz')))).body);
 assert.equal(calendar.details.id,951893);
 const rows=ids.map(id=>{
  const rawPath=`${base}/${id}.json.gz`,bytes=fs.readFileSync(path.join(root,rawPath)),raw=JSON.parse(zlib.gunzipSync(bytes)),d=raw.payload,g=d.general;
  const fixture=calendar.fixtures.allFixtures.fixtures.find(f=>f.id===id);
  assert(fixture&&fixture.status.finished&&fixture.tournament.leagueId===10611);
  assert.equal(String(g.matchId),String(id));assert.equal(g.finished,true);assert.equal(g.parentLeagueId,10611);
  assert.equal(g.homeTeam.id,fixture.home.id);assert.equal(g.awayTeam.id,fixture.away.id);assert.equal(g.matchTimeUTCDate,fixture.status.utcTime);
  assert([g.homeTeam.id,g.awayTeam.id].includes(951893));
  // Keep the full original archive, but do not mix 120-minute totals into 90-minute volumes.
  if(d.header.status?.halfs?.firstExtraHalfStarted||/extra/i.test(d.header.status?.reason?.longKey||''))return null;
  const stats=(d.content?.stats?.Periods?.All?.stats||[]).flatMap(s=>s.stats||[]);
  const value=(key,i)=>{const observed=stats.filter(s=>s.key===key).map(s=>s.rawStats?.[i]?.value??s.stats?.[i]);return observed.length&&observed.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)&&new Set(observed).size===1?observed[0]:null;};
  const sides=[g.homeTeam,g.awayTeam].map((t,i)=>{
   const score=d.header.teams.find(p=>p.id===t.id)?.score;assert(Number.isInteger(score)&&score>=0);
   const statistics={totalShots:value('total_shots',i),shotsOnTarget:value('ShotsOnTarget',i),wonCorners:value('corners',i),foulsCommitted:value('fouls',i),yellowCards:value('yellow_cards',i)};
   assert(['totalShots','shotsOnTarget','wonCorners'].every(k=>statistics[k]!==null));
   return {homeAway:i?'away':'home',providerTeamId:String(t.id),name:t.name,score,statistics};
  });
  const missing=sides.flatMap(s=>Object.entries(s.statistics).filter(([,v])=>v===null).map(([k])=>`${s.homeAway}.${k}`));
  return {eventId:String(id),season:'2026-27',league,date:g.matchTimeUTCDate.slice(0,10),home:sides[0],away:sides[1],coverage:missing.length?'partial':'complete',missing,
   coverageByMetric:{goals:true,totalShots:true,shotsOnTarget:true,wonCorners:true},
   source:{provider:'FotMob',url:raw.url,retrievedAt:raw.retrievedAt,rawPath,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}};
 }).filter(Boolean);
 const keys=new Set(ids.map(id=>`FotMob|${id}`));
 source.matches=source.matches.filter(m=>!keys.has(`${m.source?.provider}|${m.eventId}`)).concat(rows).sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
 source.summary={...source.summary,matches:source.matches.length,completeMatches:source.matches.filter(m=>m.coverage==='complete').length};
 source.retrievedAt=source.matches.map(m=>m.source?.retrievedAt).filter(Boolean).sort().at(-1);
 const coverage=source.teamCoverage?.find(t=>t.teamId==='sabah');
 if(coverage){const own=source.matches.filter(m=>[m.home,m.away].some(s=>s.providerTeamId===(m.source.provider==='FotMob'?'951893':team.espnTeamId)));coverage.matches=own.length;coverage.completeMatches=own.filter(m=>m.coverage==='complete').length;}
 return source;
}
module.exports={apply,ids};
