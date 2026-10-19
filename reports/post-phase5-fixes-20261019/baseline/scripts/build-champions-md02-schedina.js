const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const {execFileSync}=require("child_process");

const root=path.resolve(__dirname,"..");
const fixturesArg=process.argv.indexOf("--fixtures");
const targetFixtureIds=new Set(fixturesArg>=0?String(process.argv[fixturesArg+1]||"").split(",").map(value=>value.trim()).filter(Boolean):[]);
const baselineFromHead=process.argv.includes("--baseline-head");
const paths={
  integration:"data/normalized/champions-md02-integration-2026-27.json",
  individualSelection:"data/sources/champions-md02-individual-selection-2026-27.json",
  phase12d:"data/sources/champions-md02-phase12d-additions-2026-27.json",
  outsiders:"data/sources/champions-md02-phase12d-outsiders-2026-27.json",
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
const phase12d=read(paths.phase12d);
const outsiders=read(paths.outsiders);
const odds=read(paths.odds);
const calendar=read(paths.calendar);
const eventByFixture=new Map(odds.events.map(event=>[event.canonicalMatchId,event]));
const calendarByFixture=new Map(calendar.fixtures.map(fixture=>[fixture.id,fixture]));
const outsiderSelectionIds=new Set([...outsiders.teamPicks,...outsiders.individualPicks].map(pick=>pick.selectionId));
const preferredPicks=Array.isArray(outsiders.preferredPicks)?outsiders.preferredPicks:[];
const preferredBySelectionId=new Map(preferredPicks.map(pick=>[pick.selectionId,pick]));
const preferredByFixture=new Map(preferredPicks.map(pick=>[pick.fixtureId,pick]));
if(preferredPicks.length!==18||preferredBySelectionId.size!==18||preferredByFixture.size!==18)throw new Error(`Fonte editoriale preferiti non valida: ${preferredPicks.length} righe, ${preferredBySelectionId.size} selectionId, ${preferredByFixture.size} partite`);

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

const additionalTeamMarket={
  "7989":{family:"Gol",metric:"totalGoals",unit:"gol",validation:"POISSON_GOAL_MODEL"},
  "23060":{family:"Corner squadra",metric:"corners",unit:"corner",validatedThreshold:4.5,validation:"WALK_FORWARD_WON_CORNERS_4_5"},
  "23334":{family:"Tiri squadra",metric:"shotsTotal",unit:"tiri",validatedThreshold:10.5,validation:"WALK_FORWARD_TOTAL_SHOTS_10_5"},
  "23311":{family:"Tiri in porta squadra",metric:"shotsOnTarget",unit:"tiri in porta",validatedThreshold:3.5,validation:"WALK_FORWARD_SOT_3_5"}
};

function selectedAdditionalTeamForecast(fixture,pick,curation={source:paths.phase12d,curatedAt:phase12d.generatedAt}){
  const config=additionalTeamMarket[String(pick.marketCode)];
  if(!config||pick.classification!=="A")throw new Error(`${fixture.fixtureId}: mercato squadra 12D non supportato ${pick.marketCode}`);
  const event=eventByFixture.get(fixture.fixtureId);
  if(!event||String(event.providerEventId)!==String(pick.providerEventId))throw new Error(`${fixture.fixtureId}: evento provider 12D divergente`);
  const sideIndex=pick.teamSide==="home"?0:pick.teamSide==="away"?1:null;
  if(config.validatedThreshold!=null&&Number(pick.threshold)!==config.validatedThreshold)throw new Error(`${fixture.fixtureId}: soglia ${pick.threshold} non coperta dal backtest ${config.family}`);
  const sideToken=sideIndex==null?null:`SQUADRA ${sideIndex+1}`;
  const market=event.markets.find(item=>String(item.providerMarketId)===String(pick.providerMarketId)
    &&String(item.marketCode)===String(pick.marketCode)
    &&Number(item.threshold)===Number(pick.threshold)
    &&item.status==="open"
    &&(!sideToken||item.variantName.includes(sideToken)));
  const selection=market?.selections?.find(item=>String(item.providerSelectionId)===String(pick.providerSelectionId)
    &&item.name===pick.selection&&item.status==="open"&&finite(item.odds)&&Number(item.odds)>1);
  if(!market||!selection)throw new Error(`${fixture.fixtureId}: contratto squadra 12D non risolto ${pick.selectionId}`);
  const selectionId=`sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
  if(selectionId!==pick.selectionId)throw new Error(`${fixture.fixtureId}: selectionId squadra 12D divergente`);

  let line;
  let central;
  let team=null;
  let sampleCoverage=null;
  let currentSeasonReliabilityPct=null;
  if(config.metric==="totalGoals"){
    line=fixture.teamPrediction.goals.find(item=>Number(item.threshold)===Number(pick.threshold));
    central=fixture.teamPrediction.expectedGoals.total;
  }else{
    if(fixture.teamPrediction?.dataQuality?.detailedVolumesAvailable!==true)throw new Error(`${fixture.fixtureId}: volumi dettagliati mancanti per ${config.family}`);
    team=fixture.teamPrediction.teamProjections[sideIndex];
    line=team?.lines?.[config.metric]?.find(item=>Number(item.threshold)===Number(pick.threshold));
    central=team?.[config.metric]?.central;
    sampleCoverage=fixture.teamPrediction.dataQuality.teamSamples?.[sideIndex]??null;
    currentSeasonReliabilityPct=team?.[config.metric]?.normalization?.currentSeasonReliabilityPct??null;
  }
  const probability=pick.selection==="OVER"?line?.overPct:line?.underPct;
  if(!finite(probability)||!finite(central))throw new Error(`${fixture.fixtureId}: probabilita originale non disponibile per ${pick.selectionId}`);
  const fairOdds=round(100/Number(probability));
  const expectedValuePct=round((Number(probability)/100*Number(selection.odds)-1)*100,1);
  const originalModifiers=modifiers(market);
  const subject=team?.team||"Totale partita";
  const threshold=Number(market.threshold);
  const label=`${subject} ${pick.selection.toLowerCase()} ${threshold.toLocaleString("it-IT")} ${config.unit}`;
  const motivation=team
    ?`${round(central,2).toLocaleString("it-IT")} ${config.unit} attesi; probabilita originale ${Number(probability).toLocaleString("it-IT")}% sulla soglia esatta gia coperta dal walk-forward.`
    :`${round(central,2).toLocaleString("it-IT")} gol attesi; probabilita ${Number(probability).toLocaleString("it-IT")}% dalla distribuzione Poisson gia serializzata.`;
  return {
    selectionId,
    context:{competition:"champions",season:"2026-27",matchday:2},
    matchId:fixture.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    market:market.marketName,
    marketScope:"match",
    marketFamily:config.family,
    selection:pick.selection,
    providerSelectionCode:selection.code,
    label,
    odds:Number(selection.odds),
    modelProbabilityPct:Number(probability),
    fairOdds,
    expectedValuePct,
    evidenceLabel:`${subject}: ${round(central,2).toLocaleString("it-IT")} ${config.unit} · P ${Number(probability).toLocaleString("it-IT")}%`,
    motivation,
    classification:"A",
    dataQuality:{
      fixtureDetailedVolumes:config.metric==="totalGoals"?fixture.teamPrediction.dataQuality?.label:fixture.teamPrediction.dataQuality?.detailedVolumesAvailable===true,
      sampleCoverage,
      currentSeasonReliabilityPct,
      validation:config.validation
    },
    providerEventId:event.providerEventId,
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
      identity:{status:"VERIFIED_PROVIDER_IDS",matchId:fixture.fixtureId,providerEventId:event.providerEventId,providerMarketId:market.providerMarketId,providerSelectionId:selection.providerSelectionId,providerPlayerIds:[],canonicalPlayerIds:[]},
      market:{name:market.marketName,family:config.family,code:String(market.marketCode),variant:market.variantName,threshold,selection:pick.selection,modifiers:originalModifiers,bookmakerSemantics:{selectionName:selection.name,selectionCode:selection.code,modifiers:originalModifiers}},
      quote:{decimal:Number(selection.odds),oddsRaw:selection.oddsRaw,availability:"AVAILABLE_AT_SNAPSHOT",verifiedAt:event.retrievedAt||odds.retrievedAt,marketUpdatedAt:market.updatedAt||null,source:{provider:"Sisal",url:odds.sourceUrl}},
      evaluation:{status:"MODELLED_VALIDATED_TEAM_MARKET",kind:config.metric,modelProbabilityPct:Number(probability),fairOdds,expectedValuePct,forecast:{metric:config.metric,central:Number(central),threshold,selection:pick.selection,validation:config.validation},provenance:{source:paths.integration,predictionGeneratedAt:integration.generatedAt,curationSource:curation.source,curatedAt:curation.curatedAt}},
      compatibility:{status:"COMPATIBILE_CONTRATTO_ESATTO",bookmakerCombinability:"UNKNOWN"},
      operational:{playability:{status:"PLAYABLE"},classification:"SELEZIONATO_A"},
      overlap:{overlapKey:`${fixture.fixtureId}:${market.providerMarketId}`,semanticKeys:[`${fixture.fixtureId}:${config.metric}:${pick.teamSide||"match"}:${pick.selection}:${threshold}`]}
    }
  };
}

const individualMarket={
  shots:{code:"28507",family:"Tiri giocatore",projectionKey:"projectedShots",unit:"tiri"},
  shotsOnTarget:{code:"28506",family:"Tiri in porta giocatore",projectionKey:"projectedShotsOnTarget",unit:"SOT"}
};

function selectedIndividualForecast(fixture,pick,curation={source:paths.individualSelection,curatedAt:individualSelection.curatedAt,classification:"B"}){
  const config=individualMarket[pick.metric];
  if(!config)throw new Error(`${fixture.fixtureId}: metrica individuale non supportata ${pick.metric}`);
  if(fixture.teamPrediction?.dataQuality?.detailedVolumesAvailable!==true)throw new Error(`${fixture.fixtureId}: volumi dettagliati mancanti, selezione individuale vietata`);
  const players=[...fixture.lineups.home.players,...fixture.lineups.away.players];
  const player=players.find(item=>item.canonicalPlayerId===pick.playerId);
  const editorialPlayers=fixture.editorialLineups?[...fixture.editorialLineups.home.players,...fixture.editorialLineups.away.players]:[];
  const editorialPlayer=editorialPlayers.find(item=>item.canonicalPlayerId===pick.playerId)||null;
  const benchPlayers=[...(fixture.lineups.home.bench||[]),...(fixture.lineups.away.bench||[])];
  const benchPlayer=benchPlayers.find(item=>item.canonicalPlayerId===pick.playerId)||null;
  const retainedForReview=!player&&fixture.lineupStatus==="official"&&editorialPlayer;
  const confirmedBench=retainedForReview&&Boolean(benchPlayer);
  if(!player&&!retainedForReview)throw new Error(`${fixture.fixtureId}: giocatore canonico ${pick.playerId} non trovato nella formazione corrente`);
  const playerRecord=player||editorialPlayer;
  if(playerRecord.mappingStatus!=="resolved"||playerRecord.dataStatus!=="verified-history")throw new Error(`${fixture.fixtureId}: identita o storico non verificati per ${pick.playerId}`);
  const projection=retainedForReview?null:playerRecord[config.projectionKey];
  const previousProjection=editorialPlayer?.[config.projectionKey]??null;
  if(!retainedForReview&&(!finite(projection)||!finite(playerRecord.expectedMinutes)))throw new Error(`${fixture.fixtureId}: forecast/minuti N/D per ${pick.playerId}`);
  const market=fixture.oddsEvent.playerMarkets.find(item=>item.marketCode===config.code&&item.canonicalPlayerIds.includes(pick.playerId)&&Number(item.threshold)===Number(pick.threshold)&&item.status==="open");
  const selection=market?.selections?.find(item=>item.name==="OVER"&&item.interfaceSelectable&&item.status==="open"&&finite(item.odds)&&Number(item.odds)>0);
  if(!market||!selection)throw new Error(`${fixture.fixtureId}: linea Sisal ${config.code} over ${pick.threshold} non trovata per ${pick.playerId}`);
  const originalModifiers={...market.modifiers};
  const selectionId=selection.selectionId||`sisal:${fixture.oddsEvent.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`;
  if(pick.selectionId&&selectionId!==pick.selectionId)throw new Error(`${fixture.fixtureId}: selectionId individuale divergente per ${pick.playerId}`);
  if(pick.providerEventId&&String(fixture.oddsEvent.providerEventId)!==String(pick.providerEventId))throw new Error(`${fixture.fixtureId}: providerEventId individuale divergente per ${pick.playerId}`);
  if(pick.providerMarketId&&String(market.providerMarketId)!==String(pick.providerMarketId))throw new Error(`${fixture.fixtureId}: providerMarketId individuale divergente per ${pick.playerId}`);
  if(pick.providerSelectionId&&String(selection.providerSelectionId)!==String(pick.providerSelectionId))throw new Error(`${fixture.fixtureId}: providerSelectionId individuale divergente per ${pick.playerId}`);
  const threshold=Number(market.threshold);
  const limitation=pick.metric==="shotsOnTarget"
    ?"Il forecast quantifica i SOT del solo giocatore; la quota Sisal include il sostituto e anche pali/traverse. Probabilita, quota equa ed EV del contratto restano N/D."
    :"Il forecast quantifica i tiri del solo giocatore; la quota Sisal include anche il sostituto. Probabilita, quota equa ed EV del contratto restano N/D.";
  const roleLabel=playerRecord.role||"ruolo N/D";
  const reviewStatus=fixture.lineupStatus==="official"?(retainedForReview?"DA_RIVEDERE":finite(previousProjection)&&Math.abs(Number(projection)-Number(previousProjection))>=0.01?"AGGIORNATO":"CONFERMATO"):null;
  const evidenceLabel=retainedForReview
    ?`${confirmedBench?"Panchina confermata":"Non titolare nell'XI ufficiale"} · minuti e ${config.unit} attesi N/D`
    :`Proiezione singolo: ${round(projection,2).toLocaleString("it-IT")} ${config.unit} · ${round(playerRecord.expectedMinutes,1).toLocaleString("it-IT")} min`;
  const motivation=retainedForReview
    ?confirmedBench
      ?`Il giocatore non parte titolare ma compare nella panchina ufficiale. La quota e il contratto con sostituto restano disponibili; il modello non inventa minuti di subentro e mantiene la selezione in revisione prudenziale. La precedente proiezione editoriale era ${finite(previousProjection)?round(previousProjection,2).toLocaleString("it-IT"):"N/D"} ${config.unit}.`
      :`Il giocatore non compare nell'XI ufficiale né nella panchina pubblicata. La quota resta disponibile, ma minuti, probabilità ed EV restano N/D e la selezione richiede revisione. La precedente proiezione editoriale era ${finite(previousProjection)?round(previousProjection,2).toLocaleString("it-IT"):"N/D"} ${config.unit}.`
    :`${round(projection,2).toLocaleString("it-IT")} ${config.unit} attesi in ${round(playerRecord.expectedMinutes,1).toLocaleString("it-IT")} minuti; ${roleLabel}, storico verificato su ${Number(playerRecord.minutes||0).toLocaleString("it-IT")} minuti e affidabilita ${round(Number(playerRecord.reliability)*100,1).toLocaleString("it-IT")}%.`;
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
    label:`${playerRecord.canonicalName} over ${threshold.toLocaleString("it-IT")} ${config.unit}${market.replacementIncluded?" · sostituto incluso":""}${market.woodworkIncluded?" · pali/traverse inclusi":""}`,
    odds:Number(selection.odds),
    modelProbabilityPct:null,
    fairOdds:null,
    expectedValuePct:null,
    evidenceLabel,
    motivation,
    limitation,
    classification:retainedForReview?"DA_RIVEDERE":curation.classification,
    ...(reviewStatus?{reviewStatus}:{}),
    player:{
      canonicalPlayerId:playerRecord.canonicalPlayerId,
      canonicalName:playerRecord.canonicalName,
      providerPlayerIds:[...market.providerPlayerIds],
      team:playerRecord.team,
      side:playerRecord.side,
      role:playerRecord.role,
      lineupStatus:retainedForReview?(confirmedBench?"official-bench":"official-non-starter"):fixture.lineupStatus==="official"?"official-starter":"probable-starter",
      expectedMinutes:retainedForReview?null:Number(playerRecord.expectedMinutes),
      historyMinutes:Number(playerRecord.minutes||0),
      reliability:Number(playerRecord.reliability),
      dataStatus:playerRecord.dataStatus,
      projectedShots:retainedForReview?null:playerRecord.projectedShots,
      projectedShotsOnTarget:retainedForReview?null:playerRecord.projectedShotsOnTarget,
      ...(fixture.lineupStatus==="official"?{previousEditorialProjection:finite(previousProjection)?Number(previousProjection):null}:{})
    },
    dataQuality:{fixtureDetailedVolumes:true,playerDataStatus:playerRecord.dataStatus,identityStatus:playerRecord.mappingStatus,...(retainedForReview?{benchStatus:confirmedBench?"confirmed":"not-listed"}:{}),...(reviewStatus?{lineupReview:reviewStatus}:{})},
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
        canonicalPlayerIds:[playerRecord.canonicalPlayerId]
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
        individualForecast:{metric:pick.metric,mean:retainedForReview?null:Number(projection),expectedMinutes:retainedForReview?null:Number(playerRecord.expectedMinutes),...(fixture.lineupStatus==="official"?{previousEditorialMean:finite(previousProjection)?Number(previousProjection):null}:{})},
        provenance:{source:paths.integration,predictionGeneratedAt:integration.generatedAt,curationSource:curation.source,curatedAt:curation.curatedAt}
      },
      compatibility:{status:market.forecastCompatibility,bookmakerCombinability:"UNKNOWN",limitation},
      operational:{playability:{status:"PLAYABLE"},classification:retainedForReview?"DA_RIVEDERE":"SELEZIONATO",...(reviewStatus?{reviewStatus}:{})},
      overlap:{overlapKey:`${fixture.fixtureId}:${market.providerMarketId}`,semanticKeys:[]}
    }
  };
}

