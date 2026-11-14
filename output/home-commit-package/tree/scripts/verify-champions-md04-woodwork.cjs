'use strict';
// Observed evidence only. Exact provider roster identities and reconciled shot
// events are required before zero woodwork may be recorded.
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const file='data/sources/champions-results-md04-2026-27.json';
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const catalog=JSON.parse(fs.readFileSync('data/normalized/schedina-champions-md04.json','utf8'));
const legs=new Map(catalog.marketCatalog.matches.flatMap(m=>m.selections).map(l=>[l.selectionId,l]));
const audit=[];
for(const fixture of data.fixtures){
 const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(fixture.rawPath))).payload;
 const roster=raw.rosters.flatMap(r=>r.roster);
 const shots=(raw.commentary||[]).filter(c=>/^(shot-|goal($|---)|penalty---scored)/.test(c.play?.type?.type||''));
 assert.equal(new Set(shots.map(c=>c.play.id)).size,shots.length,'Duplicate shot events');
 assert(shots.every(c=>c.play.id));
 for(const record of fixture.verifiedSelections){
  if(record.settlement.status!=='unavailable'&&record.woodworkVerification?.method!=='RECONCILED_PROVIDER_SHOT_EVENTS')continue;
  const leg=legs.get(record.selectionId),market=leg?.betSelection?.market,semantics=market?.bookmakerSemantics;
  assert(semantics?.duo===true&&semantics.postsAndCrossbarIncluded===true);
  assert.equal(String(leg.betSelection.identity.providerSelectionId),String(record.providerSelectionId));
  assert.equal(market.threshold,record.threshold);assert.equal(market.selection,'OVER');
  const participants=[record.observed?.primary,record.observed?.substitute].filter(Boolean);
  assert(participants.length&&participants[0].starter);
  const evidence=participants.map(p=>{
   const row=roster.find(r=>String(r.athlete.id)===p.providerPlayerId);assert(row,'Missing exact provider ID');
   const name=row.athlete.displayName;
   assert.equal(roster.filter(r=>r.athlete.displayName===name).length,1,'Ambiguous exact event name');
   const events=shots.filter(c=>c.play.participants?.[0]?.athlete?.displayName===name);
   const onTarget=events.filter(c=>/^(shot-on-target|goal($|---)|penalty---scored)/.test(c.play.type.type)).length;
   if(events.length!==p.shots||onTarget!==p.shotsOnTarget)return {providerPlayerId:p.providerPlayerId,status:'unreconciled',events:events.length,shots:p.shots,onTarget,shotsOnTarget:p.shotsOnTarget};
   const woodwork=events.filter(c=>c.play.type.type==='shot-hit-woodwork');
   return {providerPlayerId:p.providerPlayerId,player:p.player,status:'verified',shots:p.shots,shotsOnTarget:onTarget,hitWoodwork:woodwork.length,shotEventIds:events.map(c=>c.play.id),woodworkEventIds:woodwork.map(c=>c.play.id)};
  });
  if(evidence.some(e=>e.status!=='verified')){audit.push({fixtureId:fixture.fixtureId,selectionId:record.selectionId,status:'unreconciled',evidence});continue;}
  const value=evidence.reduce((n,p)=>n+p.shotsOnTarget+p.hitWoodwork,0);
  record.woodworkVerification={method:'RECONCILED_PROVIDER_SHOT_EVENTS',sourceUrl:fixture.sourceUrl,rawPath:fixture.rawPath,evidence,observedContractTotal:value,threshold:record.threshold};
  for(const p of participants)p.hitWoodwork=evidence.find(e=>e.providerPlayerId===p.providerPlayerId).hitWoodwork;
  const won=value>record.threshold;
  record.settlement={status:won?'won':'lost',label:won?'Esatto':'Sbagliato',basis:'STATISTICAL_VERIFICATION',officiallySettled:false,reason:'RECONCILED_DUO_SOT_AND_WOODWORK',sourceUrl:fixture.sourceUrl};
  audit.push({fixtureId:fixture.fixtureId,selectionId:record.selectionId,label:record.label,status:record.settlement.status,total:value,threshold:record.threshold,evidence});
 }
}
data.individualMarketVerificationAt=new Date().toISOString();
data.coverageNote='9/18 gare concluse. Tutti i contratti pubblicati delle nove gare verificati statisticamente, inclusi i DUO con pali e traverse riconciliati sugli eventi di tiro. Nessuna liquidazione certificata; gare del 4 novembre invariate.';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const out='data/analysis/champions/md04-woodwork-verification-2026-11-04';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/audit.json',JSON.stringify({verifiedAt:data.individualMarketVerificationAt,records:audit},null,2)+'\n');
console.log(JSON.stringify({counts:audit.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),records:audit.map(({evidence,...r})=>r)}));
