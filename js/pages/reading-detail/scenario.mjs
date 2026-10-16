import {esc,number,finite,pct,recordList,details,missing} from './format.mjs';
// One display scale per metric, shared by both sides; never a share of the total.
export function comparisonWidths(values){
 const max=Math.max(0,...values.filter(finite));
 return values.map(value=>finite(value)&&max>0?Math.max(0,value)/max*100:0);
}
export function scenarioMarkup(model){
 const projections=model.prediction?.teamProjections||[],sides=[model.home,model.away];
 const keys=[['expectedGoals','Gol attesi · modello'],['shotsTotal','Tiri'],['shotsOnTarget','SOT'],['corners','Corner']];
 const comparisons=keys.map(([key,label])=>{
  const values=sides.map((_,i)=>key==='expectedGoals'?projections[i]?.[key]:projections[i]?.[key]?.central),widths=comparisonWidths(values);
  const intervals=sides.map((_,i)=>{const range=projections[i]?.[key];return key!=='expectedGoals'&&finite(range?.min)&&finite(range?.max)?`${number(range.min)}–${number(range.max)} · ${esc(range.interval||'intervallo del modello')}`:''});
  return `<article class="rd-diverging-row" aria-label="${esc(label)}: ${esc(sides[0].name)} ${number(values[0],2)}; ${esc(sides[1].name)} ${number(values[1],2)}"><div class="rd-diverging-top"><strong>${label}</strong>${values.map((value,i)=>`<b class="is-${i?'away':'home'}">${number(value,2)}</b>`).join('')}</div><div class="rd-diverging-track" aria-hidden="true">${values.map((value,i)=>`<span class="rd-diverging-half is-${i?'away':'home'}" data-available="${finite(value)}"><em style="width:${widths[i]}%"></em></span>`).join('')}</div><div class="rd-diverging-intervals">${intervals.map(interval=>`<small>${interval}</small>`).join('')}</div></article>`;
 }).join('');
 const chart=`<div class="rd-diverging" role="group" aria-label="Confronto delle previsioni, scala condivisa per ciascun indicatore"><div class="rd-diverging-teams">${sides.map((side,i)=>`<span class="is-${i?'away':'home'}">${esc(side.name)}</span>`).join('')}</div><div class="rd-diverging-rows">${comparisons}</div></div>`;
 const scores=model.prediction?.scoreForecast?.display||model.prediction?.exactScores||[];
 const verdict=model.prediction?.verdict;
 const scoreBlock=scores.length?`<div class="rd-score-grid">${scores.slice(0,3).map((s,i)=>`<article><small>${i?'Alternativa':'Risultato previsto'}</small><strong>${esc(s.score)}</strong><span>${pct(s.probabilityPct)} · ${esc(s.label||'')}</span></article>`).join('')}</div>`:missing('Risultati esatti non disponibili.');
 const interpretation=verdict?.label||model.prediction?.scoreForecast?.method;
 const confidence=model.prediction?.confidence?.value??model.prediction?.confidenceScore,surprise=model.prediction?.surprise?.value;
 return `<div class="rd-context-strip"><span>Confidenza <b>${number(confidence)}${finite(confidence)?'/100':''}</b></span><span>Fattore sorpresa <b>${number(surprise)}${finite(surprise)?'/100':''}</b></span><span>${esc(model.quality?.label||model.quality?.status||'Copertura: dettagli nelle fonti')}</span></div>${chart}${scoreBlock}${interpretation?`<p class="rd-interpretation">${esc(interpretation)}</p>`:''}<p class="rd-footnote">Gol attesi del modello e xG osservato sono grandezze distinte. I valori centrali, le probabilità e gli intervalli sono quelli della pipeline ${model.competition==='champions'?'Champions':'Serie A V2'}; nessun ricalcolo in pagina.</p>${details('Qualità dei dati, provenienza e limitazioni',recordList({qualita:model.quality,aggiornamentoPrevisione:model.prediction?.generatedAt??null,versione:model.prediction?.engineVersion??model.prediction?.status??null,metodoRisultato:model.prediction?.scoreForecast?.method??null,fonti:model.sources??null}))}`;
}
export function installScenario(model,group){
 const original=[...group.children];const content=document.createElement('div');content.className='rd-scenario';content.innerHTML=scenarioMarkup(model);
 const extended=document.createElement('details');extended.className='rd-disclosure rd-original-detail';extended.innerHTML='<summary>Spiegazione completa del modello e dati originali</summary>';
 original.forEach(node=>extended.append(node));group.replaceChildren(content,extended);
 return ()=>group.replaceChildren(...original);
}
