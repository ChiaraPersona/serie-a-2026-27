"use strict";

const crypto=require("crypto");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"..");
const paths={
  source:"data/sources/champions-md02-phase12d-additions-2026-27.json",
  schedina:"data/normalized/schedina-champions-md02.json",
  odds:"data/normalized/odds/sisal/champions-league.json",
  forecast:"data/normalized/champions-pilot-predictions-md02-2026-27.json",
  volumeBacktest:"data/normalized/champions-pilot-volume-backtest.json",
  json:"output/reports/champions-md02-phase12d-market-expansion-2026-10-13.json",
  markdown:"output/reports/champions-md02-phase12d-market-expansion-2026-10-13.md"
};
const absolute=relative=>path.join(root,relative);
const read=relative=>JSON.parse(fs.readFileSync(absolute(relative),"utf8"));
const hash=relative=>crypto.createHash("sha256").update(fs.readFileSync(absolute(relative))).digest("hex").toUpperCase();
const write=(relative,value)=>{fs.mkdirSync(path.dirname(absolute(relative)),{recursive:true});fs.writeFileSync(absolute(relative),typeof value==="string"?value:`${JSON.stringify(value,null,2)}\n`)};
const round=(value,digits=1)=>Number(Number(value).toFixed(digits));

const source=read(paths.source);
const schedina=read(paths.schedina);
const odds=read(paths.odds);
const forecast=read(paths.forecast);
const volumeBacktest=read(paths.volumeBacktest);
const selectedSourceRows=[...source.teamPicks,...source.individualPicks];
const selectedIds=new Set(selectedSourceRows.map(row=>row.selectionId));
const selections=schedina.fixtures.flatMap(fixture=>fixture.selections);
const selectionById=new Map(selections.map(selection=>[selection.selectionId,selection]));

function marketBucket(market){
  const code=String(market.marketCode);
  const name=`${market.marketName||""} ${market.variantName||""}`;
  if(code==="28507")return "Tiri giocatore DUO";
  if(code==="28506")return "SOT giocatore DUO + pali/traverse";
  if(/MARCATORE|SEGNA/.test(name))return "Marcatori e goal giocatore";
  if(/FALLI/.test(name))return "Falli";
  if(/CARTELL/.test(name))return "Cartellini / punti cartellini";
  if(/CORNER|ANGOLO/.test(name))return "Corner";
  if(["3","28319","17875"].includes(code))return "1X2 / doppia chance / DNB";
  if(["7989","18","30562","9943"].includes(code)||/GOAL\/NOGOAL|MULTIGOAL|UNDER\/OVER/.test(name))return "Goal / over-under / multigol";
  if(["23334","23311","15859","15481"].includes(code))return "Tiri e SOT squadra/partita";
  return "Altri mercati";
}

const marketTypes=new Map();
for(const event of odds.events){
  for(const market of event.markets){
    const bucket=marketBucket(market);
    const row=marketTypes.get(bucket)||{type:bucket,markets:0,selections:0,validQuotes:0,codes:new Set()};
    row.markets+=1;
    row.selections+=market.selections.length;
    row.validQuotes+=market.selections.filter(selection=>selection.status==="open"&&Number(selection.odds)>1).length;
    row.codes.add(String(market.marketCode));
    marketTypes.set(bucket,row);
  }
}

const classifications={
  "1X2 / doppia chance / DNB":{status:"A/C",support:"1X2 e doppia chance sono valutabili dalle probabilita gia serializzate; DNB e handicap richiedono gestione push non serializzata per questo output.",selected:0},
  "Goal / over-under / multigol":{status:"A/C",support:"Over/under 1.5, 2.5 e 3.5 usano la distribuzione Poisson gia adottata. Goal/no-goal, multigol e combo non vengono ricostruiti fuori dal motore.",selected:source.teamPicks.filter(row=>row.marketCode==="7989").length},
  "Corner":{status:"A/B/C",support:"Solo U/O corner squadra 4.5 e classificato A: e la soglia esatta del walk-forward. Le altre soglie restano descrittive e non ricevono P/EV.",selected:source.teamPicks.filter(row=>row.marketCode==="23060").length},
  "Falli":{status:"C",support:"Forecast centrali senza distribuzione validata sul contratto; le poche linee match/squadra includono i supplementari.",selected:0},
  "Cartellini / punti cartellini":{status:"C",support:"Il forecast conta cartellini, mentre Sisal quota punti cartellini con massimo due per giocatore o contratti DUO: target non equivalente.",selected:0},
  "Tiri e SOT squadra/partita":{status:"A/C",support:"Solo tiri squadra 10.5 e SOT squadra 3.5 sono soglie esatte coperte dal walk-forward. Totali partita e altre soglie non sono promossi.",selected:source.teamPicks.filter(row=>["23334","23311"].includes(row.marketCode)).length},
  "Tiri giocatore DUO":{status:"B",support:"Volume del singolo disponibile; contratto 28507 include il sostituto. Probabilita, quota equa ed EV null.",selected:source.individualPicks.filter(row=>row.metric==="shots").length},
  "SOT giocatore DUO + pali/traverse":{status:"B",support:"Volume SOT del singolo disponibile; contratto 28506 include sostituto e pali/traverse. Probabilita, quota equa ed EV null.",selected:source.individualPicks.filter(row=>row.metric==="shotsOnTarget").length},
  "Marcatori e goal giocatore":{status:"C",support:"Nessuna probabilita marcatore originale compatibile con sostituto, tempi, combinazioni o pali/traverse.",selected:0},
  "Altri mercati":{status:"C",support:"Primo/secondo tempo, entrambi i tempi, handicap, combinazioni e mercati temporali non hanno un target probabilistico identico gia serializzato.",selected:0}
};

