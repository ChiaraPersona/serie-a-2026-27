"use strict";

const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"..");
const read=relative=>storageReadJson(path.join(root,relative));
const integration=read("data/normalized/champions-md02-integration-2026-27.json");
const schedina=read("data/normalized/schedina-champions-md02.json");
const odds=read("data/normalized/odds/sisal/champions-league.json");
const eventByFixture=new Map(odds.events.map(event=>[event.canonicalMatchId,event]));
const outsiderSourcePath=path.join(root,"data/sources/champions-md02-phase12d-outsiders-2026-27.json");
const outsiderIds=fs.existsSync(outsiderSourcePath)
  ?new Set(Object.values(read("data/sources/champions-md02-phase12d-outsiders-2026-27.json")).filter(Array.isArray).flat().map(row=>row?.selectionId).filter(Boolean))
  :new Set();
const selectedIds=new Set(schedina.fixtures.flatMap(fixture=>fixture.selections.map(selection=>selection.selectionId)).filter(selectionId=>!outsiderIds.has(selectionId)));
const round=(value,digits=2)=>Number(Number(value).toFixed(digits));

const individual=[];
const team=[];
const unsupported=new Map();

for(const fixture of integration.fixtures){
  const players=[...fixture.lineups.home.players,...fixture.lineups.away.players];
  const playerById=new Map(players.filter(player=>player.canonicalPlayerId).map(player=>[player.canonicalPlayerId,player]));
  for(const market of fixture.oddsEvent.playerMarkets){
    const open=market.selections.filter(selection=>selection.status==="open"&&selection.interfaceSelectable&&Number(selection.odds)>1);
    if(!open.length)continue;
    if(!["28507","28506"].includes(String(market.marketCode))){
      const key=`${market.marketCode}|${market.marketName}`;
      const row=unsupported.get(key)||{marketCode:String(market.marketCode),marketName:market.marketName,markets:0,openSelections:0,oddsMin:Infinity,oddsMax:0};
      row.markets+=1;
      row.openSelections+=open.length;
      row.oddsMin=Math.min(row.oddsMin,...open.map(selection=>Number(selection.odds)));
      row.oddsMax=Math.max(row.oddsMax,...open.map(selection=>Number(selection.odds)));
      unsupported.set(key,row);
      continue;
    }
    if(market.canonicalPlayerIds.length!==1)continue;
    const player=playerById.get(market.canonicalPlayerIds[0]);
    if(!player)continue;
    const metric=String(market.marketCode)==="28507"?"shots":"shotsOnTarget";
    const projection=metric==="shots"?player.projectedShots:player.projectedShotsOnTarget;
    const over=open.find(selection=>selection.name==="OVER");
    if(!over||selectedIds.has(over.selectionId)||!Number.isFinite(Number(projection)))continue;
    const threshold=Number(market.threshold);
    const minimumProjection=metric==="shots"
      ?({0.5:0.8,1.5:1.5,2.5:2,3.5:2.7}[threshold]??Infinity)
      :({0.5:0.55,1.5:1.1,2.5:1.7}[threshold]??Infinity);
    const quality=player.mappingStatus==="resolved"
      &&player.dataStatus==="verified-history"
      &&Number(player.expectedMinutes)>=75
      &&Number(player.reliability)>=0.55
      &&Number(over.odds)>=1.8
      &&Number(projection)>=minimumProjection;
    const sideProjection=fixture.teamPrediction.teamProjections.find(team=>team.venue===player.side);
    individual.push({
      fixtureId:fixture.fixtureId,
      fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
      kickoff:`${fixture.date}T${fixture.kickoff}:00+02:00`,
      playerId:player.canonicalPlayerId,
      player:player.canonicalName,
      team:player.team,
      role:player.role,
      metric,
      threshold,
      odds:Number(over.odds),
      projected:round(projection),
      expectedMinutes:Number(player.expectedMinutes),
      reliabilityPct:round(Number(player.reliability)*100,1),
      historyMinutes:Number(player.minutes||0),
      per90:player.per90?.[metric]??null,
      reconciliationFactor:player[metric==="shots"?"shotsReconciliationFactor":"shotsOnTargetReconciliationFactor"]??null,
      teamProjection:sideProjection?.[metric==="shots"?"shotsTotal":"shotsOnTarget"]?.central??null,
      providerEventId:fixture.oddsEvent.providerEventId,
      providerMarketId:market.providerMarketId,
      providerSelectionId:over.providerSelectionId,
      selectionId:over.selectionId,
      marketCode:String(market.marketCode),
      marketName:market.marketName,
      variantName:market.variantName,
      modifiers:market.modifiers,
      quality
    });
  }

  const event=eventByFixture.get(fixture.fixtureId);
  if(!event)throw new Error(`${fixture.fixtureId}: evento Sisal mancante`);
  const resultMarket=event.markets.find(market=>String(market.marketCode)==="3"&&market.status==="open");
  for(const outcome of ["1","X","2"]){
    const probability={1:fixture.teamPrediction.probabilities.home,X:fixture.teamPrediction.probabilities.draw,2:fixture.teamPrediction.probabilities.away}[outcome];
    const selection=resultMarket?.selections.find(item=>item.name===outcome&&item.status==="open"&&Number(item.odds)>1);
    if(!selection)continue;
    const selectionId=`sisal:${event.providerEventId}:${resultMarket.providerMarketId}:${selection.providerSelectionId}`;
    if(selectedIds.has(selectionId))continue;
    const ev=round((Number(probability)/100*Number(selection.odds)-1)*100,1);
    team.push({fixtureId:fixture.fixtureId,fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,kickoff:`${fixture.date}T${fixture.kickoff}:00+02:00`,family:"Esito finale",marketCode:"3",selection:outcome,probabilityPct:Number(probability),odds:Number(selection.odds),expectedValuePct:ev,providerEventId:event.providerEventId,providerMarketId:resultMarket.providerMarketId,providerSelectionId:selection.providerSelectionId,selectionId,quality:Number(selection.odds)>=2.4&&Number(probability)>=25&&ev>=2});
  }
  for(const line of fixture.teamPrediction.goals){
    const market=event.markets.find(item=>String(item.marketCode)==="7989"&&Number(item.threshold)===Number(line.threshold)&&item.status==="open");
    if(!market)continue;
    for(const pick of [{selection:"OVER",probabilityPct:line.overPct},{selection:"UNDER",probabilityPct:line.underPct}]){
      const selection=market.selections.find(item=>item.name===pick.selection&&item.status==="open"&&Number(item.odds)>1);
      if(!selection)continue;
      const selectionId=`sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
      if(selectedIds.has(selectionId))continue;
      const ev=round((Number(pick.probabilityPct)/100*Number(selection.odds)-1)*100,1);
      team.push({fixtureId:fixture.fixtureId,fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,kickoff:`${fixture.date}T${fixture.kickoff}:00+02:00`,family:"Gol",marketCode:"7989",threshold:Number(line.threshold),selection:pick.selection,probabilityPct:Number(pick.probabilityPct),odds:Number(selection.odds),expectedValuePct:ev,providerEventId:event.providerEventId,providerMarketId:market.providerMarketId,providerSelectionId:selection.providerSelectionId,selectionId,quality:Number(selection.odds)>=2&&Number(pick.probabilityPct)>=30&&ev>=2});
    }
  }
}

const output={
  generatedAt:new Date().toISOString(),
  criteria:{individual:"probable starter, resolved identity, verified history, expectedMinutes >= 75, reliability >= 55%, odds >= 1.80, metric-specific descriptive projection floor",team:"exact serialized probability, exact open Sisal contract, odds >= 2.00 goals or >= 2.40 1X2, probability >= 30% goals or >= 25% 1X2, EV >= 2%"},
  individualCandidates:individual.filter(row=>row.quality).sort((a,b)=>a.fixtureId.localeCompare(b.fixtureId)||b.odds-a.odds),
  individualRejected:individual.filter(row=>!row.quality).sort((a,b)=>a.fixtureId.localeCompare(b.fixtureId)||b.odds-a.odds),
  teamCandidates:team.filter(row=>row.quality).sort((a,b)=>a.fixtureId.localeCompare(b.fixtureId)||b.odds-a.odds),
  teamRejected:team.filter(row=>!row.quality).sort((a,b)=>a.fixtureId.localeCompare(b.fixtureId)||b.odds-a.odds),
  unsupportedMarkets:[...unsupported.values()].sort((a,b)=>b.openSelections-a.openSelections)
};

module.exports=output;

if(require.main===module&&process.argv.includes("--lines")){
  for(const row of output.individualCandidates)process.stdout.write([row.fixtureId,row.playerId,row.role,row.metric,row.threshold,row.odds,row.projected,row.reliabilityPct,row.historyMinutes,row.selectionId].join("\t")+"\n");
  process.stdout.write("TEAM\n");
  for(const row of output.teamCandidates)process.stdout.write([row.fixtureId,row.family,row.selection,row.threshold??"",row.odds,row.probabilityPct,row.expectedValuePct,row.selectionId].join("\t")+"\n");
}else if(require.main===module&&process.argv.includes("--summary")){
  process.stdout.write(`${JSON.stringify({
    counts:{individualCandidates:output.individualCandidates.length,individualRejected:output.individualRejected.length,teamCandidates:output.teamCandidates.length,teamRejected:output.teamRejected.length,unsupportedMarketFamilies:output.unsupportedMarkets.length},
    individualCandidates:output.individualCandidates.map(({fixtureId,playerId,player,role,metric,threshold,odds,projected,expectedMinutes,reliabilityPct,historyMinutes,teamProjection,selectionId})=>({fixtureId,playerId,player,role,metric,threshold,odds,projected,expectedMinutes,reliabilityPct,historyMinutes,teamProjection,selectionId})),
    teamCandidates:output.teamCandidates
  },null,2)}\n`);
}else if(require.main===module){
  process.stdout.write(`${JSON.stringify(output,null,2)}\n`);
}
