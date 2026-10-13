const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const root=path.resolve(__dirname,"..");
const paths={
  integration:"data/normalized/champions-md02-integration-2026-27.json",
  individualSelection:"data/sources/champions-md02-individual-selection-2026-27.json",
  odds:"data/normalized/odds/sisal/champions-league.json",
  calendar:"data/normalized/champions-league-2026-27.json",
  output:"data/normalized/schedina-champions-md02.json"
};
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const hash=relative=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,relative))).digest("hex").toUpperCase();
const round=(value,digits=2)=>Number(Number(value).toFixed(digits));
const finite=value=>value!==null&&value!==""&&Number.isFinite(Number(value));

const integration=read(paths.integration);
const individualSelection=read(paths.individualSelection);
const odds=read(paths.odds);
const calendar=read(paths.calendar);
const eventByFixture=new Map(odds.events.map(event=>[event.canonicalMatchId,event]));
const calendarByFixture=new Map(calendar.fixtures.map(fixture=>[fixture.id,fixture]));

function settle(selection,calendarFixture){
  if(calendarFixture?.status!=="finished"||!finite(calendarFixture?.score?.home)||!finite(calendarFixture?.score?.away))return {status:"pending",label:"Da verificare"};
  const home=Number(calendarFixture.score.home),away=Number(calendarFixture.score.away);
  const outcome=home>away?"1":home<away?"2":"X";
  if(!/^(?:1|X|2|1X|12|X2)$/.test(selection))return {status:"unavailable",label:"Non verificabile"};
  const won=selection.includes(outcome);
  return {status:won?"won":"lost",label:won?"Esatto":"Sbagliato",officialScore:`${home}-${away}`};
}

function modifiers(market){
  return {
    threshold:market.threshold??null,
    variantName:market.variantName??null,
    periodScope:"full-match",
    replacementIncluded:false,
    woodworkIncluded:false,
    duo:false
  };
}

