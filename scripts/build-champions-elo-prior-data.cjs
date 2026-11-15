'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function build(){
 const domesticLeagueIds=new Set([55,47,87,54,53,61,57,40,38,135,71,176,441,262,59,86,122]);
 const identities={};const add=(uefa,provider)=>{assert(!identities[uefa]||identities[uefa]===String(provider),'Conflicting exact team crosswalk');identities[uefa]=String(provider);};
 for(const t of read('data/analysis/xgot/reconciliation.json').teamIdentityRegistry)if(t.namespace==='uefa'&&t.historicalTeamId)add(t.historicalTeamId,t.providerTeamId);
 const current=read('data/predictions/xgot-prospective/identity-registry.json').mappings;
 const config=read('data/sources/champions-pilot-match-stats-2025-27.json').teams;
 for(const t of read('data/sources/champions-team-history-map-2026-27.json').teams){const id=config.find(c=>c.name===t.team)?.id;if(id&&current[id])add(t.uefaTeamId,current[id]);}
 const seen=new Map();
 for(const dir of ['data/raw/xgot/fotmob/calendars','data/raw/champions-elo-prior/2026-11-14'])for(const file of fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.json.gz'))){
  const rawPath=`${dir}/${file}`,bytes=fs.readFileSync(path.join(root,rawPath)),raw=JSON.parse(zlib.gunzipSync(bytes)),d=raw.payload;
  if(!d?.details||!domesticLeagueIds.has(Number(d.details.id))||d.details.type!=='league'||!Array.isArray(d.fixtures?.allMatches))continue;
  const matches=d.fixtures.allMatches.filter(f=>f.status?.finished&&!f.status.cancelled&&!f.status.awarded&&/^\d+$/.test(String(f.round))&&/^\d+\s*-\s*\d+$/.test(f.status.scoreStr||''))
   .map(f=>{const [homeGoals,awayGoals]=f.status.scoreStr.split('-').map(Number);return {id:String(f.id),date:f.status.utcTime.slice(0,10),kickoffUtc:f.status.utcTime,homeId:String(f.home.id),awayId:String(f.away.id),homeGoals,awayGoals};}).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  if(!matches.length)continue;
  const item={leagueId:d.details.id,country:d.details.country,season:d.details.selectedSeason,retrievedAt:raw.retrievedAt,rawPath,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),teamIds:[...new Set(d.fixtures.allMatches.flatMap(f=>[String(f.home.id),String(f.away.id)]))],matches};
  // Retain every immutable calendar acquisition so historical cutoff selection
  // can use the latest snapshot actually available by that cutoff.
  seen.set(rawPath,item);
 }
 const result={schemaVersion:1,generatedAt:new Date().toISOString(),identityPolicy:'Exact existing provider/UEFA crosswalks only',nullPolicy:'No scores, identities or observations imputed',historicalAvailability:'Retrospective archives; acquisition timestamps retained. Backtests are not original pre-match forecasts.',identities,calendars:[...seen.values()]};
 fs.writeFileSync(path.join(root,'data/normalized/champions-elo-prior-domestic.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({exactTeams:Object.keys(identities).length,calendarSnapshots:result.calendars.length}));return result;
}
if(require.main===module)build();module.exports={build};
