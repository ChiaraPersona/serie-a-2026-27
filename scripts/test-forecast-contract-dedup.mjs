import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';

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
console.log(`OK: ${count} pronostici MD10 senza contratti duplicati; alias esclusi, contratti distinti conservati.`);
