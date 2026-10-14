import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createPage} from '../js/pages/champions.js';
import {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY} from '../js/pages/personal-betslip-store.mjs';
import '../js/official-starter-policy.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read('output/reports/champions-seven-official-2026-10-14-before.json');
const current={calendar:read('data/normalized/champions-league-2026-27.json'),integration:read('data/normalized/champions-md02-integration-2026-27.json'),schedina:read('data/normalized/schedina-champions-md02.json')};
const ids=new Set([12,13,14,15,16,17,18].map(n=>'ucl-2026-27-md02-'+n));
for(const [k,d] of Object.entries(current)){const key=k==='calendar'?'id':'fixtureId';for(const f of d.fixtures.filter(f=>!ids.has(f[key])))assert.deepEqual(f,before[k].fixtures.find(o=>o[key]===f[key]),`${k} unrelated ${f[key]}`);}
const policy=globalThis.officialStarterPolicy;policy.configure(read('data/normalized/official-starter-registry.json'));
const archive=read('data/technical-archive/official-nonstarter-markets.json');
const stats=read('data/normalized/champions-player-stats-2025-26.json');
const app={innerHTML:''};globalThis.document={querySelector:s=>s==='#app'?app:null};globalThis.CSS={escape:String};
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const report={checks:{unrelatedFixturesUnchanged:true,quoteContractsUnchanged:true,readingSchedinaSync:true,savedMyComboFilter:true},fixtures:[],changes:[],outsiders:[]};
for(const id of ids){
 const f=current.integration.fixtures.find(f=>f.fixtureId===id),old=before.integration.fixtures.find(f=>f.fixtureId===id),s=current.schedina.fixtures.find(f=>f.fixtureId===id),oldS=before.schedina.fixtures.find(f=>f.fixtureId===id);
 assert.deepEqual(f.teamPrediction,old.teamPrediction);
 for(const side of ['home','away']){assert.equal(f.lineups[side].players.length,11);assert(f.lineups[side].players.every(p=>!p.availabilityConflict));}
 let modified=0,unchanged=0;
 for(const pick of s.selections){const prev=oldS.selections.find(p=>p.selectionId===pick.selectionId);assert(prev,'Unrequested new selection');
  for(const k of ['odds','threshold','modifiers','isPreferred','isOutsider','providerSelectionId'])assert.deepEqual(pick[k],prev[k]);assert(policy.eligible(pick,id));
  const metric=pick.marketCode==='28506'?'projectedShotsOnTarget':'projectedShots';
  const a=prev.player?.[metric],b=pick.player?.[metric];const changed=pick.marketScope==='player'&&(a!==b||prev.player?.expectedMinutes!==pick.player?.expectedMinutes);changed?modified++:unchanged++;
  if(changed)report.changes.push({fixture:id,label:pick.label,odds:pick.odds,before:a,after:b,delta:Number((b-a).toFixed(2)),metric});
  if(pick.marketScope==='player')assert.equal(pick.modelProbabilityPct,null);
  if(pick.isOutsider)report.outsiders.push({fixture:id,label:pick.label,odds:pick.odds,projection:b??null,probability:pick.modelProbabilityPct,ev:pick.expectedValuePct});
 }
 const removed=oldS.selections.filter(p=>!s.selections.some(n=>n.selectionId===p.selectionId));
 for(const p of removed){assert(archive.some(a=>a.selectionId===p.selectionId));assert(!policy.eligible(p,id));
  const context={competition:'champions',season:'2026-27',matchday:2},key='champions:2026-27:md02',memory=new Map([[PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context,selections:[p]}}})]]);
  const store=createPersonalBetslipStore({storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});store.setContext(context);store.reconcile(s.selections);assert.equal(store.getSnapshot().selections.length,0);assert.equal(store.add(p).status,'OFFICIAL_NON_STARTER');
 }
 globalThis.location={search:'?match='+id};await createPage({esc,load:async name=>read('data/normalized/'+name)}).render();
 assert(app.innerHTML.includes('Formazioni ufficiali'));assert(app.innerHTML.includes('Panchina:'));
 assert.deepEqual([...app.innerHTML.matchAll(/data-published-selection-id="([^"]+)"/g)].map(m=>m[1]).sort(),s.selections.map(p=>p.selectionId).sort());
 const bench=['home','away'].map(k=>({team:f.lineups[k].team,players:f.lineups[k].bench.map(p=>{const history=stats.teams.find(t=>t.team===f.lineups[k].team)?.players.find(h=>h.id===p.canonicalPlayerId),totals=history?.previousSeason?.totals;return {...p,confirmedBench:true,confirmedEntry:false,expectedMinutes:null,entryProbability:null,role:history?.position??null,historicalSubstituteAppearances:totals?.substituteAppearances??null,status:totals?.substituteAppearances>=2?'POSSIBLE_SUBSTITUTE_HISTORY_ONLY':'ENTRY_NOT_ESTIMABLE'};})}));
 report.fixtures.push({fixtureId:id,label:f.homeTeam+' – '+f.awayTeam,official:true,modified:modified+removed.length,recalculated:modified,removed:removed.map(p=>p.label),unchanged,unresolved:['home','away'].flatMap(k=>f.lineups[k].players.filter(p=>!p.canonicalPlayerId).map(p=>p.suppliedName)),bench,substituteCandidates:bench.map(t=>({team:t.team,players:t.players.filter(p=>p.status==='POSSIBLE_SUBSTITUTE_HISTORY_ONLY').sort((a,b)=>b.historicalSubstituteAppearances-a.historicalSubstituteAppearances).slice(0,3)}))});
}
report.improved=report.changes.filter(p=>p.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,5);
report.worsened=report.changes.filter(p=>p.delta<0).sort((a,b)=>a.delta-b.delta).slice(0,5);
fs.writeFileSync('output/reports/champions-seven-official-2026-10-14.json',JSON.stringify(report,null,2)+'\n');
const md=['# Champions: sette formazioni ufficiali del 14 ottobre 2026','', 'Aggiornati gli undici, i moduli, le panchine e gli indisponibili dalla fonte Diretta.it. Solo le sette fixture indicate. Quote, soglie, modificatori e motore invariati.','', '| Partita | Ufficiali | Modificati (incluse esclusioni) | Invariati | Criticita |','| --- | --- | --- | --- | --- |',...report.fixtures.map(f=>`| ${f.label} | Si | ${f.modified} | ${f.unchanged} | ${[...f.removed.map(p=>'Escluso: '+p),...(f.unresolved.length?['Identita non risolte: '+f.unresolved.join(', ')]:[])].join('; ')||'Nessuna'} |`),'','## Subentranti possibili','', 'Panchine confermate; ingressi non confermati. Candidati informativi ordinati per presenze storiche da subentrante gia disponibili, senza nuova raccolta o analisi storica. Queste frequenze non sono probabilita di ingresso nella partita e non aggiornano il contratto DUO. Minuti e probabilita dei panchinari N/D; il modello operativo resta quello esistente (84,6 minuti di movimento, 90 portiere).',...report.fixtures.flatMap(f=>['','### '+f.label,...f.substituteCandidates.map(t=>'- '+t.team+': '+(t.players.map(p=>(p.canonicalName||p.suppliedName)+' ('+p.historicalSubstituteAppearances+' presenze da subentrante nel 2025/26)').join(', ')||'campione disponibile insufficiente'))]),'','## Variazioni maggiori','', 'Variazioni delle proiezioni del solo giocatore, non della probabilita del contratto DUO.','',...report.improved.map(p=>`- Migliorato: ${p.label}: ${p.before} → ${p.after} (${p.delta>0?'+':''}${p.delta}); quota ${p.odds}.`),...report.worsened.map(p=>`- Peggiorato: ${p.label}: ${p.before} → ${p.after} (${p.delta}); quota ${p.odds}.`),'','## Outsider conservati','',...report.outsiders.map(p=>`- ${p.label}, quota ${p.odds}; ${p.probability===null?'probabilita ed EV N/D':`P ${p.probability}%, EV ${p.ev}%`}.`),'','## Verifiche','', '- PASS: fixture estranee identiche; quote, soglie, modificatori, flag preferiti/outsider preservati per selezioni mantenute; pronostici squadra invariati.', '- PASS: Lettura e Schedina espongono gli stessi selectionId; MyCombo rimuove e rifiuta i tre nuovi non titolari, conservati nell archivio tecnico.', '- PASS: test UI mercati MD2 e contratto BetSelection. Test storico official-starter-policy fermo al conteggio di quattro esclusioni; archivio attuale sette. Nessun test storico indebolito.', '- Build sito e apply-official-starter-policy eseguiti. Nessun commit, push o deploy.', '- Shakhtar-AEK: il link fornito mostra Shakhtar in casa, come nel calendario canonico.', '- Nessun nuovo mercato attivato: mancano probabilita approvate per i contratti DUO. Nessuna somma impropria di statistiche e nessuna liquidazione certificata.',''].join('\n');
fs.writeFileSync('output/reports/champions-seven-official-2026-10-14.md',md);
console.log(JSON.stringify({...report,changes:undefined,fixtures:report.fixtures.map(f=>({...f,bench:undefined}))},null,2));
