"use strict";

const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const crypto=require("crypto");
const fs=require("fs");
const path=require("path");

const root=path.resolve(__dirname,"..");
const paths={
  source:"data/sources/champions-md02-phase12d-additions-2026-27.json",
  outsiderSource:"data/sources/champions-md02-phase12d-outsiders-2026-27.json",
  outsiderResearch:"scripts/research-champions-md02-outsiders.js",
  schedina:"data/normalized/schedina-champions-md02.json",
  odds:"data/normalized/odds/sisal/champions-league.json",
  forecast:"data/normalized/champions-pilot-predictions-md02-2026-27.json",
  volumeBacktest:"data/normalized/champions-pilot-volume-backtest.json",
  json:"output/reports/champions-md02-phase12d-market-expansion-2026-10-13.json",
  markdown:"output/reports/champions-md02-phase12d-market-expansion-2026-10-13.md"
};
const absolute=relative=>path.join(root,relative);
const read=relative=>storageReadJson(absolute(relative));
const hash=relative=>crypto.createHash("sha256").update(fs.readFileSync(absolute(relative))).digest("hex").toUpperCase();
const write=(relative,value)=>{fs.mkdirSync(path.dirname(absolute(relative)),{recursive:true});fs.writeFileSync(absolute(relative),typeof value==="string"?value:`${JSON.stringify(value,null,2)}\n`)};
const round=(value,digits=1)=>Number(Number(value).toFixed(digits));

const source=read(paths.source);
const outsiderSource=read(paths.outsiderSource);
const outsiderResearch=require(absolute(paths.outsiderResearch));
const allTeamPicks=[...source.teamPicks,...outsiderSource.teamPicks];
const allIndividualPicks=[...source.individualPicks,...outsiderSource.individualPicks];
const schedina=read(paths.schedina);
const odds=read(paths.odds);
const forecast=read(paths.forecast);
const volumeBacktest=read(paths.volumeBacktest);
const selectedSourceRows=[...source.teamPicks,...source.individualPicks];
const selectedIds=new Set(selectedSourceRows.map(row=>row.selectionId));
const outsiderSourceRows=[...outsiderSource.teamPicks,...outsiderSource.individualPicks];
const outsiderIds=new Set(outsiderSourceRows.map(row=>row.selectionId));
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
  "Goal / over-under / multigol":{status:"A/C",support:"Over/under 1.5, 2.5 e 3.5 usano la distribuzione Poisson gia adottata. Goal/no-goal, multigol e combo non vengono ricostruiti fuori dal motore.",selected:allTeamPicks.filter(row=>row.marketCode==="7989").length},
  "Corner":{status:"A/B/C",support:"Solo U/O corner squadra 4.5 e classificato A: e la soglia esatta del walk-forward. Le altre soglie restano descrittive e non ricevono P/EV.",selected:allTeamPicks.filter(row=>row.marketCode==="23060").length},
  "Falli":{status:"C",support:"Forecast centrali senza distribuzione validata sul contratto; le poche linee match/squadra includono i supplementari.",selected:0},
  "Cartellini / punti cartellini":{status:"C",support:"Il forecast conta cartellini, mentre Sisal quota punti cartellini con massimo due per giocatore o contratti DUO: target non equivalente.",selected:0},
  "Tiri e SOT squadra/partita":{status:"A/C",support:"Solo tiri squadra 10.5 e SOT squadra 3.5 sono soglie esatte coperte dal walk-forward. Totali partita e altre soglie non sono promossi.",selected:allTeamPicks.filter(row=>["23334","23311"].includes(row.marketCode)).length},
  "Tiri giocatore DUO":{status:"B",support:"Volume del singolo disponibile; contratto 28507 include il sostituto. Probabilita, quota equa ed EV null.",selected:allIndividualPicks.filter(row=>row.metric==="shots").length},
  "SOT giocatore DUO + pali/traverse":{status:"B",support:"Volume SOT del singolo disponibile; contratto 28506 include sostituto e pali/traverse. Probabilita, quota equa ed EV null.",selected:allIndividualPicks.filter(row=>row.metric==="shotsOnTarget").length},
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

