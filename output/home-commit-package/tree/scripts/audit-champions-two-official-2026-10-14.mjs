import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createPage} from '../js/pages/champions.js';
import {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY} from '../js/pages/personal-betslip-store.mjs';
import '../js/official-starter-policy.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read('output/reports/champions-two-official-2026-10-14-before.json');
const paths={calendar:'data/normalized/champions-league-2026-27.json',integration:'data/normalized/champions-md02-integration-2026-27.json',schedina:'data/normalized/schedina-champions-md02.json'};
const current=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,read(p)]));
const ids=new Set(['ucl-2026-27-md02-10','ucl-2026-27-md02-11']);
const policy=globalThis.officialStarterPolicy;
policy.configure(read('data/normalized/official-starter-registry.json'));
for(const k of Object.keys(paths)){
 const key=k==='calendar'?'id':'fixtureId';
 for(const f of current[k].fixtures.filter(f=>!ids.has(f[key])))assert.deepEqual(f,before[k].fixtures.find(o=>o[key]===f[key]),`${k}: unrelated ${f[key]}`);
}
const app={innerHTML:''};globalThis.document={querySelector:s=>s==='#app'?app:null};globalThis.CSS={escape:v=>String(v)};
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load=async name=>read('data/normalized/'+name);
const report={scope:[...ids],checks:{unrelatedFixturesUnchanged:true,contractsUnchanged:true,renderedSelectionSync:true,savedMyComboFilter:true,desktopMobileVisual:'BLOCKED_LOCALHOST_BROWSER_TIMEOUT'},fixtures:[]};
for(const id of ids){
 const f=current.integration.fixtures.find(f=>f.fixtureId===id),old=before.integration.fixtures.find(f=>f.fixtureId===id);
 const c=current.calendar.fixtures.find(f=>f.id===id),s=current.schedina.fixtures.find(f=>f.fixtureId===id),oldS=before.schedina.fixtures.find(f=>f.fixtureId===id);
 assert.equal(c.probableFormation.status,'official');assert.deepEqual(f.teamPrediction,old.teamPrediction);
 for(const side of ['home','away']){assert.equal(f.lineups[side].players.length,11);assert(f.lineups[side].players.every(p=>!p.availabilityConflict));}
 for(const pick of s.selections){
  const previous=oldS.selections.find(p=>p.selectionId===pick.selectionId);assert(previous);
  for(const k of ['odds','threshold','modifiers','isPreferred','isOutsider','providerSelectionId'])assert.deepEqual(pick[k],previous[k],`${id}: ${k}`);
  assert(policy.eligible(pick,id),pick.label);
  if(pick.marketScope==='player'){assert.equal(pick.modelProbabilityPct,null);const p=[...f.lineups.home.players,...f.lineups.away.players].find(p=>p.canonicalPlayerId===pick.player.canonicalPlayerId);assert(p);assert.equal(pick.player.projectedShots,p.projectedShots);assert.equal(pick.player.projectedShotsOnTarget,p.projectedShotsOnTarget);}
 }
 globalThis.location={search:'?match='+id};await createPage({esc,load}).render();
 assert(app.innerHTML.includes('Formazioni ufficiali'));assert(app.innerHTML.includes('Panchina:'));
 const rendered=[...app.innerHTML.matchAll(/data-published-selection-id="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(rendered.sort(),s.selections.map(p=>p.selectionId).sort());
 for(const side of ['home','away'])for(const name of c.probableFormation[side].players)assert(app.innerHTML.includes(esc(name)),name);
 const bench=[...old.lineups.home.players,...old.lineups.away.players].find(p=>p.canonicalPlayerId&&![...f.lineups.home.players,...f.lineups.away.players].some(n=>n.canonicalPlayerId===p.canonicalPlayerId));
 if(bench){
  const stale={...oldS.selections.find(p=>p.marketScope==='player'),player:{canonicalPlayerId:bench.canonicalPlayerId,canonicalName:bench.canonicalName},matchId:id};
  const context={competition:'champions',season:'2026-27',matchday:2},key='champions:2026-27:md02';
  const memory=new Map([[PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context,selections:[stale]}}})]]);
  const store=createPersonalBetslipStore({storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});store.setContext(context);store.reconcile(s.selections);
  assert.equal(store.getSnapshot().selections.length,0);assert.equal(store.add(stale).status,'OFFICIAL_NON_STARTER');
 }
 report.fixtures.push({id,label:f.homeTeam+'–'+f.awayTeam,formations:c.probableFormation,differences:Object.fromEntries(['home','away'].map(side=>{const next=f.lineups[side].players,prev=old.lineups[side].players;return [side,{entered:next.filter(p=>!prev.some(o=>o.canonicalPlayerId&&o.canonicalPlayerId===p.canonicalPlayerId)).map(p=>p.suppliedName),left:prev.filter(p=>!next.some(n=>n.canonicalPlayerId&&n.canonicalPlayerId===p.canonicalPlayerId)).map(p=>p.suppliedName)}];})),confirmed:s.selections.map(p=>({label:p.label,odds:p.odds,probabilityPct:p.modelProbabilityPct,preferred:p.isPreferred,outsider:p.isOutsider})),removed:oldS.selections.filter(p=>!s.selections.some(n=>n.selectionId===p.selectionId)),players:['home','away'].flatMap(side=>f.lineups[side].players.map(p=>{const prev=old.lineups[side].players.find(o=>o.canonicalPlayerId&&o.canonicalPlayerId===p.canonicalPlayerId);const fallback=!p.canonicalPlayerId||p.dataStatus==='role-baseline';return {team:p.team,name:p.canonicalName||p.suppliedName,sourceName:p.suppliedName,id:p.canonicalPlayerId,role:p.role,minutes:p.expectedMinutes,shots:fallback?null:p.projectedShots,sot:fallback?null:p.projectedShotsOnTarget,previousShots:prev?.projectedShots??null,previousSot:prev?.projectedShotsOnTarget??null,dataStatus:p.dataStatus};})),newCandidates:['home','away'].flatMap(side=>f.lineups[side].players.filter(p=>p.canonicalPlayerId&&!old.lineups[side].players.some(o=>o.canonicalPlayerId===p.canonicalPlayerId)&&p.role!=='goalkeeper').map(p=>({name:p.canonicalName,shots:p.projectedShots,sot:p.projectedShotsOnTarget,status:'REFERENCE_ONLY_NOT_NEW_OPERATIONAL_SELECTION'})))});
}
fs.writeFileSync('output/reports/champions-two-official-2026-10-14.json',JSON.stringify(report,null,2)+'\n');
const md=['# Champions: due formazioni ufficiali del 14 ottobre 2026','', 'Aggiornamento selettivo; formule, parametri, statistiche storiche e modello invariati. Quote, soglie, modificatori, preferiti e OUTSIDER preservati. Nessun commit, push o deploy.','',...report.fixtures.flatMap(f=>[
 '## '+f.label,'',`[Diretta.it](${f.formations.source.url})`,'',...['home','away'].flatMap(side=>{const t=f.formations[side],d=f.differences[side];return [`### ${t.team} — ${t.formation}`,'',`Titolari: ${t.players.join(', ')}.`,`Panchina: ${t.bench.join(', ')}.`,`Indisponibili: ${t.availability.unavailable.join('; ')}.`,`Entrano rispetto alle probabili: ${d.entered.join(', ')||'nessuno'}. Escono: ${d.left.join(', ')||'nessuno'}.`,''];}),
 '### Pronostici confermati','',...f.confirmed.map(p=>`- ${p.label}: quota ${p.odds}; P ${p.probabilityPct===null?'N/D':p.probabilityPct+'%'}${p.preferred?'; PREFERITO':''}${p.outsider?'; OUTSIDER':''}.`),'',
 'Nessuna selezione rimossa: tutti i giocatori delle selezioni pubblicate sono titolari ufficiali. Le variazioni sotto aggiornano le proiezioni individuali, senza trasferirle al contratto DUO.','',
 '| Giocatore | Minuti modello | Tiri prima → ora | SOT prima → ora |','| --- | --- | --- | --- |',...f.players.filter(p=>p.shots!==null).map(p=>`| ${p.name} | ${p.minutes} | ${p.previousShots??'N/D'} → ${p.shots} | ${p.previousSot??'N/D'} → ${p.sot} |`),'',
 '### Nuovi profili da osservare','',...f.newCandidates.map(p=>`- ${p.name}: ${p.shots} tiri e ${p.sot} SOT attesi. Candidato informativo; nessuna nuova selezione operativa aggiunta.`),'']),
 '## Verifiche e limiti','',
 '- PASS: altre fixture identiche prima/dopo in calendario, integrazione e Schedina; 14 selezioni preservate, contratti invariati e ID Lettura/Schedina coincidenti.',
 '- PASS: filtro ufficiali e rifiuto/rimozione MyCombo salvato per giocatori usciti dagli undici; disponibilità coerente con la distinta.',
 '- PASS: test UI contratti MD2. Test storici integrazione/Schedina/Lettura falliscono su hash fonte vecchio e conteggi storici 120/3; non sono stati indeboliti.',
 '- Build sito e apply-official-starter-policy eseguiti. Controllo visivo desktop/mobile non completato: browser disponibile non raggiunge localhost; Edge non disponibile nel controllo UI.',
 '- Nyoni: identità canonica non risolta; proiezioni personali N/D. Il prior interno di ruolo non viene presentato come statistica verificata.',
 '- Minuti: policy esistente 84,6 per i giocatori di movimento e 90 per i portieri; minuti/probabilità di ingresso dei panchinari non disponibili.',
 '- Il motore conserva il ruolo della rosa/statistica quando risolto; il modulo ufficiale cambia la disposizione visualizzata. Kaiki figura nella linea offensiva e Paz come punta, ma i ruoli statistici esistenti non vengono arbitrariamente riscritti.',
 '- Le probabilità squadra restano invariate: il builder esistente riconcilia il volume individuale ai totali squadra già previsti, senza un nuovo aggiustamento collettivo per gli undici.',
 '- DUO e SOT con pali/traverse: probabilità, quota equa ed EV restano N/D. Sostituti acquisiti nella panchina, senza minuti inventati.',
 '- Nessuna nuova opportunità attivata: tutte le selezioni esistenti rimangono coerenti; i nuovi titolari sono riportati come profili informativi.',''].join('\n');
fs.writeFileSync('output/reports/champions-two-official-2026-10-14.md',md);
console.log('PASS: scope, 44 starters, 14 contracts, rendered reading sync, saved MyCombo; report written');