const marketAnalysis=[...marketTypes.values()].map(row=>({
  type:row.type,
  markets:row.markets,
  selections:row.selections,
  validQuotes:row.validQuotes,
  marketCodes:[...row.codes].sort((a,b)=>Number(a)-Number(b)),
  ...(classifications[row.type]||classifications["Altri mercati"])
})).sort((left,right)=>left.type.localeCompare(right.type,"it"));

const candidates=selectedSourceRows.map(sourceRow=>{
  const selection=selectionById.get(sourceRow.selectionId);
  if(!selection)throw new Error(`Selezione 12D non pubblicata: ${sourceRow.selectionId}`);
  if(String(selection.providerEventId)!==String(sourceRow.providerEventId)||String(selection.providerMarketId)!==String(sourceRow.providerMarketId)||String(selection.providerSelectionId)!==String(sourceRow.providerSelectionId))throw new Error(`Identificativi provider divergenti: ${sourceRow.selectionId}`);
  const fixture=schedina.fixtures.find(item=>item.fixtureId===sourceRow.fixtureId);
  const kickoff=new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  const generatedAt=new Date(source.generatedAt);
  const preMatch=generatedAt<kickoff;
  return {
    fixtureId:sourceRow.fixtureId,
    fixture:selection.fixture,
    classification:sourceRow.classification,
    market:selection.marketName,
    marketFamily:selection.marketFamily,
    marketCode:selection.marketCode,
    selection:selection.selection,
    label:selection.label,
    threshold:selection.threshold,
    player:selection.player?{id:selection.player.canonicalPlayerId,name:selection.player.canonicalName,team:selection.player.team,role:selection.player.role,expectedMinutes:selection.player.expectedMinutes}:null,
    providerEventId:selection.providerEventId,
    providerMarketId:selection.providerMarketId,
    providerSelectionId:selection.providerSelectionId,
    selectionId:selection.selectionId,
    odds:selection.odds,
    oddsRaw:selection.betSelection.quote.oddsRaw,
    forecast:selection.betSelection.evaluation.forecast||selection.betSelection.evaluation.individualForecast,
    modelProbabilityPct:selection.modelProbabilityPct,
    fairOdds:selection.fairOdds,
    expectedValuePct:selection.expectedValuePct,
    motivation:selection.motivation,
    dataQuality:selection.dataQuality,
    limitation:selection.limitation||null,
    quoteVerifiedAt:selection.betSelection.quote.verifiedAt,
    source:{provider:"Sisal",url:selection.betSelection.quote.source.url,curation:paths.source},
    temporal:{generatedAt:source.generatedAt,kickoff:kickoff.toISOString(),preMatch}
  };
});

const fixtureDistribution=schedina.fixtures.map(fixture=>{
  const added=fixture.selections.filter(selection=>selectedIds.has(selection.selectionId));
  return {
    fixtureId:fixture.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    kickoff:`${fixture.date} ${fixture.kickoff} Europe/Rome`,
    baseline:fixture.selections.length-added.length,
    added:added.length,
    total:fixture.selections.length,
    classA:added.filter(selection=>selection.classification==="A").length,
    classB:added.filter(selection=>selection.classification==="B").length,
    markets:Object.fromEntries([...new Set(added.map(selection=>selection.marketFamily))].sort().map(family=>[family,added.filter(selection=>selection.marketFamily===family).length]))
  };
});

