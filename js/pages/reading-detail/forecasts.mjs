import {esc,number,pct,finite,recordList,sourceLink,missing} from './format.mjs';
import {isCanonicalModelForecast} from '../shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../personal-betslip-store.mjs';

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
export function canPickReading(model,leg){
 return model.fixture.status!=='finished'&&model.competition==='serie-a'&&Number(model.fixture.matchday)===7&&isCanonicalModelForecast(leg);
}
const options=(values,label)=>`<option value="">${esc(label)}</option>${[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it')).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}`;

export function installForecasts(model,container,shell,providedStore){
 const originals=[...container.childNodes],context={competition:model.competition,season:'2026-27',matchday:model.fixture.matchday};
 const store=providedStore||createPersonalBetslipStore();
 if(!providedStore){store.setContext(context);store.reconcile(store.getSnapshot().selections);}
 const forecasts=model.forecasts.map(leg=>({leg,view:forecastPresentation(leg)}));
 const root=document.createElement('div');root.className='rd-forecasts';
 const href=`schedina.html?giornata=${encodeURIComponent(model.fixture.matchday)}${model.competition==='champions'?'&competizione=champions':''}`;
 root.innerHTML=`<div class="rd-forecast-tools"><p>Lo stesso registro della Schedina. Quote riferite allo snapshot.</p><a href="${esc(href)}">Apri la Schedina ↗</a></div><form class="rd-filters" aria-label="Filtri pronostici"><label>Squadra<select name="team">${options(forecasts.map(f=>f.view.team),'Tutte le squadre')}</select></label><label>Giocatore<select name="player">${options(forecasts.map(f=>f.view.playerName),'Tutti i giocatori')}</select></label><label>Mercato<select name="market">${options(forecasts.map(f=>f.view.family),'Tutti i mercati')}</select></label><label>Quota<select name="quote"><option value="">Tutte</option><option value="yes">Disponibile nello snapshot</option><option value="no">Senza quota</option></select></label><label>In evidenza<select name="flags"><option value="">Tutti</option><option value="highlight">Evidenziati</option><option value="outsider">Outsider</option></select></label><button type="reset">Azzera filtri</button></form><p class="rd-filter-count" role="status" aria-live="polite"></p><div class="rd-forecast-list"></div>`;
 const list=root.querySelector('.rd-forecast-list');
 for(const {leg,view:v} of forecasts){
  const row=document.createElement('article');row.className='rd-forecast-row';row.dataset.forecastId=v.id;
  row.setAttribute(model.competition==='champions'?'data-published-selection-id':'data-shared-forecast-id',v.id);
  const result=leg.settlement;
  row.innerHTML=`<details><summary><div><span class="rd-row-family">${esc(v.family)}${v.outsider?' · OUTSIDER':''}${v.highlight?' · IN EVIDENZA':''}</span><strong>${esc(v.label)}</strong><span class="rd-contract-tags">${v.tags.map(t=>`<b>${esc(t)}</b>`).join('')||'Contratto standard'}</span></div><dl class="rd-row-metrics"><div><dt>Probabilità</dt><dd>${pct(v.probability)}</dd></div><div><dt>Quota</dt><dd>${v.quoted?number(v.odds,2):'—'}</dd></div><div><dt>EV</dt><dd>${v.quoted?pct(v.ev):'—'}</dd></div></dl></summary><div class="rd-row-details"><p>${esc(leg.evidenceLabel||leg.motivation||'Motivazione tecnica non disponibile.')}</p>${leg.limitation?`<p class="rd-footnote">${esc(leg.limitation)}</p>`:''}${sourceLink(leg.betSelection?.quote?.source?.url,'Snapshot provider')}<p class="rd-footnote">${esc(leg.betSelection?.quote?.verifiedAt||'Data quota N/D')}</p>${recordList({identita:leg.betSelection?.identity,mercato:leg.betSelection?.market,valutazione:leg.betSelection?.evaluation,compatibilita:leg.betSelection?.compatibility,origine:leg.catalogOrigin??null})}</div></details><div class="rd-row-actions">${result?`<span class="rd-outcome" data-outcome="${esc(result.status)}">${esc(result.label||result.status)} · ${result.officiallySettled?'liquidazione certificata':'verifica statistica'} ${sourceLink(result.sourceUrl,'Fonte esito')}</span>`:''}<button type="button" data-rd-pick="${esc(v.id)}" aria-pressed="false" ${canPickReading(model,leg)?'':'disabled'}>${model.fixture.status==='finished'?'Partita conclusa':canPickReading(model,leg)?'Aggiungi':'Consultazione'}</button></div>`;
  list.append(row);
 }
 if(!forecasts.length)list.innerHTML=missing('Nessun pronostico pubblicato disponibile.');
 container.replaceChildren(root);
 const form=root.querySelector('form');
 const filter=()=>{
  const data=new FormData(form);let count=0;
  [...list.children].forEach((row,i)=>{const v=forecasts[i]?.view;if(!v)return;const visible=(!data.get('team')||data.get('team')===v.team)&&(!data.get('player')||data.get('player')===v.playerName)&&(!data.get('market')||data.get('market')===v.family)&&(!data.get('quote')||(data.get('quote')==='yes')===v.quoted)&&(!data.get('flags')||(data.get('flags')==='outsider'?v.outsider:v.highlight));row.hidden=!visible;if(visible)count++});
  root.querySelector('[role=status]').textContent=`${count} di ${forecasts.length} pronostici`;
 };
 form.addEventListener('change',filter);form.addEventListener('reset',()=>queueMicrotask(filter));filter();
 const trigger=document.createElement('button');trigger.type='button';trigger.className='rd-slip-trigger';trigger.setAttribute('aria-haspopup','dialog');
 const dialog=document.createElement('dialog');dialog.className='rd-slip';dialog.setAttribute('aria-labelledby','rd-slip-title');
 dialog.innerHTML=`<header><div><small>${esc(model.competition==='champions'?'Champions League':'Serie A')} · Giornata ${esc(model.fixture.matchday)}</small><h2 id="rd-slip-title">La mia schedina</h2></div><button type="button" data-close aria-label="Chiudi schedina">×</button></header><div data-slip-content></div><p class="rd-slip-notice" role="status"></p><a href="${esc(href)}">Apri nella pagina Schedina ↗</a>`;
 shell.append(trigger,dialog);
 let opener,previousOverflow='';
 const close=()=>dialog.close();
 trigger.addEventListener('click',()=>{opener=document.activeElement;previousOverflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('[data-close]').focus()});
 dialog.querySelector('[data-close]').addEventListener('click',close);
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;opener?.focus()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...dialog.querySelectorAll('button:not([disabled]),a[href],input')].filter(n=>n.getClientRects().length);if(!nodes.length)return;if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}});
 const render=snapshot=>{
  const selected=new Set(snapshot.selections.map(s=>s.selectionId));
  root.querySelectorAll('[data-rd-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(selected.has(b.dataset.rdPick)));if(!b.disabled)b.textContent=selected.has(b.dataset.rdPick)?'Rimuovi':'Aggiungi'});
  trigger.textContent=`Schedina · ${selected.size}`;
  dialog.querySelector('[data-slip-content]').innerHTML=snapshot.selections.length?`<ol>${snapshot.selections.map(s=>{const v=forecastPresentation(s);return `<li><div><small>${esc(s.fixture||s.matchId||'')}</small><strong>${esc(v.label)}</strong><p>${v.tags.map(esc).join(' · ')}</p><span>Quota ${v.quoted?number(v.odds,2):'—'}</span>${s.quoteChanged?'<p>Quota aggiornata rispetto all’aggiunta.</p>':''}${s.dataStatus==='MISSING_FROM_CURRENT_DATA'?'<p>Selezione non presente nel catalogo corrente.</p>':''}</div><button type="button" data-remove="${esc(s.selectionId)}" aria-label="Rimuovi ${esc(v.label)}">×</button></li>`}).join('')}</ol><dl class="rd-slip-total"><dt>Quota teorica</dt><dd>${number(snapshot.assessment.theoreticalCombinedOdds,2)}</dd><dt>Quota utilizzabile</dt><dd>${number(snapshot.assessment.usableCombinedOdds,2)}</dd></dl>${snapshot.assessment.pendingModelQuote?'<p>Totale non disponibile: almeno una selezione è senza quota.</p>':''}<ul class="rd-slip-issues">${snapshot.assessment.issues.map(issue=>`<li>${esc(issue.message)}</li>`).join('')}</ul><button type="button" data-clear>Svuota schedina</button>`:missing('Nessuna selezione in questo contesto.');
  if(snapshot.storageError)dialog.querySelector('.rd-slip-notice').textContent=snapshot.storageError;
 };
 root.addEventListener('click',e=>{const b=e.target.closest('[data-rd-pick]');if(!b||b.disabled)return;const leg=model.forecasts.find(l=>l.selectionId===b.dataset.rdPick);if(!leg||!canPickReading(model,leg))return;const selected=store.getSnapshot().selections.some(s=>s.selectionId===leg.selectionId);const result=selected?store.remove(leg.selectionId):store.add({...leg,context});dialog.querySelector('.rd-slip-notice').textContent=result.reason||result.status;});
 dialog.addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove){const index=[...dialog.querySelectorAll('[data-remove]')].indexOf(remove);store.remove(remove.dataset.remove);(dialog.querySelectorAll('[data-remove]')[index]||dialog.querySelector('[data-close]')).focus()}if(e.target.closest('[data-clear]')){store.clear();dialog.querySelector('[data-close]').focus()}});
 const unsubscribe=store.subscribe(render);render(store.getSnapshot());
 return {store,undo:()=>{unsubscribe();if(dialog.open)dialog.close();trigger.remove();dialog.remove();container.replaceChildren(...originals)}};
}
