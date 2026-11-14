import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sharedForecastsForMatch,uniqueForecastContracts,hasVerifiedPlayableQuote} from '../js/pages/shared-forecast-contract.mjs';

const data=JSON.parse(fs.readFileSync('data/normalized/schedina-md10.json','utf8'));
let count=0;
for(const match of data.marketCatalog.matches){
  const forecasts=sharedForecastsForMatch(data.marketCatalog,match.matchId);
  const keys=forecasts.map(leg=>JSON.stringify([leg.betSelection.quote.source.provider,leg.betSelection.identity.providerMarketId,leg.betSelection.identity.providerSelectionId]));
  assert.equal(new Set(keys).size,keys.length,`${match.matchId}: contratto provider ripetuto`);
  count+=forecasts.length;
}
const match=data.marketCatalog.matches[0],first=sharedForecastsForMatch(data.marketCatalog,match.matchId)[0];
const duplicate=structuredClone(first);
duplicate.selectionId+=':alias';duplicate.betSelection.selectionId=duplicate.selectionId;
const distinct=structuredClone(duplicate);
distinct.selectionId+=':other';distinct.betSelection.selectionId=distinct.selectionId;
distinct.betSelection.identity.providerSelectionId+=':other';
const catalog={matches:[{matchId:match.matchId,selections:[first,duplicate,distinct]}]};
assert.deepEqual(sharedForecastsForMatch(catalog,match.matchId).map(l=>l.selectionId),[first.selectionId,distinct.selectionId]);
assert.deepEqual(uniqueForecastContracts([first,duplicate,distinct]),[first,distinct]);
assert.deepEqual(uniqueForecastContracts([{leg:first},{leg:duplicate},{leg:distinct}],row=>row.leg),[{leg:first},{leg:distinct}]);
assert.equal(uniqueForecastContracts([{},{}]).length,2,'Missing identities must not merge unrelated rows');
const historical=JSON.parse(fs.readFileSync('data/normalized/schedina-md07.json','utf8')).marketCatalog.matches.find(m=>m.matchId==='fiorentina-como-2026-27-md-07');
const model=historical.selections.find(l=>l.betSelection?.forecastIdentity?.subjectId==='como'&&l.betSelection.forecastIdentity.metric==='sot'&&l.betSelection.forecastIdentity.threshold===3.5);
const quoted=historical.selections.find(l=>l.suggestionAnalysis?.suggested&&l.betSelection?.compatibility?.modelTarget==='statistical:sot-team-over'&&l.betSelection.market.threshold===3.5&&l.betSelection.market.variant.startsWith('SQUADRA 2:'));
const earlyModel=structuredClone(model);earlyModel.suggestionAnalysis.rank=0;
const pair={...historical,selections:[earlyModel,quoted]};
assert.deepEqual(sharedForecastsForMatch({matches:[pair]},pair.matchId).map(l=>l.selectionId),[quoted.selectionId],'Keep the verified row even when the unquoted model is ranked first');
assert.equal(sharedForecastsForMatch({matches:[{matchId:pair.matchId,selections:pair.selections}]},pair.matchId,historical).length,1,'Light projections must use canonical fixture context');
const anotherThreshold=structuredClone(earlyModel);anotherThreshold.betSelection.forecastIdentity.threshold+=1;
assert.equal(sharedForecastsForMatch({matches:[{...pair,selections:[anotherThreshold,quoted]}]},pair.matchId).length,2,'Different thresholds must remain separate');
const duo=structuredClone(quoted);duo.betSelection.market.bookmakerSemantics.duo=true;
assert.equal(sharedForecastsForMatch({matches:[{...pair,selections:[earlyModel,duo]}]},pair.matchId).length,2,'A DUO contract is not a team event');
assert.equal(sharedForecastsForMatch({matches:[{...pair,homeTeam:'como',awayTeam:'fiorentina'}]},pair.matchId).length,2,'Different canonical team IDs must remain separate');
for(const file of ['schedina.json',...Array.from({length:9},(_,i)=>`schedina-md${String(i+2).padStart(2,'0')}.json`),...Array.from({length:3},(_,i)=>`schedina-champions-md0${i+1}.json`)]){
  const day=JSON.parse(fs.readFileSync(`data/normalized/${file}`,'utf8'));
  const groups=day.marketCatalog?.matches?.map(m=>sharedForecastsForMatch(day.marketCatalog,m.matchId))||day.fixtures?.map(f=>f.selections)||day.slips?.map(s=>s.legs)||[];
  if(day.marketCatalog)for(const match of day.marketCatalog.matches){
    const labels=sharedForecastsForMatch(day.marketCatalog,match.matchId).map(l=>l.label.toLowerCase());
    assert.equal(new Set(labels).size,labels.length,`${file} ${match.matchId}: evento di squadra mostrato due volte`);
  }
  for(const legs of groups){
    const verified=(legs||[]).filter(hasVerifiedPlayableQuote);
    assert.equal(uniqueForecastContracts(verified).length,verified.length,`${file}: repeated published contract`);
    // Legacy archives have flat provider IDs and no BetSelection contract.
    const legacy=(legs||[]).filter(l=>!l.betSelection&&l.providerSelectionId);
    const keys=legacy.map(l=>JSON.stringify([l.matchId||l.fixtureId,l.providerSelectionId]));
    assert.equal(new Set(keys).size,keys.length,`${file}: repeated legacy contract`);
  }
}
console.log(`OK: ${count} pronostici MD10 senza contratti duplicati; alias esclusi, contratti distinti conservati.`);
console.log('OK: controllate tutte le 10 giornate Serie A e le 3 Champions, inclusi gli archivi precedenti.');