const baselineIds=selections.filter(selection=>!selectedIds.has(selection.selectionId)).map(selection=>selection.selectionId).sort();
const baselineHash=crypto.createHash("sha256").update(JSON.stringify(baselineIds)).digest("hex").toUpperCase();
const output={
  schemaVersion:1,
  phase:"12D",
  generatedAt:source.generatedAt,
  gate:"PARTIAL",
  gateReason:"Integrazione completa e prepartita; PARTIAL perche i 59 mercati individuali DUO restano in classe B con probabilita/EV N/D e i contratti falli, punti cartellini e marcatori non equivalenti restano esclusi.",
  temporalIntegrity:{timezone:"Europe/Rome",earliestKickoff:"2026-10-13T18:45:00+02:00",generatedBeforeEveryKickoff:candidates.every(candidate=>candidate.temporal.preMatch),preMatchCandidates:candidates.filter(candidate=>candidate.temporal.preMatch).length,retrospectiveCandidates:candidates.filter(candidate=>!candidate.temporal.preMatch).length},
  preservation:{baselinePredictions:baselineIds.length,baselineSelectionIdsSha256:baselineHash,expectedBaselineSelectionIdsSha256:source.baseline.selectionIdsSha256,preserved:baselineIds.length===63&&baselineHash===source.baseline.selectionIdsSha256},
  catalog:{retrievedAt:odds.retrievedAt,sourceUrl:odds.sourceUrl,events:odds.events.length,markets:odds.events.reduce((sum,event)=>sum+event.markets.length,0),selections:odds.events.reduce((sum,event)=>sum+event.markets.reduce((inner,market)=>inner+market.selections.length,0),0),downloadedAgain:false},
  validationEvidence:{volumeBacktestGeneratedAt:volumeBacktest.generatedAt,thresholds:volumeBacktest.thresholds,metrics:volumeBacktest.metrics,goalModel:forecast.methodology?.goals||forecast.fixtures[0]?.expectedGoals?.method},
  marketAnalysis,
  candidates,
  inserted:{total:candidates.length,classA:candidates.filter(candidate=>candidate.classification==="A").length,classB:candidates.filter(candidate=>candidate.classification==="B").length,classC:0,team:source.teamPicks.length,individual:source.individualPicks.length},
  updatedTotals:{predictions:schedina.summary.predictions,clickableSelections:schedina.summary.clickableSelections,mathematicallyEvaluable:schedina.summary.mathematicallyEvaluable,notProbabilisticallyEvaluable:schedina.summary.predictions-schedina.summary.mathematicallyEvaluable},
  distribution:fixtureDistribution,
  excluded:[
    {market:"DNB, handicap e mercati con push",classification:"C",reason:"Gestione push/handicap non serializzata nel forecast MD2."},
    {market:"Goal/no-goal, multigol e combo goal",classification:"C",reason:"Nessuna probabilita originale serializzata per l'identico contratto; non ricostruita dalla sola media."},
    {market:"Corner diversi da U/O squadra 4.5",classification:"B/C",reason:"Volumi disponibili, ma il backtest esistente certifica soltanto la soglia squadra 4.5."},
    {market:"Falli match, squadra e giocatore",classification:"C",reason:"Distribuzione non validata e contratti Sisal inclusivi dei supplementari dove presenti."},
    {market:"Punti cartellini e cartellini DUO",classification:"C",reason:"Target provider diverso dal conteggio cartellini del forecast; cap per giocatore e sostituto non modellati."},
    {market:"Marcatori e primo/ultimo marcatore",classification:"C",reason:"Probabilita giocatore, sostituto, ordine e pali/traverse non modellate sul contratto Sisal."},
    {market:"Primo tempo, entrambi i tempi e combo",classification:"C",reason:"Il modello disponibile e full-match e non certifica le dipendenze richieste."}
  ],
  sources:Object.fromEntries(Object.entries(paths).filter(([key])=>!["json","markdown"].includes(key)).map(([key,value])=>[key,{path:value,sha256:hash(value)}]))
};

if(!output.preservation.preserved)throw new Error("Baseline 63 selectionId non preservata");
if(!output.temporalIntegrity.generatedBeforeEveryKickoff)throw new Error("Una proposta 12D non e prepartita");
if(output.inserted.total!==31||output.updatedTotals.predictions!==94||output.updatedTotals.clickableSelections!==94||output.updatedTotals.mathematicallyEvaluable!==35)throw new Error("Totali Fase 12D inattesi");
write(paths.json,output);

