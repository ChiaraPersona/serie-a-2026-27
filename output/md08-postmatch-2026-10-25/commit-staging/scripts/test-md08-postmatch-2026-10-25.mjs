import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
import {settleArchivedLeg} from '../js/pages/betting-settlement.mjs';
const dir='output/md08-postmatch-2026-10-25',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baseline=read(dir+'/baseline.json'),matches=read('data/normalized/matches.json'),before=read(dir+'/matches-before.json');
for(const [p,h]of Object.entries(baseline.protectedHashes))if(!p.endsWith('official-lineups-2026-27.json'))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p);
assert.deepEqual(matches.filter(m=>!baseline.matchIds.includes(m.id)),before.filter(m=>!baseline.matchIds.includes(m.id)));
const oldTeams=read(dir+'/teams-before.json'),affected=baseline.matchIds.flatMap(id=>{const m=matches.find(m=>m.id===id);return[m.homeTeam,m.awayTeam];});
for(const [f,d]of Object.entries(oldTeams))if(!['index.json','player-leaderboards.json'].includes(f)&&!affected.includes(f.replace('.json','')))assert.deepEqual(read('data/teams/'+f),d,f);
const official=read('data/sources/official-lineups-2026-27.json'),oldOfficial=read(dir+'/official-before.json');
assert.deepEqual(official.fixtures.filter(f=>f.matchId!=='napoli-roma-2026-27-md-08'),oldOfficial.fixtures.filter(f=>f.matchId!=='napoli-roma-2026-27-md-08'));
const catalog=read('data/normalized/schedina-md08.json').marketCatalog,records=read('data/normalized/card-settlement-records.json').records;
const reports=baseline.matchIds.map(id=>{
 const m=matches.find(m=>m.id===id);assert.equal(m.status,'finished');
 for(const side of ['home','away']){
  assert.equal(m.playerStats[side].filter(p=>p.starter).length,11);
  for(const [pf,tf]of [['shots','shots'],['shotsOnTarget','shotsOnTarget'],['foulsCommitted','fouls'],['hitWoodwork','hitWoodwork']])assert.equal(m.playerStats[side].reduce((n,p)=>n+p[pf],0),m.teamStats[side][tf]);
 }
 const legs=sharedForecastsForMatch(catalog,id),rows=legs.map(l=>({selectionId:l.selectionId,label:l.label,odds:l.odds,result:settleArchivedLeg(l,m,records)}));
 for(const kind of ['catalogs','matches'])assert.deepEqual(sharedForecastsForMatch(read(`data/generated/readings/${kind}/${id}.json`).forecastDataset.marketCatalog,id),legs);
 const counts=Object.fromEntries(['won','lost','void','unavailable','pending'].map(s=>[s,rows.filter(r=>r.result.status===s).length]));
 return{matchId:id,score:m.score,players:m.playerStats.home.length+m.playerStats.away.length,counts,rows,providerCertified:false,unresolvedPlayers:[...m.playerStats.home,...m.playerStats.away].filter(p=>!p.playerId).map(p=>p.player)};
});
assert.equal(matches.filter(m=>m.status==='finished').length,78);
fs.writeFileSync(dir+'/settlement.json',JSON.stringify(reports,null,2)+'\n');
fs.writeFileSync(dir+'/data-audit.json',JSON.stringify({status:'PASS',protectedForecastsAndQuotes:true,unrelatedFixturesAndTeamsUnchanged:true,reports:reports.map(({rows,...r})=>r)},null,2)+'\n');
console.log(JSON.stringify(reports.map(({rows,...r})=>r),null,2));
