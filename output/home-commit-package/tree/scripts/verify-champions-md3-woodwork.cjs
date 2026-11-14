'use strict';
// Enrich MD3 observed evidence only, using the archived event feed. No name guessing.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const file='data/sources/champions-results-md03-2026-27.json',data=read(file),audit=[];
for(const fixture of data.fixtures){
  const raw=read(fixture.detailedReportSource.rawPath).payload;
  const roster=raw.rosters.flatMap(r=>r.roster);
  const shots=(raw.commentary||[]).filter(c=>/^(shot-|goal($|---)|penalty---scored)/.test(c.play?.type?.type||''));
  const seen=new Set();
  for(const c of shots){assert(c.play.id);assert(!seen.has(c.play.id),'Duplicate shot event');seen.add(c.play.id);}
  for(const p of fixture.playerEvidence.filter(p=>p.statistics.appearances===1)){
    const row=roster.find(r=>r.athlete.id===p.providerPlayerId);assert(row);
    // Exact provider identity -> exact provider display name, unique in this match.
    const name=row.athlete.displayName;
    if(roster.filter(r=>r.athlete.displayName===name).length!==1)continue;
    const events=shots.filter(c=>c.play.participants?.[0]?.athlete?.displayName===name);
    const onTarget=events.filter(c=>/^(shot-on-target|goal($|---)|penalty---scored)/.test(c.play.type.type)).length;
    if(events.length!==p.statistics.totalShots||onTarget!==p.statistics.shotsOnTarget){
      audit.push({fixtureId:fixture.fixtureId,playerId:p.playerId,status:'unreconciled',shots:events.length,onTarget});continue;
    }
    const woodwork=events.filter(c=>c.play.type.type==='shot-hit-woodwork');
    p.statistics.hitWoodwork=woodwork.length;
    p.woodworkVerification={method:'EXACT_PROVIDER_ROSTER_AND_RECONCILED_SHOT_EVENTS',rawPath:fixture.detailedReportSource.rawPath,
      sourceUrl:fixture.detailedReportSource.url,shotEventIds:events.map(c=>c.play.id),woodworkEventIds:woodwork.map(c=>c.play.id)};
    audit.push({fixtureId:fixture.fixtureId,playerId:p.playerId,status:'verified',shots:events.length,onTarget,hitWoodwork:woodwork.length});
  }
}
data.individualMarketVerificationAt='2026-10-24';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const out='data/analysis/champions/md3-woodwork-verification-2026-10-24';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/audit.json',JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({verified:audit.filter(r=>r.status==='verified').length,unreconciled:audit.filter(r=>r.status!=='verified')}));
