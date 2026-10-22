import {esc,number,pct,finite,missing} from './format.mjs?v=20261022-assets-v1';
import {isCanonicalModelForecast,isPublishedForecast,hasVerifiedPlayableQuote,sharedForecastsForMatch} from '../shared-forecast-contract.mjs?v=20261022-assets-v1';
import {createPersonalBetslipStore} from '../personal-betslip-store.mjs?v=20261022-assets-v1';

export function forecastPresentation(leg){
 const contract=leg.betSelection||{},market=contract.market||{},subject=market.subject||{},player=leg.player&&typeof leg.player==='object'?leg.player:{};
 const modifiers=market.modifiers||leg.modifiers||{};
 return {id:leg.selectionId,label:leg.label||leg.selection||market.selection||'Selezione',family:leg.marketFamily||leg.suggestionAnalysis?.familyLabel||market.family||market.name||leg.market||'Mercato',
  playerId:leg.playerId||player.canonicalPlayerId||(['player','player-plus-substitute'].includes(subject.type)?subject.id:null),
  playerName:player.canonicalName||leg.playerName||subject.name||'',team:leg.teamId||player.team||subject.teamId||'',
  probability:contract.evaluation?.modelProbabilityPct,odds:contract.quote?.decimal,ev:contract.evaluation?.expectedValuePct,
  quoted:contract.quote?.availability==='AVAILABLE_AT_SNAPSHOT'&&finite(contract.quote.decimal),
  outsider:leg.isOutsider===true,highlight:leg.isPreferred===true,
  tags:[modifiers.replacementIncluded||market.bookmakerSemantics?.replacementIncluded?'Sostituto incluso':null,modifiers.woodworkIncluded||market.bookmakerSemantics?.postsAndCrossbarIncluded?'Pali/traverse':null,market.bookmakerSemantics?.duo?'DUO':null,modifiers.periodScope==='first-half'?'Primo tempo':modifiers.periodScope==='both-halves'?'Entrambi i tempi':null,market.threshold!=null?`Soglia ${market.threshold}`:null].filter(Boolean)};
}
export function publishedReadingForecasts(catalog,matchId,match=null){
 const unique=new Map();for(const leg of sharedForecastsForMatch(catalog,matchId,match))if(!unique.has(leg.selectionId))unique.set(leg.selectionId,leg);return [...unique.values()];
}
export function canPickReading(model,leg){
 return model.fixture.status!=='finished'&&['serie-a','champions'].includes(model.competition)&&isPublishedForecast(leg)&&(isCanonicalModelForecast(leg)||hasVerifiedPlayableQuote(leg));
}
export function compactForecastMarkup(model){
 const rows=model.forecasts.map(leg=>{const v=forecastPresentation(leg),enabled=canPickReading(model,leg);return `<tr data-forecast-id="${esc(v.id)}" data-shared-forecast-id="${esc(v.id)}"><td class="rd-forecast-name">${esc(v.label)}${leg.publication?`<small class="rd-footnote" data-publication-status="${esc(leg.publication.status)}">${leg.publication.status==='APPROVED'?'Approvata':'Preliminare'}</small>`:''}</td><td>${pct(v.probability)}</td><td>${v.quoted?number(v.odds,2):'—'}</td><td><button type="button" data-rd-pick="${esc(v.id)}" aria-label="${esc(enabled?'Aggiungi '+v.label:model.fixture.status==='finished'?'Partita conclusa: '+v.label:'Solo consultazione: '+v.label)}" aria-pressed="false" ${enabled?'':'disabled'}>+</button></td></tr>`}).join('');
 return `${model.forecasts.some(l=>l.publication?.status==='PRELIMINARY'&&!l.betSelection?.evaluation?.validation?.approvable)?'<p class="rd-footnote">Le previsioni non validate restano preliminari.</p>':''}<table class="rd-compact-forecast-table"><thead><tr><th scope="col">Nome pronostico</th><th scope="col">Probabilità</th><th scope="col">Quota</th><th scope="col" aria-label="Selezione">+</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function installForecasts(model,container,shell,providedStore){
 const originals=[...container.childNodes],context={competition:model.competition,season:'2026-27',matchday:model.fixture.matchday};
 const store=providedStore||createPersonalBetslipStore();
 if(!providedStore){store.setContext(context);store.reconcile(store.getSnapshot().selections);}
 const root=document.createElement('div');root.className='rd-forecasts';
 const href=`schedina.html?giornata=${encodeURIComponent(model.fixture.matchday)}${model.competition==='champions'?'&competizione=champions':''}`;
 root.innerHTML=compactForecastMarkup(model)+`<a class="rd-forecast-destination" href="${esc(href)}">Apri la Schedina ↗</a>`;
 container.replaceChildren(root);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='rd-slip-trigger';trigger.setAttribute('aria-haspopup','dialog');
 const dialog=document.createElement('dialog');dialog.className='rd-slip';dialog.setAttribute('aria-labelledby','rd-slip-title');
 dialog.innerHTML=`<header><div><small>${esc(model.competition==='champions'?'Champions League':'Serie A')} · Giornata ${esc(model.fixture.matchday)}</small><h2 id="rd-slip-title">La mia schedina</h2></div><button type="button" data-close aria-label="Chiudi schedina">×</button></header><div data-slip-content></div><p class="rd-slip-notice" role="status"></p><a href="${esc(href)}">Apri nella pagina Schedina ↗</a>`;
 if(shell.matches('.rd-shell'))shell.append(trigger,dialog);
 let opener,previousOverflow='';
 const close=()=>dialog.close();
 trigger.addEventListener('click',()=>{opener=document.activeElement;previousOverflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('[data-close]').focus()});
 dialog.querySelector('[data-close]').addEventListener('click',close);
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;opener?.focus()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...dialog.querySelectorAll('button:not([disabled]),a[href],input')].filter(n=>n.getClientRects().length);if(!nodes.length)return;if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}});
 const render=snapshot=>{
  const selected=new Set(snapshot.selections.map(s=>s.selectionId));
  root.querySelectorAll('[data-rd-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(selected.has(b.dataset.rdPick)));if(!b.disabled){const active=selected.has(b.dataset.rdPick),leg=model.forecasts.find(l=>l.selectionId===b.dataset.rdPick);b.textContent=active?'−':'+';b.setAttribute('aria-label',(active?'Rimuovi ':'Aggiungi ')+forecastPresentation(leg).label)}});
  trigger.textContent=`Schedina · ${selected.size}`;
  dialog.querySelector('[data-slip-content]').innerHTML=snapshot.selections.length?`<ol>${snapshot.selections.map(s=>{const v=forecastPresentation(s);return `<li><div><small>${esc(s.fixture||s.matchId||'')}</small><strong>${esc(v.label)}</strong><p>${v.tags.map(esc).join(' · ')}</p><span>Quota ${v.quoted?number(v.odds,2):'—'}</span>${s.quoteChanged?'<p>Quota aggiornata rispetto all’aggiunta.</p>':''}${s.dataStatus==='MISSING_FROM_CURRENT_DATA'?'<p>Selezione non presente nel catalogo corrente.</p>':''}</div><button type="button" data-remove="${esc(s.selectionId)}" aria-label="Rimuovi ${esc(v.label)}">×</button></li>`}).join('')}</ol><dl class="rd-slip-total"><dt>Quota teorica</dt><dd>${number(snapshot.assessment.theoreticalCombinedOdds,2)}</dd><dt>Quota utilizzabile</dt><dd>${number(snapshot.assessment.usableCombinedOdds,2)}</dd></dl>${snapshot.assessment.pendingModelQuote?'<p>Totale non disponibile: almeno una selezione è senza quota.</p>':''}<ul class="rd-slip-issues">${snapshot.assessment.issues.map(issue=>`<li>${esc(issue.message)}</li>`).join('')}</ul><button type="button" data-clear>Svuota schedina</button>`:missing('Nessuna selezione in questo contesto.');
  if(snapshot.storageError)dialog.querySelector('.rd-slip-notice').textContent=snapshot.storageError;
 };
 root.addEventListener('click',e=>{const b=e.target.closest('[data-rd-pick]');if(!b||b.disabled)return;const leg=model.forecasts.find(l=>l.selectionId===b.dataset.rdPick);if(!leg||!canPickReading(model,leg))return;const selected=store.getSnapshot().selections.some(s=>s.selectionId===leg.selectionId);const result=selected?store.remove(leg.selectionId):store.add({...leg,context:{...leg.context,...context}});dialog.querySelector('.rd-slip-notice').textContent=result.reason||result.status;});
 dialog.addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove){const index=[...dialog.querySelectorAll('[data-remove]')].indexOf(remove);store.remove(remove.dataset.remove);(dialog.querySelectorAll('[data-remove]')[index]||dialog.querySelector('[data-close]')).focus()}if(e.target.closest('[data-clear]')){store.clear();dialog.querySelector('[data-close]').focus()}});
 const unsubscribe=store.subscribe(render);render(store.getSnapshot());
 window.addEventListener('pagehide',unsubscribe,{once:true});
 return {store,undo:()=>{unsubscribe();if(dialog.open)dialog.close();trigger.remove();dialog.remove();container.replaceChildren(...originals)}};
}