const fixtures=integration.fixtures.map(fixture=>{
  const calendarFixture=calendarByFixture.get(fixture.fixtureId);
  const individualPicks=individualSelection.picks.filter(pick=>pick.fixtureId===fixture.fixtureId).map(pick=>selectedIndividualForecast(fixture,pick));
  const phase12dTeamPicks=phase12d.teamPicks.filter(pick=>pick.fixtureId===fixture.fixtureId).map(pick=>selectedAdditionalTeamForecast(fixture,pick));
  const phase12dIndividualPicks=phase12d.individualPicks.filter(pick=>pick.fixtureId===fixture.fixtureId).map(pick=>selectedIndividualForecast(fixture,pick,{source:paths.phase12d,curatedAt:phase12d.generatedAt,classification:"B"}));
  const outsiderTeamPicks=outsiders.teamPicks.filter(pick=>pick.fixtureId===fixture.fixtureId).map(pick=>selectedAdditionalTeamForecast(fixture,pick,{source:paths.outsiders,curatedAt:outsiders.generatedAt}));
  const outsiderIndividualPicks=outsiders.individualPicks.filter(pick=>pick.fixtureId===fixture.fixtureId).map(pick=>selectedIndividualForecast(fixture,pick,{source:paths.outsiders,curatedAt:outsiders.generatedAt,classification:"B"}));
  const selections=[selectedForecast(fixture),...individualPicks,...phase12dTeamPicks,...phase12dIndividualPicks,...outsiderTeamPicks,...outsiderIndividualPicks].map(selection=>{
    const preferred=preferredBySelectionId.get(selection.selectionId)||null;
    const isOutsider=outsiderSelectionIds.has(selection.selectionId);
    return {
      ...selection,
      isOutsider,
      isPreferred:Boolean(preferred),
      editorial:{
        isOutsider,
        isPreferred:Boolean(preferred),
        source:paths.outsiders,
        ...(preferred?{preferred:{
          curatedAt:outsiders.preferredCuratedAt,
          evaluationClass:preferred.evaluationClass,
          dataQuality:preferred.dataQuality,
          reason:preferred.reason,
          limitation:preferred.limitation
        }}:{})
      }
    };
  });
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
    selections
  };
});
const selections=fixtures.flatMap(fixture=>fixture.selections);
for(const preferred of preferredPicks){
  const fixture=fixtures.find(item=>item.fixtureId===preferred.fixtureId);
  if(!fixture?.selections.some(selection=>selection.selectionId===preferred.selectionId&&selection.isPreferred===true))throw new Error(`${preferred.fixtureId}: preferito editoriale non risolto ${preferred.selectionId}`);
}
if(selections.filter(selection=>selection.isOutsider).length!==outsiderSelectionIds.size)throw new Error("Flag outsider non allineati alla fonte editoriale");
if(selections.filter(selection=>selection.isPreferred).length!==18||fixtures.some(fixture=>fixture.selections.filter(selection=>selection.isPreferred).length!==1))throw new Error("Serve esattamente un preferito per ciascuna delle 18 partite");
const additiveSources=new Set([paths.phase12d,paths.outsiders]);
const baselineSelections=fixtures.flatMap(fixture=>fixture.selections.filter(selection=>!additiveSources.has(selection.betSelection.evaluation.provenance?.curationSource)));
const baselineHash=crypto.createHash("sha256").update(JSON.stringify(baselineSelections.map(selection=>selection.selectionId).sort())).digest("hex").toUpperCase();
if(baselineSelections.length!==phase12d.baseline.predictions||baselineHash!==phase12d.baseline.selectionIdsSha256)throw new Error(`Baseline Fasi 12B/12C alterata: ${baselineSelections.length} selezioni, hash ${baselineHash}`);
const outsiderBaselineSelections=fixtures.flatMap(fixture=>fixture.selections.filter(selection=>selection.betSelection.evaluation.provenance?.curationSource!==paths.outsiders));
const outsiderBaselineHash=crypto.createHash("sha256").update(JSON.stringify(outsiderBaselineSelections.map(selection=>selection.selectionId).sort())).digest("hex").toUpperCase();
if(outsiderBaselineSelections.length!==outsiders.baseline.predictions||outsiderBaselineHash!==outsiders.baseline.selectionIdsSha256)throw new Error(`Baseline Fase 12D alterata: ${outsiderBaselineSelections.length} selezioni, hash ${outsiderBaselineHash}`);
if(new Set(selections.map(selection=>selection.selectionId)).size!==selections.length)throw new Error("selectionId duplicati dopo l'ampliamento 12D");
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
  generatedAt:outsiders.generatedAt,
  provider:"Sisal",
  oddsRetrievedAt:odds.retrievedAt,
  sourceUrl:odds.sourceUrl,
  status:pending===selections.length?"PRE_MATCH":pending?"PARTIAL_RESULTS":"SETTLED",
  methodology:"La card conserva integralmente le 94 selezioni concluse con la Fase 12D e aggiunge outsider su contratti Sisal esatti: soglie gol con probabilita gia serializzata e riferimenti individuali tiri/SOT sostenuti da minuti, storico e volumi. I contratti individuali DUO mantengono probabilita, quota equa ed EV N/D.",
  selectionRule:"Nessun numero fisso per gara. Classe A: contratto full-match identico a una soglia probabilistica gia validata o alla distribuzione gol gia adottata. Classe B: volume individuale motivante e quota valida, ma contratto DUO non probabilisticamente valutabile. Nessuna conversione automatica di una media in probabilita.",
  settlementPolicy:"Puntata simulata di 1 € per esito. ROI e profitto/perdita includono soltanto esiti ufficialmente definiti; pending e non verificabili non sono perdite.",
  sources:{
    integration:{path:paths.integration,sha256:hash(paths.integration),generatedAt:integration.generatedAt},
    individualSelection:{path:paths.individualSelection,sha256:hash(paths.individualSelection),curatedAt:individualSelection.curatedAt,status:individualSelection.status},
    phase12d:{path:paths.phase12d,sha256:hash(paths.phase12d),generatedAt:phase12d.generatedAt,status:phase12d.status,baselineSelectionIdsSha256:phase12d.baseline.selectionIdsSha256},
    outsiders:{path:paths.outsiders,sha256:hash(paths.outsiders),generatedAt:outsiders.generatedAt,preferredCuratedAt:outsiders.preferredCuratedAt,status:outsiders.status,baselineSelectionIdsSha256:outsiders.baseline.selectionIdsSha256},
    odds:{path:paths.odds,sha256:hash(paths.odds),retrievedAt:odds.retrievedAt},
    officialResults:{path:paths.calendar,sha256:hash(paths.calendar)}
  },
  summary:{
    fixtures:fixtures.length,
    predictions:selections.length,
    clickableSelections:selections.filter(selection=>selection.betSelection.quote.availability==="AVAILABLE_AT_SNAPSHOT").length,
    result1x2:selections.filter(selection=>selection.marketCode==="3").length,
    doubleChance:selections.filter(selection=>selection.marketCode==="28319").length,
    phase12BPredictions:selections.filter(selection=>selection.betSelection.evaluation.status==="MODELLED_EXISTING_TEAM_VERDICT").length,
    teamPredictions:selections.filter(selection=>selection.marketScope!=="player").length,
    phase12DTeamPredictions:phase12d.teamPicks.length,
    phase12DIndividualPredictions:phase12d.individualPicks.length,
    outsiderPredictions:outsiders.teamPicks.length+outsiders.individualPicks.length,
    outsiderTeamPredictions:outsiders.teamPicks.length,
    outsiderIndividualPredictions:outsiders.individualPicks.length,
    preferredPredictions:selections.filter(selection=>selection.isPreferred).length,
    individualPredictions:selections.filter(selection=>selection.marketScope==="player").length,
    individualShots:selections.filter(selection=>selection.marketCode==="28507").length,
    individualShotsOnTarget:selections.filter(selection=>selection.marketCode==="28506").length,
    teamGoals:selections.filter(selection=>selection.marketCode==="7989").length,
    teamCorners:selections.filter(selection=>selection.marketCode==="23060").length,
    teamShots:selections.filter(selection=>selection.marketCode==="23334").length,
    teamShotsOnTarget:selections.filter(selection=>selection.marketCode==="23311").length,
    mathematicallyEvaluable:selections.filter(selection=>selection.betSelection.evaluation.status!=="NOT_MODELLED").length,
    won,lost,void:voided,pending,
    stakeEuro:stake,
    grossReturnEuro:stake?round(grossReturn):null,
    profitLossEuro:stake?round(grossReturn-stake):null,
    roiPct:stake?round((grossReturn-stake)/stake*100):null
  },
  fixtures
};

