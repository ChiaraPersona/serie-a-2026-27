import assert from 'node:assert/strict';
import fs from 'node:fs';
import {archiveContractStats} from '../js/pages/archive-contract-stats.mjs';
import {sharedForecastsForMatch,uniqueForecastContracts} from '../js/pages/shared-forecast-contract.mjs';

const data=JSON.parse(fs.readFileSync('data/normalized/schedina-md10.json','utf8'));
const first=sharedForecastsForMatch(data.marketCatalog,data.marketCatalog.matches[0].matchId)[0];
const won=structuredClone(first);won.odds=2;
const alias=structuredClone(won);alias.selectionId+=':alias';alias.betSelection.selectionId=alias.selectionId;
const other=(id,status)=>({matchId:'fixture',providerSelectionId:id,odds:3,settlement:{status}});
const lost=other('lost','lost'),voidLeg=other('void','void'),pending=other('pending','pending');
const input=[won,alias,lost,{...lost},voidLeg,pending];
const original=JSON.stringify(input);
const stats=archiveContractStats(input,leg=>leg.settlement||{status:'won'});
assert.deepEqual(stats,{archiveWins:1,archiveVoids:1,archiveStake:2,archiveSuccessPct:50,archiveProfitPct:0,archiveGrossReturn:2,archiveNetProfit:0,archivePending:1});
assert.equal(JSON.stringify(input),original,'Original archive must remain unchanged');
assert.equal(uniqueForecastContracts([won,alias]).length,1);
// A repeated winner must not inflate either success or ROI.
const without=archiveContractStats([won,lost],leg=>leg.settlement||{status:'won'});
assert.deepEqual(archiveContractStats([won,alias,lost],leg=>leg.settlement||{status:'won'}),without);
const distinct=structuredClone(won);distinct.betSelection.identity.providerSelectionId+=':other';
assert.equal(archiveContractStats([won,distinct],()=>({status:'won'})).archiveStake,2);
console.log('OK: successo e ROI per contratto unico, alias e ID legacy, contratti distinti, annullate, pendenti e integrità originali.');
