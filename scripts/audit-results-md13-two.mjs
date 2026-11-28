import fs from 'node:fs';
import assert from 'node:assert/strict';
import {settleLeg} from '../js/pages/betting-settlement.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
globalThis.officialStarterPolicy.configure(read('data/normalized/official-starter-registry.json'));
const matches=read('data/normalized/matches.json');
const schedina=read('data/normalized/schedina-md13.json');
const reading=read('data/normalized/reading-md13-market-catalog.json');
const out=[];
for(const cat of schedina.marketCatalog.matches.filter(x=>/^(frosinone-parma|torino-lazio)-/.test(x.matchId))){
 const match=matches.find(x=>x.id===cat.matchId);assert.equal(match.status,'finished');
 const other=reading.marketCatalog.matches.find(x=>x.matchId===cat.matchId);
 const rows=cat.selections.map(leg=>({selectionId:leg.selectionId,market:leg.market,label:leg.label,selection:leg.selection,playerId:leg.playerId,odds:leg.odds,suggested:!!leg.suggestionAnalysis?.suggested,settlement:settleLeg(leg,match)}));
 for(const row of rows.filter(r=>r.market==='ENTRAMBE LE SQUADRE ALMENO X TIRI IN PORTA')){
  const threshold=Number(row.label.match(/almeno (\d+)/i)?.[1]);
  assert(Number.isFinite(threshold));assert(['SI','NO'].includes(row.selection));
  const actual=Math.min(match.teamStats.home.shotsOnTarget,match.teamStats.away.shotsOnTarget);
  row.independentStatisticalCheck={status:((actual>=threshold)===(row.selection==='SI'))?'won':'lost',minimumTeamShotsOnTarget:actual,threshold,engineUnsupported:row.settlement.status==='unavailable'};
 }
 const mismatches=[];
 for(const leg of other?.selections||[]){const row=rows.find(x=>x.selectionId===leg.selectionId);if(!row||JSON.stringify(row.settlement)!==JSON.stringify(settleLeg(leg,match)))mismatches.push(leg.selectionId);}
 assert.equal(mismatches.length,0,'Lettura/Schedina differ');
 const count=rs=>rs.reduce((a,r)=>(a[r.settlement.status]=(a[r.settlement.status]||0)+1,a),{});
 const suggested=rows.filter(x=>x.suggested);
 out.push({matchId:cat.matchId,score:match.score,teamStats:match.teamStats,all:count(rows),suggested:count(suggested),readingCount:other?.selections.length,mismatches,rows});
}
fs.mkdirSync('output/md13-results-two-2026-11-28',{recursive:true});
fs.writeFileSync('output/md13-results-two-2026-11-28/forecast-outcomes.json',JSON.stringify({certifiedProviderSettlement:false,fixtures:out},null,2));
for(const x of out){console.log(JSON.stringify({matchId:x.matchId,all:x.all,suggested:x.suggested,readingCount:x.readingCount}));for(const r of x.rows.filter(r=>r.suggested))console.log(r.settlement.status+' | '+r.market+' | '+r.label+' | '+(r.settlement.reason||''));}
