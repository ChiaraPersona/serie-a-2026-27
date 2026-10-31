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
for(const file of ['schedina.json',...Array.from({length:9},(_,i)=>`schedina-md${String(i+2).padStart(2,'0')}.json`),...Array.from({length:3},(_,i)=>`schedina-champions-md0${i+1}.json`)]){
  const day=JSON.parse(fs.readFileSync(`data/normalized/${file}`,'utf8'));
  const groups=day.marketCatalog?.matches?.map(m=>sharedForecastsForMatch(day.marketCatalog,m.matchId))||day.fixtures?.map(f=>f.selections)||day.slips?.map(s=>s.legs)||[];
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