function selectedForecast(fixture){
  const event=eventByFixture.get(fixture.fixtureId);
  if(!event)throw new Error(`${fixture.fixtureId}: evento Sisal non trovato`);
  const verdict=fixture.teamPrediction?.verdict;
  if(!verdict?.outcome||!finite(verdict.probabilityPct))throw new Error(`${fixture.fixtureId}: verdetto squadra già generato non disponibile`);
  const marketCode=verdict.outcome.length===1?"3":"28319";
  const market=event.markets.find(item=>String(item.marketCode)===marketCode&&item.status==="open");
  const selection=market?.selections?.find(item=>item.status==="open"&&item.name===verdict.outcome&&finite(item.odds)&&Number(item.odds)>0);
  if(!market||!selection)throw new Error(`${fixture.fixtureId}: quota Sisal esatta non trovata per ${verdict.outcome}`);
  const probability=Number(verdict.probabilityPct);
  const fairOdds=round(100/probability);
  const expectedValuePct=round((probability/100*Number(selection.odds)-1)*100,1);
  const selectionId=`sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
  const originalModifiers=modifiers(market);
  const settlement=settle(verdict.outcome,calendarByFixture.get(fixture.fixtureId));
  return {
    selectionId,
    context:{competition:"champions",season:"2026-27",matchday:2},
    matchId:fixture.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    market:market.marketName,
    marketScope:market.marketScope||"match",
    marketFamily:marketCode==="3"?"Esito finale":"Doppia chance",
    selection:verdict.outcome,
    label:`${verdict.label} (${verdict.outcome})`,
    odds:Number(selection.odds),
    modelProbabilityPct:probability,
    fairOdds,
    expectedValuePct,
    evidenceLabel:`Verdetto squadra già generato · ${probability.toLocaleString("it-IT")}%`,
    providerEventId:event.providerEventId,
    providerMarketId:market.providerMarketId,
    providerSelectionId:selection.providerSelectionId,
    marketCode:String(market.marketCode),
    marketName:market.marketName,
    variantName:market.variantName,
    threshold:market.threshold??null,
    modifiers:originalModifiers,
    settlement,
    scenarioAnalysis:{compatibleOutcomes:[...verdict.outcomes],prevalentOutcome:verdict.outcome},
    betSelection:{
      selectionId,
      identity:{
        status:"VERIFIED_PROVIDER_IDS",
        matchId:fixture.fixtureId,
        providerEventId:event.providerEventId,
        providerMarketId:market.providerMarketId,
        providerSelectionId:selection.providerSelectionId,
        providerPlayerIds:[],
        canonicalPlayerIds:[]
      },
      market:{
        name:market.marketName,
        family:marketCode==="3"?"Esito finale":"Doppia chance",
        code:String(market.marketCode),
        variant:market.variantName,
        threshold:market.threshold??null,
        selection:verdict.outcome,
        modifiers:originalModifiers,
        bookmakerSemantics:{selectionName:selection.name,modifiers:originalModifiers}
      },
      quote:{
        decimal:Number(selection.odds),
        oddsRaw:selection.oddsRaw,
        availability:"AVAILABLE_AT_SNAPSHOT",
        verifiedAt:event.retrievedAt||odds.retrievedAt,
        marketUpdatedAt:market.updatedAt||null,
        source:{provider:"Sisal",url:odds.sourceUrl}
      },
      evaluation:{
        status:"MODELLED_EXISTING_TEAM_VERDICT",
        kind:"TEAM_RESULT_VERDICT",
        modelProbabilityPct:probability,
        fairOdds,
        expectedValuePct,
        provenance:{source:paths.integration,predictionGeneratedAt:integration.generatedAt}
      },
      compatibility:{status:"COMPATIBILE",bookmakerCombinability:"UNKNOWN"},
      operational:{playability:{status:"PLAYABLE"},classification:"SELEZIONATO"},
      overlap:{overlapKey:`${fixture.fixtureId}:${market.providerMarketId}`,semanticKeys:[`${fixture.fixtureId}:result:${verdict.outcome}`]}
    }
  };
}

const individualMarket={
  shots:{code:"28507",family:"Tiri giocatore",projectionKey:"projectedShots",unit:"tiri"},
  shotsOnTarget:{code:"28506",family:"Tiri in porta giocatore",projectionKey:"projectedShotsOnTarget",unit:"SOT"}
};

function selectedIndividualForecast(fixture,pick){
  const config=individualMarket[pick.metric];
  if(!config)throw new Error(`${fixture.fixtureId}: metrica individuale non supportata ${pick.metric}`);
  if(fixture.teamPrediction?.dataQuality?.detailedVolumesAvailable!==true)throw new Error(`${fixture.fixtureId}: volumi dettagliati mancanti, selezione individuale vietata`);
  const players=[...fixture.lineups.home.players,...fixture.lineups.away.players];
  const player=players.find(item=>item.canonicalPlayerId===pick.playerId);
  if(!player)throw new Error(`${fixture.fixtureId}: giocatore canonico ${pick.playerId} non trovato nella probabile formazione`);
  if(player.mappingStatus!=="resolved"||player.dataStatus!=="verified-history")throw new Error(`${fixture.fixtureId}: identita o storico non verificati per ${pick.playerId}`);
  const projection=player[config.projectionKey];
  if(!finite(projection)||!finite(player.expectedMinutes))throw new Error(`${fixture.fixtureId}: forecast/minuti N/D per ${pick.playerId}`);
  const market=fixture.oddsEvent.playerMarkets.find(item=>item.marketCode===config.code&&item.canonicalPlayerIds.includes(pick.playerId)&&Number(item.threshold)===Number(pick.threshold)&&item.status==="open");
  const selection=market?.selections?.find(item=>item.name==="OVER"&&item.interfaceSelectable&&item.status==="open"&&finite(item.odds)&&Number(item.odds)>0);
  if(!market||!selection)throw new Error(`${fixture.fixtureId}: linea Sisal ${config.code} over ${pick.threshold} non trovata per ${pick.playerId}`);
  const originalModifiers={...market.modifiers};
  const selectionId=selection.selectionId||`sisal:${fixture.oddsEvent.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
  const threshold=Number(market.threshold);
  const limitation=pick.metric==="shotsOnTarget"
    ?"Il forecast quantifica i SOT del solo giocatore; la quota Sisal include il sostituto e anche pali/traverse. Probabilita, quota equa ed EV del contratto restano N/D."
    :"Il forecast quantifica i tiri del solo giocatore; la quota Sisal include anche il sostituto. Probabilita, quota equa ed EV del contratto restano N/D.";
  const roleLabel=player.role||"ruolo N/D";
  const motivation=`${round(projection,2).toLocaleString("it-IT")} ${config.unit} attesi in ${round(player.expectedMinutes,1).toLocaleString("it-IT")} minuti; ${roleLabel}, storico verificato su ${Number(player.minutes||0).toLocaleString("it-IT")} minuti e affidabilita ${round(Number(player.reliability)*100,1).toLocaleString("it-IT")}%.`;
  return {
    selectionId,
    context:{competition:"champions",season:"2026-27",matchday:2},
    matchId:fixture.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    market:market.marketName,
    marketScope:"player",
    marketFamily:config.family,
    selection:"OVER",
    providerSelectionCode:selection.code,
    label:`${player.canonicalName} over ${threshold.toLocaleString("it-IT")} ${config.unit}${market.replacementIncluded?" · sostituto incluso":""}${market.woodworkIncluded?" · pali/traverse inclusi":""}`,
    odds:Number(selection.odds),
    modelProbabilityPct:null,
    fairOdds:null,
    expectedValuePct:null,
    evidenceLabel:`Proiezione singolo: ${round(projection,2).toLocaleString("it-IT")} ${config.unit} · ${round(player.expectedMinutes,1).toLocaleString("it-IT")} min`,
    motivation,
    limitation,
    player:{
      canonicalPlayerId:player.canonicalPlayerId,
      canonicalName:player.canonicalName,
      providerPlayerIds:[...market.providerPlayerIds],
      team:player.team,
      side:player.side,
      role:player.role,
      lineupStatus:"probable-starter",
      expectedMinutes:Number(player.expectedMinutes),
      historyMinutes:Number(player.minutes||0),
      reliability:Number(player.reliability),
      dataStatus:player.dataStatus,
      projectedShots:player.projectedShots,
      projectedShotsOnTarget:player.projectedShotsOnTarget
    },
    dataQuality:{fixtureDetailedVolumes:true,playerDataStatus:player.dataStatus,identityStatus:player.mappingStatus},
    providerEventId:fixture.oddsEvent.providerEventId,
    providerMarketId:market.providerMarketId,
    providerSelectionId:selection.providerSelectionId,
    marketCode:String(market.marketCode),
    marketName:market.marketName,
    variantName:market.variantName,
    threshold,
    modifiers:originalModifiers,
    settlement:{status:"pending",label:"Da verificare"},
    betSelection:{
      selectionId,
      identity:{
        status:"VERIFIED_PROVIDER_IDS",
        matchId:fixture.fixtureId,
        providerEventId:fixture.oddsEvent.providerEventId,
        providerMarketId:market.providerMarketId,
        providerSelectionId:selection.providerSelectionId,
        providerPlayerIds:[...market.providerPlayerIds],
        canonicalPlayerIds:[player.canonicalPlayerId]
      },
      market:{
        name:market.marketName,
        family:config.family,
        code:String(market.marketCode),
        variant:market.variantName,
        threshold,
        selection:"OVER",
        modifiers:originalModifiers,
        bookmakerSemantics:{
          selectionName:selection.name,
          selectionCode:selection.code,
          modifiers:originalModifiers,
          duo:true,
          replacementIncluded:market.replacementIncluded===true,
          postsAndCrossbarIncluded:market.woodworkIncluded===true
        }
      },
      quote:{
        decimal:Number(selection.odds),
        oddsRaw:selection.oddsRaw,
        availability:selection.quoteAvailability,
        verifiedAt:fixture.oddsEvent.retrievedAt,
        marketUpdatedAt:market.updatedAt||null,
        source:{provider:"Sisal",url:odds.sourceUrl}
      },
      evaluation:{
        status:"NOT_MODELLED",
        kind:"INDIVIDUAL_FORECAST_REFERENCE_ONLY",
        modelProbabilityPct:null,
        fairOdds:null,
        expectedValuePct:null,
        individualForecast:{metric:pick.metric,mean:Number(projection),expectedMinutes:Number(player.expectedMinutes)},
        provenance:{source:paths.integration,predictionGeneratedAt:integration.generatedAt,curationSource:paths.individualSelection,curatedAt:individualSelection.curatedAt}
      },
      compatibility:{status:market.forecastCompatibility,bookmakerCombinability:"UNKNOWN",limitation},
      operational:{playability:{status:"PLAYABLE"},classification:"SELEZIONATO"},
      overlap:{overlapKey:`${fixture.fixtureId}:${market.providerMarketId}`,semanticKeys:[]}
    }
  };
}

const fixtures=integration.fixtures.map(fixture=>{
  const calendarFixture=calendarByFixture.get(fixture.fixtureId);
  const individualPicks=individualSelection.picks.filter(pick=>pick.fixtureId===fixture.fixtureId).map(pick=>selectedIndividualForecast(fixture,pick));
  return {
    fixtureId:fixture.fixtureId,
    date:fixture.date,
    kickoff:fixture.kickoff,
    homeTeam:fixture.homeTeam,
    awayTeam:fixture.awayTeam,
    status:calendarFixture?.status||"scheduled",
    score:calendarFixture?.score||null,
    readingUrl:`champions-league.html?match=${fixture.fixtureId}`,
    forecastSyncKey:fixture.generationSync?.forecastKey||fixture.syncKey,
    selections:[selectedForecast(fixture),...individualPicks]
  };
});
const selections=fixtures.flatMap(fixture=>fixture.selections);
const won=selections.filter(selection=>selection.settlement.status==="won").length;
const lost=selections.filter(selection=>selection.settlement.status==="lost").length;
const voided=selections.filter(selection=>selection.settlement.status==="void").length;
const pending=selections.length-won-lost-voided;
const stake=won+lost+voided;
const grossReturn=selections.reduce((total,selection)=>selection.settlement.status==="won"?total+selection.odds:selection.settlement.status==="void"?total+1:total,0);

const output={
  schemaVersion:1,
  competition:"UEFA Champions League",
  season:"2026/27",
  matchday:2,
  generatedAt:integration.generatedAt,
  provider:"Sisal",
  oddsRetrievedAt:odds.retrievedAt,
  sourceUrl:odds.sourceUrl,
  status:pending===selections.length?"PRE_MATCH":pending?"PARTIAL_RESULTS":"SETTLED",
  methodology:"La card conserva i 18 verdetti squadra della Fase 12B e aggiunge una selezione editoriale dei forecast individuali tiri/SOT gia generati. Ogni forecast resta riferito al singolo; quando la quota Sisal comprende sostituto o pali/traverse, probabilita, quota equa ed EV del contratto restano N/D.",
  selectionRule:"Un verdetto squadra gia generato per ciascuna partita, piu proposte individuali soltanto per probabili titolari con identita e storico verificati, minuti attesi, volumi dettagliati e linea Sisal aperta. Nessun numero fisso per gara e nessuna probabilita ricavata arbitrariamente dalla media prevista.",
  settlementPolicy:"Puntata simulata di 1 € per esito. ROI e profitto/perdita includono soltanto esiti ufficialmente definiti; pending e non verificabili non sono perdite.",
  sources:{
    integration:{path:paths.integration,sha256:hash(paths.integration),generatedAt:integration.generatedAt},
    individualSelection:{path:paths.individualSelection,sha256:hash(paths.individualSelection),curatedAt:individualSelection.curatedAt,status:individualSelection.status},
    odds:{path:paths.odds,sha256:hash(paths.odds),retrievedAt:odds.retrievedAt},
    officialResults:{path:paths.calendar,sha256:hash(paths.calendar)}
  },
  summary:{
    fixtures:fixtures.length,
    predictions:selections.length,
    clickableSelections:selections.filter(selection=>selection.betSelection.quote.availability==="AVAILABLE_AT_SNAPSHOT").length,
    result1x2:selections.filter(selection=>selection.marketCode==="3").length,
    doubleChance:selections.filter(selection=>selection.marketCode==="28319").length,
    phase12BPredictions:selections.filter(selection=>selection.marketScope!=="player").length,
    individualPredictions:selections.filter(selection=>selection.marketScope==="player").length,
    individualShots:selections.filter(selection=>selection.marketCode==="28507").length,
    individualShotsOnTarget:selections.filter(selection=>selection.marketCode==="28506").length,
    mathematicallyEvaluable:selections.filter(selection=>selection.betSelection.evaluation.status!=="NOT_MODELLED").length,
    won,lost,void:voided,pending,
    stakeEuro:stake,
    grossReturnEuro:stake?round(grossReturn):null,
    profitLossEuro:stake?round(grossReturn-stake):null,
    roiPct:stake?round((grossReturn-stake)/stake*100):null
  },
  fixtures
};

if(output.summary.fixtures!==18||output.summary.phase12BPredictions!==18||output.summary.individualPredictions!==individualSelection.picks.length)throw new Error(`Copertura MD2 incompleta: ${output.summary.fixtures} partite, ${output.summary.phase12BPredictions} pronostici 12B, ${output.summary.individualPredictions} individuali`);
fs.writeFileSync(path.join(root,paths.output),`${JSON.stringify(output,null,2)}\n`);
console.log(`Generata ${paths.output}: ${output.summary.fixtures} partite, ${output.summary.predictions} pronostici, ${output.summary.clickableSelections} cliccabili`);