const candidateRows=candidates.map(candidate=>`| ${candidate.fixture} | ${candidate.classification} | ${candidate.marketFamily} | ${candidate.label} | ${candidate.odds.toFixed(2)} | ${candidate.modelProbabilityPct==null?"N/D":`${candidate.modelProbabilityPct}%`} | ${candidate.expectedValuePct==null?"N/D":`${candidate.expectedValuePct>0?"+":""}${candidate.expectedValuePct}%`} | \`${candidate.selectionId}\` |`).join("\n");
const distributionRows=fixtureDistribution.map(row=>`| ${row.fixture} | ${row.baseline} | ${row.added} | ${row.total} | ${row.classA} | ${row.classB} | ${Object.entries(row.markets).map(([family,count])=>`${family} ${count}`).join("; ")||"—"} |`).join("\n");
const analysisRows=marketAnalysis.map(row=>`| ${row.type} | ${row.markets} | ${row.validQuotes} | ${row.status} | ${row.selected} | ${row.support} |`).join("\n");
const excludedRows=output.excluded.map(row=>`| ${row.market} | ${row.classification} | ${row.reason} |`).join("\n");
const markdown=`# Champions League 2026/27 — Fase 12D\n\nGenerato: ${source.generatedAt} · snapshot Sisal invariato: ${odds.retrievedAt}\n\n## Gate\n\n**${output.gate}** — ${output.gateReason}\n\n## Totali\n\n- Baseline preservata: **${output.preservation.baselinePredictions}/63** selectionId, hash **${output.preservation.baselineSelectionIdsSha256}**.\n- Nuovi candidati individuati e inseriti: **${output.inserted.total}** (${output.inserted.classA} classe A, ${output.inserted.classB} classe B).\n- Totale MD2: **${output.updatedTotals.predictions}** pronostici; **${output.updatedTotals.clickableSelections}** cliccabili.\n- Matematicamente valutabili: **${output.updatedTotals.mathematicallyEvaluable}**; P/EV N/D: **${output.updatedTotals.notProbabilisticallyEvaluable}**.\n- Integrita temporale: **${output.temporalIntegrity.preMatchCandidates}/${output.inserted.total}** nuove selezioni generate prima del kickoff; retrospettive **${output.temporalIntegrity.retrospectiveCandidates}**.\n- Nessun nuovo download quote; snapshot locale con ${output.catalog.events} eventi, ${output.catalog.markets.toLocaleString("it-IT")} mercati e ${output.catalog.selections.toLocaleString("it-IT")} selezioni.\n\n## Mercati Sisal analizzati\n\n| Tipologia | Mercati | Quote valide | Classi | Inseriti | Esito della verifica |\n|---|---:|---:|---|---:|---|\n${analysisRows}\n\n## Nuovi candidati e pronostici inseriti\n\n| Partita | Classe | Mercato | Selezione | Quota | P | EV | selectionId |\n|---|---|---|---|---:|---:|---:|---|\n${candidateRows}\n\nLe 14 righe individuali conservano il contratto DUO originale: 11 tiri totali con sostituto e 3 SOT con sostituto piu pali/traverse. Le loro medie del singolo sono evidenza descrittiva; P, quota equa ed EV restano null.\n\n## Distribuzione per partita\n\n| Partita | Baseline | Nuovi | Totale | A | B | Nuovi mercati |\n|---|---:|---:|---:|---:|---:|---|\n${distributionRows}\n\n## Mercati esclusi\n\n| Mercato | Classe | Motivo |\n|---|---|---|\n${excludedRows}\n\n## Integrita e sincronizzazione\n\n- La fonte additiva e \`${paths.source}\`; la fonte condivisa renderizzata resta \`${paths.schedina}\`.\n- I 63 selectionId delle Fasi 12B/12C sono hash-controllati prima di accettare le 31 aggiunte.\n- Quote, oddsRaw, providerEventId, providerMarketId, providerSelectionId, soglie e modificatori sono riletti dallo snapshot Sisal e verificati dal builder.\n- Letture, card e MyCombo consumano lo stesso array per fixture; nessun contratto individuale e trasformato in un evento del solo giocatore.\n- Il dettaglio completo di candidati, copertura, motivazioni, limiti, timestamp e provenienza e nel report JSON affiancato.\n`;
write(paths.markdown,markdown);
console.log(`OK audit Champions MD2 Fase 12D: ${output.inserted.total} aggiunte, ${output.updatedTotals.predictions} totali, ${output.updatedTotals.mathematicallyEvaluable} valutabili, gate ${output.gate}`);
