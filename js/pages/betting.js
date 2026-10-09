const release=new URL(import.meta.url).searchParams.get("v")||"development";
const {settleLeg:settleStrictLeg,settleArchivedLeg}=await import(`./betting-settlement.mjs?v=${encodeURIComponent(release)}`);
const {createPersonalBetslipStore,personalBetslipSummary}=await import(`./personal-betslip-store.mjs?v=${encodeURIComponent(release)}`);

export function createPage(deps){
  const {esc,dateOnly,hero,load}=deps;
  let recordedOutcomes=[];
  const settleLeg=(leg,match)=>settleArchivedLeg(leg,match,recordedOutcomes);
  const pct=value=>Number(value).toLocaleString("it-IT",Number(value)>0&&Number(value)<.01?{minimumFractionDigits:4,maximumFractionDigits:6}:{minimumFractionDigits:2,maximumFractionDigits:2});
  const odds=value=>Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const metric=(value,formatter,suffix="")=>Number.isFinite(value)?`${formatter(value)}${suffix}`:"N/D";
  let personalStore=null,currentContext=null,personalNotice="",personalUnsubscribe=null,personalDocumentClick=null;
  const selectionRegistry=new Map(),slipRegistry=new Map();

  function registerSelection(leg,{fixture=leg.fixture,sourceSection="modello"}={}){
    const contract=leg?.betSelection;
    if(!currentContext||!leg?.selectionId||contract?.selectionId!==leg.selectionId||contract?.identity?.status!=="VERIFIED_PROVIDER_IDS")return null;
    const selection={selectionId:leg.selectionId,context:{...currentContext},fixture:fixture||contract.identity.matchId,label:leg.label||contract.market?.selection||"Selezione",market:leg.market||contract.market?.name||"Mercato",sourceSection,betSelection:contract};
    selectionRegistry.set(selection.selectionId,selection);
    return selection;
  }

  const personalPickButton=(selection,finished=false)=>selection?`<button type="button" class="betting-personal-pick" data-personal-pick="${esc(selection.selectionId)}" aria-pressed="false"${finished?" disabled":""}><span aria-hidden="true">＋</span><span>${finished?"Archiviata":"Aggiungi"}</span></button>`:"";

  function slipCard(slip,matchById){
    if(slip.qualityStatus==="nd"&&!slip.legs.length)return `<article class="betting-nd-compact"><strong>${esc(slip.name)} · N/D</strong><span>${esc(slip.filterNote||"Dati insufficienti per una proposta prudenziale.")}</span></article>`;
    const selectable=[];
    const legs=slip.legs.map((leg,index)=>{
      const settlement=settleLeg(leg,matchById.get(leg.matchId));
      const settled=["won","lost","void"].includes(settlement.status);
      const symbol=settlement.status==="won"?"✓":settlement.status==="lost"?"×":"—";
      const badge=settled?`<span class="betting-leg-result" aria-label="Esito ${esc(settlement.label.toLowerCase())}"><span aria-hidden="true">${symbol}</span> ${esc(settlement.label)}${settlement.reviewRequired?" · archiviato, target da verificare":""}</span>`:"";
      const selection=registerSelection(leg,{sourceSection:"schedina-modello"});
      if(selection&&!settled)selectable.push(selection);
      return `<li${settled?` class="betting-leg--${settlement.status}" data-settlement="${settlement.status}"`:""}><span class="betting-leg-number">${String(index+1).padStart(2,"0")}</span><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)} <small>· ${esc(leg.evidenceLabel)}</small></span>${badge}</div><b>${odds(leg.odds)}</b>${personalPickButton(selection,settled)}</li>`;
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

  function roundContent(data,matchById,{showLegend=false}={}){
    const qualified=data.slips.filter(slip=>slip.qualityStatus==="qualificata"),others=data.slips.filter(slip=>slip.qualityStatus!=="qualificata");
    const selected=qualified.length?`<div class="betting-slip-grid betting-slip-grid-qualified">${qualified.map(slip=>slipCard(slip,matchById)).join("")}</div>`:`<div class="betting-nd-compact"><strong>Nessuna schedina qualificata</strong><span>Il controllo prudenziale non forza proposte: restano disponibili le letture editoriali e di laboratorio.</span></div>`;
    const legend=showLegend?`<div class="betting-result-legend" aria-label="Legenda esiti"><span class="betting-result-legend--won"><b aria-hidden="true">✓</b> Esatto</span><span class="betting-result-legend--lost"><b aria-hidden="true">×</b> Sbagliato</span><span class="betting-result-legend--void"><b aria-hidden="true">—</b> Annullata</span><small>Se il calciatore non entra, la quota è annullata e la puntata viene restituita.</small></div>`:"";
    const coverage=data.coverage?`<p class="betting-coverage"><strong>${data.coverage.qualifiedProfiles} proposte qualificate</strong> su ${data.coverage.profilesEvaluated} profili valutati · ${data.coverage.unavailableProfiles} profili N/D.</p>`:"";
    return `<div class="betting-stage"><header class="betting-intro"><div><p class="eyebrow">Controllo prudenziale</p><h3>Selezionate dal modello</h3></div><p>${esc(data.selectionRule||"Entrano qui soltanto schedine con EV non negativo e nessuna gamba sotto −10% di EV individuale.")}</p></header>${coverage}${legend}${selected}${others.length?`<header class="betting-section-heading"><div><p class="eyebrow">Letture editoriali e laboratorio</p><h3>Scenari non qualificati</h3></div><p>Restano visibili per confronto, con rischio ed EV dichiarati.</p></header><div class="betting-slip-grid">${others.map(slip=>slipCard(slip,matchById)).join("")}</div>`:""}<footer class="betting-method"><strong>Come leggere i numeri</strong><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. <a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">Fonte quote</a>. Gioca responsabilmente: pagina editoriale, nessun esito è certo.</p></footer></div>`;
  }

  function myComboRoundContent(predictions,matchById,teamById,matchday){
    const code=String(matchday).padStart(2,"0");
    const entries=predictions.filter(prediction=>prediction.matchId.endsWith(`-md-${code}`)).map(prediction=>({prediction,combo:prediction.combinations?.find(item=>item.tier==="Safe"),match:matchById.get(prediction.matchId)})).filter(item=>item.match&&item.combo?.legs?.length);
    const cards=entries.map(({combo,match})=>{
      const home=teamById.get(match.homeTeam)?.name||match.homeTeam,away=teamById.get(match.awayTeam)?.name||match.awayTeam,finished=match.status==="finished";
      const results=combo.legs.map(leg=>settleLeg({...leg,fixture:`${home} - ${away}`},match)),won=results.filter(result=>result.status==="won").length,decided=results.filter(result=>["won","lost","void"].includes(result.status)).length,pending=results.length-decided;
      const metrics=finished?`<div class="betting-slip-total"><span>Esiti presi</span><strong>${won}</strong><small>${decided} esiti verificati</small></div><div><span>Da verificare</span><strong>${pending}/${results.length}</strong></div>`:`<div class="betting-slip-total"><span>Nella schedina</span><strong data-mycombo-active>0</strong><small>stato condiviso</small></div><div><span>Disponibili</span><strong>${combo.legs.length}</strong></div>`;
      const legs=combo.legs.map((leg,index)=>{const result=results[index],settled=finished&&["won","lost","void"].includes(result.status),status=finished?(settled?result.status:"unavailable"):"pending",badge=finished?`<span class="betting-leg-result">${esc(settled?result.label:"Da verificare")}</span>`:"",selection=registerSelection(leg,{fixture:`${home} - ${away}`,sourceSection:"mycombo-partita"});return `<li${finished?` class="betting-leg--${status}" data-settlement="${status}"`:""}><button type="button" class="betting-mycombo-pick" data-mycombo-pick${selection?` data-personal-pick="${esc(selection.selectionId)}"`:""} aria-pressed="false"${finished||!selection?" disabled":""}><span class="betting-leg-number">${String(index+1).padStart(2,"0")}</span><span class="betting-mycombo-pick-copy"><strong>${esc(leg.market)}</strong><span>${esc(leg.label)}</span>${badge}</span><b>${odds(leg.odds)}</b></button></li>`}).join("");
      return `<article class="betting-slip betting-mycombo-card" data-match-id="${esc(match.id)}"${finished?' data-finished="true"':""}><header><div><p>MyCombo · ${finished?"risultati":`scegli tra ${combo.legs.length} esiti`}</p><h2>${esc(home)} - ${esc(away)}</h2><small>${finished?`Finale ${match.score.home}-${match.score.away} · verde = esito preso`:"Aggiungi o rimuovi ogni esito dalla schedina personale condivisa"}</small></div></header><div class="betting-slip-metrics">${metrics}<div><span>Rischio</span><strong>${esc(combo.risk||combo.tier)}</strong></div></div><ol class="betting-mycombo-options">${legs}</ol><p class="betting-weakest">${finished?"Esiti verificati sul referto finale; i mercati non coperti dai dati disponibili restano da verificare.":"L’assenza di conflitti non dimostra che il bookmaker consenta la multipla: la combinabilità resta da verificare."}</p></article>`;
    }).join("");
    const title=matchday===5?"MyCombo · 10 esiti per gara":"MyCombo · candidati per gara";
    const copy=matchday===5?"Ogni proposta contiene esattamente 10 esiti. Per le gare concluse gli esiti verificabili sono aggiornati sul referto: quelli presi sono evidenziati in verde, mentre i dati non coperti restano da verificare.":"Il numero di esiti dipende dalla qualità disponibile: nessun mercato viene aggiunto per raggiungere artificialmente quota dieci. La MyCombo resta un costruttore di scenari, non una multipla consigliata.";
    return `<section class="betting-mycombo-round" aria-labelledby="betting-mycombo-md${code}-title"><header class="betting-section-heading"><div><p class="eyebrow">Una per ogni partita</p><h3 id="betting-mycombo-md${code}-title">${title}</h3></div><p>${copy}</p></header><div class="betting-slip-grid">${cards}</div></section>`;
  }

  function bindMyComboInteractions(){updatePersonalSelectionControls(personalStore?.getSnapshot())}

  const personalContextLabel=context=>context?.label||`${context?.competition||"Competizione"} · ${context?.season||"stagione N/D"} · giornata ${context?.matchday??"N/D"}`;

  function updatePersonalSelectionControls(snapshot){
    const selected=new Set((snapshot?.selections||[]).map(selection=>selection.selectionId));
    document.querySelectorAll("[data-personal-pick]").forEach(button=>{
      const active=selected.has(button.dataset.personalPick);
      button.setAttribute("aria-pressed",String(active));
      button.classList.toggle("is-selected",active);
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
    return `<div class="personal-betslip-root" data-personal-root><button type="button" class="personal-betslip-trigger" data-personal-open aria-controls="personal-betslip-panel" aria-expanded="false"><span>Schedina personale</span><b data-personal-count>0</b></button><aside id="personal-betslip-panel" class="personal-betslip-panel" role="dialog" aria-modal="false" aria-labelledby="personal-betslip-title" hidden><header><div><p class="eyebrow">Costruttore condiviso</p><h2 id="personal-betslip-title" tabindex="-1">Schedina personale</h2></div><button type="button" class="personal-betslip-close" data-personal-close aria-label="Chiudi la schedina personale">×</button></header><p class="personal-betslip-context" data-personal-context></p><p class="personal-betslip-notice" data-personal-notice aria-live="polite"></p><div class="personal-betslip-content" data-personal-content></div><footer><button type="button" class="personal-betslip-copy" data-personal-copy>Copia riepilogo</button><button type="button" class="personal-betslip-clear" data-personal-clear>Svuota</button></footer></aside></div>`;
  }

  function issueLabel(issue){
    const labels={EXACT_DUPLICATE:"Duplicato",LOGICAL_OVERLAP:"Sovrapposizione",MARKET_CONTRADICTION:"Contraddizione",BOOKMAKER_COMBINABILITY_UNKNOWN:"Combinabilità non verificata",MISSING_VERIFIED_QUOTE:"Quota non verificata",AVAILABILITY_NOT_CONFIRMED:"Disponibilità non confermata",MODEL_BOOKMAKER_INCOMPATIBLE:"Mercato incompatibile",MISSING_FROM_CURRENT_DATA:"Non più nei dati correnti"};
    return labels[issue.type]||"Verifica richiesta";
  }

  function renderPersonalBetslip(snapshot){
    const root=document.querySelector("[data-personal-root]");
    if(!root)return;
    const context=root.querySelector("[data-personal-context]");
    const content=root.querySelector("[data-personal-content]");
    const notice=root.querySelector("[data-personal-notice]");
    const selections=snapshot?.selections||[],assessment=snapshot?.assessment||{issues:[],usableCombinedOdds:null};
    context.textContent=snapshot?.context?personalContextLabel(snapshot.context):"Apri una giornata per iniziare o riprendere la schedina.";
    notice.textContent=personalNotice||snapshot?.storageError||"";
    const rows=selections.map(selection=>{
      const quote=selection.betSelection?.quote||{};
      const quoteText=quote.decimal!==null&&quote.decimal!==""&&Number.isFinite(Number(quote.decimal))?odds(quote.decimal):"N/D";
      const flags=[];
      if(selection.quoteChanged)flags.push(`Quota aggiornata${selection.previousQuote?` da ${odds(selection.previousQuote)}`:""}`);
      if(selection.dataStatus==="MISSING_FROM_CURRENT_DATA")flags.push("Non presente nei dati correnti: selezione conservata");
      const related=assessment.issues.filter(issue=>issue.selectionIds?.includes(selection.selectionId)&&issue.type!=="BOOKMAKER_COMBINABILITY_UNKNOWN");
      return `<li class="personal-betslip-item"><div><small>${esc(selection.fixture||"Partita N/D")}</small><strong>${esc(selection.label||"Selezione N/D")}</strong><span>${esc(selection.market||selection.betSelection?.market?.name||"Mercato N/D")} · quota ${quoteText}</span><span>Snapshot ${esc(quote.verifiedAt||"N/D")}</span>${flags.map(flag=>`<em>${esc(flag)}</em>`).join("")}${related.map(issue=>`<em>${esc(issueLabel(issue))}</em>`).join("")}</div><button type="button" data-personal-remove="${esc(selection.selectionId)}" aria-label="Rimuovi ${esc(selection.label||"selezione")}">Rimuovi</button></li>`;
    }).join("");
    const warnings=assessment.issues.length?`<section class="personal-betslip-warnings" aria-labelledby="personal-betslip-warnings-title"><h3 id="personal-betslip-warnings-title">Avvisi di compatibilità</h3><ul>${assessment.issues.map(issue=>`<li><strong>${esc(issueLabel(issue))}</strong><span>${esc(issue.message)}</span></li>`).join("")}</ul></section>`:"";
    const total=assessment.usableCombinedOdds==null?`<div class="personal-betslip-total is-unavailable"><span>Quota totale</span><strong>Non disponibile come giocabile</strong><small>Serve conferma su quote, compatibilità e combinabilità bookmaker.</small></div>`:`<div class="personal-betslip-total"><span>Quota combinata verificata</span><strong>${odds(assessment.usableCombinedOdds)}</strong><small>Calcolata sulle ultime quote verificate disponibili.</small></div>`;
    content.innerHTML=selections.length?`<ol class="personal-betslip-list">${rows}</ol>${warnings}${total}<p class="personal-betslip-method">Il costruttore non calcola probabilità congiunte né EV.</p>`:`<div class="personal-betslip-empty"><strong>Nessuna selezione</strong><span>Usa “Aggiungi” nelle schedine del modello o scegli gli esiti MyCombo della giornata.</span></div>`;
    root.querySelector("[data-personal-copy]").disabled=!selections.length;
    root.querySelector("[data-personal-clear]").disabled=!selections.length;
    updatePersonalSelectionControls(snapshot);
  }

  function mountPersonalBetslip(){
    personalUnsubscribe?.();
    if(personalDocumentClick)document.removeEventListener("click",personalDocumentClick);
    document.querySelector("[data-personal-root]")?.remove();
    document.body.insertAdjacentHTML("beforeend",personalBetslipMarkup());
    const root=document.querySelector("[data-personal-root]"),panel=root.querySelector(".personal-betslip-panel"),trigger=root.querySelector("[data-personal-open]");
    let previousFocus=null;
    const open=()=>{previousFocus=document.activeElement;panel.hidden=false;requestAnimationFrame(()=>panel.dataset.open="true");trigger.setAttribute("aria-expanded","true");panel.querySelector("[data-personal-close]").focus()};
    const close=()=>{delete panel.dataset.open;trigger.setAttribute("aria-expanded","false");setTimeout(()=>{if(!panel.dataset.open)panel.hidden=true},180);(previousFocus?.isConnected?previousFocus:trigger).focus()};
    root.addEventListener("click",async event=>{
      const openButton=event.target.closest("[data-personal-open]"),closeButton=event.target.closest("[data-personal-close]"),removeButton=event.target.closest("[data-personal-remove]"),copyButton=event.target.closest("[data-personal-copy]"),clearButton=event.target.closest("[data-personal-clear]");
      if(openButton){open();return}if(closeButton){close();return}
      if(removeButton){personalStore.remove(removeButton.dataset.personalRemove);personalNotice="Selezione rimossa.";renderPersonalBetslip(personalStore.getSnapshot());return}
      if(clearButton&&window.confirm("Vuoi svuotare la schedina personale di questa giornata?")){const result=personalStore.clear();personalNotice=`Schedina svuotata: ${result.removed||0} selezioni rimosse.`;renderPersonalBetslip(personalStore.getSnapshot());return}
      if(copyButton){
        const text=personalBetslipSummary(personalStore.getSnapshot());
        try{await navigator.clipboard.writeText(text);personalNotice="Riepilogo copiato."}catch(_error){const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();document.execCommand("copy");area.remove();personalNotice="Riepilogo copiato."}
        renderPersonalBetslip(personalStore.getSnapshot());
      }
    });
    personalDocumentClick=event=>{
      const pick=event.target.closest("[data-personal-pick]");
      if(pick&&!pick.disabled){
        const id=pick.dataset.personalPick,snapshot=personalStore.getSnapshot(),active=snapshot.selections.some(selection=>selection.selectionId===id);
        const result=active?personalStore.remove(id):personalStore.add(selectionRegistry.get(id));
        const notices={ADDED:"Selezione aggiunta.",REMOVED:"Selezione rimossa.",DUPLICATE:"Selezione già presente.",UNDER_NOT_PLAYABLE:"Gli Under sono esclusi dalle proposte giocabili dalla sesta giornata.",UNVERIFIED_IDENTITY:"Selezione non aggiunta: identificazione bookmaker non verificata.",CONTEXT_MISMATCH:"Selezione non aggiunta: giornata o competizione non coerente."};
        personalNotice=notices[result.status]||"Operazione non disponibile.";renderPersonalBetslip(personalStore.getSnapshot());
      }
      const addSlip=event.target.closest("[data-personal-add-slip]");
      if(addSlip&&!addSlip.disabled){
        const result=personalStore.addMany(slipRegistry.get(addSlip.dataset.personalAddSlip)||[]);
        personalNotice=`${result.added} aggiunte${result.duplicates?` · ${result.duplicates} già presenti`:""}${result.rejected.length?` · ${result.rejected.length} non aggiunte`:""}.`;
        renderPersonalBetslip(personalStore.getSnapshot());
      }
    };
    document.addEventListener("click",personalDocumentClick);
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
    return `<article class="betting-slip betting-slip--champions betting-slip--${esc(slip.id)}" data-quality="${esc(slip.qualityStatus)}"><header><div><p>${esc(slip.eyebrow)}</p><h2>${esc(slip.name)}</h2><small>${families}</small></div></header><div class="betting-slip-metrics"><div class="betting-slip-total"><span>Quota totale</span><strong>${odds(slip.combinedOdds)}</strong><small>${slip.legs.length} giocate · solo riferimento</small></div><div><span>${cardHeuristic?"Indice euristico non calibrato":"Probabilità"}</span><strong>${metric(slip.jointModelProbabilityPct,pct,"%")}</strong></div><div><span>${cardHeuristic?"Quota derivata euristica":"Quota equa"}</span><strong>${metric(slip.fairOdds,odds)}</strong></div><div><span>${cardHeuristic?"EV euristico non validato":"EV stimato"}</span><strong>${metric(slip.expectedValuePct,pct,"%")}</strong></div></div><p class="betting-coverage">Esito schedina: ${slip.settlement?.status==="lost"?"Persa":slip.settlement?.status==="won"?"Vinta":"Da verificare"}</p><ol>${slip.legs.map((leg,index)=>`<li class="betting-leg--${esc(leg.settlement?.status||"pending")}" data-settlement="${esc(leg.settlement?.status||"pending")}"><span class="betting-leg-number">${String(index+1).padStart(2,"0")}</span><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)} <small>· ${esc(leg.evidenceLabel)}</small></span><span class="betting-leg-result" title="${esc(leg.settlement?.reason||"")}">${esc(leg.settlement?.label||"Da verificare")}</span></div><b>${odds(leg.odds)}</b></li>`).join("")}</ol>${weak}</article>`;
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
      const description=`Tutte le schedine della ${ordinalWord(number)} giornata, con quote, probabilità, quota equa ed EV consultabili.`;
      const myCombo=[5,6].includes(number)?myComboRoundContent(predictionData.predictions||[],matchById,teamById,number):"";
      document.querySelector("#app").innerHTML=hero(`Archivio · ${ordinal} giornata`,"Schedine",description)+`<nav class="betting-round-back" aria-label="Navigazione archivio schedine"><a href="schedina.html">← Tutte le giornate</a></nav><section class="betting-round-page" aria-labelledby="betting-round-${String(number).padStart(2,"0")}-title"><header class="betting-round-heading"><p class="eyebrow">Serie A · 2026/27</p><h2 id="betting-round-${String(number).padStart(2,"0")}-title">${ordinal} giornata</h2></header>${myCombo}${roundContent(data,matchById,{showLegend:number===1})}</section>`;
      if(currentContext)initializePersonalBetslip(currentContext);
      if([5,6].includes(number))bindMyComboInteractions();
      return;
    }
    document.querySelector("#app").innerHTML=hero("Archivio · Stagione 2026/27","Schedina","Le schedine e le MyCombo sono raccolte separatamente giornata per giornata.")+`<section class="betting-archive" aria-labelledby="betting-archive-title"><header class="betting-archive-intro"><div><p class="eyebrow">Archivio schedine</p><h2 id="betting-archive-title">Competizioni e giornate</h2></div><p>La prima card blu raccoglie la Champions; seguono le giornate di Serie A.</p></header><div class="betting-archive-list team-directory-grid team-flip-grid">${championsArchiveCard(champions)}${archiveCard(md1,1,matchById)}${archiveCard(md2,2,matchById)}${archiveCard(md3,3,matchById)}${archiveCard(md4,4,matchById)}${archiveCard(md5,5,matchById)}${archiveCard(md6,6,matchById)}</div></section>`;
  }
  return {render};
}
