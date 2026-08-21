export function createPage(deps){
  const {esc,dateOnly,hero,load}=deps;
  const pct=value=>Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const odds=value=>Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const metric=(value,formatter,suffix="")=>Number.isFinite(value)?`${formatter(value)}${suffix}`:"N/D";

  function slipCard(slip){
    const legs=slip.legs.map((leg,index)=>`<li><span class="betting-leg-number">${String(index+1).padStart(2,"0")}</span><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)} <small>· ${esc(leg.evidenceLabel)}</small></span></div><b>${odds(leg.odds)}</b></li>`).join("");
    const families=slip.marketFamilies.map(family=>`<span>${esc(family)}</span>`).join("");
    return `<article class="betting-slip betting-slip--${esc(slip.id)}"><header><div><p>${esc(slip.eyebrow)}</p><h2>${esc(slip.name)}</h2></div><span class="betting-slip-index" aria-hidden="true">0${slip.number}</span></header><p class="betting-slip-copy">${esc(slip.description)}</p><div class="betting-family-list" aria-label="Famiglie di mercato">${families}</div><div class="betting-quote"><span>Quota totale</span><strong>${odds(slip.combinedOdds)}</strong><small>${slip.legs.length} selezioni · zero doppioni</small></div><ol>${legs}</ol><dl><div><dt>Probabilità modello</dt><dd>${metric(slip.jointModelProbabilityPct,pct,"%")}</dd></div><div><dt>Quota equa</dt><dd>${metric(slip.fairOdds,odds)}</dd></div><div><dt>EV stimato</dt><dd>${metric(slip.expectedValuePct,pct,"%")}</dd></div></dl></article>`;
  }

  async function render(){
    const data=await load("schedina.json");
    const cards=data.slips.map(slipCard).join("");
    document.querySelector("#app").innerHTML=hero("Prima giornata · Sisal","Schedina","Sei modi diversi di leggere lo stesso turno. Le quote brillano, ma ogni selezione resta ancorata al risultato pronosticato.")+`<section class="betting-stage" aria-labelledby="betting-title"><header class="betting-intro"><div><p class="eyebrow">${esc(data.title)}</p><h2 id="betting-title">Accendi la tua lettura</h2></div><p>${esc(data.description)}</p></header><div class="betting-slip-grid">${cards}</div><footer class="betting-method"><strong>Come leggere i numeri</strong><p>${esc(data.methodology)}</p><p>Quote ${esc(data.provider)} aggiornate al ${esc(dateOnly(data.oddsRetrievedAt))}. <a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">Fonte quote</a>. Gioca responsabilmente: pagina editoriale, nessun esito è certo.</p></footer></section>`;
  }
  return {render};
}