function candidateFromSource(sourceRow,curationSource,generatedAt){
  const selection=selectionById.get(sourceRow.selectionId);
  if(!selection)throw new Error(`Selezione 12D non pubblicata: ${sourceRow.selectionId}`);
  if(String(selection.providerEventId)!==String(sourceRow.providerEventId)||String(selection.providerMarketId)!==String(sourceRow.providerMarketId)||String(selection.providerSelectionId)!==String(sourceRow.providerSelectionId))throw new Error(`Identificativi provider divergenti: ${sourceRow.selectionId}`);
  const fixture=schedina.fixtures.find(item=>item.fixtureId===sourceRow.fixtureId);
  const kickoff=new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  const generated=new Date(generatedAt);
  const preMatch=generated<kickoff;
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
    source:{provider:"Sisal",url:selection.betSelection.quote.source.url,curation:curationSource},
    temporal:{generatedAt,kickoff:kickoff.toISOString(),preMatch}
  };
}

const candidates=selectedSourceRows.map(row=>candidateFromSource(row,paths.source,source.generatedAt));
const outsiderCandidates=outsiderSourceRows.map(row=>candidateFromSource(row,paths.outsiderSource,outsiderSource.generatedAt));
const outsiderApprovedIds=new Set(outsiderCandidates.map(candidate=>candidate.selectionId));
const outsiderExcluded=[
  ...outsiderResearch.individualCandidates.filter(row=>!outsiderApprovedIds.has(row.selectionId)).map(row=>({...row,classification:"B",reason:"Filtro preliminare superato, ma escluso dalla selezione finale per ridondanza, soglia meno informativa o evidenza comparativamente piu debole."})),
  ...outsiderResearch.teamCandidates.filter(row=>!outsiderApprovedIds.has(row.selectionId)).map(row=>({...row,classification:"A",reason:"Esito 1X2 outsider non approvato: sovrapposizione o conflitto con il verdetto pubblicato e divergenza modello-mercato troppo ampia per promuovere automaticamente la quota alta."}))
];

const fixtureDistribution=schedina.fixtures.map(fixture=>{
  const added=fixture.selections.filter(selection=>selectedIds.has(selection.selectionId));
  const outsiderAdded=fixture.selections.filter(selection=>outsiderIds.has(selection.selectionId));
  const allAdded=[...added,...outsiderAdded];
  return {
    fixtureId:fixture.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    kickoff:`${fixture.date} ${fixture.kickoff} Europe/Rome`,
    baseline:fixture.selections.length-allAdded.length,
    added:added.length,
    outsiderAdded:outsiderAdded.length,
    total:fixture.selections.length,
    classA:allAdded.filter(selection=>selection.classification==="A").length,
    classB:allAdded.filter(selection=>selection.classification==="B").length,
    markets:Object.fromEntries([...new Set(allAdded.map(selection=>selection.marketFamily))].sort().map(family=>[family,allAdded.filter(selection=>selection.marketFamily===family).length]))
  };
});

