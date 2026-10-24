import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {settleLeg,settleArchivedLeg} from '../js/pages/betting-settlement.mjs';
import {sharedForecastsForMatch,hasVerifiedPlayableQuote} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY} from '../js/pages/personal-betslip-store.mjs';
import {readingResultsDestination} from '../js/pages/reading-detail/shell.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{calculateStandings}=require('./standings.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),dir='output/torino-monza-md08-postmatch',id='torino-monza-2026-27-md-08';
const matches=read('data/normalized/matches.json'),before=read(dir+'/matches-before.json'),match=matches.find(m=>m.id===id),baseline=read(dir+'/baseline.json');
for(const [p,digest]of Object.entries(baseline.protectedHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),digest,p);
assert.deepEqual(matches.filter(m=>m.id!==id),before.filter(m=>m.id!==id));
assert.equal(matches.filter(m=>m.status==='finished').length,71);
assert.deepEqual(matches.filter(m=>m.matchday===8&&m.status==='finished').map(m=>m.id),[id]);
assert.deepEqual(match.score,{home:3,away:2});assert.deepEqual(match.halfTimeScore,{home:1,away:0});
assert.equal(match.scorers.at(-1).playerId,'patterson');assert.equal(match.scorers.at(-1).minute,94);assert.equal(match.scorers.at(-1).ownGoal,true);
for(const side of ['home','away']){
 const players=match.playerStats[side];assert.equal(players.length,16);assert.equal(players.filter(p=>p.starter).length,11);
 assert(players.every(p=>p.playerId&&p.minutes>0&&p.minutes<=90));assert.equal(new Set(players.map(p=>p.playerId)).size,16);
 for(const [field,teamField]of [['shots','shots'],['shotsOnTarget','shotsOnTarget'],['foulsCommitted','fouls'],['hitWoodwork','hitWoodwork']]){
  assert(players.every(p=>Number.isFinite(p[field])));assert.equal(players.reduce((n,p)=>n+p[field],0),match.teamStats[side][teamField]);
 }
}
assert.deepEqual(['home','away'].map(s=>[match.teamStats[s].shots,match.teamStats[s].shotsOnTarget,match.teamStats[s].corners,match.teamStats[s].fouls]),[[17,7,3,8],[7,3,4,4]]);
assert.equal(match.bookings.length,1);assert.equal(match.bookings[0].playerId,'adrian-ismajli');assert.equal(match.substitutions.length,10);
assert.equal(match.didNotPlay.home.find(p=>p.player==='Pietro Pellegri').playerId,null);
const resultSources=read('data/sources/match-results-2026-27.json'),priorSources=read(dir+'/results-before.json');
assert.deepEqual(resultSources.matches.filter(m=>m.matchId!==id),priorSources.matches.filter(m=>m.matchId!==id));
const teams=read('data/normalized/teams.json'),standings=calculateStandings(teams,matches);
assert.equal(standings.find(r=>r.team==='torino').points,13);assert.equal(standings.find(r=>r.team==='monza').points,7);
for(const teamId of ['torino','monza'])assert.equal(standings.find(r=>r.team===teamId).played,8);
const clubsBefore=read(dir+'/teams-before.json');
for(const [file,original]of Object.entries(clubsBefore))if(!['index.json','player-leaderboards.json','torino.json','monza.json'].includes(file))assert.deepEqual(read('data/teams/'+file),original);
assert.deepEqual(read('data/teams/index.json').officialLineups,clubsBefore['index.json'].officialLineups);
const catalog=read('data/normalized/schedina-md08.json').marketCatalog;
assert.deepEqual(catalog,read('data/normalized/reading-md08-market-catalog.json').marketCatalog);
const forecasts=sharedForecastsForMatch(catalog,id),records=read('data/normalized/card-settlement-records.json').records;
const outcomes=legs=>legs.map(leg=>({selectionId:leg.selectionId,label:leg.label,quoted:hasVerifiedPlayableQuote(leg),odds:leg.odds,result:settleArchivedLeg(leg,match,records)}));
const summarize=rows=>{const quoted=rows.filter(r=>r.quoted),stake=quoted.length,gross=quoted.reduce((n,r)=>n+(r.result.status==='won'?Number(r.odds):r.result.status==='void'?1:0),0);return {total:rows.length,won:rows.filter(r=>r.result.status==='won').length,lost:rows.filter(r=>r.result.status==='lost').length,void:rows.filter(r=>r.result.status==='void').length,unavailable:rows.filter(r=>!['won','lost','void'].includes(r.result.status)).length,quoted:stake,unquoted:rows.length-stake,unitStake:1,stake,gross:Number(gross.toFixed(2)),net:Number((gross-stake).toFixed(2)),roiPct:Number(((gross/stake-1)*100).toFixed(2)),providerCertified:false};};
const rows=outcomes(forecasts),summary=summarize(rows);
assert.equal(summary.total,24);assert.equal(summary.won,9);assert.equal(summary.lost,15);assert.equal(summary.unquoted,4);assert.equal(summary.gross,10.38);
for(const metric of ['shots','sot'])assert.equal(rows.find(r=>r.selectionId.includes(':team:monza:'+metric+':')).result.status,'lost');
assert.equal(settleLeg(forecasts.find(l=>l.selectionId.includes(':mandragora:shots:')),match).status,'won');
// The new canonical route fails closed for an unresolved team, and retains N/D stats.
const modelLeg=forecasts.find(l=>l.selectionId.includes(':team:monza:shots:'));
assert.equal(settleLeg({...modelLeg,betSelection:{...modelLeg.betSelection,market:{...modelLeg.betSelection.market,subject:{id:'unknown'}}}},match).status,'unavailable');
const unknown=structuredClone(match);unknown.teamStats.away.shots=null;assert.equal(settleLeg(modelLeg,unknown).status,'unavailable');
// Check every older catalog against the pre-change settlement module, with no changes to legacy outcomes.
const original=execFileSync('git',['show','HEAD:js/pages/betting-settlement.mjs'],{encoding:'utf8'}).replace(/from '\.\/disciplinary\.mjs[^']*'/,"from '"+new URL('../js/pages/disciplinary.mjs',import.meta.url).href+"'");
const legacy=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));let historicalChecks=0;
for(let day=1;day<=7;day++){
 const file=day===1?'data/normalized/schedina.json':`data/normalized/schedina-md${String(day).padStart(2,'0')}.json`;
 if(!fs.existsSync(file))continue;const data=read(file);
 const legs=[...(data.marketCatalog?.matches||[]).flatMap(m=>m.selections),...(data.slips||[]).flatMap(s=>s.legs||[])];
 for(const leg of legs){const oldMatch=before.find(m=>m.id===leg.matchId);if(oldMatch?.status!=='finished')continue;assert.deepEqual(settleLeg(leg,oldMatch),legacy.settleLeg(leg,oldMatch),leg.selectionId||leg.label);historicalChecks++;}
}
const context={competition:'serie-a',season:'2026-27',matchday:8},key='serie-a:2026-27:md08';
const values=new Map([[PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context,selections:[{...forecasts.find(hasVerifiedPlayableQuote),context}]}}})]]);
const store=createPersonalBetslipStore({storage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}});store.setContext(context);store.reconcile(forecasts);
assert.equal(store.getSnapshot().selections.length,1,'Previously saved starter selection lost');
for(const kind of ['catalogs','matches'])assert.deepEqual(sharedForecastsForMatch(read(`data/generated/readings/${kind}/${id}.json`).forecastDataset.marketCatalog,id),forecasts);
assert.equal(await readingResultsDestination({competition:'serie-a',fixture:match},async p=>read(p)),'schedina.html?giornata=8');
const officialBefore=read('output/torino-monza-md08-official/before.json')['data/normalized/schedina-md08.json'].marketCatalog;
const prior=outcomes(sharedForecastsForMatch(officialBefore,id));
const report={status:'PASS',matchId:id,score:match.score,statistics:{players:32,starters:22,substitutions:10,bookings:1},filteredPublished:summary,preOfficialPublished:summarize(prior),outcomes:rows,preOfficialOutcomes:prior,historicalChecks,otherFixturesUnchanged:true,protectedHashesVerified:true,previouslySavedSelectionPreserved:true,canonicalScopeOptInOnly:true,legacyScopeDefectDeferred:'Older reports retain their original interpretation; broader historical correction is outside this fixture update.'};
fs.writeFileSync(dir+'/data-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,...summary,historicalChecks}));
