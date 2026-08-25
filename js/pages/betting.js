const release=new URL(import.meta.url).searchParams.get("v")||"development";
const {settleLeg}=await import(`./betting-settlement.mjs?v=${encodeURIComponent(release)}`);

export function createPage(deps){
  const {esc,dateOnly,hero,load}=deps;
  const pct=value=>Number(value).toLocaleString("it-IT",Number(value)>0&&Number(value)<.01?{minimumFractionDigits:4,maximumFractionDigits:6}:{minimumFractionDigits:2,maximumFractionDigits:2});
  const odds=value=>Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const metric=(value,formatter,suffix="")=>Number.isFinite(value)?`${formatter(value)}${suffix}`:"N/D";

  function slipCard(slip,matchById){
    const legs=slip.legs.map((leg,index)=>{
      const settlement=settleLeg(leg,matchById.get(leg.matchId));
      const settled=settlement.status==="won"||settlement.status==="lost";
      const badge=settled?`<span class="betting-leg-result" aria-label="Esito ${esc(settlement.label.toLowerCase())}"><span aria-hidden="true">${settlement.status==="won"?"✓":"×"}</span> ${esc(settlement.label)}</span>`:"";
      return `<li${settled?` class="betting-leg--${settlement.status}" data-settlement="${settlement.status}"`:""}><span class="betting-leg-number">${String(index+1).padStart(2,"0")}</span><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)} <small>· ${esc(leg.evidenceLabel)}</small></span>${badge}</div><b>${odds(leg.odds)}</b></li>`;
    }).join("");
    const families=slip.marketFamilies.map(esc).join(" · ");
    const weak=slip.weakestLeg?`<p class="betting-weakest">Gamba più fragile: <strong>${esc(slip.weakestLeg.label)}</strong> · EV ${slip.weakestLeg.expectedValuePct>0?"+":""}${pct(slip.weakestLeg.expectedValuePct)}%${slip.filterNote?`<small>${esc(slip.filterNote)}</small>`:""}</p>`:"";
    return `<article class="betting-slip betting-slip--${esc(slip.id)}" data-quality="${esc(slip.qualityStatus)}"><header><div><p>${esc(slip.eyebrow)}</p><h2>${esc(slip.name)}</h2><small>${families}</small></div><span class="betting-quality">${esc(slip.qualityLabel)}</span></header><div class="betting-slip-metrics"><div class="betting-slip-total"><span>Quota totale</span><strong>${odds(slip.combinedOdds)}</strong><small>${slip.legs.length} giocate</small></div><div><span>Probabilità</span><strong>${metric(slip.jointModelProbabilityPct,pct,"%")}</strong></div><div><span>Quota equa</span><strong>${metric(slip.fairOdds,odds)}</strong></div><div><span>EV stimato</span><strong>${metric(slip.expectedValuePct,pct,"%")}</strong></div></div><ol>${legs}</ol>${weak}</article>`;
  }

  function roundContent(data,matchById,{showLegend=false}={}){
    const qualified=data.slips.filter(slip=>slip.qualityStatus==="qualificata"),others=data.slips.filter(slip=>slip.qualityStatus!=="qualificata");
    const selected=qualified.length?`<div class="betting-slip-grid betting-slip-grid-qualified">${qualified.map(slip=>slipCard(slip,matchById)).join("")}</div>`:`<div class="betting-nd-compact"><strong>Nessuna schedina qualificata</strong><span>Il controllo prudenziale non forza proposte: restano disponibili le letture editoriali e di laboratorio.</span></div>`;
    const legend=showLegend?`<div class="betting-result-legend" aria-label="Legenda esiti"><span class="betting-result-legend--won"><b aria-hidden="true">✓</b> Esatto</span><span class="betting-result-legend--lost"><b aria-hidden="true">×</b> Sbagliato</span><small>Le selezioni non ancora concluse o non liquidabili dai dati ufficiali restano neutre.</small></div>`:"";
    const coverage=data.coverage?`<p class="betting-coverage"><strong>${data.coverage.qualifiedProfiles} proposte qualificate</strong> su ${data.coverage.profilesEvaluated} profili valutati · ${data.coverage.unavailableProfiles} profili N/D.</p>`:"";
    return `<div class="betting-stage"><header class="betting-intro"><div><p class="eyebrow">Controllo prudenziale</p><h3>Selezionate dal modello</h3></div><p>${esc(data.selectionRule||"Entrano qui soltanto schedine con EV non negativo e nessuna gamba sotto −10% di EV individuale.")}</p></header>${coverage}${legend}${selected}${others.length?`<header class="betting-section-heading"><div><p class="eyebrow">Letture editoriali e laboratorio</p><h3>Scenari non qualificati</h3></div><p>Restano visibili per confronto, con rischio ed EV dichiarati.</p></header><div class="betting-slip-grid">${others.map(slip=>slipCard(slip,matchById)).join("")}</div>`:""}<footer class="betting-method"><strong>Come leggere i numeri</strong><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. <a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">Fonte quote</a>. Gioca responsabilmente: pagina editoriale, nessun esito è certo.</p></footer></div>`;
  }

  function archiveStats(data,matchById){
    const archiveLegResults=data.slips.flatMap(slip=>slip.legs.map(leg=>({leg,settlement:settleLeg(leg,matchById.get(leg.matchId))})));
    const archiveWins=archiveLegResults.filter(({settlement})=>settlement.status==="won").length;
    const archiveStake=archiveLegResults.length;
    const archiveGrossReturn=archiveLegResults.reduce((total,{leg,settlement})=>settlement.status==="won"?total+Number(leg.odds):total,0);
    const archiveSuccessPct=archiveStake?archiveWins/archiveStake*100:0;
    const archiveProfitPct=archiveStake?(archiveGrossReturn-archiveStake)/archiveStake*100:0;
    return {archiveWins,archiveStake,archiveSuccessPct,archiveProfitPct};
  }

  function archiveCard(data,number,matchById){
    const finished=data.slips.some(slip=>slip.legs.some(leg=>["won","lost"].includes(settleLeg(leg,matchById.get(leg.matchId)).status)));
    const stats=archiveStats(data,matchById);
    const detail=finished?`<span class="betting-archive-performance"><span><small>Successo</small><strong>${pct(stats.archiveSuccessPct)}%</strong></span><span><small>Guadagno</small><strong>${stats.archiveProfitPct>0?"+":""}${pct(stats.archiveProfitPct)}%</strong></span></span><span>${stats.archiveWins} giocate esatte su ${stats.archiveStake}</span>`:`<span class="betting-archive-performance"><span><small>Qualificate</small><strong>${data.slips.length}</strong></span><span><small>N/D</small><strong>${data.coverage?.unavailableProfiles??0}</strong></span></span><span>Quote aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}</span>`;
    return `<a class="betting-archive-card team-directory-card team-flip-card" href="schedina.html?giornata=${number}" aria-label="Apri le schedine della ${number===1?"prima":"seconda"} giornata" style="--team-primary:${number===1?"#123e85":"#9b1c31"};--team-secondary:#06152b"><span class="team-flip-inner"><span class="team-flip-face team-flip-front betting-archive-card-front"><span class="betting-archive-number">${number}</span></span><span class="team-flip-face team-flip-back betting-archive-card-back"><strong>${number}ª giornata</strong><span>Serie A · 2026/27</span><span>${data.slips.length} ${number===1?"schedine":"MyCombo"}</span>${detail}<b>Apri la lista delle schedine</b></span></span></a>`;
  }

  async function render(){
    const [md1,md2,matches]=await Promise.all([load("schedina.json"),load("schedina-md02.json"),load("matches.json")]);
    const matchById=new Map((Array.isArray(matches)?matches:matches.matches||[]).map(match=>[match.id,match]));
    const matchday=new URLSearchParams(location.search).get("giornata");
    if(matchday==="1"||matchday==="2"){
      const number=Number(matchday),data=number===1?md1:md2;
      const ordinal=number===1?"1ª":"2ª";
      const description=number===1?"Tutte le schedine della prima giornata, con quote, valutazioni ed esiti consultabili.":"Le MyCombo qualificate della seconda giornata, senza forzare il numero di gambe o la quota obiettivo.";
      document.querySelector("#app").innerHTML=hero(`Archivio · ${ordinal} giornata`,"Schedine",description)+`<nav class="betting-round-back" aria-label="Navigazione archivio schedine"><a href="schedina.html">← Tutte le giornate</a></nav><section class="betting-round-page" aria-labelledby="betting-round-${String(number).padStart(2,"0")}-title"><header class="betting-round-heading"><p class="eyebrow">Serie A · 2026/27</p><h2 id="betting-round-${String(number).padStart(2,"0")}-title">${ordinal} giornata</h2></header>${roundContent(data,matchById,{showLegend:number===1})}</section>`;
      return;
    }
    document.querySelector("#app").innerHTML=hero("Archivio · Stagione 2026/27","Schedina","Le schedine restano raccolte giornata per giornata, con quote, valutazioni ed esiti sempre consultabili.")+`<section class="betting-archive" aria-labelledby="betting-archive-title"><header class="betting-archive-intro"><div><p class="eyebrow">Archivio schedine</p><h2 id="betting-archive-title">Giornate</h2></div><p>Seleziona una giornata per consultare tutte le schedine archiviate.</p></header><div class="betting-archive-list team-directory-grid team-flip-grid">${archiveCard(md1,1,matchById)}${archiveCard(md2,2,matchById)}</div></section>`;
  }
  return {render};
}
