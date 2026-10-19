const fs=require('fs'),p=require('path'),out='reports/post-phase5-fixes-20261019',integrity=JSON.parse(fs.readFileSync(out+'/integrity.json'));const own=integrity.changed.filter(f=>!integrity.concurrentChanges.includes(f)).map(f=>f.replaceAll('\\','/')).concat(integrity.addedProductionFiles);let report=`# Correzioni operative post-Fase 5 — 19 ottobre 2026

Stato finale: **PASS nei controlli eseguiti**. Nessun commit, push o deploy eseguito da questo intervento. Nessun builder di dati o previsioni avviato.

## Blocco 1 — Previsioni canoniche nelle Letture: PASS

**Problema:** sezione e montaggio erano stati rimossi; il catalogo continuava a contenere previsioni canoniche valide.

**Soluzione:** riattivato il renderer condiviso e il montaggio universale; il fallback legacy usa lo stesso catalogo filtrato con \`isCanonicalModelForecast\`. L'adapter Serie A espone soltanto previsioni pubblicate e canoniche. Una partita senza previsioni non genera una sezione vuota. Champions non riceve una nuova sezione pronostici.

Conservati senza modifiche \`canPickReading\`, contratto condiviso, store, criteri sui titolari, ID e contesti. Il renderer universale riutilizza lo store riconciliato sull'intero catalogo, evitando di considerare mancanti le selezioni di altre partite. Ripristinato l'aggiornamento degli stati selezionati nel legacy. Rimossi dal componente riattivato i dettagli dedicati alla provenienza/provider; dati interni conservati. Grafica Anton/Inter, separatori e controlli del sistema esistente.

**File:** \`js/pages/readings.js\`, \`js/pages/reading-detail/{serie-a-adapter.mjs,shell.mjs,forecasts.mjs}\`; relativi test.

**Verifiche:** tutte le 10 fixture MD7, entrambe le viste a 1440/390/320: Fiorentina–Como, Milan–Atalanta, Juventus–Lazio, Monza–Cagliari e Parma–Torino mostrano 4 previsioni canoniche ciascuna; Udinese–Lecce e le altre quattro fixture non mostrano previsioni canoniche inesistenti. Nessun allargamento ai mercati provider. Aggiunta → reload → Schedina → Lettura → rimozione: PASS nelle due viste e tre larghezze. Quote assenti e totale «—»: PASS. Due fixture salvate contemporaneamente, deduplicazione reale con risposta DUPLICATE, rimozione indipendente, separazione giornata/competizione e tastiera legacy: PASS. Gate finished verificato anche con contratto canonico reale nel test unitario; nessuna aggiunta nelle fixture concluse disponibili.

## Blocco 2 — Risultato fallback Champions: PASS

**Problema:** \`pilotReadingDetail()\` stampava prepartita e VS anche con fixture conclusa.

**Soluzione:** testata derivata da status e score, senza modificare le proiezioni. Lo zero è un risultato valido; risultato mancante resta «Risultato N/D». Gestiti scheduled, finished, live/in_progress, postponed e cancelled. Aggiornato soltanto il template, oltre alla versione dell'import del shell condiviso.

**File:** \`js/pages/champions.js\`.

**Verifiche:** Lens–Sporting reale: conclusa 0–2 nelle viste universale e legacy. Otto casi di stato/risultato nel test di presentazione, inclusi 0–0 e risultato assente: PASS.

## Blocco 3 — Schedine Champions blu notte: PASS

**Problema:** Schedina conservava tema e superfici chiari anche con competizione Champions.

**Soluzione:** bootstrap parser-blocking subito dopo body applica \`data-competition-theme="champions"\`. \`data-page="betting"\` rimane invariato; non viene usato il tema delle Letture. Il catalogo token scuri esistente si attiva anche sul nuovo attributo. Regole locali in betting.css coprono pannelli, mercati, archivio MD1/MD2, quote, controlli e pannello personale, mantenendo colori degli esiti. Alias glass locali collegati ai token; accenti semantici leggibili sullo scuro. Navbar arrotondata e footer blu preservati.

Il loader distingue bootstrap da CSS delle Letture: Schedina riceve il primo e non reading-detail.css. Aggiornati gli hash CSS e le versioni dei moduli nelle 31 shell HTML attraverso \`applyStyleLinks\`, senza ricostruire dati o pagine. Il confronto conferma che queste shell cambiano solo nelle risorse di presentazione.

**File:** \`js/initial-presentation.js\`, \`scripts/site-styles.js\`, \`css/tokens.css\`, \`css/betting.css\`, 31 shell HTML. \`css/page-background.css\` già usa i token: nessuna modifica necessaria.

**Verifiche:** MD1/MD2 ai sei viewport: PASS. Tema senza app: PASS. Test con applicazione trattenuta dal server, cache HTTP realmente fredda (0 hit) e calda (23 hit per navigazione): sfondo rgb(7,21,44) prima e dopo montaggio, PASS. Nessun ritorno al chiaro; Serie A e archivio generale restano chiari. Un test con routing browser disattiva la cache: per la prova fredda/calda fa fede \`cache-paint.json\`, non la semplice ripetizione delle navigazioni in functional.json.

Contrasto: individuato badge Outsider a 3,13:1, corretto localmente usando l'accento del tema. Verifica finale: **1.156 campioni su superfici solide, zero sotto soglia**; 706 campioni con glass/gradienti esclusi dal calcolo automatico. Questi ultimi sono stati controllati visivamente, senza attribuire loro una certificazione numerica.

## Blocco 4 — Mercati per partita, MyCombo e Preferiti: PASS

Nessun vecchio blocco, raccolta o badge Preferiti Champions ripristinato. Nessun flag editoriale modificato. Aggiornati i test che imponevano zero pronostici nelle Letture o descrivevano il test corrente come MyCombo separata; i test contrattuali MyCombo restano distinti.

**File:** \`scripts/check-reading-universal.cjs\`, \`scripts/check-schedina-md07-browser.cjs\`, \`scripts/check-schedina-recovery.cjs\`, \`scripts/test-reading-detail-internals.mjs\`.

**Verifiche UI:** 169 mercati MD6, 217 MD7, 117 Champions MD2 e 52 Champions MD1 conservati e visibili, desktop/mobile. Aggiunta/persistenza/rimozione MD7, deduplicazione, pannello e archivi non operativi: PASS. Contratti BetSelection: 6 schedina, 137 MyCombo e 137 prediction legs, PASS.

## Blocco 5 — Nomi lunghi Champions: PASS

**Problema:** logo fisso e colonna testo troppo stretta spezzavano le parole sulle hero squadra mobile.

**Soluzione:** solo sotto 600px, identità squadra con flex-wrap e testo con base intrinseca min-content; il testo passa sotto il logo quando necessario. Wrapping locale dei titoli. Nessun nome squadra codificato, modifica HTML o riduzione font. Hero Home e Champions principale invariate.

**File:** \`css/champions.css\`.

**Verifiche:** tutte le 36 schede nei sei viewport; acquisizione e controllo visivo delle 36 hero a 320 e 390, con geometrie registrate in team-names.json. Galatasaray, Manchester City/United, Atlético e nomi brevi leggibili; nessun overflow. [Tavola 320px](team-sheet-320.png), [tavola 390px](team-sheet-390.png).

## Blocco 6 — Regressioni e integrità: PASS entro la copertura indicata

Matrice finale: **73 rotte × 6 viewport = 438 viste** a 1440, 1050, 901, 768, 390 e 320. Comprende 20 schede Serie A, 36 Champions, principali, Schedina Serie A/Champions MD1/MD2 e approfondimenti rappresentativi nelle due viste. Confronto baseline su 72 rotte/432 viste; MD1 aggiunta come rotta ulteriore e con screenshot di dettaglio dalla baseline salvata.

- Overflow documento: 0; errori JavaScript e risposte locali HTTP fallite: 0; immagini rotte: 0.
- Menu mobile nei due temi, filtri Giocatori, comparatore, scroll interno tabelle, filtri formazioni, calendario Champions e reset, accordion Coppa, archivio Letture: PASS.
- Focus tastiera, attivazione selezione, apertura e chiusura con Escape del dialogo personale: PASS.
- Navigazione da Schedina e scheda squadra alla Lettura tramite collegamenti disponibili: PASS.
- Confronto immagini e posizionamenti delle formazioni sulle 432 viste comuni: nessuna differenza.
- Sottotitoli principali rimossi: nessuna ricomparsa nei selettori verificati; nessun nuovo blocco fonti nel componente riattivato. Policy pubblica e attribuzioni legali invariate.
- **9.679 file confrontati, inclusi 9.114 file dati: dati tutti invariati.** Nessuna modifica ai contratti condivisi, allo store, ai motori o agli asset fotografici. Nessuna dipendenza introdotta.

**Modifica concorrente preservata:** css/readings-index.css ha ricevuto un aggiornamento locale di specificità e font dei pulsanti archivio durante il lavoro; non è una correzione effettuata da questo intervento. È conservata ed evidenziata in integrity.json. L'indice corrente usa ri-match e data-archive-day: adattati i test obsoleti senza cambiare struttura o comportamento del sito.

## Test eseguiti

| Verifica | Risultato | Evidenza |
|---|---|---|
| test-css-modules.js | PASS: entry 994 byte | console; modulo CSS invariato nell'ordine |
| test-personal-betslip.mjs | PASS | store, contesti, compatibilità, persistenza |
| test-betting-selection-contract.js | PASS | contratti Schedina/MyCombo/prediction |
| test-reading-detail-internals.mjs | PASS | canoniche reali, gate finished, null/zero |
| test-champions-reading-page.mjs | PASS | dettaglio Champions |
| test-post-phase5-presentation.mjs | PASS | bootstrap, hash idempotenti, otto stati/score |
| check-schedina-recovery.cjs | PASS | otto combinazioni giornata/viewport |
| check-schedina-md07-browser.cjs | PASS | 10 fixture × 2 viewport |
| check-reading-universal.cjs --interactions-only --no-screenshots | PASS | interazioni e navigazione rappresentative |
| audit.cjs + dark-final.cjs | PASS | final-matrix.json, 438 viste |
| functional.cjs | PASS | functional.json, 76 registrazioni |
| cross-context.cjs | PASS | cross-context.json |
| focused.cjs | PASS | focused.json |
| visual.cjs | PASS | visual.json, 39 registrazioni |
| cache-paint.cjs | PASS | cache-paint.json, cache reale e app sospesa |
| team-names.cjs | PASS | 72 acquisizioni hero e due tavole |
| contrast.cjs | PASS nei campioni misurati | contrast.json |

I primi tentativi con selettori obsoleti dell'archivio/indice non sono conteggiati come PASS: sono stati aggiornati e ripetuti con successo. Un errore Windows nel salvataggio screenshot ha interrotto una prima acquisizione; la matrice è stata ripetuta con salvataggio atomico. Il test di app rallentata è stato corretto per non attendere DOMContentLoaded mentre il modulo è intenzionalmente sospeso.

## Screenshot e confronti

[Apri la galleria prima/dopo](comparisons.html): desktop e mobile per Schedina Champions, Galatasaray, Manchester City e risultato legacy. Screenshot completi originali e corretti conservati nella stessa cartella; detail-before-* proviene dalle copie baseline, senza ripristinare file di produzione.

- [Schedina Champions MD2 mobile, prima](before-viewport-13-390.png) / [dopo](dark-final-viewport-1-390.png).
- [Schedina Champions MD1 mobile](dark-final-viewport-0-390.png).
- [Fiorentina–Como universale mobile](detail-lettura-html-match-fiorentina-como-2026-27-md-07-390.png).
- [Fiorentina–Como legacy mobile](detail-lettura-html-match-fiorentina-como-2026-27-md-07-layout-legacy-390.png).
- [App sospesa, cache fredda](cache-cold-md2.png) / [cache calda](cache-warm-md2.png).

## File di produzione e test modificati da questo intervento (${own.length})

Le 31 shell ricevono solo hash/versioni e, per Schedina, il bootstrap. Gli altri file sono descritti nei blocchi precedenti; il nuovo test di presentazione non è un builder.

${own.map(f=>'- \`'+f+'\`').join('\n')}

Artefatti tecnici: questa cartella contiene baseline, script di verifica, JSON e screenshot; elenco completo in artifact-files.txt. I test esistenti aggiornano anche reports/reading-universal/interactions.json e output/reports/serie-a-md07-{1440.png,390.png,browser-audit.json}. Nessuno di questi è un file dati sportivi.

## Limiti, problemi aperti e pubblicazione

- **NON VERIFICATO:** audit visuale esaustivo di ogni Lettura dell'intero calendario; controllate tutte le 10 MD7 nelle due viste a tre larghezze e gli approfondimenti rappresentativi nella matrice a sei larghezze. Non è stato eseguito il ramo completo da 226 Letture del test universale.
- **NON VERIFICATO numericamente:** contrasto completo delle superfici con gradienti/glass; revisione visiva eseguita. Non si dichiara una certificazione accessibilità completa.
- Le previsioni canoniche senza quota restano intenzionalmente senza quota/EV e senza totale calcolabile. Nessuna quota è stata creata.
- Nessuna regressione aperta rilevata nella copertura eseguita. Le vecchie MyCombo e i 18 Preferiti Champions rimangono intenzionalmente assenti come richiesto.

**Prontezza:** correzioni pronte per revisione e approvazione finale, con i limiti espliciti sopra. Pubblicazione non effettuata. Intervento concluso; nessuna fase successiva avviata.
`;
fs.writeFileSync(out+'/REPORT.md',report);const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory())walk(f);else files.push(f)}}walk(out);fs.writeFileSync(out+'/artifact-files.txt',files.join('\n')+'\n');console.log('Report written, own files',own.length,'artifacts',files.length);
