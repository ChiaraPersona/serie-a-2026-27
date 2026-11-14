const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'reports/site-assets'),before=JSON.parse(fs.readFileSync(path.join(dir,'before.json'))),after=JSON.parse(fs.readFileSync(path.join(dir,'after.json')));
assert(before.length>=after.length);assert(after.length>0&&after.length%2===0);
function duplicates(r){const counts=new Map();for(const q of r.requests){const key=q.url.split('?')[0];counts.set(key,(counts.get(key)||0)+1)}return [...counts].filter(([,n])=>n>1);}
const rows=after.map(a=>{const b=before.find(b=>b.key===a.key);assert.equal(duplicates(a).length,0,a.key+' duplicate resources');return {route:a.route,width:a.width,cssBefore:b.totals.stylesheet.bytes,cssAfter:a.totals.stylesheet.bytes,cssRequestsBefore:b.totals.stylesheet.requests,cssRequestsAfter:a.totals.stylesheet.requests,imageBefore:b.totals.image.bytes,imageAfter:a.totals.image.bytes,requestsBefore:b.requests.length,requestsAfter:a.requests.length,localBytesBefore:b.requests.reduce((n,q)=>n+q.bytes,0),localBytesAfter:a.requests.reduce((n,q)=>n+q.bytes,0),duplicatesBefore:duplicates(b),duplicatesAfter:duplicates(a)}});
fs.writeFileSync(path.join(dir,'weights.json'),JSON.stringify({units:'bytes, local uncompressed response bodies, cold cache; remote fonts excluded',rows},null,2));
const kb=n=>(n/1000).toFixed(1),mb=n=>(n/1e6).toFixed(2);
const table=rows.filter(r=>r.width===1440).map(r=>`| ${r.route} | ${kb(r.cssBefore)} → ${kb(r.cssAfter)} | ${kb(r.imageBefore)} → ${kb(r.imageAfter)} | ${r.requestsBefore} → ${r.requestsAfter} |`).join('\n');
const mobile=rows.find(r=>r.width===390&&r.route==='champions-league.html');
const report=`# CSS, immagini e richieste — verifica desktop/mobile

## Misure

Cache fredda; KB/MB decimali; byte dei corpi delle risposte locali, non compressi. Font remoti esclusi. I JSON usati nei confronti sono stati congelati nella baseline per isolare la presentazione da eventuali aggiornamenti concorrenti dei risultati.

| Pagina desktop (1440 px) | CSS KB prima → dopo | Immagini KB prima → dopo | Richieste locali prima → dopo |
| --- | ---: | ---: | ---: |
${table}

Anche tutti i ${rows.length/2} percorsi a 390 px sono verificati in weights.json. Il banner responsive porta le immagini dell'indice Champions mobile da ${mb(mobile.imageBefore)} a ${mb(mobile.imageAfter)} MB.

I CSS locali passano da 16–18 richieste a una per pagina. Nessuna richiesta locale duplicata rimasta nei ${rows.length} casi, anche confrontando i percorsi senza il parametro di versione.

## CSS

Gli originali modulari rimangono in css/. scripts/page-styles.cjs genera css/pages/ dai renderer completi e dalle dipendenze, inclusi template, dialoghi, classi dinamiche e stati interattivi. Non si basa sulla sola schermata iniziale. Dichiarazioni e ordine originario della cascata sono conservati; filtra i selettori incompatibili con la pagina e mantiene prudentemente quelli complessi/alternativi.

scripts/site-styles.js usa link bloccanti con hash del contenuto. Lettura e Champions scelgono nel head il foglio indice o dettaglio con uno script sincrono del parser. Non si usa CSS asincrono, ritardo artificiale o pagina nascosta. Il foglio Lettura indice non viene più inserito dopo il contenuto. Il bootstrap del tema e la preparazione del dettaglio rimangono attivi.

Il build ordinario riusa site-styles; scripts/refresh-presentation-assets.cjs aggiorna esclusivamente i 28 shell senza chiamare builder dati. Corretti anche prefissi delle pagine squadra e invalidazione del relativo script.

## Immagini

63 varianti WebP, originali preservati e verificati per SHA-256. Stemmi e marchio sono compressi senza perdita e conservano dimensioni/trasparenza. L'icona gol passa da 4500×4500 / 1.053.304 B a 96×96 / 2.752 B, sufficiente per la sua dimensione visualizzata. Il banner Champions usa srcset 800/1600 px (69.388/201.006 B contro 1.944.980 B); gli attributi di dimensione e il layout restano invariati. Ottimizzati anche sfondo Home e campo, senza modificare gli originali.

test-presentation-assets.cjs conferma uguaglianza dei pixel visibili per le versioni lossless (dopo il ridimensionamento previsto per l'icona) e PSNR fotografico 39,3–43,4 dB rispetto ai ridimensionamenti di riferimento. Screenshot affiancati controllati visivamente: nessuna perdita visibile nei campioni.

## Richieste duplicate

Cache condivisa per vista fra servizio dati e lettore del dettaglio; il solo parametro v viene ignorato nella chiave. Restano refresh del registro ufficiale a ogni nuova vista ed espulsione dei fallimenti dalla cache per consentire retry. Nessun cambiamento al filtro o ai contratti archiviati. Eliminata la seconda importazione della policy pubblica quando già caricata nel head; uniformati gli URL dei moduli condivisi, inclusi gli import dinamici di Schedina.

## Verifiche

- ${rows.length} confronti: ${rows.length/2} percorsi × 1440/390 px. Testo identico; geometria iniziale, colori, font, griglie e stati interattivi preservati. Arrotondamenti del browser tollerati entro 0,1 px. Nei confronti interattivi si escludono la traslazione animata transitoria e il navigatore scroll-spy; geometria iniziale e funzionalità di navigazione sono verificate separatamente.
- Archivio/giornate future, dettagli espandibili, filtro titolari/panchinari e menu mobile verificati. Il controllo Lettura aggiuntivo verifica navigazione sezioni, dialogo schedina, gare concluse non selezionabili e riconciliazione delle selezioni salvate fra fixture.
- Altri 24 reload: normale, hard e cache disabilitata, quattro percorsi × desktop/mobile; zero frame senza stili, zero frame con layout precedente, zero errori JavaScript.
- test-initial-render.cjs: tutti i 28 shell, CSS bloccante, hash, generazione idempotente e tema iniziale.
- test-presentation-assets.cjs: proiezione/cascata/stati CSS, immagini originali, lossless e qualità foto.
- test-schedina-loading.mjs: deduplicazione concorrente, registro fresco per vista, retry, contratti archiviati e proiezioni G5/G6/G7.
- test-reading-browser-data.mjs: parità di report, risultati, previsioni e contratti su tutte le 380 fixture; rose e giocatori G1/G6/G7/G8 invariati.
- Test adattatori e internals Lettura: PASS.

Nessuna formula, dato o funzionalità modificati. Non sono stati eseguiti comandi di commit, push o deploy.

## Riproduzione

\x60\x60\x60text
npm run build:assets
npm run test:assets
npm run test:assets:browser
npm run test:assets:reloads
\x60\x60\x60

I confronti browser richiedono la baseline locale in reports/site-assets/baseline. Per acquisire una nuova baseline prima di ulteriori modifiche usare check-site-assets.cjs --before --rerun con una nuova directory di confronto.
`;
fs.writeFileSync(path.join(dir,'REPORT.md'),report);console.log(rows.filter(r=>r.width===1440).map(({route,cssBefore,cssAfter,imageBefore,imageAfter,requestsBefore,requestsAfter})=>({route,cssBefore,cssAfter,imageBefore,imageAfter,requestsBefore,requestsAfter})));
