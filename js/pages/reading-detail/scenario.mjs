import {esc,number,finite,pct,missing} from './format.mjs?v=20261022-assets-v1';
import {competitionContextMarkup} from '../../components/competition-context.mjs?v=20261105';
// One display scale per metric, shared by both sides; never a share of the total.
export function comparisonWidths(values){
 const max=Math.max(0,...values.filter(finite));
 return values.map(value=>finite(value)&&max>0?Math.max(0,value)/max*100:0);
}
// Both existing pipelines serialize expected yellow cards here; never use red-card or total-card counts.
export function projectedYellowCards(projection){
 const value=projection?.cards?.central;
 return finite(value)&&value>=0?value:null;
}
// Internal note: model expected goals and observed xG are distinct. Central values,
// probabilities and intervals come from the competition pipeline; no page recalculation.
export function scenarioMarkup(model){
 const projections=model.prediction?.teamProjections||[],sides=[model.home,model.away];
 const keys=[['expectedGoals','Gol attesi · modello'],['shotsTotal','Tiri'],['shotsOnTarget','SOT'],['corners','Corner'],['cards','Cartellini previsti'],['fouls','Falli previsti']];
 const comparisons=keys.map(([key,label])=>{
  const values=sides.map((_,i)=>key==='fouls'?(finite(projections[i]?.fouls?.central)&&projections[i].fouls.central>=0?projections[i].fouls.central:null):key==='cards'?projectedYellowCards(projections[i]):key==='expectedGoals'?projections[i]?.[key]:projections[i]?.[key]?.central),widths=comparisonWidths(values);
  const formatted=values.map(value=>['cards','fouls'].includes(key)?(finite(value)?value.toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'—'):number(value,2));
  return `<article class="rd-diverging-row" data-statistic="${key}" aria-label="${esc(label)}${key==='cards'?' (ammonizioni)':''}: ${esc(sides[0].name)} ${formatted[0]}; ${esc(sides[1].name)} ${formatted[1]}"><div class="rd-diverging-top"><strong>${label}</strong>${formatted.map((value,i)=>`<b class="is-${i?'away':'home'}">${value}</b>`).join('')}</div><div class="rd-diverging-track" aria-hidden="true">${values.map((value,i)=>`<span class="rd-diverging-half is-${i?'away':'home'}" data-available="${finite(value)}"><em style="width:${widths[i]}%"></em></span>`).join('')}</div></article>`;
 }).join('');
 const chart=`<div class="rd-diverging" role="group" aria-label="Confronto delle previsioni, scala condivisa per ciascun indicatore"><div class="rd-diverging-teams">${sides.map((side,i)=>`<span class="is-${i?'away':'home'}">${esc(side.name)}</span>`).join('')}</div><div class="rd-diverging-rows">${comparisons}</div></div>`;
 const scores=model.prediction?.scoreForecast?.display||model.prediction?.exactScores||[];
 const scoreBlock=scores.length?`<div class="rd-score-grid">${scores.slice(0,3).map((s,i)=>`<article><small>${i?'Alternativa':'Risultato previsto'}</small><strong>${esc(s.score)}</strong><span>${pct(s.probabilityPct)} · ${esc(s.label||'')}</span></article>`).join('')}</div>`:missing('Risultati esatti non disponibili.');
 const european=model.prediction?.resultModel?.type==='EUROPEAN_RATING_RESULT';
 const resultBlock=european?`<div data-european-result><p><strong>Probabilità 1X2 · rating europeo</strong> · Stima preliminare</p><div class="rd-score-grid">${[['1','home'],['X','draw'],['2','away']].map(([label,key])=>`<article><small>${label}</small><strong data-result-outcome="${label}">${pct(model.prediction.probabilities?.[key])}</strong></article>`).join('')}</div><p>Gol attesi e volumi sono stime separate. ${model.prediction.resultModel.status==='INSUFFICIENT_DATA'?'Storico europeo insufficiente: esito N/D.':'Validazione del modello da completare.'}</p></div>`:'';
 const confidence=model.prediction?.confidence?.value??model.prediction?.confidenceScore,surprise=model.prediction?.surprise?.value;
 return `${resultBlock}<div class="rd-context-strip"><span>Confidenza <b>${number(confidence)}${finite(confidence)?'/100':''}</b></span><span>Fattore sorpresa <b>${number(surprise)}${finite(surprise)?'/100':''}</b></span>${model.competition!=='champions'&&(model.quality?.label||model.quality?.status)?`<span>${esc(model.quality.label||model.quality.status)}</span>`:''}</div>${chart}${scoreBlock}${competitionContextMarkup(model.prediction?.competitionContext,Object.fromEntries(sides.map(s=>[s.id,s.name])))}`;
}
export function installScenario(model,group){
 const original=[...group.children];const content=document.createElement('div');content.className='rd-scenario';content.innerHTML=scenarioMarkup(model);
 group.replaceChildren(content);
 return ()=>group.replaceChildren(...original);
}
