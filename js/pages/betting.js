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
    const families=slip.marketFamilies.map(family=>`<span>${esc(family)}</span>`).join("");
    const weak=slip.weakestLeg?`<p class="betting-weakest">Gamba più fragile: <strong>${esc(slip.weakestLeg.label)}</strong> · EV ${slip.weakestLeg.expectedValuePct>0?"+":""}${pct(slip.weakestLeg.expectedValuePct)}%${slip.filterNote?`<small>${esc(slip.filterNote)}</small>`:""}</p>`:"";
    return `<article class="betting-slip betting-slip--${esc(slip.id)}" data-quality="${esc(slip.qualityStatus)}"><header><div><p>${esc(slip.eyebrow)}</p><h2>${esc(slip.name)}</h2></div><span class="betting-quality">${esc(slip.qualityLabel)}</span></header><p class="betting-slip-copy">${esc(slip.description)}</p><div class="betting-family-list" aria-label="Famiglie di mercato">${families}</div><div class="betting-quote"><span>Quota totale</span><strong>${odds(slip.combinedOdds)}</strong><small>${slip.legs.length} selezioni · zero doppioni</small></div><ol>${legs}</ol><dl><div><dt>Probabilità modello</dt><dd>${metric(slip.jointModelProbabilityPct,pct,"%")}</dd></div><div><dt>Quota equa</dt><dd>${metric(slip.fairOdds,odds)}</dd></div><div><dt>EV stimato</dt><dd>${metric(slip.expectedValuePct,pct,"%")}</dd></div></dl>${weak}</article>`;
  }

  async function render(){
    const [data,matches]=await Promise.all([load("schedina.json"),load("matches.json")]);
    const matchById=new Map((Array.isArray(matches)?matches:matches.matches||[]).map(match=>[match.id,match]));
    const qualified=data.slips.filter(slip=>slip.qualityStatus==="qualificata"),others=data.slips.filter(slip=>slip.qualityStatus!=="qualificata");
    const selected=qualified.length?`<div class="betting-slip-grid betting-slip-grid-qualified">${qualified.map(slip=>slipCard(slip,matchById)).join("")}</div>`:`<div class="betting-nd-compact"><strong>Nessuna schedina qualificata</strong><span>Il controllo prudenziale non forza proposte: restano disponibili le letture editoriali e di laboratorio.</span></div>`;
    const legend=`<div class="betting-result-legend" aria-label="Legenda esiti"><span class="betting-result-legend--won"><b aria-hidden="true">✓</b> Esatto</span><span class="betting-result-legend--lost"><b aria-hidden="true">×</b> Sbagliato</span><small>Le selezioni non ancora concluse o non liquidabili dai dati ufficiali restano neutre.</small></div>`;
    document.querySelector("#app").innerHTML=hero("Prima giornata · Sisal","Schedina","Proposte ordinate per qualità del modello: nessun target di quota giustifica una gamba debole.")+`<section class="betting-stage" aria-labelledby="betting-title"><header class="betting-intro"><div><p class="eyebrow">Controllo prudenziale</p><h2 id="betting-title">Selezionate dal modello</h2></div><p>Entrano qui soltanto schedine con EV non negativo e nessuna gamba sotto −10% di EV individuale.</p></header>${legend}${selected}${others.length?`<header class="betting-section-heading"><div><p class="eyebrow">Letture editoriali e laboratorio</p><h2>Scenari non qualificati</h2></div><p>Restano visibili per confronto, con rischio ed EV dichiarati.</p></header><div class="betting-slip-grid">${others.map(slip=>slipCard(slip,matchById)).join("")}</div>`:""}<footer class="betting-method"><strong>Come leggere i numeri</strong><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. <a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">Fonte quote</a>. Gioca responsabilmente: pagina editoriale, nessun esito è certo.</p></footer></section>`;
  }
  return {render};
}
