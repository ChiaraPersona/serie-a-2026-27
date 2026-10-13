const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const root=path.resolve(__dirname,"..");
const paths={
  integration:"data/normalized/champions-md02-integration-2026-27.json",
  odds:"data/normalized/odds/sisal/champions-league.json",
  calendar:"data/normalized/champions-league-2026-27.json",
  output:"data/normalized/schedina-champions-md02.json"
};
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const hash=relative=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,relative))).digest("hex").toUpperCase();
const round=(value,digits=2)=>Number(Number(value).toFixed(digits));
const finite=value=>value!==null&&value!==""&&Number.isFinite(Number(value));

const integration=read(paths.integration);
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

const fixtures=integration.fixtures.map(fixture=>{
  const calendarFixture=calendarByFixture.get(fixture.fixtureId);
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
    selections:[selectedForecast(fixture)]
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
  methodology:"La card riusa esclusivamente il verdetto squadra già pubblicato nella lettura MD2 e lo collega alla selezione Sisal esatta. Nessun mercato viene promosso a pronostico dalla sola presenza di una quota.",
  selectionRule:"Un pronostico di esito già generato per ciascuna delle 18 partite; 1X2 o doppia chance a tempo pieno secondo il verdetto condiviso con la lettura.",
  settlementPolicy:"Puntata simulata di 1 € per esito. ROI e profitto/perdita includono soltanto esiti ufficialmente definiti; pending e non verificabili non sono perdite.",
  sources:{
    integration:{path:paths.integration,sha256:hash(paths.integration),generatedAt:integration.generatedAt},
    odds:{path:paths.odds,sha256:hash(paths.odds),retrievedAt:odds.retrievedAt},
    officialResults:{path:paths.calendar,sha256:hash(paths.calendar)}
  },
  summary:{
    fixtures:fixtures.length,
    predictions:selections.length,
    clickableSelections:selections.filter(selection=>selection.betSelection.quote.availability==="AVAILABLE_AT_SNAPSHOT").length,
    result1x2:selections.filter(selection=>selection.marketCode==="3").length,
    doubleChance:selections.filter(selection=>selection.marketCode==="28319").length,
    won,lost,void:voided,pending,
    stakeEuro:stake,
    grossReturnEuro:stake?round(grossReturn):null,
    profitLossEuro:stake?round(grossReturn-stake):null,
    roiPct:stake?round((grossReturn-stake)/stake*100):null
  },
  fixtures
};

if(output.summary.fixtures!==18||output.summary.predictions!==18)throw new Error(`Copertura MD2 incompleta: ${output.summary.fixtures} partite, ${output.summary.predictions} pronostici`);
fs.writeFileSync(path.join(root,paths.output),`${JSON.stringify(output,null,2)}\n`);
console.log(`Generata ${paths.output}: ${output.summary.fixtures} partite, ${output.summary.predictions} pronostici, ${output.summary.clickableSelections} cliccabili`);

