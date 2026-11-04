import {esc,number} from './format.mjs?v=20261022-assets-v1';
import {createReadingView} from './view-model.mjs?v=20261022-assets-v1';
import {mountReadingShell,prepareReadingShell} from './shell.mjs?v=20261104-tactical-profiles-v3';

// Adapt existing MD3 artifacts for the shared presentation; never recalculate them.
export async function mountChampionsReading({fixture,prediction,probableFixture,branding,analysis,refereeMarkup,probableMarkup,extend}){
 const side=name=>({name,...branding.get(name)});
 const model=createReadingView({competition:'champions',fixture,home:side(fixture.homeTeam),away:side(fixture.awayTeam),prediction:{...prediction,scoreForecast:{...prediction.scoreForecast,display:prediction.scoreForecast?.display||[prediction.scoreForecast?.primary,...(prediction.scoreForecast?.alternatives||[])].filter(Boolean)}},quality:prediction.dataQuality,analysis});
 const prepared=await prepareReadingShell(model);
 if(probableFixture)prepared.evidence.lineups=probableFixture.teams.map((t,i)=>({side:[model.home,model.away][i],formation:t.formation,status:t.status,coach:t.coach||prepared.evidence.lineups[i]?.coach?.replace(/-+$/,'').trim()||null,players:t.players.filter(p=>p.projectedRole==='starter').map(p=>({id:p.playerId,name:p.canonicalName||p.sourceName,shirtNumber:p.shirtNumber,source:p})),bench:t.players.filter(p=>p.projectedRole==='bench').map(p=>p.canonicalName||p.sourceName),benchPlayers:t.players.filter(p=>p.projectedRole==='bench').map(p=>({id:p.playerId,name:p.canonicalName||p.sourceName,shirtNumber:p.shirtNumber,source:p})),benchPlayerIds:t.players.filter(p=>p.projectedRole==='bench').map(p=>p.playerId)}));
 const root=document.querySelector('#app');
 const draft=document.createElement('div');draft.innerHTML=refereeMarkup;
 root.innerHTML='<div class="reading-back"><a href="champions-league.html">← Letture Champions League</a></div><div class="reading-match-hero"></div>';
 const referee=draft.querySelector('.reading-referee-assignment');
 if(referee){
   const sample=document.createElement('div');sample.className='champions-reading-referee-detail';
   for(const node of [...referee.querySelectorAll('.rf-season,.rf-indicators,.rf-note')])sample.append(node);
   referee.append(sample);root.append(referee);
 }
 await mountReadingShell(model,root,{prepared,extend:async context=>{
   const scenario=context.groups.get('scenario').lastElementChild;
   if(probableMarkup){
     const draft=document.createElement('div');draft.innerHTML=probableMarkup;
     const content=context.groups.get('giocatori').lastElementChild;
     // Retain every MD3 projection, availability notice and expandable statistic.
     const columns=draft.querySelector('.rd-player-columns');
     if(columns){
       content.replaceChildren();
       const toolbar=document.createElement('div');toolbar.className='rd-player-toolbar';toolbar.innerHTML='<div class="rd-player-mode" role="group" aria-label="Filtra per formazione"><button type="button" data-player-lineup-filter="starter" aria-pressed="true">Titolari</button><button type="button" data-player-lineup-filter="bench" aria-pressed="false">Panchinari</button></div>';
       content.append(toolbar,columns);
       columns.querySelectorAll('.rd-player-team').forEach(team=>{
         const extra=document.createElement('details');extra.className='rd-disclosure';extra.innerHTML='<summary>Disponibilità e rosa</summary>';
         for(const child of [...team.children])if(child.matches('p,h4,[data-md3-potential-bench]'))extra.append(child);
         team.append(extra);
       });
       columns.querySelectorAll('.rd-row-identity > small').forEach(note=>note.closest('details').querySelector('.rd-player-expanded').prepend(note));
       const note=draft.querySelector('.rd-section-content > p');if(note)context.groups.get('formazioni').lastElementChild.prepend(note);
       columns.querySelectorAll('[data-md3-probable-player]').forEach(row=>{row.dataset.playerCard='';row.dataset.playerLineup=row.dataset.projectedRole;});
       const filter=active=>{
         columns.querySelectorAll('[data-player-card]').forEach(row=>row.hidden=row.dataset.playerLineup!==active);
         toolbar.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.playerLineupFilter===active)));
       };
       toolbar.addEventListener('click',event=>{const button=event.target.closest('[data-player-lineup-filter]');if(button)filter(button.dataset.playerLineupFilter);});filter('starter');
     }
   }
   if(extend)await extend(context);
 }});
}
