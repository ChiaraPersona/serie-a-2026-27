import {esc,number,finite,pct,missing} from './format.mjs?v=20261022-assets-v1';

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
function comparisonRow(key,label,values,sides,{ready=false,coverage=''}={}){
 const widths=comparisonWidths(values),formatted=values.map(value=>key.startsWith('xgot')&&!finite(value)?'N/D':['cards','fouls'].includes(key)?(finite(value)?value.toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}):'—'):number(value,2));
 return `<article class="rd-diverging-row" data-statistic="${key}"${key==='xgot'?` data-xgot-observed data-xgot-ready="${ready}"`:''} aria-label="${esc(label)}${key==='cards'?' (ammonizioni)':''}: ${esc(sides[0].name)} ${formatted[0]}; ${esc(sides[1].name)} ${formatted[1]}"><div class="rd-diverging-top"><strong>${esc(label)}</strong>${formatted.map((value,i)=>`<b class="is-${i?'away':'home'}">${value}</b>`).join('')}</div><div class="rd-diverging-track" aria-hidden="true">${values.map((value,i)=>`<span class="rd-diverging-half is-${i?'away':'home'}" data-available="${finite(value)}"><em style="width:${widths[i]}%"></em></span>`).join('')}</div>${coverage?`<small class="rd-footnote">${esc(coverage)}</small>`:''}</article>`;
}
export function xgotComparisonMarkup(model,data){
 const date=model.fixture?.date,year=Number(date?.slice(0,4))-(Number(date?.slice(5,7))<7?1:0),start=`${year}-07-01`,sides=[model.home,model.away];
 const samples=sides.map(side=>(data?.teamMatches?.[side.id]||[]).filter(r=>r.date>=start&&r.date<date&&finite(r.xgot)));
 const values=samples.map(rows=>rows.length?rows.reduce((n,r)=>n+r.xgot,0)/rows.length:null);
 return comparisonRow('xgot','xGOT osservato / gara',values,sides,{ready:true});
}
// Internal note: model expected goals and observed xG are distinct. Central values,
// probabilities and intervals come from the competition pipeline; no page recalculation.
export function scenarioMarkup(model){
 const projections=model.prediction?.teamProjections||[],sides=[model.home,model.away];
 const keys=[['expectedGoals','Gol attesi · modello'],['shotsTotal','Tiri'],['shotsOnTarget','SOT'],['xgot','xGOT osservato / gara'],['corners','Corner'],['cards','Cartellini previsti'],['fouls','Falli previsti']];
 const comparisons=keys.map(([key,label])=>{
  const values=sides.map((_,i)=>key==='xgot'?null:key==='fouls'?(finite(projections[i]?.fouls?.central)&&projections[i].fouls.central>=0?projections[i].fouls.central:null):key==='cards'?projectedYellowCards(projections[i]):key==='expectedGoals'?projections[i]?.[key]:projections[i]?.[key]?.central);
  return comparisonRow(key,label,values,sides);
 }).join('');
 const forecast=model.prediction?.xgotForecast;
 const forecastRow=forecast?comparisonRow('xgot-forecast','xGOT previsto · sperimentale',[forecast.home,forecast.away],sides,{coverage:'Stima di squadra non validata; distinta dall’xGOT osservato.'}):'';
 const chart=`<div class="rd-diverging" role="group" aria-label="Confronto delle previsioni, scala condivisa per ciascun indicatore"><div class="rd-diverging-teams">${sides.map((side,i)=>`<span class="is-${i?'away':'home'}">${esc(side.name)}</span>`).join('')}</div><div class="rd-diverging-rows">${comparisons}${forecastRow}</div></div>`;
 const scores=model.prediction?.scoreForecast?.display||model.prediction?.exactScores||[];
 const scoreBlock=scores.length?`<div class="rd-score-grid">${scores.slice(0,3).map((s,i)=>`<article><small>${i?'Alternativa':'Risultato previsto'}</small><strong>${esc(s.score)}</strong><span>${pct(s.probabilityPct)} · ${esc(s.label||'')}</span></article>`).join('')}</div>`:missing('Risultati esatti non disponibili.');
 const european=model.prediction?.resultModel?.type==='EUROPEAN_RATING_RESULT';
 const linked=model.prediction?.europeanReading?.applied;
 const modelNote=linked?'Gol attesi, risultati esatti, tiri, SOT, corner e xGOT condividono lo scenario Elo europeo. Falli e cartellini usano il contesto degli esiti quando il campione lo consente. Stima sperimentale non validata.':model.prediction?.europeanReading?'Storico Elo insufficiente: 1X2 N/D; le altre stime usano il modello statistico di base.':'Gol attesi e volumi sono stime separate. '+(model.prediction?.resultModel?.status==='INSUFFICIENT_DATA'?'Storico europeo insufficiente: esito N/D.':'Validazione del modello da completare.');
 const resultBlock=european?`<div data-european-result${linked?' data-european-reading="linked"':''}><p><strong>${linked?'Lettura collegata · Elo europeo':'Probabilità 1X2 · rating europeo'}${model.prediction.resultModel.xgot?.applied?' + xGOT sperimentale':''}</strong> · Stima preliminare</p><div class="rd-score-grid">${[['1','home'],['X','draw'],['2','away']].map(([label,key])=>`<article><small>${label}</small><strong data-result-outcome="${label}">${pct(model.prediction.probabilities?.[key])}</strong></article>`).join('')}</div><p>${modelNote}</p></div>`:'';
 const confidence=model.prediction?.confidence?.value??model.prediction?.confidenceScore,surprise=model.prediction?.surprise?.value;
 return `${resultBlock}<div class="rd-context-strip"><span>Confidenza <b>${number(confidence)}${finite(confidence)?'/100':''}</b></span><span>Fattore sorpresa <b>${number(surprise)}${finite(surprise)?'/100':''}</b></span>${model.competition!=='champions'&&(model.quality?.label||model.quality?.status)?`<span>${esc(model.quality.label||model.quality.status)}</span>`:''}</div>${chart}${scoreBlock}`;
}
export function installScenario(model,group){
 const original=[...group.children];const content=document.createElement('div');content.className='rd-scenario';content.innerHTML=scenarioMarkup(model);
 group.replaceChildren(content);
 import('../../components/xgot-statistics.mjs?v=20261106-xgot').then(async({loadXgotStatistics})=>{
  const data=await loadXgotStatistics();if(!content.isConnected)return;
  const row=content.querySelector('[data-statistic="xgot"]');if(row)row.outerHTML=xgotComparisonMarkup(model,data);
 });
 return ()=>group.replaceChildren(...original);
}
