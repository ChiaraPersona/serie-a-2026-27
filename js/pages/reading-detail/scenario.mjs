import {esc,number,finite,pct,recordList,details,missing} from './format.mjs';
export function scenarioMarkup(model){
 const projections=model.prediction?.teamProjections||[],sides=[model.home,model.away];
 const keys=[['expectedGoals','Gol attesi · modello'],['shotsTotal','Tiri'],['shotsOnTarget','SOT'],['corners','Corner']];
 const comparisons=keys.map(([key,label])=>{
  const values=projections.slice(0,2).map(p=>key==='expectedGoals'?p[key]:p[key]?.central),max=Math.max(...values.filter(finite),1);
  return `<article class="rd-comparison"><header><strong>${label}</strong><span>Previsione</span></header>${sides.map((side,i)=>{const range=projections[i]?.[key];return `<div class="rd-compare-side is-${i?'away':'home'}"><span>${esc(side.name)}</span><b>${number(values[i],2)}</b><i aria-hidden="true"><em style="width:${finite(values[i])?Math.max(0,values[i])/max*100:0}%"></em></i><small>${key!=='expectedGoals'&&finite(range?.min)&&finite(range?.max)?`${number(range.min)}–${number(range.max)} · ${esc(range.interval||'intervallo del modello')}`:''}</small></div>`}).join('')}</article>`;
 }).join('');
 const scores=model.prediction?.scoreForecast?.display||model.prediction?.exactScores||[];
 const verdict=model.prediction?.verdict;
 const scoreBlock=scores.length?`<div class="rd-score-grid">${scores.slice(0,3).map((s,i)=>`<article><small>${i?'Alternativa':'Risultato previsto'}</small><strong>${esc(s.score)}</strong><span>${pct(s.probabilityPct)} · ${esc(s.label||'')}</span></article>`).join('')}</div>`:missing('Risultati esatti non disponibili.');
 const interpretation=verdict?.label||model.prediction?.scoreForecast?.method;
 const confidence=model.prediction?.confidence?.value??model.prediction?.confidenceScore,surprise=model.prediction?.surprise?.value;
 return `<div class="rd-context-strip"><span>Confidenza <b>${number(confidence)}${finite(confidence)?'/100':''}</b></span><span>Fattore sorpresa <b>${number(surprise)}${finite(surprise)?'/100':''}</b></span><span>${esc(model.quality?.label||model.quality?.status||'Copertura: dettagli nelle fonti')}</span></div><div class="rd-kpi-grid">${comparisons}</div>${scoreBlock}${interpretation?`<p class="rd-interpretation">${esc(interpretation)}</p>`:''}<p class="rd-footnote">Gol attesi del modello e xG osservato sono grandezze distinte. I valori centrali, le probabilità e gli intervalli sono quelli della pipeline ${model.competition==='champions'?'Champions':'Serie A V2'}; nessun ricalcolo in pagina.</p>${details('Qualità dei dati, provenienza e limitazioni',recordList({qualita:model.quality,aggiornamentoPrevisione:model.prediction?.generatedAt??null,versione:model.prediction?.engineVersion??model.prediction?.status??null,metodoRisultato:model.prediction?.scoreForecast?.method??null,fonti:model.sources??null}))}`;
}
export function installScenario(model,group){
 const original=[...group.children];const content=document.createElement('div');content.className='rd-scenario';content.innerHTML=scenarioMarkup(model);
 const extended=document.createElement('details');extended.className='rd-disclosure rd-original-detail';extended.innerHTML='<summary>Spiegazione completa del modello e dati originali</summary>';
 original.forEach(node=>extended.append(node));group.replaceChildren(content,extended);
 return ()=>group.replaceChildren(...original);
}
