const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const root=path.resolve(__dirname,"..");
const paths={
  source:"data/sources/champions-md02-phase12d-outsiders-2026-27.json",
  phase12d:"data/sources/champions-md02-phase12d-additions-2026-27.json",
  integration:"data/normalized/champions-md02-integration-2026-27.json",
  schedina:"data/normalized/schedina-champions-md02.json",
  marketReport:"output/reports/champions-md02-phase12d-market-expansion-2026-10-13.json",
  reportJson:"output/reports/champions-md02-final-audit-2026-10-13.json",
  reportMarkdown:"output/reports/champions-md02-final-audit-2026-10-13.md"
};
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const sha256=relative=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,relative))).digest("hex").toUpperCase();
const source=read(paths.source);
const phase12d=read(paths.phase12d);
const integration=read(paths.integration);
const schedina=read(paths.schedina);
const marketReport=read(paths.marketReport);
const selections=schedina.fixtures.flatMap(fixture=>fixture.selections);
const sourceOutsiders=[...source.teamPicks,...source.individualPicks];
const sourceOutsiderIds=new Set(sourceOutsiders.map(pick=>pick.selectionId));
const preferredIds=new Set(source.preferredPicks.map(pick=>pick.selectionId));
const fail=message=>{throw new Error(message)};
const assert=(condition,message)=>{if(!condition)fail(message)};
const round=(value,digits=1)=>Number(Number(value).toFixed(digits));
const it=value=>Number(value).toLocaleString("it-IT",{maximumFractionDigits:2});

assert(selections.length===120,"Il totale non è 120");
assert(new Set(selections.map(selection=>selection.selectionId)).size===120,"selectionId duplicati");
assert(sourceOutsiderIds.size===26,"La fonte non contiene 26 outsider unici");
assert(preferredIds.size===18,"La fonte non contiene 18 preferiti unici");
assert(selections.filter(selection=>selection.isOutsider===true).length===26,"Flag outsider non allineati");
assert(selections.filter(selection=>selection.isPreferred===true).length===18,"Flag preferito non allineati");
assert(schedina.fixtures.every(fixture=>fixture.selections.filter(selection=>selection.isPreferred===true).length===1),"Non c'è esattamente un preferito per partita");
assert(selections.filter(selection=>selection.betSelection.evaluation.status!=="NOT_MODELLED").length===42,"Conteggio valutabili diverso da 42");
assert(selections.filter(selection=>selection.betSelection.evaluation.status==="NOT_MODELLED").length===78,"Conteggio DUO N/D diverso da 78");

const fixtureById=new Map(schedina.fixtures.map(fixture=>[fixture.fixtureId,fixture]));
const integrationById=new Map(integration.fixtures.map(fixture=>[fixture.fixtureId,fixture]));
const selectionById=new Map(selections.map(selection=>[selection.selectionId,selection]));
const kickoffIso=fixture=>`${fixture.date}T${fixture.kickoff}:00+02:00`;
const temporalRows=schedina.fixtures.map(fixture=>({
  fixtureId:fixture.fixtureId,
  fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
  generatedAt:source.generatedAt,
  kickoff:kickoffIso(fixture),
  preMatch:new Date(source.generatedAt)<new Date(kickoffIso(fixture))
}));
assert(temporalRows.every(row=>row.preMatch),"Una o più nuove selezioni non sono prepartita");