if(output.summary.fixtures!==18||output.summary.phase12BPredictions!==18||output.summary.individualPredictions!==individualSelection.picks.length+phase12d.individualPicks.length+outsiders.individualPicks.length||output.summary.predictions!==outsiders.baseline.predictions+outsiders.teamPicks.length+outsiders.individualPicks.length)throw new Error(`Copertura MD2 incompleta: ${output.summary.fixtures} partite, ${output.summary.phase12BPredictions} pronostici 12B, ${output.summary.individualPredictions} individuali, ${output.summary.predictions} totali`);
let finalOutput=output;
if(targetFixtureIds.size){
  const previousOutput=baselineFromHead
    ?JSON.parse(execFileSync("git",["show","HEAD:data/normalized/schedina-champions-md02.json"],{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024}))
    :read(paths.output);
  const generatedById=new Map(output.fixtures.map(fixture=>[fixture.fixtureId,fixture]));
  for(const fixtureId of targetFixtureIds)if(!generatedById.has(fixtureId)||!previousOutput.fixtures.some(fixture=>fixture.fixtureId===fixtureId))throw new Error(`${fixtureId}: target selettivo non valido`);
  finalOutput={...output,fixtures:previousOutput.fixtures.map(fixture=>targetFixtureIds.has(fixture.fixtureId)?generatedById.get(fixture.fixtureId):fixture)};
}
fs.writeFileSync(path.join(root,paths.output),`${JSON.stringify(finalOutput,null,2)}\n`);
console.log(`Generata ${paths.output}: ${output.summary.fixtures} partite, ${output.summary.predictions} pronostici, ${output.summary.clickableSelections} cliccabili`);
if(fs.existsSync(path.join(root,'data/sources/champions-results-md02-2026-27.json')))require('./settle-champions-md02.js').build();
require('./apply-official-starter-policy.js').build();

