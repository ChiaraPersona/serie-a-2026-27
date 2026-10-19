const fs=require('fs');const edit=(f,fn)=>{const s=fs.readFileSync(f,'utf8'),n=fn(s);if(s===n)throw Error(f);fs.writeFileSync(f+'.tmp',n);fs.renameSync(f+'.tmp',f)};
edit('js/pages/reading-detail/forecasts.mjs',s=>{s=s.replace('{isCanonicalModelForecast}', '{isCanonicalModelForecast,isPublishedForecast,hasVerifiedPlayableQuote,sharedForecastsForMatch}');const start=s.indexOf('export function canPickReading'),end=s.indexOf('export function installForecasts',start);s=s.slice(0,start)+`export function publishedReadingForecasts(catalog,matchId){
 return [...new Map(sharedForecastsForMatch(catalog,matchId).map(leg=>[leg.selectionId,leg])).values()];
}
export function canPickReading(model,leg){
 return model.fixture.status!=='finished'&&model.competition==='serie-a'&&isPublishedForecast(leg)&&(isCanonicalModelForecast(leg)||hasVerifiedPlayableQuote(leg));
}
export function compactForecastMarkup(model){
 const rows=model.forecasts.map(leg=>{const v=forecastPresentation(leg),enabled=canPickReading(model,leg);return \`<tr data-forecast-id="\${esc(v.id)}" data-shared-forecast-id="\${esc(v.id)}"><td class="rd-forecast-name">\${esc(v.label)}</td><td>\${pct(v.probability)}</td><td>\${v.quoted?number(v.odds,2):'—'}</td><td><button type="button" data-rd-pick="\${esc(v.id)}" aria-label="\${esc(enabled?'Aggiungi '+v.label:model.fixture.status==='finished'?'Partita conclusa: '+v.label:'Solo consultazione: '+v.label)}" aria-pressed="false" \${enabled?'':'disabled'}>+</button></td></tr>\`}).join('');
 return \`<table class="rd-compact-forecast-table"><thead><tr><th scope="col">Nome pronostico</th><th scope="col">Probabilità</th><th scope="col">Quota</th><th scope="col"><span class="rd-accessible-title">Selezione</span></th></tr></thead><tbody>\${rows}</tbody></table>\`;
}

`+s.slice(end);const a=s.indexOf(' const forecasts=model.forecasts.map'),b=s.indexOf(' const trigger=document.createElement',a);s=s.slice(0,a)+` const root=document.createElement('div');root.className='rd-forecasts';
 const href=\`schedina.html?giornata=\${encodeURIComponent(model.fixture.matchday)}\${model.competition==='champions'?'&competizione=champions':''}\`;
 root.innerHTML=compactForecastMarkup(model)+\`<a class="rd-forecast-destination" href="\${esc(href)}">Apri la Schedina ↗</a>\`;
 container.replaceChildren(root);
`+s.slice(b);s=s.replace("if(!b.disabled)b.textContent=selected.has(b.dataset.rdPick)?'Rimuovi':'Aggiungi'", "if(!b.disabled){const active=selected.has(b.dataset.rdPick),leg=model.forecasts.find(l=>l.selectionId===b.dataset.rdPick);b.textContent=active?'−':'+';b.setAttribute('aria-label',(active?'Rimuovi ':'Aggiungi ')+forecastPresentation(leg).label)}");return s;});
edit('js/pages/reading-detail/serie-a-adapter.mjs',s=>s.replace("import {sharedForecastsForMatch,isCanonicalModelForecast} from '../shared-forecast-contract.mjs';","import {publishedReadingForecasts} from './forecasts.mjs?v=20261019-compact-all-v1';").replace('sharedForecastsForMatch(marketCatalog,match.id).filter(isCanonicalModelForecast)','publishedReadingForecasts(marketCatalog,match.id)'));
edit('js/pages/reading-detail/shell.mjs',s=>s.replace("import {isCanonicalModelForecast} from '../shared-forecast-contract.mjs';\n",'').replace('20261019-canonical-forecasts-v1','20261019-compact-all-v1').replace('model.forecasts?.some(isCanonicalModelForecast)','model.forecasts?.length>0'));
edit('js/pages/readings.js',s=>{s=s.replace("import {forecastView,sharedForecastsForMatch,isCanonicalModelForecast} from './shared-forecast-contract.mjs';", "import {sharedForecastsForMatch} from './shared-forecast-contract.mjs';\nimport {compactForecastMarkup,publishedReadingForecasts,installForecasts} from './reading-detail/forecasts.mjs?v=20261019-compact-all-v1';");const a=s.indexOf('  const forecasts=sharedForecastsForMatch(marketCatalog,match?.id)'),b=s.indexOf('\n}\n',a);s=s.slice(0,a)+`  const forecasts=publishedReadingForecasts(marketCatalog,match?.id);
  if(!forecasts.length)return '';
  const model={competition:'serie-a',fixture:match,forecasts};
  return \`<section class="section reading-shared-forecasts" aria-labelledby="reading-shared-forecasts-title"><header class="section-heading"><h2 id="reading-shared-forecasts-title">Pronostici</h2></header><div data-reading-forecast-content>\${compactForecastMarkup(model)}</div></section>\`;
`+s.slice(b);s=s.replaceAll('20261019-canonical-forecasts-v1','20261019-compact-all-v1');const c=s.indexOf('    if(requestedMatchday===7&&document.querySelector'),d=s.indexOf('\n  if(page==="readings"&&activeReadingMatch)',c);s=s.slice(0,c)+`    if(activeReadingMatch&&publishedReadingForecasts(forecastDataset?.marketCatalog,activeReadingMatch.id).length){
      const context={competition:'serie-a',season:'2026-27',matchday:requestedMatchday};
      const store=createPersonalBetslipStore();personalReadingStore=store;store.setContext(context);
      const latest=(forecastDataset?.marketCatalog?.matches||[]).flatMap(m=>sharedForecastsForMatch(forecastDataset.marketCatalog,m.matchId))
        .map(leg=>({...leg,context}));
      store.reconcile(latest);
      if(!finishReading){const content=document.querySelector('[data-reading-forecast-content]');if(content)installForecasts({competition:'serie-a',fixture:activeReadingMatch,forecasts:publishedReadingForecasts(forecastDataset.marketCatalog,activeReadingMatch.id)},content,document.querySelector('#app'),store);}
    }
`+s.slice(d);return s;});