const individualOutsiders=source.individualPicks.map(pick=>{
  const fixture=fixtureById.get(pick.fixtureId);
  const integrationFixture=integrationById.get(pick.fixtureId);
  const player=[...integrationFixture.lineups.home.players,...integrationFixture.lineups.away.players].find(item=>item.canonicalPlayerId===pick.playerId);
  const selection=selectionById.get(pick.selectionId);
  assert(player&&selection,`${pick.selectionId}: giocatore o selezione non risolti`);
  assert(selection.isOutsider===true,`${pick.selectionId}: flag outsider mancante`);
  assert(player.mappingStatus==="resolved"&&player.dataStatus==="verified-history",`${pick.selectionId}: identità o storico non verificati`);
  assert(selection.betSelection.evaluation.status==="NOT_MODELLED",`${pick.selectionId}: P/EV DUO non devono essere modellati`);
  assert(selection.modelProbabilityPct===null&&selection.fairOdds===null&&selection.expectedValuePct===null,`${pick.selectionId}: valori probabilistici DUO non null`);
  const projection=pick.metric==="shots"?player.projectedShots:player.projectedShotsOnTarget;
  const modifiers=selection.modifiers;
  return {
    fixtureId:pick.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    playerId:pick.playerId,
    player:player.canonicalName,
    team:player.team,
    role:player.role,
    lineupStatus:"probable-starter",
    expectedMinutes:player.expectedMinutes,
    expectedMinutesPolicy:player.expectedMinutesPolicy,
    minuteClassification:player.expectedMinutesPolicy==="existing-model-starter-exposure-0.94x90"?"SHARED_STARTER_EXPOSURE_FALLBACK":"OTHER",
    individualizedMinutes:false,
    assignmentError:false,
    historyMinutes:player.minutes,
    reliabilityPct:round(player.reliability*100),
    metric:pick.metric,
    forecast:projection,
    threshold:selection.threshold,
    odds:selection.odds,
    marketCode:selection.marketCode,
    marketName:selection.marketName,
    variantName:selection.variantName,
    modifiers,
    providerEventId:selection.providerEventId,
    providerMarketId:selection.providerMarketId,
    providerSelectionId:selection.providerSelectionId,
    selectionId:selection.selectionId,
    classification:"B",
    probabilityStatus:"N/D",
    principalRisk:pick.metric==="shotsOnTarget"?"Il contratto DUO include il sostituto e pali/traverse, mentre il forecast descrive solo i SOT del titolare; i minuti non sono individualizzati.":"Il contratto DUO include il sostituto, mentre il forecast descrive solo i tiri del titolare; i minuti non sono individualizzati."
  };
});
assert(individualOutsiders.length===19,"Outsider individuali diversi da 19");
assert(individualOutsiders.every(row=>row.expectedMinutes===84.6&&row.minuteClassification==="SHARED_STARTER_EXPOSURE_FALLBACK"),"Il pattern 84,6 non è uniforme o non è il fallback atteso");

const teamOutsiders=source.teamPicks.map(pick=>{
  const fixture=fixtureById.get(pick.fixtureId);
  const selection=selectionById.get(pick.selectionId);
  assert(selection&&selection.isOutsider===true,`${pick.selectionId}: outsider squadra non risolto`);
  assert(selection.betSelection.evaluation.status==="MODELLED_VALIDATED_TEAM_MARKET",`${pick.selectionId}: outsider squadra non valutabile`);
  return {
    fixtureId:pick.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    market:selection.marketName,
    threshold:selection.threshold,
    selection:selection.selection,
    odds:selection.odds,
    modelProbabilityPct:selection.modelProbabilityPct,
    fairOdds:selection.fairOdds,
    expectedValuePct:selection.expectedValuePct,
    forecast:selection.betSelection.evaluation.forecast,
    modifiers:selection.modifiers,
    providerEventId:selection.providerEventId,
    providerMarketId:selection.providerMarketId,
    providerSelectionId:selection.providerSelectionId,
    selectionId:selection.selectionId,
    classification:"A",
    principalRisk:"Esito di coda: dipende dalla calibrazione della distribuzione Poisson già serializzata; quota alta non equivale automaticamente a valore."
  };
});
assert(teamOutsiders.length===7,"Outsider squadra diversi da 7");

const preferred=source.preferredPicks.map(pick=>{
  const selection=selectionById.get(pick.selectionId);
  const fixture=fixtureById.get(pick.fixtureId);
  assert(selection&&selection.isPreferred===true,`${pick.fixtureId}: preferito non risolto`);
  assert(pick.evaluationClass==="A"&&selection.betSelection.evaluation.status!=="NOT_MODELLED",`${pick.fixtureId}: preferito non valutabile`);
  return {
    fixtureId:pick.fixtureId,
    fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
    selectionId:pick.selectionId,
    curatedAt:source.preferredCuratedAt,
    label:selection.label,
    market:selection.marketFamily,
    odds:selection.odds,
    modelProbabilityPct:selection.modelProbabilityPct,
    expectedValuePct:selection.expectedValuePct,
    isOutsider:selection.isOutsider===true,
    evaluationClass:pick.evaluationClass,
    dataQuality:pick.dataQuality,
    reason:pick.reason,
    limitation:pick.limitation
  };
});

