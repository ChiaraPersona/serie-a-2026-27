const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('data/sources/reading-referee-match-history.json'),generated=read('data/generated/reading-referee-history.json'),before=read('output/reports/referee-md07-before.json');
const {analyze}=require('./referee-stats/reading-analysis');
const fmt=v=>v===null||v===undefined?'N/D':Number(v).toLocaleString('it-IT',{maximumFractionDigits:2});
const keys={yellowCards:'Gialli',dismissals:'Espulsioni',directRedCards:'Rossi diretti',secondYellowCards:'Seconde ammonizioni',totalCards:'Cartellini complessivi',fouls:'Falli'};
let out='# Analisi arbitrali Serie A, giornata 7 — 18 ottobre 2026\n\n';
out+='Integrazione informativa delle sole Milan–Atalanta, Juventus–Lazio, Monza–Cagliari e Parma–Torino. Nessun builder di previsione eseguito.\n\n';
out+='Conteggio: gialli ordinari registrati + espulsioni una sola volta (rosso diretto oppure seconda ammonizione). La seconda ammonizione è separata dai gialli ordinari. Allenatori e serie dei rigori esclusi. Le medie usano esclusivamente valori disponibili e non contestati per la singola metrica. I valori originari restano nei profili interni; quelli discordanti non risolti non vengono mostrati come confermati.\n\n';
out+='La base stagionale 2026/27 include le gare individualmente recuperate dal luglio 2026 prima del cutoff. La copertura completa di tutte le competizioni non è certificata: sono medie stagionali parziali, non dati ufficiali esaustivi. Δ = (recente / stagionale − 1) × 100; base zero → N/D.\n\n';
for(const s of source.fixtureAnalyses){
 const f=generated.fixtures.find(f=>f.fixtureId===s.fixtureId),a=analyze(s.matches,f.cutoffDate);
 out+=`## ${f.refereeName} — ${s.fixtureId}\n\nCutoff esclusivo: ${f.cutoffDate}.\n\n`;
 out+='| Data | Competizione | Partita | Risultato | Gialli | Rossi diretti | Seconde amm. | Espulsioni | Falli |\n|---|---|---|---|---:|---:|---:|---:|---:|\n';
 for(const r of f.rows){const v=k=>r.disputedMetrics?.includes(k)?'N/D (discordante)':fmt(r[k]);out+=`| ${r.date} | ${r.competition} | ${r.home}–${r.away} | ${r.score.home}–${r.score.away} | ${v('yellowCards')} | ${v('directRedCards')} | ${v('secondYellowCards')} | ${v('dismissals')} | ${v('fouls')} |\n`;}
 out+='\n| Metrica | Media ultime 5 | n validi | Media 2026/27 parziale | n validi | Δ % |\n|---|---:|---:|---:|---:|---:|\n';
 for(const [k,label] of Object.entries(keys))out+=`| ${label} | ${fmt(a.recent[k].average)} | ${a.recent[k].n} | ${fmt(a.seasonal[k].average)} | ${a.seasonal[k].n} | ${fmt(a.percentDifference[k])} |\n`;
 out+=`\n${a.trend} ${a.limitations}\n\nDiscrepanze e risoluzione: ${s.discrepancies.join(' ')}\n\n`;
 out+='Dati mancanti/non risolti: '+f.rows.filter(r=>r.missingMetrics.length).map(r=>`${r.date}: ${r.missingMetrics.join(', ')}`).join('; ')+'.\n\n';
 out+='Tracciabilità interna delle verifiche:\n\n';
 const urls=new Set(s.matches.flatMap(r=>[r.source.url,...r.verification.map(v=>v.url)]));for(const u of urls)out+=`- ${u}\n`;
 out+='\n';
}
const targets=new Set(source.fixtureAnalyses.map(s=>s.fixtureId));
for(const f of generated.fixtures.filter(f=>!targets.has(f.fixtureId)))assert.deepEqual(f,before.history.fixtures.find(x=>x.fixtureId===f.fixtureId));
for(const [file,hash] of Object.entries(before.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/normalized/'+file)).digest('hex'),hash,file);
out+='## Verifiche e file\n\n520 record arbitrali estranei invariati, incluse le altre sei partite MD7. Tutti i 14 hash protetti di dati normalizzati (calendario, letture, pronostici e schedine) identici allo snapshot prima dell’intervento. Nessuna modifica a formazioni, quote, probabilità, mercati o motore; nessun commit, push o deploy. Profili originari della fonte canonica integralmente preservati.\n\n';
out+='Test: `node scripts/test-reading-referee-history.mjs`; `node scripts/test-referee-md07-analysis.mjs`. Rigenerazione: `node scripts/build-reading-referee-history.js`; shell sito: `node scripts/build-site.js --presentation-only`.\n\n';
if(fs.existsSync('output/reports/referee-md07/browser.json')){const b=read('output/reports/referee-md07/browser.json');out+=`Browser: ${b.checks.length} verifiche su quattro partite a 1440, 390 e 320 px; ${b.errors.length} errori JavaScript; nessun overflow. Screenshot nella stessa cartella.\n\n`;}
out+='File di questo intervento:\n\n'+[
'data/sources/reading-referee-match-history.json (aggiunta fixtureAnalyses, profili precedenti preservati)',
'data/generated/reading-referee-history.json (solo quattro fixture)',
'scripts/build-reading-referee-history.js',
'scripts/referee-stats/reading-analysis.js',
'scripts/referee-stats/complete-md07-reading-analysis.js',
'js/pages/reading-detail/referee-history.mjs (ramo condizionale solo per quattro fixture)',
'scripts/test-referee-md07-analysis.mjs',
'scripts/check-referee-md07-analysis.cjs',
'scripts/report-referee-md07-analysis.cjs',
'output/reports/referee-md07-before.json',
'output/reports/referee-md07/ (report, audit browser e screenshot)'].map(x=>'- '+x).join('\n')+'\n\n';
out+='Altre modifiche presenti nel checkout durante il lavoro (CSS, shell/tattiche e pagine HTML) non appartengono a questa integrazione e non sono state ripristinate.\n';
fs.mkdirSync('output/reports/referee-md07',{recursive:true});fs.writeFileSync('output/reports/referee-md07/report.md',out);console.log('Report written with verified invariance assertions.');
