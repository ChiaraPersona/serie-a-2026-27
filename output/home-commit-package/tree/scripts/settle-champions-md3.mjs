import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {settleMd3Leg} from '../js/pages/champions-md3-results.mjs';
const require=createRequire(import.meta.url),policy=require('../js/official-starter-policy.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,d)=>{fs.mkdirSync(p.slice(0,p.lastIndexOf('/')),{recursive:true});const body=JSON.stringify(d,null,2)+'\n';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==body)fs.writeFileSync(p,body)};
const reports=read('data/sources/champions-results-md03-2026-27.json');
const file='data/sources/champions-official-formations-md03-2026-27.json',official=read(file);
const changes=[];
for(const r of reports.fixtures){
  let f=official.fixtures.find(f=>f.fixtureId===r.fixtureId);
  if(!f){f={fixtureId:r.fixtureId,status:'official'};official.fixtures.push(f)}
  for(const side of ['home','away']){
    const players=r.actualLineups[side].players.filter(p=>p.starter);
    assert.equal(players.length,11,r.fixtureId+' '+side);
    const old=f[side]?.players||[];
    const ids=old.map(p=>p.playerId||p.canonicalPlayerId).filter(Boolean);
    const actual=players.map(p=>p.playerId).filter(Boolean);
    if(ids.slice().sort().join('|')!==actual.slice().sort().join('|'))changes.push({fixtureId:r.fixtureId,side,previous:ids,observed:actual});
    f[side]={...f[side],teamId:r.playerEvidence.find(p=>p.team===side).teamId,
      players:players.map(p=>({...p,canonicalName:p.name,identityStatus:p.playerId?'canonical-provider-id':'unresolved'}))};
  }
  f.status='official';f.postMatchVerification=r.detailedReportSource;
}
write(file,official);
require('./apply-official-starter-policy.js').build();
const workspace=await loadChampionsWorkspaceMd3Derived(async name=>read('data/normalized/'+name),3);
const excluded=workspace.all.filter(l=>!policy.eligible(l,l.matchId));
write('data/technical-archive/champions-md03/settlement-excluded.json',excluded);
const operational=workspace.all.filter(l=>policy.eligible(l,l.matchId));
const records=operational.map(l=>({selectionId:l.selectionId,matchId:l.matchId,playerId:l.playerId??null,market:l.market,label:l.label,
  suggested:l.suggestionAnalysis?.suggested===true,odds:l.betSelection?.quote?.decimal??l.odds??null,
  settlement:settleMd3Leg(l,workspace.fixtures.find(f=>f.id===l.matchId))}));
const tally=rows=>rows.reduce((c,r)=>(c[r.settlement.status]=(c[r.settlement.status]||0)+1,c),{});
const economics=rows=>{
  const quoted=rows.filter(r=>Number.isFinite(r.odds)&&r.odds>1);
  const decided=quoted.filter(r=>['won','lost','void'].includes(r.settlement.status));
  const gross=decided.reduce((n,r)=>n+(r.settlement.status==='won'?r.odds:r.settlement.status==='void'?1:0),0);
  return {unitStakeEuro:1,considered:decided.length,unverified:quoted.length-decided.length,unquoted:rows.length-quoted.length,
    stakeEuro:decided.length,grossReturnEuro:+gross.toFixed(2),profitLossEuro:+(gross-decided.length).toFixed(2),roiPct:decided.length?+((gross/decided.length-1)*100).toFixed(2):null};
};
const selected=records.filter(r=>r.suggested);
const summary={schemaVersion:1,matchday:3,verifiedAt:reports.individualMarketVerificationAt||'2026-10-22',officiallySettled:false,fixtures:18,
  counts:tally(records),suggested:tally(selected),filteredEconomics:economics(selected),
  originalPublicationEconomics:economics(workspace.all.filter(l=>l.suggestionAnalysis?.suggested).map(l=>({...l,odds:l.betSelection?.quote?.decimal??l.odds,settlement:l.settlement}))),
  excluded:excluded.length,lineupChanges:changes.length?changes:(fs.existsSync('data/normalized/champions-md03-settlement.json')?read('data/normalized/champions-md03-settlement.json').lineupChanges:[]),unverifiable:records.filter(r=>!['won','lost','void'].includes(r.settlement.status)),records};
write('data/normalized/champions-md03-settlement.json',summary);
console.log(JSON.stringify({counts:summary.counts,suggested:summary.suggested,economics:summary.filteredEconomics,excluded:excluded.length,lineupChanges:changes.length}));