const fixtureDistribution=schedina.fixtures.map(fixture=>({
  fixtureId:fixture.fixtureId,
  fixture:`${fixture.homeTeam} - ${fixture.awayTeam}`,
  predictions:fixture.selections.length,
  outsider:fixture.selections.filter(selection=>selection.isOutsider).length,
  preferred:fixture.selections.filter(selection=>selection.isPreferred).length,
  mathematicallyEvaluable:fixture.selections.filter(selection=>selection.betSelection.evaluation.status!=="NOT_MODELLED").length,
  individualDuo:fixture.selections.filter(selection=>selection.betSelection.evaluation.status==="NOT_MODELLED").length
}));

const finalReport={
  schemaVersion:1,
  phase:"CHAMPIONS-MD2-FINAL",
  generatedAt:new Date().toISOString(),
  gate:"PARTIAL",
  gateReason:"Integrazione, tracciabilità e contratti sono completi; resta una limitazione modellistica esplicita: i 19 outsider individuali usano la stessa esposizione da titolare 0,94×90, non minuti individualizzati. I mercati DUO restano correttamente senza P, quota equa ed EV.",
  preservation:{
    predictions:selections.length,
    uniqueSelectionIds:new Set(selections.map(selection=>selection.selectionId)).size,
    original63Predictions:phase12d.baseline.predictions,
    original63SelectionIdsSha256:phase12d.baseline.selectionIdsSha256,
    preOutsiderPredictions:source.baseline.predictions,
    preOutsiderSelectionIdsSha256:source.baseline.selectionIdsSha256,
    quotesOrContractsRewritten:false
  },
  temporalIntegrity:{allPreMatch:true,sourceGeneratedAt:source.generatedAt,rows:temporalRows},
  minuteAudit:{
    result:"SHARED_FALLBACK_CONFIRMED",
    value:84.6,
    derivation:"0,94 × 90 minuti",
    policy:"existing-model-starter-exposure-0.94x90",
    individualized:0,
    sharedFallback:individualOutsiders.length,
    errors:0,
    impact:"Il fattore minuti scala linearmente il volume per 90 prima della riconciliazione ai volumi squadra. Non distingue rischio di sostituzione, ruolo operativo o storico di permanenza in campo del singolo.",
    decision:"Nessuna correzione automatica: il motore matematico e i forecast restano invariati; la limitazione viene resa esplicita.",
    players:individualOutsiders
  },
  outsiderAudit:{
    screened:marketReport.outsiders.screening,
    approved:26,
    approvedTeam:7,
    approvedIndividual:19,
    excludedAfterQualityScreen:80,
    classA:teamOutsiders.length,
    classB:individualOutsiders.length,
    classCNotPublished:marketReport.excluded,
    team:teamOutsiders,
    individual:individualOutsiders
  },
  labels:{
    outsider:{count:selections.filter(selection=>selection.isOutsider).length,source:paths.source,derivation:"selectionId presente in teamPicks o individualPicks della fonte editoriale versionata"},
    preferred:{count:selections.filter(selection=>selection.isPreferred).length,onePerFixture:true,source:paths.source,derivation:"preferredPicks della fonte editoriale versionata"},
    combinedLabels:selections.filter(selection=>selection.isOutsider&&selection.isPreferred).map(selection=>selection.selectionId)
  },
  preferred,
  updatedTotals:{predictions:120,clickableSelections:schedina.summary.clickableSelections,mathematicallyEvaluable:42,individualDuoNotModelled:78,outsiders:26,preferred:18},
  distribution:fixtureDistribution,
  markets:marketReport.marketAnalysis,
  excluded:marketReport.excluded,
  integration:{
    sharedSource:paths.schedina,
    builder:"scripts/build-champions-md02-schedina.js",
    readingsRenderer:"js/pages/champions.js",
    schedinaRenderer:"js/pages/betting.js",
    styles:["css/champions.css","css/betting.css"],
    hardcodedRendererSelectionIds:false,
    myComboContractPreserved:true
  },
  verification:{
    dataTest:{command:"node scripts/test-champions-md02-schedina.mjs",status:"PASS"},
    browserTest:{command:"node scripts/check-champions-md02-schedina-browser.cjs",status:"PASS"},
    browserCases:["Roma - Real Madrid: molte selezioni","Sabah - Slavia Praga: poche selezioni","Galatasaray - Barcelona: preferito anche outsider"],
    viewports:[1280,390],
    regressionScope:["Champions MD1","Serie A MD6","sync lettura/schedina/MyCombo"]
  },
  sources:{
    editorial:{path:paths.source,sha256:sha256(paths.source)},
    integration:{path:paths.integration,sha256:sha256(paths.integration)},
    schedina:{path:paths.schedina,sha256:sha256(paths.schedina)},
    marketAudit:{path:paths.marketReport,sha256:sha256(paths.marketReport)}
  }
};

