/* Shared build/browser policy. Identity is exact; no forecast transfer. */
(function(scope){
  const token=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  let registry={};
  function configure(value){registry=value||{};}
  function eligible(row,matchId){
    if(!row||typeof row!=='object')return true;
    const subject=row.betSelection?.market?.subject||{};
    const player=row.player&&typeof row.player==='object'?row.player:{};
    const individual=row.marketScope==='player'||row.betSelection?.market?.scope==='player'||String(subject.type||'').includes('player')||Boolean(row.playerId||player.canonicalPlayerId)||/GIOCATORE/.test(String(row.betSelection?.market?.name||row.market||''));
    if(!individual)return true;
    const fixture=registry[row.matchId||row.fixtureId||row.betSelection?.identity?.matchId||matchId];
    if(!fixture)return !['official-bench','official-non-starter','official-nonstarter'].includes(player.lineupStatus);
    const id=player.canonicalPlayerId||row.playerId||subject.id||row.lineupEligibility?.playerId;
    if(id&&fixture.ids.includes(String(id)))return true;
    const name=player.canonicalName||player.name||row.playerName||subject.name||(typeof row.player==='string'?row.player:null);
    return Boolean(name&&fixture.names.includes(token(name)));
  }
  function filter(value,matchId,archivedMatchIds=new Set()){
    if(Array.isArray(value))return value.filter(row=>archivedMatchIds.has(row?.fixtureId||row?.matchId||row?.betSelection?.identity?.matchId||matchId)||eligible(row,matchId)).map(row=>filter(row,matchId,archivedMatchIds));
    if(!value||typeof value!=='object')return value;
    const id=value.fixtureId||value.matchId||value.id||matchId;
    if(archivedMatchIds.has(id))return value;
    const copy={};for(const [key,item] of Object.entries(value))copy[key]=filter(item,id,archivedMatchIds);
    if(Array.isArray(value.legs)&&copy.legs.length!==value.legs.length){
      // The original combined metrics belong to the full technical snapshot.
      // Do not present them as metrics of the remaining public selections.
      copy.officialStarterFiltered=true;
      for(const key of ['combinedOdds','jointModelProbabilityPct','fairOdds','expectedValuePct','weakestLeg','settlement'])if(key in copy)copy[key]=null;
    }
    if(Array.isArray(copy.slips))copy.slips=copy.slips.filter(slip=>!slip.officialStarterFiltered||slip.legs.length);
    return copy;
  }
  const api={configure,eligible,filter,token};scope.officialStarterPolicy=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
