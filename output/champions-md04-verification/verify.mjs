// Read existing contracts and observed reports; write audit artifacts only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {settleLeg} from '../../js/pages/betting-settlement.mjs';
const base='output/champions-md04-verification',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const calendar=read('data/normalized/champions-league-2026-27.json');
const catalog=read('data/normalized/schedina-champions-md04.json');
const official=read('data/sources/champions-official-formations-md04-2026-27.json');
const teams=read('data/sources/champions-pilot-match-stats-2025-27.json').teams;
const events=read(base+'/scoreboard.json').events;
const expected=[[0,1],[2,0],[0,2],[3,0],[0,3],[0,0],[4,0],[3,2],[0,6]];
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const stats=rows=>Object.fromEntries((rows||[]).map(s=>[s.name,number(s.value??s.displayValue)]));
const counts=rows=>rows.reduce((a,r)=>(a[r.settlement.status]=(a[r.settlement.status]||0)+1,a),{});
const records=[],fixtures=[];
for(const [index,f] of calendar.fixtures.filter(f=>f.matchday===4&&f.date==='2026-11-03').entries()){
 const ht=teams.find(t=>t.name===f.homeTeam),at=teams.find(t=>t.name===f.awayTeam);assert(ht&&at);
 const event=events.find(e=>e.competitions[0].competitors.some(t=>t.homeAway==='home'&&String(t.id)===String(ht.espnTeamId))&&e.competitions[0].competitors.some(t=>t.homeAway==='away'&&String(t.id)===String(at.espnTeamId)));assert(event,f.id);
 const raw=read(base+'/'+event.id+'.json'),d=raw.payload,comp=d.header.competitions[0];assert(comp.status.type.completed);
 const competitors=Object.fromEntries(comp.competitors.map(t=>[t.homeAway,t]));
 const score={home:number(competitors.home.score),away:number(competitors.away.score)};assert.deepEqual([score.home,score.away],expected[index]);
 const match={...f,status:'finished',score,teamStats:{},playerStats:{},didNotPlay:{},substitutions:[],resultCoverage:{substitutions:'COMPLETE',participation:'available'}};
 const rowsById=new Map();
 for(const side of ['home','away']){
  const roster=d.rosters.find(r=>String(r.team.id)===String(competitors[side].id));assert.equal(roster.roster.filter(p=>p.starter).length,11);
  const ts=stats(d.boxscore.teams.find(t=>String(t.team.id)===String(competitors[side].id)).statistics);
  match.teamStats[side]={shots:ts.totalShots??null,shotsOnTarget:ts.shotsOnTarget??null,corners:ts.wonCorners??null};
  match.playerStats[side]=roster.roster.map(p=>{const s=stats(p.stats);const row={player:p.athlete.displayName||p.athlete.fullName,providerPlayerId:String(p.athlete.id),starter:p.starter===true,shots:s.totalShots??null,shotsOnTarget:s.shotsOnTarget??null,hitWoodwork:s.hitWoodwork??null,appearances:s.appearances};rowsById.set(row.providerPlayerId,row);return row;});
  for(const [key,provider] of [['shots','totalShots'],['shotsOnTarget','shotsOnTarget']]){
   const playing=roster.roster.filter(p=>stats(p.stats).appearances===1),values=playing.map(p=>stats(p.stats)[provider]);
   if(values.every(v=>v!==null&&v!==undefined))assert.equal(values.reduce((a,b)=>a+b,0),match.teamStats[side][key],f.id+' '+side+' '+key);
  }
 }
 for(const e of d.keyEvents||[]){if(e.type?.type!=='substitution')continue;const incoming=rowsById.get(String(e.participants?.[0]?.athlete?.id)),outgoing=rowsById.get(String(e.participants?.[1]?.athlete?.id));assert(incoming&&outgoing,'Unresolved substitution '+f.id);match.substitutions.push({playerIn:incoming.player,playerOut:outgoing.player});}
 const off=official.fixtures.find(o=>o.fixtureId===f.id);assert(off);
 const legs=catalog.marketCatalog.matches.find(m=>m.matchId===f.id)?.selections||[];
 for(const leg of legs){
  let settlement,observed=null;
  if(leg.marketScope==='player'){
   const identity=['home','away'].flatMap(side=>(off[side]?.players||[]).map(p=>({...p,side}))).find(p=>p.playerId===leg.playerId);
   const primary=identity?.providerPlayerId?rowsById.get(String(identity.providerPlayerId)):null;
   if(!identity)settlement={status:'excluded',reason:'OFFICIAL_NONSTARTER_OR_UNRESOLVED_CANONICAL_ID'};
   else if(!primary)settlement={status:'unavailable',reason:'EXACT_PROVIDER_ID_UNRESOLVED'};
   else if(!primary.starter)settlement={status:'excluded',reason:'OBSERVED_NONSTARTER'};
   else{
    const replacement=match.substitutions.find(s=>s.playerOut===primary.player),sub=replacement?[...rowsById.values()].find(p=>p.player===replacement.playerIn):null;
    observed={primary,substitute:sub||null};
    if(!/TIRI/.test(leg.market))settlement={status:'unavailable',reason:'UNSUPPORTED_INDIVIDUAL_AUDIT'};
    else{
     settlement=settleLeg({...leg,player:primary.player},match);
     const market=leg.betSelection?.market,semantics=market?.bookmakerSemantics;
     if(settlement.status==='unavailable'&&semantics?.postsAndCrossbarIncluded===true&&leg.selection==='OVER'){
      const lower=settleLeg({...leg,player:primary.player,betSelection:{...leg.betSelection,market:{...market,bookmakerSemantics:{...semantics,postsAndCrossbarIncluded:false}}}},match);
      if(lower.status==='won')settlement={...lower,reason:'OBSERVED_SOT_LOWER_BOUND_REACHES_THRESHOLD'};
     }
    }
   }
  }else settlement=settleLeg(leg,match);
  if(settlement.status==='unavailable'&&!settlement.reason)settlement.reason='WOODWORK_OR_COMPLETE_CONTRACT_STATISTICS_UNAVAILABLE';
  records.push({matchId:f.id,fixture:f.homeTeam+' – '+f.awayTeam,selectionId:leg.selectionId,providerSelectionId:leg.betSelection?.identity?.providerSelectionId??null,label:leg.label,marketScope:leg.marketScope,suggested:leg.suggestionAnalysis?.suggested===true,odds:leg.betSelection?.quote?.decimal??leg.odds??null,settlement:{...settlement,basis:'STATISTICAL_VERIFICATION',officiallySettled:false},observed,sourceUrl:raw.url});
 }
 fixtures.push({id:f.id,fixture:f.homeTeam+' – '+f.awayTeam,score,teamStats:match.teamStats,eventId:event.id,sourceUrl:raw.url,counts:counts(records.filter(r=>r.matchId===f.id)),suggested:counts(records.filter(r=>r.matchId===f.id&&r.suggested))});
}
const result={verifiedAt:new Date().toISOString(),date:'2026-11-03',officiallySettled:false,scope:'Published MD4 catalog, nine finished fixtures; personal browser storage not accessed',slips:catalog.slips.length,counts:counts(records),suggested:counts(records.filter(r=>r.suggested)),fixtures,records};
const suggested=records.filter(r=>r.suggested);
assert.equal(new Set(suggested.map(r=>r.matchId+'|'+(r.providerSelectionId||r.selectionId))).size,suggested.length,'Duplicate suggested provider contract');
assert(suggested.every(r=>r.odds>=1.08),'Minimum quoted odds policy');
fs.writeFileSync(base+'/verification.json',JSON.stringify(result,null,2)+'\n');
const lines=['# Verifica schedine Champions — 3 novembre 2026','','Verifica statistica; nessuna liquidazione certificata del bookmaker. Quote e contratti originali conservati. Nessuna modifica ai dati pubblici. Le schedine personali salvate nel browser non sono comprese.','','| Partita | Risultato | Suggerite vinte | Suggerite perse | Da verificare | Escluse |','|---|---|---:|---:|---:|---:|'];
for(const f of fixtures)lines.push(`| ${f.fixture} | ${f.score.home}–${f.score.away} | ${f.suggested.won||0} | ${f.suggested.lost||0} | ${(f.suggested.unavailable||0)+(f.suggested.pending||0)} | ${f.suggested.excluded||0} |`);
lines.push('','## Selezioni suggerite','');
for(const f of fixtures){lines.push('### '+f.fixture,'');for(const r of records.filter(r=>r.matchId===f.id&&r.suggested))lines.push(`- ${r.label} — **${r.settlement.status}**, quota ${r.odds??'N/D'}${r.settlement.reason?' ('+r.settlement.reason+')':''}`);lines.push('');}
lines.push('## Evidenze interne','',...fixtures.map(f=>'- '+f.fixture+': '+f.sourceUrl));
fs.writeFileSync(base+'/verification.md',lines.join('\n')+'\n');
console.log(JSON.stringify({counts:result.counts,suggested:result.suggested,fixtures:fixtures.map(f=>({fixture:f.fixture,suggested:f.suggested})),unavailable:records.filter(r=>r.suggested&&r.settlement.status==='unavailable').map(r=>({label:r.label,reason:r.settlement.reason}))}));