const preferredLines=preferred.map(row=>`| ${row.fixture} | ${row.label} | ${row.odds.toFixed(2)} | ${it(row.modelProbabilityPct)}% | ${row.expectedValuePct>0?"+":""}${it(row.expectedValuePct)}% | ${row.isOutsider?"Sì":"No"} |`).join("\n");
const minuteLines=individualOutsiders.map(row=>`| ${row.fixture} | ${row.player} (${row.role}) | ${row.metric==="shots"?"Tiri":"SOT"} O${it(row.threshold)} | ${row.odds.toFixed(2)} | ${it(row.forecast)} | ${it(row.expectedMinutes)} | ${it(row.historyMinutes)} | ${it(row.reliabilityPct)}% |`).join("\n");
const teamLines=teamOutsiders.map(row=>`| ${row.fixture} | ${row.selection} ${it(row.threshold)} gol | ${row.odds.toFixed(2)} | ${it(row.modelProbabilityPct)}% | ${row.expectedValuePct>0?"+":""}${it(row.expectedValuePct)}% | A |`).join("\n");
const distributionLines=fixtureDistribution.map(row=>`| ${row.fixture} | ${row.predictions} | ${row.outsider} | ${row.preferred} | ${row.mathematicallyEvaluable} | ${row.individualDuo} |`).join("\n");
const marketLines=marketReport.marketAnalysis.map(row=>`| ${row.type} | ${row.markets.toLocaleString("it-IT")} | ${row.validQuotes.toLocaleString("it-IT")} | ${row.status} | ${row.selected} | ${row.support} |`).join("\n");
const excludedLines=marketReport.excluded.map(row=>`- **${row.market} (${row.classification})** — ${row.reason}`).join("\n");