const baselineIds=selections.filter(selection=>!selectedIds.has(selection.selectionId)&&!outsiderIds.has(selection.selectionId)).map(selection=>selection.selectionId).sort();
const baselineHash=crypto.createHash("sha256").update(JSON.stringify(baselineIds)).digest("hex").toUpperCase();
const outsiderBaselineIds=selections.filter(selection=>!outsiderIds.has(selection.selectionId)).map(selection=>selection.selectionId).sort();
const outsiderBaselineHash=crypto.createHash("sha256").update(JSON.stringify(outsiderBaselineIds)).digest("hex").toUpperCase();
const output={
  schemaVersion:1,
  phase:"12D-OUTSIDERS",
  generatedAt:outsiderSource.generatedAt,
  gate:"PARTIAL",
  gateReason:"Integrazione outsider completa e prepartita; PARTIAL perche i 78 mercati individuali DUO restano in classe B con probabilita/EV N/D e marcatori, cartellini, falli e 1X2 outsider non sufficientemente robusti restano esclusi.",
  temporalIntegrity:{timezone:"Europe/Rome",earliestKickoff:"2026-10-13T18:45:00+02:00",generatedBeforeEveryKickoff:[...candidates,...outsiderCandidates].every(candidate=>candidate.temporal.preMatch),preMatchCandidates:[...candidates,...outsiderCandidates].filter(candidate=>candidate.temporal.preMatch).length,retrospectiveCandidates:[...candidates,...outsiderCandidates].filter(candidate=>!candidate.temporal.preMatch).length,outsiderPreMatchCandidates:outsiderCandidates.filter(candidate=>candidate.temporal.preMatch).length},
  preservation:{baselinePredictions:baselineIds.length,baselineSelectionIdsSha256:baselineHash,expectedBaselineSelectionIdsSha256:source.baseline.selectionIdsSha256,preserved:baselineIds.length===63&&baselineHash===source.baseline.selectionIdsSha256},
  outsiderPreservation:{baselinePredictions:outsiderBaselineIds.length,baselineSelectionIdsSha256:outsiderBaselineHash,expectedBaselineSelectionIdsSha256:outsiderSource.baseline.selectionIdsSha256,preserved:outsiderBaselineIds.length===94&&outsiderBaselineHash===outsiderSource.baseline.selectionIdsSha256},
  catalog:{retrievedAt:odds.retrievedAt,sourceUrl:odds.sourceUrl,events:odds.events.length,markets:odds.events.reduce((sum,event)=>sum+event.markets.length,0),selections:odds.events.reduce((sum,event)=>sum+event.markets.reduce((inner,market)=>inner+market.selections.length,0),0),downloadedAgain:false},
  validationEvidence:{volumeBacktestGeneratedAt:volumeBacktest.generatedAt,thresholds:volumeBacktest.thresholds,metrics:volumeBacktest.metrics,goalModel:forecast.methodology?.goals||forecast.fixtures[0]?.expectedGoals?.method},
  marketAnalysis,
  candidates,
  inserted:{total:candidates.length,classA:candidates.filter(candidate=>candidate.classification==="A").length,classB:candidates.filter(candidate=>candidate.classification==="B").length,classC:0,team:source.teamPicks.length,individual:source.individualPicks.length},
  outsiders:{
    screening:{...outsiderSource.research,individualScreened:outsiderResearch.individualCandidates.length+outsiderResearch.individualRejected.length,teamScreened:outsiderResearch.teamCandidates.length+outsiderResearch.teamRejected.length},
    approved:outsiderCandidates,
    approvedTotals:{total:outsiderCandidates.length,classA:outsiderCandidates.filter(candidate=>candidate.classification==="A").length,classB:outsiderCandidates.filter(candidate=>candidate.classification==="B").length,team:outsiderSource.teamPicks.length,individual:outsiderSource.individualPicks.length},
    excluded:outsiderExcluded,
    excludedTotals:{total:outsiderExcluded.length,individual:outsiderExcluded.filter(candidate=>candidate.metric).length,team:outsiderExcluded.filter(candidate=>candidate.family).length},
    unsupportedMarkets:outsiderResearch.unsupportedMarkets
  },
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
if(!output.outsiderPreservation.preserved)throw new Error("Baseline 94 selectionId pre-outsider non preservata");
if(!output.temporalIntegrity.generatedBeforeEveryKickoff)throw new Error("Una proposta 12D non e prepartita");
if(output.inserted.total!==31||output.outsiders.approvedTotals.total!==26||output.outsiders.excludedTotals.total!==80||output.updatedTotals.predictions!==120||output.updatedTotals.clickableSelections!==120||output.updatedTotals.mathematicallyEvaluable!==42)throw new Error("Totali Fase 12D outsider inattesi");
write(paths.json,output);

const candidateRows=candidates.map(candidate=>`| ${candidate.fixture} | ${candidate.classification} | ${candidate.marketFamily} | ${candidate.label} | ${candidate.odds.toFixed(2)} | ${candidate.modelProbabilityPct==null?"N/D":`${candidate.modelProbabilityPct}%`} | ${candidate.expectedValuePct==null?"N/D":`${candidate.expectedValuePct>0?"+":""}${candidate.expectedValuePct}%`} | \`${candidate.selectionId}\` |`).join("\n");
const outsiderRows=outsiderCandidates.map(candidate=>{
  const evidence=candidate.player
    ?`${candidate.forecast.mean.toLocaleString("it-IT")} ${candidate.forecast.metric==="shots"?"tiri":"SOT"} attesi; ${candidate.player.expectedMinutes.toLocaleString("it-IT")} min; ${candidate.motivation.split("; ")[1]||"storico verificato"}`
    :`P ${candidate.modelProbabilityPct}% da distribuzione gol serializzata; EV descrittivo ${candidate.expectedValuePct>0?"+":""}${candidate.expectedValuePct}%`;
  const risk=candidate.player
    ?`${candidate.marketCode==="28506"?"Contratto DUO con sostituto e pali/traverse":"Contratto DUO con sostituto"}; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza.`
    :"Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata.";
  return `| ${candidate.fixture} | ${candidate.classification} | ${candidate.label} | ${candidate.odds.toFixed(2)} | ${evidence} | ${risk} | ${candidate.modelProbabilityPct==null?"N/D":`${candidate.modelProbabilityPct}%`} | ${candidate.expectedValuePct==null?"N/D":`${candidate.expectedValuePct>0?"+":""}${candidate.expectedValuePct}%`} | \`${candidate.selectionId}\` |`;
}).join("\n");
const distributionRows=fixtureDistribution.map(row=>`| ${row.fixture} | ${row.baseline} | ${row.added} | ${row.outsiderAdded} | ${row.total} | ${row.classA} | ${row.classB} | ${Object.entries(row.markets).map(([family,count])=>`${family} ${count}`).join("; ")||"—"} |`).join("\n");
const analysisRows=marketAnalysis.map(row=>`| ${row.type} | ${row.markets} | ${row.validQuotes} | ${row.status} | ${row.selected} | ${row.support} |`).join("\n");
const excludedRows=output.excluded.map(row=>`| ${row.market} | ${row.classification} | ${row.reason} |`).join("\n");
const markdown=`# Champions League 2026/27 — Fase 12D con estensione outsider\n\nGenerato outsider: ${outsiderSource.generatedAt} · snapshot Sisal invariato: ${odds.retrievedAt}\n\n## Gate\n\n**${output.gate}** — ${output.gateReason}\n\n## Totali\n\n- Baseline Fasi 12B/12C preservata: **${output.preservation.baselinePredictions}/63** selectionId, hash **${output.preservation.baselineSelectionIdsSha256}**.\n- Baseline completa pre-outsider preservata: **${output.outsiderPreservation.baselinePredictions}/94** selectionId, hash **${output.outsiderPreservation.baselineSelectionIdsSha256}**.\n- Fase 12D originaria: **${output.inserted.total}** aggiunte (${output.inserted.classA} classe A, ${output.inserted.classB} classe B).\n- Estensione outsider: **${output.outsiders.approvedTotals.total}** approvati (${output.outsiders.approvedTotals.classA} classe A, ${output.outsiders.approvedTotals.classB} classe B).\n- Totale MD2: **${output.updatedTotals.predictions}** pronostici; **${output.updatedTotals.clickableSelections}** cliccabili.\n- Matematicamente valutabili: **${output.updatedTotals.mathematicallyEvaluable}**; P/EV N/D: **${output.updatedTotals.notProbabilisticallyEvaluable}**.\n- Integrita temporale outsider: **${output.temporalIntegrity.outsiderPreMatchCandidates}/${output.outsiders.approvedTotals.total}** prima del kickoff; retrospettive complessive **${output.temporalIntegrity.retrospectiveCandidates}**.\n- Nessun nuovo download quote; snapshot locale con ${output.catalog.events} eventi, ${output.catalog.markets.toLocaleString("it-IT")} mercati e ${output.catalog.selections.toLocaleString("it-IT")} selezioni.\n\n## Mercati Sisal analizzati\n\n| Tipologia | Mercati | Quote valide | Classi | Inseriti complessivi | Esito della verifica |\n|---|---:|---:|---|---:|---|\n${analysisRows}\n\n## Fase 12D originaria\n\n| Partita | Classe | Mercato | Selezione | Quota | P | EV | selectionId |\n|---|---|---|---|---:|---:|---:|---|\n${candidateRows}\n\n## Estensione outsider\n\n### Candidati analizzati\n\n- Linee sottoposte allo screening: **${output.outsiders.screening.individualScreened} individuali** e **${output.outsiders.screening.teamScreened} squadra**.\n- Candidati che hanno superato il filtro preliminare: **${output.outsiders.screening.qualityCandidates}** (${output.outsiders.screening.individualQualityCandidates} individuali, ${output.outsiders.screening.teamQualityCandidates} squadra).\n- Approvati: **${output.outsiders.approvedTotals.total}**. Esclusi dopo il filtro: **${output.outsiders.excludedTotals.total}**.\n\n### Outsider approvati\n\n| Partita | Classe | Mercato e contratto | Quota | Evidenza statistica e titolarita | Rischio principale | P | EV | selectionId |\n|---|---|---|---:|---|---|---:|---:|---|\n${outsiderRows}\n\nLe 19 proposte individuali sono evidenze statistiche, non valutazioni probabilistiche del contratto Sisal: P, quota equa ed EV restano null. Le 7 soglie goal sono invece valutazioni matematiche basate sulle probabilita full-match gia serializzate.\n\n### Outsider esclusi\n\n- **${output.outsiders.excludedTotals.individual}** linee individuali hanno superato il filtro iniziale ma sono state escluse per ridondanza, soglia meno informativa o evidenza comparativamente piu debole.\n- **${output.outsiders.excludedTotals.team}** esiti squadra, tutti 1X2 outsider, sono stati esclusi per sovrapposizione/conflitto con il verdetto pubblicato o divergenza modello-mercato troppo ampia.\n- Marcatori, cartellini DUO, falli e combinazioni restano esclusi: il catalogo contiene **${output.outsiders.screening.unsupportedOpenMarketFamilies}** famiglie aperte senza target probabilistico equivalente.\n- L'elenco completo degli 80 candidati esclusi, con quote, forecast e identificativi provider, e nel report JSON affiancato.\n\n## Distribuzione per partita\n\n| Partita | Baseline | Fase 12D | Outsider | Totale | A | B | Nuovi mercati |\n|---|---:|---:|---:|---:|---:|---:|---|\n${distributionRows}\n\n## Mercati esclusi\n\n| Mercato | Classe | Motivo |\n|---|---|---|\n${excludedRows}\n\n## Integrita e sincronizzazione\n\n- Le fonti additive sono \`${paths.source}\` e \`${paths.outsiderSource}\`; la fonte condivisa renderizzata resta \`${paths.schedina}\`.\n- I 63 selectionId delle Fasi 12B/12C e tutti i 94 selectionId pre-outsider sono hash-controllati.\n- Quote, oddsRaw, providerEventId, providerMarketId, providerSelectionId, soglie e modificatori sono riletti dallo snapshot Sisal e verificati dal builder.\n- Letture, card e MyCombo consumano lo stesso array per fixture; nessun contratto individuale e trasformato in un evento del solo giocatore.\n- Il dettaglio completo di candidati approvati/esclusi, copertura, rischi, timestamp e provenienza e nel report JSON affiancato.\n`;
write(paths.markdown,markdown);
console.log(`OK audit Champions MD2 Fase 12D: ${output.inserted.total} aggiunte, ${output.updatedTotals.predictions} totali, ${output.updatedTotals.mathematicallyEvaluable} valutabili, gate ${output.gate}`);
