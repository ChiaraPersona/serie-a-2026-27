// Internal retrospective audit. Never runs forecast builders or edits publication.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {settleMd3Leg} from '../../js/pages/champions-md3-results.mjs';
const require=createRequire(import.meta.url);
const {zonedLocalToUtc}=require('../champions/complete-forecast-snapshots.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const destination=path.join(root,'data/analysis/champions/suggestion-prudence-2026-11-25');
const inputs=new Map();
const read=p=>{const bytes=fs.readFileSync(path.join(root,p));inputs.set(p,crypto.createHash('sha256').update(bytes).digest('hex'));return JSON.parse(bytes)};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>finite(n)?Number(n.toFixed(3)):null;
function duo(l){const m=l.betSelection?.market||{},s=m.bookmakerSemantics||{},a=m.modifiers||l.modifiers||{};return s.duo===true||s.substituteIncluded===true||s.modifiers?.replacementIncluded===true||a.replacementIncluded===true||a.duo===true||l.replacementIncluded===true||/DUO|sostitut/i.test(`${l.market} ${l.label}`)}
function family(l){
 const text=`${l.marketFamily||''} ${l.market||''}`.toLowerCase();
 if(duo(l))return /porta|target|sot/.test(text)?'SOT DUO':/cartell|ammon/.test(text)?'Cartellini DUO':'Tiri DUO';
 if(l.marketScope==='player'||l.playerId||/individual|giocatore/.test(text))return /porta|sot/.test(text)?'SOT individuali':'Tiri individuali';
 if(/corner/.test(text))return 'Corner';
 if(/porta|sot/.test(text))return 'SOT';
 if(/tiri/.test(text))return 'Tiri';
 if(/risultato|1x2|doppia chance/.test(text))return 'Risultati';
 if(/cartell|ammon/.test(text))return 'Cartellini';
 return 'Gol e altri';
}
function probability(l){if(duo(l))return null;const p=l.betSelection?.evaluation?.modelProbabilityPct??l.modelProbabilityPct??(finite(l.modelProbability)?l.modelProbability*100:null);return finite(p)&&p>=0&&p<=100?p:null}
// Selection has no access to outcomes. A missing probability always means abstention.
export function choose(rows,{minimum=60,maximumOdds=Infinity,onePerFixture=false}={}){
 const eligible=rows.filter(r=>!r.duo&&finite(r.p)&&r.p>=minimum&&r.quoteVerified&&finite(r.odds)&&r.odds>1&&r.odds<=maximumOdds);
 if(!onePerFixture)return eligible;
 const groups=new Map();for(const r of eligible){const old=groups.get(r.fixtureId);if(!old||r.p>old.p||(r.p===old.p&&r.id.localeCompare(old.id)<0))groups.set(r.fixtureId,r)}
 return [...groups.values()];
}
function summarize(rows){
 const settled=rows.filter(r=>['won','lost'].includes(r.status)),modelled=settled.filter(r=>finite(r.p));
 const won=settled.filter(r=>r.status==='won').length,priced=settled.filter(r=>finite(r.odds)&&r.odds>1),quotes=rows.filter(r=>finite(r.odds)&&r.odds>1),profit=priced.reduce((s,r)=>s+(r.status==='won'?r.odds-1:-1),0);
 return {n:rows.length,fixtures:new Set(rows.map(r=>r.fixtureId)).size,won,lost:settled.length-won,void:rows.filter(r=>r.status==='void').length,excluded:rows.filter(r=>r.status==='excluded').length,unresolved:rows.filter(r=>!['won','lost','void','excluded'].includes(r.status)).length,hitPct:settled.length?round(100*won/settled.length):null,meanOdds:quotes.length?round(quotes.reduce((s,r)=>s+r.odds,0)/quotes.length):null,pricedSettledN:priced.length,missingOdds:rows.length-quotes.length,profitUnits:priced.length?round(profit):null,roiSettledPct:priced.length?round(100*profit/priced.length):null,probabilityN:modelled.length,meanProbabilityPct:modelled.length?round(modelled.reduce((s,r)=>s+r.p,0)/modelled.length):null,observedProbabilityPct:modelled.length?round(100*modelled.filter(r=>r.status==='won').length/modelled.length):null,brier:modelled.length?round(modelled.reduce((s,r)=>s+(r.p/100-Number(r.status==='won'))**2,0)/modelled.length):null};
}
function grouped(rows,key){return Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,summarize(rows.filter(r=>key(r)===k))]))}
export async function run(){
 const calendar=read('data/normalized/champions-league-2026-27.json');
 const rows=[],inventory=[];
 for(let md=1;md<=5;md++){
  const suffix=String(md).padStart(2,'0'),catalog=read(`data/normalized/schedina-champions-md${suffix}.json`),results=read(`data/sources/champions-results-md${suffix}-2026-27.json`);
  let published=[];
  if(md===1)published=catalog.slips.flatMap(s=>s.legs);
  else if(md===2)published=catalog.fixtures.flatMap(f=>f.selections);
  else published=catalog.marketCatalog.matches.flatMap(m=>m.selections.filter(l=>(m.suggestions||[]).includes(l.selectionId)));
  const all=catalog.marketCatalog?.matches.flatMap(m=>m.selections)||published;
  inventory.push({matchday:md,resultFixtures:results.fixtures.length,publishedOccurrences:published.length,catalogCandidates:all.length,generatedAt:catalog.generatedAt||null});
  const seen=new Set();
  for(const leg of published){
   const fixtureId=leg.matchId||leg.fixtureId,fixture=calendar.fixtures.find(f=>f.id===fixtureId),report=results.fixtures.find(f=>f.fixtureId===fixtureId);if(!fixture||!report)continue;
   const id=leg.selectionId||[fixtureId,leg.providerMarketId,leg.providerSelectionId].join(':');if(seen.has(id))continue;seen.add(id);
   const providerId=leg.betSelection?.identity?.providerSelectionId||leg.providerSelectionId;
   const exact=report.verifiedSelections?.find(s=>providerId?String(s.providerSelectionId)===String(providerId):s.selectionId===id);
   // Reuse the existing contract settlement adapter; do not infer missing observations.
   const settlement=exact?.settlement||(['won','lost','void','excluded'].includes(leg.settlement?.status)?leg.settlement:settleMd3Leg(leg,{...fixture,matchday:3,matchReport:report,status:'finished',score:report.score}));
   const rawOdds=leg.betSelection?.quote?.decimal??leg.odds;
   const odds=finite(rawOdds)&&rawOdds>1?rawOdds:null;
   const kickoff=zonedLocalToUtc(fixture.date,fixture.kickoff,fixture.timezone||'Europe/Rome');
   const quoteAt=leg.betSelection?.quote?.verifiedAt||catalog.oddsRetrievedAt;
   const quoteVerified=Boolean(providerId&&(leg.betSelection?.identity?.providerMarketId||leg.providerMarketId)&&finite(Date.parse(quoteAt))&&Date.parse(quoteAt)<Date.parse(kickoff));
   const forecastAt=leg.betSelection?.evaluation?.provenance?.asOf||leg.betSelection?.evaluation?.provenance?.predictionGeneratedAt||catalog.generatedAt||null;
   rows.push({id,fixtureId,matchday:md,date:fixture.date,family:family(leg),label:leg.label,duo:duo(leg),p:probability(leg),odds,status:settlement.status||'unavailable',quoteVerified,quoteAt,forecastAt,forecastChronology:finite(Date.parse(forecastAt))&&Date.parse(forecastAt)<Date.parse(kickoff)?'TIMESTAMP_PRE_KICKOFF_NOT_IMMUTABLE_PROOF':'UNPROVEN_OR_AFTER_KICKOFF',threshold:leg.betSelection?.market?.threshold??leg.threshold??null,direction:leg.selection,catalogOrigin:leg.catalogOrigin||null});
  }
 }
 const policies=[{name:'Pubblicato',baseline:true},{name:'Solo_probabilita_e_quote',minimum:0},...[55,60,65,70,75].map(minimum=>({name:`P${minimum}`,minimum})),{name:'P65_quota_max3',minimum:65,maximumOdds:3},{name:'P65_una_per_gara',minimum:65,onePerFixture:true}];
 const comparisons=policies.map(policy=>{const selected=policy.baseline?rows:choose(rows,policy);return {policy,overall:summarize(selected),byMatchday:grouped(selected,r=>String(r.matchday)),byFamily:grouped(selected,r=>r.family),abstention:{removed:rows.length-selected.length,fixturesWithoutSelections:[...new Set(rows.map(r=>r.fixtureId))].filter(id=>!selected.some(r=>r.fixtureId===id)).length},selectedIds:selected.map(r=>r.id)}});
 const volume=rows.filter(r=>['Corner','Tiri','SOT'].includes(r.family)&&!r.duo);
 const bins=grouped(rows.filter(r=>finite(r.p)),r=>`${Math.min(90,Math.floor(r.p/10)*10)}-${Math.min(100,Math.floor(r.p/10)*10+10)}`);
 const report={schemaVersion:1,createdAt:new Date().toISOString(),status:'RETROSPECTIVE_DIAGNOSTIC_NO_POLICY_PROMOTED',inventory,baseline:{overall:summarize(rows),byMatchday:grouped(rows,r=>String(r.matchday)),byFamily:grouped(rows,r=>r.family),byMatchdayFamily:grouped(rows,r=>`${r.matchday}:${r.family}`),probabilityBins:bins,probabilityBinsByMatchday:grouped(rows.filter(r=>finite(r.p)),r=>`${r.matchday}:${Math.min(90,Math.floor(r.p/10)*10)}`),chronology:grouped(rows,r=>r.forecastChronology)},volumeOnly:policies.map(p=>({policy:p.name,...summarize(p.baseline?volume:choose(volume,p)),byMatchday:grouped(p.baseline?volume:choose(volume,p),r=>String(r.matchday))})),comparisons,limitations:[
 'MD1-3 hanno criteri e modelli differenti da MD4-5: i totali non sono una validazione omogenea.',
 'MD4 è un confronto storico; MD5 era già osservata prima di questo audit e non è un holdout incontaminato. Nessuna soglia è scelta come vincente.',
 'I timestamp sono indicatori di cronologia, non prova di snapshot prepartita immutabili. Cataloghi correnti possono contenere revisioni; i risultati restano diagnostici.',
 'Simulazioni solo di filtraggio/astensione sui suggerimenti archiviati: nessuna nuova soglia inferiore e nessun UNDER ricostruito. Il catalogo non conserva tutte le alternative dei volumi.',
 'Le probabilità DUO sono forzate a null anche negli archivi legacy che riportavano la probabilità del singolo.',
 'ROI teorico a 1 unità per singola, solo esiti won/lost; esiti mancanti, void ed esclusi separati. Non è rendimento di multiple né liquidazione certificata.',
 'Le quote mancanti restano null: il ROI usa soltanto gli esiti con quota disponibile (pricedSettledN). Le verifiche già archiviate sono conservate; gli altri esiti usano l’adattatore contrattuale esistente, senza nuovi lookup approssimativi.',
 'Eventi della stessa partita correlati: numero selezioni non equivale a numero di osservazioni indipendenti.',
 'Nessuna formula, quota, soglia o selezione operativa modificata. Astensione sperimentale, non applicata al sito.'
 ],inputs:Object.fromEntries(inputs)};
 fs.mkdirSync(destination,{recursive:true});
 assert.equal(rows.filter(r=>r.matchday===5&&r.status==='won').length,58);
 assert.equal(rows.filter(r=>r.matchday===5&&r.status==='lost').length,79);
 assert(rows.filter(r=>r.duo).every(r=>r.p===null));
 assert.equal(choose(volume.filter(r=>r.matchday===5),{minimum:65}).length,0);
 fs.writeFileSync(path.join(destination,'results.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(destination,'selections.json'),JSON.stringify(rows,null,2)+'\n');
 const fmt=n=>n===null?'N/D':String(n);
 const table=(items)=>['| Regola | N | Vinte | Perse | Escluse | N/D | Quote mancanti | Successo % | ROI singole % |','|---|---:|---:|---:|---:|---:|---:|---:|---:|',...items.map(({name,s})=>`| ${name} | ${s.n} | ${s.won} | ${s.lost} | ${s.excluded} | ${s.unresolved} | ${s.missingOdds} | ${fmt(s.hitPct)} | ${fmt(s.roiSettledPct)} |`)].join('\n');
 let md='# Champions: prudenza dei suggerimenti e astensione\n\nAudit interno del 25 novembre 2026. Nessun aggiornamento al sito.\n\n## 1. Confronto delle giornate\n\n'+table(Object.entries(report.baseline.byMatchday).map(([name,s])=>({name:'MD'+name,s})))+'\n\n### Famiglie separate\n\n'+table(Object.entries(report.baseline.byFamily).map(([name,s])=>({name,s})))+'\n\n## 2. Simulazioni prudenti\n\nP55–P75: probabilità minima, quota identificata e antecedente al calcio d’inizio, DUO esclusi. Stessa selezione e quota originali. Sono filtri, non nuove previsioni.\n\n';
 for(const day of ['4','5'])md+=`### MD${day} — ${day==='4'?'confronto storico':'diagnostica già osservata, non holdout'}\n\n`+table(comparisons.map(c=>({name:c.policy.name,s:c.byMatchday[day]||summarize([])})))+'\n\n';
 md+='### Soli volumi di squadra/partita: corner, tiri e SOT\n\n'+table(report.volumeOnly.map(s=>({name:s.policy,s})))+'\n\n';
 for(const day of [4,5])md+=`### Volumi MD${day}\n\n`+table(policies.map(p=>{const subset=volume.filter(r=>r.matchday===day);return {name:p.name,s:summarize(p.baseline?subset:choose(subset,p))}}))+'\n\n';
 const yesterday=volume.filter(r=>r.matchday===5),p60=summarize(choose(yesterday,{minimum:60}));
 md+=`### Riscontro diagnostico\n\nMD5: ${summarize(yesterday).won} positivi su ${yesterday.length} suggerimenti di volume. P60 lascia ${p60.n} selezioni, ${p60.won} positive e ${p60.lost} negative; P65 si astiene completamente sui volumi. Aumentare la probabilità minima non corregge da solo eventuali errori nelle stime e non dimostra rendimento migliore. Nessuna soglia viene promossa.\n\n`;
 md+='## 3. Astensione\n\n'+comparisons.filter(c=>!c.policy.baseline).map(c=>`- ${c.policy.name}: ${c.abstention.removed} suggerimenti rimossi; ${c.abstention.fixturesWithoutSelections} gare senza suggerimenti.`).join('\n')+'\n\n## Limiti e passo successivo\n\n'+report.limitations.map(s=>'- '+s).join('\n')+'\n\nCongelare tutte le regole simulate prima di nuove gare; acquisire l’intero insieme di contratti alternativi con quote e distribuzioni prepartita. Valutare successivamente almeno per famiglia e giornata, senza selezionare adesso la percentuale che ha reso meglio. Il filtro permette già zero selezioni per gara/famiglia; nessun riempimento obbligatorio.\n\nRiproduzione: `node scripts/research/champions-suggestion-prudence.mjs`. Evidenze e hash: `results.json`; singole selezioni: `selections.json`.\n';
 fs.writeFileSync(path.join(destination,'report.md'),md);
 for(const [p,hash] of inputs)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'),hash,'Audit mutated input '+p);
 console.log(JSON.stringify({destination,baseline:report.baseline.overall,byMatchday:report.baseline.byMatchday,volumeOnly:report.volumeOnly,inputsUnchanged:true}));
 return report;
}
if(process.argv.includes('--self-test')){
 const base={fixtureId:'f',p:70,quoteVerified:true,odds:1.5,duo:false};
 const sample=[{...base,id:'a',status:'lost'},{...base,id:'b',p:60,status:'won'},{...base,id:'c',p:null,duo:true,status:'won'}];
 assert.deepEqual(choose(sample,{minimum:65}).map(r=>r.id),['a']);
 assert.deepEqual(choose(sample.map(r=>({...r,status:r.status==='won'?'lost':'won'})),{minimum:65}).map(r=>r.id),['a']);
 assert.equal(choose(sample,{minimum:75}).length,0);
 assert.equal(choose(sample,{minimum:55,onePerFixture:true})[0].id,'a');
 assert.equal(choose([{...base,id:'x',quoteVerified:false}]).length,0);
 assert.equal(probability({market:'DUO',modelProbabilityPct:99}),null);
 assert.equal(summarize([{...base,status:'unavailable'}]).roiSettledPct,null);
 console.log('PASS: outcome-independent selection, abstention, one per fixture, quote gate, DUO null, missing outcomes');
}else if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