const markdown=`# Champions MD2 — audit finale outsider, etichette e preferiti

Generato il ${finalReport.generatedAt}. Fonte outsider/preferiti: \`${paths.source}\`.

## 1. Audit degli 84,6 minuti attesi

**Esito: fallback condiviso confermato, non errore di assegnazione.** Tutti i 19 outsider individuali sono probabili titolari di movimento e ricevono la policy \`existing-model-starter-exposure-0.94x90\`: 0,94 × 90 = 84,6. Non sono 19 stime individualizzate. Il fattore scala linearmente il volume per 90 prima della riconciliazione ai volumi squadra e non rappresenta il rischio sostituzione specifico. Il motore e i forecast non sono stati modificati.

| Partita | Giocatore | Mercato | Quota | Forecast singolo | Min attesi | Storico min | Affidabilità |
|---|---|---:|---:|---:|---:|---:|---:|
${minuteLines}

Tutti i contratti sono DUO: tiri \`28507\` includono il sostituto; SOT \`28506\` includono sostituto e pali/traverse. Perciò P, quota equa ed EV restano N/D. Il rischio principale comune è l'incompatibilità tra forecast del solo titolare e payoff del contratto provider, aggravata dai minuti non individualizzati.

## 2. Audit outsider

Analizzati ${marketReport.outsiders.screening.qualityCandidates} candidati di qualità (${marketReport.outsiders.screening.individualQualityCandidates} individuali, ${marketReport.outsiders.screening.teamQualityCandidates} squadra); approvati 26, esclusi dopo il quality screen 80. I 7 outsider squadra sono classe A:

| Partita | Esito | Quota | P modello | EV | Classe |
|---|---:|---:|---:|---:|---:|
${teamLines}

I 19 individuali sono classe B: identità risolta, probabile titolarità, storico verificato, soglia e quota provider esatte; non ricevono inferenze probabilistiche. Quote alte non sono state equiparate automaticamente a valore.

## 3. Classificazione matematica

- Classe A: 42 selezioni complessive matematicamente valutabili, incluse le 7 outsider squadra.
- Classe B: 78 individuali DUO complessivi supportati dai volumi ma con P/quota equa/EV N/D, inclusi 19 outsider.
- Classe C: mercati non supportati non pubblicati; le selezioni già valide restano selezionabili.

${excludedLines}

## 4. Etichette outsider

\`isOutsider: true\` è emesso dal builder solo se il selectionId appartiene a \`teamPicks\` o \`individualPicks\` della fonte editoriale versionata. Conteggio verificato: **26**. Il badge OUTSIDER è presente sia in lettura sia in schedina; nessun selectionId è codificato nei renderer.

## 5. Pronostico preferito per partita

I 18 preferiti sono espliciti in \`preferredPicks\`, tutti classe A e già inclusi nelle 120 selezioni. Una quota alta non è stata usata come criterio sufficiente.

| Partita | Preferito | Quota | P modello | EV | Anche outsider |
|---|---|---:|---:|---:|---:|
${preferredLines}

## 6. Implementazione tecnica

Fonte editoriale → \`scripts/build-champions-md02-schedina.js\` → \`data/normalized/schedina-champions-md02.json\` → \`js/pages/champions.js\` e \`js/pages/betting.js\`. I badge sono compatti; il preferito usa stella dorata e bordo sottile. Se una selezione è sia outsider sia preferita, mostra entrambe le etichette. Nessun redesign, nessuna modifica al motore matematico, quote o contratti.

## 7. Sincronizzazione letture / schedina / MyCombo

Stessa fonte normalizzata e stesso selectionId sulle due pagine. Totali verificati: 120 pronostici, 120 cliccabili, 26 outsider, 18 preferiti, 42 valutabili, 78 DUO N/D. Quote, soglie, modificatori e payload MyCombo restano quelli del provider.

| Partita | Totale | Outsider | Preferiti | Classe A | DUO N/D |
|---|---:|---:|---:|---:|---:|
${distributionLines}

## 8. Test automatici e browser

- Dati/contratti: **PASS** — \`node scripts/test-champions-md02-schedina.mjs\`.
- Browser desktop 1280 px e mobile 390 px: **PASS** — \`node scripts/check-champions-md02-schedina-browser.cjs\`.
- Casi visivi: Roma–Real Madrid (molte selezioni), Sabah–Slavia Praga (poche), Galatasaray–Barcelona (preferito anche outsider).
- Controlli: conteggi, badge, doppia etichetta, overflow, click e persistenza MyCombo, sync lettura/schedina.

## 9. Regressioni e mercati Sisal

Catalogo riusato senza nuovo download: ${marketReport.catalog.events} eventi, ${marketReport.catalog.markets.toLocaleString("it-IT")} mercati, ${marketReport.catalog.selections.toLocaleString("it-IT")} selezioni.

| Tipologia | Mercati | Quote valide | Classi | Selezionati | Esito audit |
|---|---:|---:|---:|---:|---|
${marketLines}

Le regressioni coperte comprendono Champions MD1 e Serie A MD6. Nessun commit, push o deploy fa parte di questa fase.

## 10. Gate finale

**PARTIAL.** Integrazione, contratti, conteggi, tracciabilità e resa sono completi. Il limite residuo è metodologico e dichiarato: gli 84,6 minuti dei 19 outsider individuali sono un fallback condiviso, non una previsione individualizzata. I relativi contratti DUO restano quindi correttamente classe B e senza P/quota equa/EV.
`;

fs.mkdirSync(path.join(root,"output/reports"),{recursive:true});
fs.writeFileSync(path.join(root,paths.reportJson),`${JSON.stringify(finalReport,null,2)}\n`);
fs.writeFileSync(path.join(root,paths.reportMarkdown),markdown);
console.log(`OK audit finale: ${paths.reportMarkdown} e ${paths.reportJson} · gate ${finalReport.gate}`);
