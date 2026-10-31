import {uniqueForecastContracts,meetsMinimumPublicOdds} from './shared-forecast-contract.mjs?v=20261031-md10-min-odds-108-v5';

// Presentation economics: original selections and settlements remain immutable.
export function archiveContractStats(legs,resolve){
  const results=uniqueForecastContracts(legs.filter(meetsMinimumPublicOdds)).map(leg=>({leg,settlement:resolve(leg)}));
  const archiveWins=results.filter(r=>r.settlement.status==='won').length;
  const archiveLosses=results.filter(r=>r.settlement.status==='lost').length;
  const archiveVoids=results.filter(r=>r.settlement.status==='void').length;
  const archiveStake=archiveWins+archiveLosses;
  const archiveGrossReturn=results.reduce((sum,{leg,settlement})=>settlement.status==='won'?sum+Number(leg.odds):sum,0);
  return {archiveWins,archiveVoids,archiveStake,
    archiveSuccessPct:archiveStake?archiveWins/archiveStake*100:0,
    archiveProfitPct:archiveStake?(archiveGrossReturn-archiveStake)/archiveStake*100:0,
    archiveGrossReturn,archiveNetProfit:archiveGrossReturn-archiveStake,
    archivePending:results.length-archiveStake-archiveVoids};
}
