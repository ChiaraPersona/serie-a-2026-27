const release=new URL(import.meta.url).searchParams.get("v")||"development";
const {settleLeg:settleStrictLeg,settleArchivedLeg}=await import(`./betting-settlement.mjs?v=${encodeURIComponent(release)}`);
const {createPersonalBetslipStore}=await import(`./personal-betslip-store.mjs?v=${encodeURIComponent(release)}`);

export function createPage(deps){
  const {esc,dateOnly,hero,load}=deps;
  let recordedOutcomes=[];
  const settleLeg=(leg,match)=>settleArchivedLeg(leg,match,recordedOutcomes);
  const pct=value=>Number(value).toLocaleString("it-IT",Number(value)>0&&Number(value)<.01?{minimumFractionDigits:4,maximumFractionDigits:6}:{minimumFractionDigits:2,maximumFractionDigits:2});
  const odds=value=>Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const metric=(value,formatter,suffix="")=>Number.isFinite(value)?`${formatter(value)}${suffix}`:"N/D";
  let personalStore=null,currentContext=null,personalNotice="",personalUnsubscribe=null,personalDocumentClick=null,personalDocumentKeydown=null,personalMediaCleanup=null,personalNoticeTimer=null;
  const selectionRegistry=new Map(),slipRegistry=new Map();

  function registerSelection(leg,{fixture=leg.fixture,sourceSection="modello"}={}){
    const contract=leg?.betSelection;
    if(!currentContext||!leg?.selectionId||contract?.selectionId!==leg.selectionId||contract?.identity?.status!=="VERIFIED_PROVIDER_IDS")return null;
    const selection={selectionId:leg.selectionId,context:{...currentContext},fixture:fixture||contract.identity.matchId,label:leg.label||contract.market?.selection||"Selezione",market:leg.market||contract.market?.name||"Mercato",sourceSection,scenarioAnalysis:leg.scenarioAnalysis||null,betSelection:contract};
    selectionRegistry.set(selection.selectionId,selection);
    return selection;
  }

  const personalPickButton=(selection,finished=false)=>selection?`<button type="button" class="betting-personal-pick" data-personal-pick="${esc(selection.selectionId)}" aria-pressed="false"${finished?" disabled":""}><span aria-hidden="true">＋</span><span>${finished?"Archiviata":"Aggiungi"}</span></button>`:"";

  function slipCard(slip,matchById){
    if(slip.qualityStatus==="nd"&&!slip.legs.length)return `<article class="betting-nd-compact"><strong>${esc(slip.name)} · N/D</strong><span>${esc(slip.filterNote||"Dati insufficienti per una proposta prudenziale.")}</span></article>`;
    const selectable=[];
    const legs=slip.legs.map(leg=>{
      const settlement=settleLeg(leg,matchById.get(leg.matchId));
      const settled=["won","lost","void"].includes(settlement.status);
      const symbol=settlement.status==="won"?"✓":settlement.status==="lost"?"×":"—";
      const badge=settled?`<span class="betting-leg-result" aria-label="Esito ${esc(settlement.label.toLowerCase())}"><span aria-hidden="true">${symbol}</span> ${esc(settlement.label)}${settlement.reviewRequired?" · archiviato, target da verificare":""}</span>`:"";
      const selection=registerSelection(leg,{sourceSection:"schedina-modello"});
      if(selection&&!settled)selectable.push(selection);
      return `<li${settled?` class="betting-leg--${settlement.status}" data-settlement="${settlement.status}"`:""}><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)} <small>· ${esc(leg.evidenceLabel)}</small></span>${badge}</div><b>${odds(leg.odds)}</b>${personalPickButton(selection,settled)}</li>`;
    }).join("");
    const slipKey=`model:${slip.id}`;
    if(selectable.length)slipRegistry.set(slipKey,selectable);
    const cardHeuristic=slip.legs.some(leg=>leg.marketFamily==="Ammoniti"||/PUNTI CARTELLINI/.test(leg.market||""));
    const duoIncompatible=slip.legs.some(leg=>leg.compatibility==="INCOMPATIBILE_DUO"||String(leg.probabilitySemantics||"").includes("INDIVIDUAL_V2_VS"));
    const families=slip.marketFamilies.map(esc).join(" · ");
    const weak=slip.weakestLeg?`<p class="betting-weakest">Gamba più fragile: <strong>${esc(slip.weakestLeg.label)}</strong> · ${cardHeuristic?"EV euristico non validato":"EV"} ${slip.weakestLeg.expectedValuePct>0?"+":""}${pct(slip.weakestLeg.expectedValuePct)}%${slip.filterNote?`<small>${esc(slip.filterNote)}</small>`:""}</p>`:"";
    const validation=slip.validationStatus?`<p class="betting-coverage"><strong>${esc(slip.validationStatus)}</strong> · ${esc(slip.risk||"rischio N/D")}</p>`:"";
    const semanticWarning=cardHeuristic?'<p class="betting-weakest">Cartellini: valori euristici non calibrati; probabilità DUO non modellata. Le quote derivate e l’EV non dimostrano un vantaggio statistico.</p>':duoIncompatible?'<p class="betting-weakest">Mercati giocatore DUO: la quota include il sostituto; sui SOT include anche pali/traverse. P V2 individuale, probabilità congiunta ed EV non calcolabili.</p>':"";
    const addAll=selectable.length?`<button type="button" class="betting-personal-add-slip" data-personal-add-slip="${esc(slipKey)}"><span aria-hidden="true">＋</span> Aggiungi tutte le ${selectable.length} selezioni</button>`:"";
    return `<article class="betting-slip betting-slip--${esc(slip.id)}" data-quality="${esc(slip.qualityStatus)}"><header><div><p>${esc(slip.eyebrow)}</p><h2>${esc(slip.name)}</h2><small>${families}</small></div></header>${validation}<div class="betting-slip-metrics"><div class="betting-slip-total"><span>Quota totale</span><strong>${odds(slip.combinedOdds)}</strong><small>${slip.legs.length} giocate</small></div><div><span>${cardHeuristic?"Indice euristico non calibrato":duoIncompatible?"Probabilità congiunta":"Probabilità"}</span><strong>${metric(slip.jointModelProbabilityPct,pct,"%")}</strong></div><div><span>${cardHeuristic?"Quota derivata euristica":"Quota equa"}</span><strong>${metric(slip.fairOdds,odds)}</strong></div><div><span>${cardHeuristic?"EV euristico non validato":duoIncompatible?"EV non calcolabile":"EV stimato"}</span><strong>${metric(slip.expectedValuePct,pct,"%")}</strong></div></div>${addAll}<ol>${legs}</ol>${semanticWarning}${weak}</article>`;
  }

  function modelSections(data,matchById,{showLegend=false}={}){
    const model=data.slips.filter(slip=>!["laboratorio","nd"].includes(slip.qualityStatus)),laboratory=data.slips.filter(slip=>["laboratorio","nd"].includes(slip.qualityStatus));
    const selected=model.length?`<div class="betting-slip-grid betting-slip-grid-qualified">${model.map(slip=>slipCard(slip,matchById)).join("")}</div>`:`<div class="betting-nd-compact"><strong>Nessuna schedina del modello</strong><span>Non sono state forzate combinazioni per questa giornata.</span></div>`;
    const legend=showLegend?`<div class="betting-result-legend" aria-label="Legenda esiti"><span class="betting-result-legend--won"><b aria-hidden="true">✓</b> Esatto</span><span class="betting-result-legend--lost"><b aria-hidden="true">×</b> Sbagliato</span><span class="betting-result-legend--void"><b aria-hidden="true">—</b> Annullata</span><small>Se il calciatore non entra, la quota è annullata e la puntata viene restituita.</small></div>`:"";
    const coverage=data.coverage?`<p class="betting-coverage"><strong>${data.coverage.qualifiedProfiles} proposte qualificate</strong> su ${data.coverage.profilesEvaluated} profili valutati · ${data.coverage.unavailableProfiles} profili N/D.</p>`:"";
    const main=`<section class="betting-stage betting-model-section" aria-labelledby="betting-model-title"><header class="betting-section-heading"><h3 id="betting-model-title">Schedine del modello</h3></header>${legend}${selected}</section>`;
    const lab=laboratory.length?`<section class="betting-stage betting-lab-section" aria-labelledby="betting-lab-title"><header class="betting-section-heading"><h3 id="betting-lab-title">Analisi e laboratorio</h3></header><div class="betting-slip-grid">${laboratory.map(slip=>slipCard(slip,matchById)).join("")}</div><footer class="betting-method"><strong>Metodo</strong><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. <a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">Fonte quote</a>.</p></footer></section>`:"";
    const summary=`<section class="betting-essential" aria-labelledby="betting-essential-title"><h3 id="betting-essential-title">In sintesi</h3>${coverage}<p>${esc(data.selectionRule||"Nessuna selezione viene forzata.")}</p><p>Under, falli individuali, corner per tempo e doppia chance 12 non sono proposte giocabili dalla MD6; i corner dell'intera partita restano eleggibili. Quote: ${esc(data.provider)}, snapshot ${esc(dateOnly(data.oddsRetrievedAt))}.</p></section>`;
    return {summary,main,lab};
  }

  const hasValidEvaluation=leg=>{
    const evaluation=leg?.betSelection?.evaluation;
    return evaluation?.status!=="NOT_MODELLED"&&[evaluation?.modelProbabilityPct,evaluation?.fairOdds,evaluation?.expectedValuePct].every(Number.isFinite);
  };

  const isPlayableSelection=leg=>leg?.betSelection?.operational?.playability?.status!=="NOT_PLAYABLE"&&leg?.betSelection?.operational?.classification!=="ESCLUSO";

  const hasVerifiedPlayableQuote=leg=>{
    const contract=leg?.betSelection,quote=contract?.quote||{},compatibility=String(contract?.compatibility?.status||"");
    return leg?.lineupEligibility?.eligible!==false&&isPlayableSelection(leg)&&contract?.selectionId===leg?.selectionId&&contract?.identity?.status==="VERIFIED_PROVIDER_IDS"&&Boolean(contract.identity.providerSelectionId)&&Number.isFinite(Number(quote.decimal))&&Number(quote.decimal)>0&&Boolean(quote.verifiedAt)&&Boolean(quote.source?.provider)&&quote.availability==="AVAILABLE_AT_SNAPSHOT"&&!/^INCOMPATIBILE/.test(compatibility)&&compatibility!=="INCOMPATIBLE";
  };

  function selectableMarketRow({leg,sourceSection},index,fixture){
    const evaluation=hasValidEvaluation(leg)?leg.betSelection.evaluation:null,market=leg.betSelection.market||{},selection=registerSelection(leg,{fixture,sourceSection}),threshold=market.threshold??market.selection,quote=Number(leg.betSelection.quote.decimal),probability=evaluation?Number(evaluation.modelProbabilityPct):null,fairOdds=evaluation?Number(evaluation.fairOdds):null,ev=evaluation?Number(evaluation.expectedValuePct):null;
    const metricText=(value,formatter,suffix="")=>Number.isFinite(value)?`${formatter(value)}${suffix}`:"—",dnb=evaluation?.probabilitySemantics==="CONDITIONAL_ON_NO_DRAW",probabilityLabel=dnb?"Prob. senza X":"Probabilità",settlementNote=dnb?`<span>Rimborso sul pareggio · tempo regolamentare</span>`:"";
    const relation=leg.scenarioAnalysis||{},relationClass={COHERENT_WITH_PREVALENT:"coherent",ALTERNATIVE_TO_PREVALENT:"alternative",COMPATIBLE_WITH_MULTIPLE_SCENARIOS:"multi",NOT_DETERMINABLE:"undetermined"}[relation.classification]||"undetermined",relationText=relation.label||"Relazione con lo scenario non determinabile",relationDot=`<span class="betting-scenario-dot betting-scenario-dot--${relationClass}" title="${esc(`${relationText}. ${relation.reason||""}`)}" aria-label="${esc(relationText)}"></span>`;
    return `<li class="betting-market-row betting-selection-row betting-scenario--${relationClass}" role="button" tabindex="0" data-selection-row data-personal-pick="${esc(selection.selectionId)}" data-selection-label="${esc(leg.label)}" data-source-section="${esc(sourceSection)}" data-scenario-class="${esc(relation.classification||"NOT_DETERMINABLE")}" data-order="${index}" data-ev="${Number.isFinite(ev)?ev:""}" data-probability="${Number.isFinite(probability)?probability:""}" data-odds="${quote}" aria-pressed="false" aria-label="Aggiungi alla schedina: ${esc(leg.label)}. ${esc(relationText)}"><div class="betting-market-copy"><small>${relationDot}${esc(market.family||leg.marketFamily||leg.market||"Mercato")}</small><strong>${esc(leg.label)}</strong>${threshold!==null&&threshold!==undefined&&threshold!==""?`<span>${market.threshold!==null&&market.threshold!==undefined?"Soglia":"Esito"} ${esc(threshold)}</span>`:""}${settlementNote}</div><span class="betting-market-metric"><small>Quota</small><b>${odds(quote)}</b></span><span class="betting-market-metric"><small>${probabilityLabel}</small><b>${metricText(probability,pct,"%")}</b></span><span class="betting-market-metric"><small>Quota equa</small><b>${metricText(fairOdds,odds)}</b></span><span class="betting-market-metric betting-market-ev ${Number.isFinite(ev)?ev>=0?"is-positive":"is-negative":""}"><small>EV</small><b>${Number.isFinite(ev)&&ev>0?"+":""}${metricText(ev,pct,"%")}</b></span><span class="betting-selection-check" aria-hidden="true">✓</span></li>`;
  }

  const marketEntryOrder=(left,right)=>{const leftEv=hasValidEvaluation(left.leg)?Number(left.leg.betSelection.evaluation.expectedValuePct):null,rightEv=hasValidEvaluation(right.leg)?Number(right.leg.betSelection.evaluation.expectedValuePct):null,leftMissing=!Number.isFinite(leftEv),rightMissing=!Number.isFinite(rightEv);if(leftMissing!==rightMissing)return leftMissing?1:-1;if(!leftMissing&&leftEv!==rightEv)return rightEv-leftEv;return Number(left.leg.catalogOrder??0)-Number(right.leg.catalogOrder??0)||String(left.leg.selectionId).localeCompare(String(right.leg.selectionId))};

  function matchScenarioSummary(scenario){
    if(!scenario)return "";
    const probabilities=scenario.probabilities||{},prevalent=scenario.prevalentOutcome||scenario.prevalentOutcomes?.join("/")||"N/D",modal=scenario.modalExactScore,band=scenario.goalDistribution?.dominantBand;
    return `<section class="betting-scenario-summary" aria-label="Scenario predittivo V2"><div class="betting-scenario-main"><small>Scenario prevalente</small><strong>${esc(prevalent)}</strong><span>Non è una certezza</span></div><div class="betting-scenario-probabilities" aria-label="Probabilità uno X due"><span><b>1</b>${metric(probabilities["1"],pct,"%")}</span><span><b>X</b>${metric(probabilities.X,pct,"%")}</span><span><b>2</b>${metric(probabilities["2"],pct,"%")}</span></div><p>${esc(scenario.description||"")}${modal?` <span>Moda esatta: <strong>${esc(modal.score)}</strong>${Number.isFinite(modal.probabilityPct)?` (${pct(modal.probabilityPct)}%)`:""}.</span>`:""}${band?` <span>Banda gol prevalente: <strong>${esc(band.label)}</strong> (${pct(band.probabilityPct)}%).</span>`:""}</p><div class="betting-scenario-legend" aria-label="Legenda relazione mercati"><span><i class="betting-scenario-dot betting-scenario-dot--coherent"></i>Coerente</span><span><i class="betting-scenario-dot betting-scenario-dot--alternative"></i>Alternativa</span><span><i class="betting-scenario-dot betting-scenario-dot--multi"></i>Multi-scenario</span><span><i class="betting-scenario-dot betting-scenario-dot--undetermined"></i>N/D</span></div></section>`;
  }

  function matchdayWorkspaceContent(data,predictions,matchById,teamById,matchday){
    const code=String(matchday).padStart(2,"0"),modelByMatch=new Map(),catalogByMatch=new Map((data.marketCatalog?.matches||[]).map(match=>[match.matchId,match]));
    data.slips.flatMap(slip=>slip.legs.map(leg=>({leg,sourceSection:slip.qualityStatus==="laboratorio"?"laboratorio":"schedina-modello"}))).filter(({leg})=>hasValidEvaluation(leg)&&hasVerifiedPlayableQuote(leg)).forEach(entry=>{
      const rows=modelByMatch.get(entry.leg.matchId)||[];rows.push(entry);modelByMatch.set(entry.leg.matchId,rows);
    });
    const predictionsByMatch=new Map(predictions.filter(prediction=>prediction.matchId.endsWith(`-md-${code}`)).map(prediction=>[prediction.matchId,prediction]));
    const matches=[...matchById.values()].filter(match=>match.id.endsWith(`-md-${code}`)).sort((left,right)=>`${left.date}T${left.kickoff||"00:00"}`.localeCompare(`${right.date}T${right.kickoff||"00:00"}`));
    const panels=matches.map(match=>{
      const home=teamById.get(match.homeTeam)?.name||match.homeTeam,away=teamById.get(match.awayTeam)?.name||match.awayTeam,prediction=predictionsByMatch.get(match.id),combo=prediction?.combinations?.find(item=>item.tier==="Safe"),comboLegs=combo?.legs||[],seen=new Set(),markets=[];
      const catalog=catalogByMatch.get(match.id),entries=catalog?.selections?.length?catalog.selections.map(leg=>({leg,sourceSection:leg.catalogOrigin||"catalogo-mercati"})):[...(modelByMatch.get(match.id)||[]),...comboLegs.filter(hasVerifiedPlayableQuote).map(leg=>({leg,sourceSection:"mycombo-partita"}))];
      entries.filter(({leg})=>hasVerifiedPlayableQuote(leg)).forEach(entry=>{if(entry.leg.selectionId&&!seen.has(entry.leg.selectionId)){seen.add(entry.leg.selectionId);markets.push(entry)}});markets.sort(marketEntryOrder);
      const fixture=`${home} - ${away}`,marketList=markets.length?`<div class="betting-market-columns" aria-hidden="true"><span>Mercato</span><span>Quota</span><span>Probabilità</span><span>Quota equa</span><span>EV</span><span></span></div><ol class="betting-market-list">${markets.map((entry,index)=>selectableMarketRow(entry,index,fixture)).join("")}</ol>`:`<p class="betting-market-empty">Nessuna selezione disponibile.</p>`;
      return `<details class="betting-match-panel" data-match-panel data-match-id="${esc(match.id)}"><summary><span><small>${esc(dateOnly(match.date))} · ${esc(match.kickoff||"Orario N/D")}</small><strong>${esc(home)} - ${esc(away)}</strong></span><span class="betting-match-count">${markets.length} ${markets.length===1?"selezione disponibile":"selezioni disponibili"}</span><span class="betting-match-toggle" aria-hidden="true">＋</span></summary><div class="betting-match-body">${matchScenarioSummary(catalog?.scenario)}${marketList}</div></details>`;
    }).join("");
    return `<section class="betting-matchday-shell" aria-labelledby="betting-markets-title"><header class="betting-matchday-heading"><div><p class="eyebrow">${matches.length} partite · ordine cronologico</p><h3 id="betting-markets-title">Mercati per partita</h3></div><div class="betting-matchday-actions"><button type="button" data-match-open-all>Apri tutte</button><button type="button" data-match-close-all>Chiudi tutte</button></div></header><div class="betting-match-list">${panels}</div></section>`;
  }

  function archiveRoundContent(data,matchById,{showLegend=false}={}){
    const qualified=data.slips.filter(slip=>slip.qualityStatus==="qualificata"),others=data.slips.filter(slip=>slip.qualityStatus!=="qualificata");
    const selected=qualified.length?`<div class="betting-slip-grid betting-slip-grid-qualified">${qualified.map(slip=>slipCard(slip,matchById)).join("")}</div>`:`<div class="betting-nd-compact"><strong>Nessuna schedina qualificata</strong><span>Il controllo prudenziale non forza proposte: restano disponibili le letture editoriali e di laboratorio.</span></div>`;
    const legend=showLegend?`<div class="betting-result-legend" aria-label="Legenda esiti"><span class="betting-result-legend--won"><b aria-hidden="true">✓</b> Esatto</span><span class="betting-result-legend--lost"><b aria-hidden="true">×</b> Sbagliato</span><span class="betting-result-legend--void"><b aria-hidden="true">—</b> Annullata</span><small>Se il calciatore non entra, la quota è annullata e la puntata viene restituita.</small></div>`:"";
    const coverage=data.coverage?`<p class="betting-coverage"><strong>${data.coverage.qualifiedProfiles} proposte qualificate</strong> su ${data.coverage.profilesEvaluated} profili valutati · ${data.coverage.unavailableProfiles} profili N/D.</p>`:"";
    return `<div class="betting-stage"><header class="betting-intro"><div><p class="eyebrow">Controllo prudenziale</p><h3>Selezionate dal modello</h3></div><p>${esc(data.selectionRule||"Entrano qui soltanto schedine con EV non negativo e nessuna gamba sotto −10% di EV individuale.")}</p></header>${coverage}${legend}${selected}${others.length?`<header class="betting-section-heading"><div><p class="eyebrow">Letture editoriali e laboratorio</p><h3>Scenari non qualificati</h3></div><p>Restano visibili per confronto, con rischio ed EV dichiarati.</p></header><div class="betting-slip-grid">${others.map(slip=>slipCard(slip,matchById)).join("")}</div>`:""}<footer class="betting-method"><strong>Come leggere i numeri</strong><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. <a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">Fonte quote</a>. Gioca responsabilmente: pagina editoriale, nessun esito è certo.</p></footer></div>`;
  }

  function myComboRoundContent(predictions,matchById,teamById,matchday){
    const code=String(matchday).padStart(2,"0");
    const entries=predictions.filter(prediction=>prediction.matchId.endsWith(`-md-${code}`)).map(prediction=>({prediction,combo:prediction.combinations?.find(item=>item.tier==="Safe"),match:matchById.get(prediction.matchId)})).filter(item=>item.match&&item.combo?.legs?.length).sort((left,right)=>`${left.match.date}T${left.match.kickoff||"00:00"}`.localeCompare(`${right.match.date}T${right.match.kickoff||"00:00"}`));
    if(matchday===5){
      const cards=entries.map(({combo,match})=>{const home=teamById.get(match.homeTeam)?.name||match.homeTeam,away=teamById.get(match.awayTeam)?.name||match.awayTeam,results=combo.legs.map(leg=>settleLeg({...leg,fixture:`${home} - ${away}`},match)),won=results.filter(result=>result.status==="won").length,decided=results.filter(result=>["won","lost","void"].includes(result.status)).length,pending=results.length-decided,legs=combo.legs.map((leg,index)=>{const result=results[index],settled=["won","lost","void"].includes(result.status),status=settled?result.status:"unavailable";return `<li class="betting-leg--${status}" data-settlement="${status}"><button type="button" class="betting-mycombo-pick" data-mycombo-pick aria-pressed="false" disabled><span class="betting-mycombo-pick-copy"><strong>${esc(leg.market)}</strong><span>${esc(leg.label)}</span><span class="betting-leg-result">${esc(settled?result.label:"Da verificare")}</span></span><b>${odds(leg.odds)}</b></button></li>`}).join("");return `<article class="betting-slip betting-mycombo-card" data-match-id="${esc(match.id)}" data-finished="true"><header><div><p>MyCombo · risultati</p><h2>${esc(home)} - ${esc(away)}</h2><small>Finale ${match.score?.home??"N/D"}-${match.score?.away??"N/D"} · verde = esito preso</small></div></header><div class="betting-slip-metrics"><div class="betting-slip-total"><span>Esiti presi</span><strong>${won}</strong><small>${decided} esiti verificati</small></div><div><span>Da verificare</span><strong>${pending}/${results.length}</strong></div></div><ol class="betting-mycombo-options">${legs}</ol></article>`}).join("");
      return `<section class="betting-mycombo-round" aria-labelledby="betting-mycombo-md05-title"><header class="betting-section-heading"><div><p class="eyebrow">Una per ogni partita</p><h3 id="betting-mycombo-md05-title">MyCombo · 10 esiti per gara</h3></div><p>Snapshot archiviate e risultati verificabili.</p></header><div class="betting-slip-grid">${cards}</div></section>`;
    }
    const legRow=(leg,index,match,finished,forceDisabled=false)=>{const home=teamById.get(match.homeTeam)?.name||match.homeTeam,away=teamById.get(match.awayTeam)?.name||match.awayTeam,result=settleLeg({...leg,fixture:`${home} - ${away}`},match),settled=finished&&["won","lost","void"].includes(result.status),status=finished?(settled?result.status:"unavailable"):"pending",classification=leg.betSelection?.operational?.classification,reliability=leg.betSelection?.operational?.reliability?.level||"Non valutabile",playable=leg.betSelection?.operational?.playability?.status!=="NOT_PLAYABLE",selection=!forceDisabled&&playable&&classification!=="ESCLUSO"?registerSelection(leg,{fixture:`${home} - ${away}`,sourceSection:"mycombo-partita"}):null,badge=finished?`<span class="betting-leg-result">${esc(settled?result.label:"Da verificare")}</span>`:"";return `<li${finished?` class="betting-leg--${status}" data-settlement="${status}"`:""}><button type="button" class="betting-mycombo-pick" data-mycombo-pick${selection?` data-personal-pick="${esc(selection.selectionId)}"`:""} aria-pressed="false"${finished||!selection?" disabled":""}><span class="betting-mycombo-pick-copy"><strong>${esc(leg.label)}</strong><span>${esc(leg.market)} · ${esc(classification||"Non valutabile")} · Affidabilità ${esc(reliability)}</span>${badge}</span><b>${odds(leg.odds)}</b></button></li>`};
    const cards=entries.map(({combo,match})=>{
      const home=teamById.get(match.homeTeam)?.name||match.homeTeam,away=teamById.get(match.awayTeam)?.name||match.awayTeam,finished=match.status==="finished";
      const main=combo.legs.filter(leg=>["PRINCIPALE","INTERESSANTE","OUTSIDER"].includes(leg.betSelection?.operational?.classification)&&leg.betSelection?.operational?.playability?.status!=="NOT_PLAYABLE");
      const watch=combo.legs.filter(leg=>leg.betSelection?.operational?.classification==="WATCH"&&leg.betSelection?.operational?.playability?.status!=="NOT_PLAYABLE");
      const review=combo.legs.filter(leg=>!main.includes(leg)&&!watch.includes(leg));
      const mainRows=main.length?`<div class="betting-mycombo-group"><h4>Proposte</h4><ol class="betting-mycombo-options">${main.map((leg,index)=>legRow(leg,index,match,finished)).join("")}</ol></div>`:"";
      const watchRows=watch.length?`<details class="betting-mycombo-watch"><summary>WATCH</summary><ol class="betting-mycombo-options">${watch.map((leg,index)=>legRow(leg,index,match,finished)).join("")}</ol></details>`:"";
      const reviewRows=review.length?`<details class="betting-mycombo-review"><summary>Non valutabili</summary><ol class="betting-mycombo-options">${review.map((leg,index)=>legRow(leg,index,match,finished,true)).join("")}</ol></details>`:"";
      return `<details class="betting-mycombo-card" data-match-id="${esc(match.id)}"${finished?' data-finished="true"':""}><summary><span><small>${esc(dateOnly(match.date))} · ${esc(match.kickoff||"Orario N/D")}</small><strong>${esc(home)} - ${esc(away)}</strong></span><span aria-hidden="true">＋</span></summary><div class="betting-mycombo-body">${mainRows}${watchRows}${reviewRows}</div></details>`;
    }).join("");
    return `<section class="betting-mycombo-round" aria-labelledby="betting-mycombo-md${code}-title"><header class="betting-section-heading"><h3 id="betting-mycombo-md${code}-title">MyCombo per partita</h3><div class="betting-mycombo-actions"><button type="button" data-mycombo-open-all>Apri tutte</button><button type="button" data-mycombo-close-all>Chiudi tutte</button></div></header><div class="betting-mycombo-list">${cards}</div></section>`;
  }

  function bindMyComboInteractions(matchday){
    const storageKey=`serie-a-2026-27:mycombo-open:v1:md${String(matchday).padStart(2,"0")}`,details=[...document.querySelectorAll(".betting-mycombo-card")];
    let saved=[];try{saved=JSON.parse(localStorage.getItem(storageKey)||"[]")}catch(_error){saved=[]}
    details.forEach(detail=>{detail.open=saved.includes(detail.dataset.matchId);detail.addEventListener("toggle",()=>{try{localStorage.setItem(storageKey,JSON.stringify(details.filter(item=>item.open).map(item=>item.dataset.matchId)))}catch(_error){}})});
    document.querySelector("[data-mycombo-open-all]")?.addEventListener("click",()=>details.forEach(detail=>{detail.open=true}));
    document.querySelector("[data-mycombo-close-all]")?.addEventListener("click",()=>details.forEach(detail=>{detail.open=false}));
    updatePersonalSelectionControls(personalStore?.getSnapshot());
  }

  function bindMatchdayInteractions(matchday){
    const storageKey=`serie-a-2026-27:match-open:v1:md${String(matchday).padStart(2,"0")}`,panels=[...document.querySelectorAll("[data-match-panel]")];
    let saved=[];try{saved=JSON.parse(localStorage.getItem(storageKey)||"[]")}catch(_error){saved=[]}
    const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(panels.filter(panel=>panel.open).map(panel=>panel.dataset.matchId)))}catch(_error){}};
    panels.forEach(panel=>{
      panel.open=saved.includes(panel.dataset.matchId);
      panel.addEventListener("toggle",persist);
    });
    document.querySelector("[data-match-open-all]")?.addEventListener("click",()=>panels.forEach(panel=>{panel.open=true}));
    document.querySelector("[data-match-close-all]")?.addEventListener("click",()=>panels.forEach(panel=>{panel.open=false}));
    updatePersonalSelectionControls(personalStore?.getSnapshot());
  }

  const personalContextLabel=context=>context?.label||`${context?.competition||"Competizione"} · ${context?.season||"stagione N/D"} · giornata ${context?.matchday??"N/D"}`;

  function updatePersonalSelectionControls(snapshot){
    const selected=new Set((snapshot?.selections||[]).map(selection=>selection.selectionId));
    document.querySelectorAll("[data-personal-pick]").forEach(button=>{
      const active=selected.has(button.dataset.personalPick);
      button.setAttribute("aria-pressed",String(active));
      button.classList.toggle("is-selected",active);
      if(button.dataset.selectionLabel)button.setAttribute("aria-label",`${active?"Rimuovi dalla":"Aggiungi alla"} schedina: ${button.dataset.selectionLabel}`);
      if(button.classList.contains("betting-personal-pick")){
        const label=button.querySelector("span:last-child");
        if(label&&!button.disabled)label.textContent=active?"Aggiunta":"Aggiungi";
      }
    });
    document.querySelectorAll(".betting-mycombo-card").forEach(card=>{
      const count=[...card.querySelectorAll("[data-personal-pick]")].filter(button=>button.getAttribute("aria-pressed")==="true").length;
      const output=card.querySelector("[data-mycombo-active]");
      if(output)output.textContent=String(count);
    });
    document.querySelectorAll("[data-personal-count]").forEach(output=>output.textContent=String(snapshot?.selections?.length||0));
  }

  function personalBetslipMarkup(){
    return `<div class="personal-betslip-root" data-personal-root><button type="button" class="personal-betslip-trigger" data-personal-open aria-controls="personal-betslip-panel" aria-expanded="false"><span>La mia schedina</span><b data-personal-count>0</b></button><aside id="personal-betslip-panel" class="personal-betslip-panel" role="dialog" aria-modal="false" aria-labelledby="personal-betslip-title" hidden><header><div><h2 id="personal-betslip-title" tabindex="-1">La mia schedina</h2></div><button type="button" class="personal-betslip-close" data-personal-close aria-label="Chiudi la mia schedina">×</button></header><p class="personal-betslip-context" data-personal-context></p><p class="personal-betslip-notice" data-personal-notice aria-live="polite"></p><div class="personal-betslip-content" data-personal-content></div><footer><button type="button" class="personal-betslip-clear" data-personal-clear>Svuota</button></footer></aside></div>`;
  }

  function issueLabel(issue){
    const labels={EXACT_DUPLICATE:"Duplicato",LOGICAL_OVERLAP:"Correlazione o sovrapposizione",LOGICAL_IMPLICATION:"Implicazione logica",SCENARIO_INCOMPATIBILITY:"Incompatibilità logica",MARKET_CONTRADICTION:"Incompatibilità logica",BOOKMAKER_COMBINABILITY_UNKNOWN:"Combinabilità bookmaker non verificata",MISSING_VERIFIED_QUOTE:"Quota non verificata",AVAILABILITY_NOT_CONFIRMED:"Disponibilità non confermata",MODEL_BOOKMAKER_INCOMPATIBLE:"Mercato incompatibile",MISSING_FROM_CURRENT_DATA:"Non più nei dati correnti",UNDER_NOT_PLAYABLE:"Under non giocabile",INDIVIDUAL_FOUL_NOT_PLAYABLE:"Falli individuali non giocabili",CORNER_PERIOD_NOT_PLAYABLE:"Corner per tempo non giocabile"};
    return labels[issue.type]||"Verifica richiesta";
  }

  function renderPersonalBetslip(snapshot){
    const root=document.querySelector("[data-personal-root]");
    if(!root)return;
    const context=root.querySelector("[data-personal-context]");
    const content=root.querySelector("[data-personal-content]");
    const notice=root.querySelector("[data-personal-notice]");
    const panel=root.querySelector(".personal-betslip-panel"),footer=panel.querySelector("footer"),selections=snapshot?.selections||[],assessment=snapshot?.assessment||{theoreticalCombinedOdds:null,theoreticalExcludedCount:0};
    context.textContent=snapshot?.context?personalContextLabel(snapshot.context):"Apri una giornata per iniziare o riprendere la schedina.";
    notice.textContent=personalNotice||snapshot?.storageError||"";
    notice.hidden=!notice.textContent;
    const rows=selections.map(selection=>{
      const quote=selection.betSelection?.quote||{};
      const quoteText=quote.decimal!==null&&quote.decimal!==""&&Number.isFinite(Number(quote.decimal))?odds(quote.decimal):"N/D";
      const flags=[];
      if(selection.quoteChanged)flags.push(`Quota aggiornata${selection.previousQuote?` da ${odds(selection.previousQuote)}`:""}`);
      return `<li class="personal-betslip-item"><div><small>${esc(selection.fixture||"Partita N/D")}</small><strong>${esc(selection.label||"Selezione N/D")}</strong><span>${esc(selection.market||selection.betSelection?.market?.name||"Mercato N/D")} · quota ${quoteText}</span>${flags.map(flag=>`<em>${esc(flag)}</em>`).join("")}</div><button type="button" class="personal-betslip-remove" data-personal-remove="${esc(selection.selectionId)}" aria-label="Rimuovi selezione" title="Rimuovi selezione"><span aria-hidden="true">×</span></button></li>`;
    }).join("");
    const relationshipIssues=(assessment.issues||[]).filter(issue=>["MARKET_CONTRADICTION","SCENARIO_INCOMPATIBILITY","LOGICAL_OVERLAP","LOGICAL_IMPLICATION","BOOKMAKER_COMBINABILITY_UNKNOWN"].includes(issue.type)),uniqueRelationshipIssues=[...new Map(relationshipIssues.map(issue=>[`${issue.type}:${(issue.selectionIds||[]).slice().sort().join("|")}`,issue])).values()],analysis=selections.length>1&&uniqueRelationshipIssues.length?`<section class="personal-betslip-analysis" aria-label="Relazioni tra selezioni"><strong>Relazioni tra selezioni</strong><ul>${uniqueRelationshipIssues.map(issue=>`<li data-issue-type="${esc(issue.type)}"><b>${esc(issueLabel(issue))}</b><span>${esc(issue.message)}</span></li>`).join("")}</ul><small>Nessuna probabilità combinata viene stimata. La combinabilità commerciale resta separata.</small></section>`:"";
    const partial=Number(assessment.theoreticalExcludedCount)||0,totalValue=assessment.theoreticalCombinedOdds==null?"—":odds(assessment.theoreticalCombinedOdds),total=`<div class="personal-betslip-total"><span>Quota combinata teorica</span><strong>${totalValue}</strong><small>${partial?`Totale parziale: ${partial} ${partial===1?"selezione non inclusa":"selezioni non incluse"} perché senza quota valida o non giocabili.`:"Prodotto matematico delle quote selezionate; non conferma la combinabilità Sisal."}</small></div>`,emptyTotal='<div class="personal-betslip-total personal-betslip-total--empty"><span>Quota combinata teorica</span><strong>—</strong></div>';
    content.innerHTML=selections.length?`<ol class="personal-betslip-list">${rows}</ol>${analysis}${total}`:`<div class="personal-betslip-empty"><span class="personal-betslip-empty-icon" aria-hidden="true">＋</span><strong>Nessuna selezione</strong><span>Aggiungi una giocata per iniziare</span></div>${emptyTotal}`;
    panel.classList.toggle("is-empty",!selections.length);
    footer.hidden=!selections.length;
    root.querySelector("[data-personal-clear]").disabled=!selections.length;
    updatePersonalSelectionControls(snapshot);
  }

  function setPersonalNotice(message){
    personalNotice=message;
    if(personalNoticeTimer)clearTimeout(personalNoticeTimer);
    renderPersonalBetslip(personalStore?.getSnapshot());
    if(message)personalNoticeTimer=setTimeout(()=>{personalNotice="";renderPersonalBetslip(personalStore?.getSnapshot())},2200);
  }

  function mountPersonalBetslip(){
    personalUnsubscribe?.();
    if(personalDocumentClick)document.removeEventListener("click",personalDocumentClick);
    if(personalDocumentKeydown)document.removeEventListener("keydown",personalDocumentKeydown);
    personalMediaCleanup?.();
    document.querySelector("[data-personal-root]")?.remove();
    const host=document.querySelector("[data-personal-host]");
    if(!host)return;
    host.innerHTML=personalBetslipMarkup();
    const root=document.querySelector("[data-personal-root]"),panel=root.querySelector(".personal-betslip-panel"),trigger=root.querySelector("[data-personal-open]");
    const desktop=window.matchMedia("(min-width:1180px)");let previousFocus=null,mobileOpen=false;
    const syncMode=()=>{if(desktop.matches){panel.hidden=false;panel.dataset.open="true";panel.setAttribute("role","region");panel.setAttribute("aria-modal","false");trigger.setAttribute("aria-expanded","true")}else{panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");if(!mobileOpen){delete panel.dataset.open;panel.hidden=true;trigger.setAttribute("aria-expanded","false")}}};
    const open=()=>{if(desktop.matches)return;previousFocus=document.activeElement;mobileOpen=true;panel.hidden=false;requestAnimationFrame(()=>panel.dataset.open="true");trigger.setAttribute("aria-expanded","true");panel.querySelector("[data-personal-close]").focus()};
    const close=()=>{if(desktop.matches)return;mobileOpen=false;delete panel.dataset.open;trigger.setAttribute("aria-expanded","false");setTimeout(()=>{if(!mobileOpen&&!desktop.matches)panel.hidden=true},180);(previousFocus?.isConnected?previousFocus:trigger).focus()};
    desktop.addEventListener("change",syncMode);personalMediaCleanup=()=>desktop.removeEventListener("change",syncMode);syncMode();
    root.addEventListener("click",async event=>{
      const openButton=event.target.closest("[data-personal-open]"),closeButton=event.target.closest("[data-personal-close]"),removeButton=event.target.closest("[data-personal-remove]"),clearButton=event.target.closest("[data-personal-clear]");
      if(openButton){open();return}if(closeButton){close();return}
      if(removeButton){personalStore.remove(removeButton.dataset.personalRemove);setPersonalNotice("Selezione rimossa.");return}
      if(clearButton&&window.confirm("Vuoi svuotare la schedina personale di questa giornata?")){const result=personalStore.clear();setPersonalNotice(`Schedina svuotata: ${result.removed||0} selezioni rimosse.`);return}
    });
    const togglePersonalPick=pick=>{
      if(pick&&!pick.disabled){
        const id=pick.dataset.personalPick,snapshot=personalStore.getSnapshot(),active=snapshot.selections.some(selection=>selection.selectionId===id);
        const result=active?personalStore.remove(id):personalStore.add(selectionRegistry.get(id));
        const notices={ADDED:"Selezione aggiunta.",REMOVED:"Selezione rimossa.",DUPLICATE:"Selezione già presente.",UNDER_NOT_PLAYABLE:"Gli Under sono esclusi dalle proposte giocabili dalla sesta giornata.",INDIVIDUAL_FOUL_NOT_PLAYABLE:"I falli individuali sono esclusi dalle proposte giocabili dalla sesta giornata.",CORNER_PERIOD_NOT_PLAYABLE:"I corner riferiti a singoli tempi sono esclusi dalle proposte giocabili dalla sesta giornata.",UNVERIFIED_IDENTITY:"Selezione non aggiunta: identificazione bookmaker non verificata.",CONTEXT_MISMATCH:"Selezione non aggiunta: giornata o competizione non coerente."};
        setPersonalNotice(notices[result.status]||"Operazione non disponibile.");
      }
    };
    personalDocumentClick=event=>{
      const pick=event.target.closest("[data-personal-pick]");
      if(pick)togglePersonalPick(pick);
      const addSlip=event.target.closest("[data-personal-add-slip]");
      if(addSlip&&!addSlip.disabled){
        const result=personalStore.addMany(slipRegistry.get(addSlip.dataset.personalAddSlip)||[]);
        setPersonalNotice(`${result.added} aggiunte${result.duplicates?` · ${result.duplicates} già presenti`:""}${result.rejected.length?` · ${result.rejected.length} non aggiunte`:""}.`);
      }
    };
    personalDocumentKeydown=event=>{const pick=event.target.closest('[data-selection-row][data-personal-pick]');if(pick&&(event.key==="Enter"||event.key===" ")){event.preventDefault();togglePersonalPick(pick)}};
    document.addEventListener("click",personalDocumentClick);
    document.addEventListener("keydown",personalDocumentKeydown);
    panel.addEventListener("keydown",event=>{
      if(event.key==="Escape"){event.preventDefault();close();return}
      if(event.key!=="Tab")return;
      const focusable=[...panel.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
      if(!focusable.length)return;
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
    personalUnsubscribe=personalStore.subscribe(renderPersonalBetslip);
    renderPersonalBetslip(personalStore.getSnapshot());
  }

  function initializePersonalBetslip(context){
    personalStore=personalStore||createPersonalBetslipStore();
    if(context){personalStore.setContext(context);personalStore.reconcile([...selectionRegistry.values()])}
    mountPersonalBetslip();
  }

  function archiveStats(data,matchById,resolve=leg=>settleLeg(leg,matchById.get(leg.matchId))){
    const archiveLegResults=data.slips.flatMap(slip=>slip.legs.map(leg=>({leg,settlement:resolve(leg)})));
    const archiveWins=archiveLegResults.filter(({settlement})=>settlement.status==="won").length;
    const archiveLosses=archiveLegResults.filter(({settlement})=>settlement.status==="lost").length;
    const archiveVoids=archiveLegResults.filter(({settlement})=>settlement.status==="void").length;
    const archiveStake=archiveWins+archiveLosses+archiveVoids;
    const archiveGrossReturn=archiveLegResults.reduce((total,{leg,settlement})=>settlement.status==="won"?total+Number(leg.odds):settlement.status==="void"?total+1:total,0);
    const archiveDecided=archiveWins+archiveLosses;
    const archiveSuccessPct=archiveDecided?archiveWins/archiveDecided*100:0;
    const archiveProfitPct=archiveStake?(archiveGrossReturn-archiveStake)/archiveStake*100:0;
    return {archiveWins,archiveVoids,archiveStake,archiveSuccessPct,archiveProfitPct};
  }

  const ordinalWord=number=>number===1?"prima":number===2?"seconda":number===3?"terza":number===4?"quarta":`${number}ª`;
  function archiveCard(data,number,matchById){
    const finished=data.slips.some(slip=>slip.legs.some(leg=>["won","lost"].includes(settleLeg(leg,matchById.get(leg.matchId)).status)));
    const stats=archiveStats(data,matchById);
    const detail=finished?`<span class="betting-archive-performance"><span><small>Successo</small><strong>${pct(stats.archiveSuccessPct)}%</strong></span><span><small>Guadagno</small><strong>${stats.archiveProfitPct>0?"+":""}${pct(stats.archiveProfitPct)}%</strong></span></span><span>${stats.archiveWins} esatte su ${stats.archiveStake}${stats.archiveVoids?` · ${stats.archiveVoids} annullate`:""}</span>`:`<span class="betting-archive-performance"><span><small>Proposte</small><strong>${data.slips.length}</strong></span><span><small>Selezioni</small><strong>${data.slips.reduce((sum,slip)=>sum+slip.legs.length,0)}</strong></span></span><span>Quote aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}</span>`;
    const colors={1:"#123e85",2:"#9b1c31",3:"#0f766e",4:"#7c3aed",5:"#b45309",6:"#0369a1"};
    return `<a class="betting-archive-card team-directory-card team-flip-card" href="schedina.html?giornata=${number}" aria-label="Apri le schedine della ${ordinalWord(number)} giornata" style="--team-primary:${colors[number]};--team-secondary:#06152b"><span class="team-flip-inner"><span class="team-flip-face team-flip-front betting-archive-card-front"><span class="betting-archive-number">${number}</span></span><span class="team-flip-face team-flip-back betting-archive-card-back"><strong>${number}ª giornata</strong><span>Serie A · 2026/27</span><span>${data.slips.length} schedine</span>${detail}<b>Apri la lista delle schedine</b></span></span></a>`;
  }

  function championsArchiveCard(data){
    const stats=archiveStats(data,null,leg=>leg.settlement||{status:"pending"});
    const pending=data.slips.flatMap(slip=>slip.legs).length-stats.archiveStake;
    const performance=stats.archiveStake?`<span class="betting-archive-performance"><span><small>Successo</small><strong>${pct(stats.archiveSuccessPct)}%</strong></span><span><small>Guadagno</small><strong>${stats.archiveProfitPct>0?"+":""}${pct(stats.archiveProfitPct)}%</strong></span></span><span>${stats.archiveWins} esatte su ${stats.archiveStake}${stats.archiveVoids?` · ${stats.archiveVoids} annullate`:""}${pending?` · ${pending} da verificare`:""}</span><span>Calcolo su singole giocate da 1 € definite</span>`:`<span>${data.summary.legs} selezioni · ${data.summary.distinctFixtures} partite</span>`;
    return `<a class="betting-archive-card betting-archive-card--champions team-directory-card team-flip-card" href="schedina.html?competizione=champions" aria-label="Apri la schedina Champions League" style="--team-primary:#0756c9;--team-secondary:#02183f"><span class="team-flip-inner"><span class="team-flip-face team-flip-front betting-archive-card-front betting-champions-front" style="background:radial-gradient(circle at 70% 18%,rgba(80,196,255,.5),transparent 42%),linear-gradient(145deg,#0966e8,#031b4b)!important;color:#fff"><span class="betting-archive-number">CL1</span><small>UEFA</small></span><span class="team-flip-face team-flip-back betting-archive-card-back"><strong>Champions League</strong><span>1ª giornata · 2026/27</span><span>${data.slips.length} schedine</span>${performance}<b>Apri le schedine Champions</b></span></span></a>`;
  }

  function championsSlipCard(slip){
    const cardHeuristic=slip.legs.some(leg=>leg.marketFamily==="Ammoniti"||leg.probabilitySemantics);
    const families=slip.marketFamilies.map(esc).join(" · ");
    const weak=slip.weakestLeg?`<p class="betting-weakest">Gamba più fragile: <strong>${esc(slip.weakestLeg.label)}</strong> · ${cardHeuristic?"EV euristico non validato":"EV"} ${slip.weakestLeg.expectedValuePct>0?"+":""}${pct(slip.weakestLeg.expectedValuePct)}%</p>`:"";
    return `<article class="betting-slip betting-slip--champions betting-slip--${esc(slip.id)}" data-quality="${esc(slip.qualityStatus)}"><header><div><p>${esc(slip.eyebrow)}</p><h2>${esc(slip.name)}</h2><small>${families}</small></div></header><div class="betting-slip-metrics"><div class="betting-slip-total"><span>Quota totale</span><strong>${odds(slip.combinedOdds)}</strong><small>${slip.legs.length} giocate · solo riferimento</small></div><div><span>${cardHeuristic?"Indice euristico non calibrato":"Probabilità"}</span><strong>${metric(slip.jointModelProbabilityPct,pct,"%")}</strong></div><div><span>${cardHeuristic?"Quota derivata euristica":"Quota equa"}</span><strong>${metric(slip.fairOdds,odds)}</strong></div><div><span>${cardHeuristic?"EV euristico non validato":"EV stimato"}</span><strong>${metric(slip.expectedValuePct,pct,"%")}</strong></div></div><p class="betting-coverage">Esito schedina: ${slip.settlement?.status==="lost"?"Persa":slip.settlement?.status==="won"?"Vinta":"Da verificare"}</p><ol>${slip.legs.map(leg=>`<li class="betting-leg--${esc(leg.settlement?.status||"pending")}" data-settlement="${esc(leg.settlement?.status||"pending")}"><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)} <small>· ${esc(leg.evidenceLabel)}</small></span><span class="betting-leg-result" title="${esc(leg.settlement?.reason||"")}">${esc(leg.settlement?.label||"Da verificare")}</span></div><b>${odds(leg.odds)}</b></li>`).join("")}</ol>${weak}</article>`;
  }

  function championsContent(data){
    return `<div class="betting-stage betting-champions-stage"><header class="betting-intro"><div><p class="eyebrow">Champions League · 1ª giornata</p><h3>${data.slips.length} schedine costruite dal modello</h3></div><p>Tiri, gol e assist, multigol, due poker ammoniti e tre schedine giornaliere. Quote e proiezioni originali archiviate.</p></header><p class="betting-coverage">${data.summary.legs} selezioni complessive su ${data.summary.distinctFixtures} gare. Quota minima per selezione: 1.10.</p><p class="betting-coverage">${data.settlementSummary?.won??0} vinte · ${data.settlementSummary?.lost??0} perse · ${data.settlementSummary?.pending??data.summary.legs} da verificare. ${esc(data.settlementNote||"")}</p><div class="betting-slip-grid">${data.slips.map(championsSlipCard).join("")}</div><footer class="betting-method"><strong>Criterio Champions</strong><p>${esc(data.selectionRule)}</p><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. Gioca responsabilmente.</p></footer></div>`;
  }

  async function render(){
    selectionRegistry.clear();slipRegistry.clear();currentContext=null;personalNotice="";
    recordedOutcomes=(await load("card-settlement-records.json")).records;
    const [champions,md1,md2,md3,md4,md5,md6,matches,predictionData,teams]=await Promise.all([load("schedina-champions-md01.json"),load("schedina.json"),load("schedina-md02.json"),load("schedina-md03.json"),load("schedina-md04.json"),load("schedina-md05.json"),load("schedina-md06.json"),load("matches.json"),load("predictions.json"),load("teams.json")]);
    const rounds={1:md1,2:md2,3:md3,4:md4,5:md5,6:md6};
    const matchById=new Map((Array.isArray(matches)?matches:matches.matches||[]).map(match=>[match.id,match]));
    const teamById=new Map((Array.isArray(teams)?teams:teams.teams||[]).map(team=>[team.id,team]));
    const matchday=new URLSearchParams(location.search).get("giornata");
    const competition=new URLSearchParams(location.search).get("competizione");
    if(competition==="champions"){
      document.querySelector("#app").innerHTML=hero("UEFA Champions League · 2026/27","Schedine Champions","Archivio del primo turno: giocate originali ed esiti verificabili delle gare dell’8–10 settembre.")+`<nav class="betting-round-back" aria-label="Navigazione archivio schedine"><a href="schedina.html">← Tutte le schedine</a></nav><section class="betting-round-page betting-round-page--champions"><header class="betting-round-heading"><p class="eyebrow">Champions League · 2026/27</p><h2>1ª giornata</h2></header>${championsContent(champions)}</section>`;
      return;
    }
    if(rounds[matchday]){
      const number=Number(matchday),data=rounds[number];
      const ordinal=`${number}ª`;
      if(number>=6)currentContext={competition:"serie-a",season:"2026-27",matchday:number,label:`Serie A · ${ordinal} giornata`};
      const description=number>=6?"Quote, probabilità, quota equa ed EV delle selezioni.":`Tutte le schedine della ${ordinalWord(number)} giornata, con quote, probabilità, quota equa ed EV consultabili.`;
      const myCombo=number===5?myComboRoundContent(predictionData.predictions||[],matchById,teamById,number):"";
      if(number>=6){
        const matchdayContent=matchdayWorkspaceContent(data,predictionData.predictions||[],matchById,teamById,number);
        document.querySelector("#app").innerHTML=hero(`Serie A · ${ordinal} giornata`,"Schedine",description)+`<nav class="betting-round-back" aria-label="Navigazione archivio schedine"><a href="schedina.html">← Tutte le giornate</a></nav><section class="betting-round-page betting-round-page--workspace" aria-labelledby="betting-round-${String(number).padStart(2,"0")}-title"><header class="betting-round-heading"><p class="eyebrow">Serie A · 2026/27</p><h2 id="betting-round-${String(number).padStart(2,"0")}-title">${ordinal} giornata</h2></header><div class="betting-workspace"><div class="betting-workspace-content">${matchdayContent}</div><aside class="betting-personal-column" data-personal-host aria-label="Costruttore della schedina personale"></aside></div></section>`;
      }else{
        document.querySelector("#app").innerHTML=hero(`Archivio · ${ordinal} giornata`,"Schedine",description)+`<nav class="betting-round-back" aria-label="Navigazione archivio schedine"><a href="schedina.html">← Tutte le giornate</a></nav><section class="betting-round-page" aria-labelledby="betting-round-${String(number).padStart(2,"0")}-title"><header class="betting-round-heading"><p class="eyebrow">Serie A · 2026/27</p><h2 id="betting-round-${String(number).padStart(2,"0")}-title">${ordinal} giornata</h2></header>${myCombo}${archiveRoundContent(data,matchById,{showLegend:number===1})}</section>`;
      }
      if(currentContext)initializePersonalBetslip(currentContext);
      if(number===5)bindMyComboInteractions(number);
      if(number>=6)bindMatchdayInteractions(number);
      return;
    }
    document.querySelector("#app").innerHTML=hero("Archivio · Stagione 2026/27","Schedina","Le schedine e le MyCombo sono raccolte separatamente giornata per giornata.")+`<section class="betting-archive" aria-labelledby="betting-archive-title"><header class="betting-archive-intro"><div><p class="eyebrow">Archivio schedine</p><h2 id="betting-archive-title">Competizioni e giornate</h2></div><p>La prima card blu raccoglie la Champions; seguono le giornate di Serie A.</p></header><div class="betting-archive-list team-directory-grid team-flip-grid">${championsArchiveCard(champions)}${archiveCard(md1,1,matchById)}${archiveCard(md2,2,matchById)}${archiveCard(md3,3,matchById)}${archiveCard(md4,4,matchById)}${archiveCard(md5,5,matchById)}${archiveCard(md6,6,matchById)}</div></section>`;
  }
  return {render};
}
