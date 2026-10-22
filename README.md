# Serie A 2026/27

Sito statico autonomo per Serie A, Coppa Italia e statistiche arbitrali, compatibile con GitHub Pages.

## Procedura di manutenzione e aggiornamento

Usare Node >=22.12 (verificato con Node 24.19). Node 22.11 richiede flag sperimentali per i moduli ESM e non e supportato dal build.

| Operazione | Comando | Effetto |
|---|---|---|
| Verifica completa | `npm test` | Esegue tutti i contratti anche dopo un fallimento; report `output/test-suite/latest.json` |
| Verifica Serie A / Champions | `npm run verify:serie-a` / `npm run verify:champions` | Controlla artefatti locali; nessun import quote |
| Build pagine | `npm run build` | Solo presentazione dai dataset gia verificati; non rigenera pronostici |
| Piano Serie A MD7 (MD8: cambiare numero) | `npm run update:serie-a -- --matchday 7` | Elenca le dipendenze per la giornata esplicita |
| Generazione controllata Serie A | `npm run update:serie-a -- --matchday 7 --stage --output output/serie-a-md07-candidati` | Genera in copia isolata, senza promozione |
| Piano Champions MD1/MD2/MD3 | `npm run update:champions -- --matchday 3` | Catena specifica per la giornata; rifiuta giornate non ancora documentate |
| Generazione controllata Champions MD3 | `npm run update:champions -- --matchday 3 --stage --output output/champions-md03-candidati` | Database giocatori, probabili, motore offline, catalogo e contratti gia approvati |
| Volumi, confronto preliminare | `npm run build:volumes -- --output output/volumi-candidati.json` | Legge 380 raw originali senza copiarli; confrontare con il consolidato |

Lo staging condivide soltanto i raw immutabili tramite junction; copia gli altri input e produce `generation-report.json` con tutti i file divergenti. I builder possono aggiornare aggregati condivisi nella copia: confrontare semanticamente le sole fixture della giornata richiesta, mantenere identiche tutte le altre e le previsioni archiviate. Nessuna promozione automatica: integrare solo i candidati controllati, poi eseguire verifiche e build. MD1-MD5 e tutte le giornate Serie A con gare gia concluse usano soltanto --validate-only: la rigenerazione e bloccata prima di qualsiasi scrittura, anche invocando direttamente il builder. --validate-only rifiuta --refresh-odds e non modifica i vincoli MyCombo. Per MD8 non eseguire un rebuild globale di predictions.json nel workspace operativo.

Risultati/esiti richiedono prima l'import documentato della singola fixture nella fonte canonica `data/sources/match-results-2026-27.json` (Champions: relativa fonte della competizione), con identita e statistiche osservate verificate; non si ricavano risultati da pronostici. `scripts/update-results-md07-2026-10-20.js` e un import datato, non un comando da riusare sulle future giornate. Dopo una modifica agli undici ufficiali eseguire `node scripts/apply-official-starter-policy.js`, verificare Letture/Schedine/MyCombo e quindi `npm run build`. Le liquidazioni certificate restano distinte dai confronti statistici. Nella copia isolata, la normalizzazione Serie A delle fonti risultati e calendario usa `node scripts/import-official-calendar.js`; la normalizzazione Champions usa `node scripts/build-champions-league.js --fixtures ID_CANONICO_1,ID_CANONICO_2`. Questi comandi a basso livello leggono le fonti locali gia verificate: confrontare le fixture non richieste prima di integrare risultati, poi rieseguire le catene di verifica e presentazione. Non importarli nel workspace operativo senza il confronto. Per rose, classifica, letture e risultati gli aggregati si generano nello staging; quote e approvazioni devono gia esistere negli input verificati. La catena MD3 riusa le sette approvazioni esistenti, senza approvare nuovi contratti.

I vecchi alias generali `build:predictions`, `build:schedina`, `build:champions` e `build:champions-markets` richiedono ora la giornata e mostrano un piano; aggiungere esplicitamente `--stage --output ...` per produrre candidati. `build:readings` aggiorna la presentazione. I comandi a basso livello elencati sotto possono scrivere dati: usarli soltanto nella procedura specifica e dopo confronto degli archivi. Import quote, pubblicazione, commit, push e deploy rimangono operazioni separate, mai implicite nella verifica o nel build.

Input volumi: ordine di ricerca `data/raw/referee-stats/espn/2025-26/serie-a`, archivio spostato `seria-a-2026-27-raw-archive-2026-08-24/data/raw/referee-stats/espn/2025-26/serie-a`, cache `data/raw/team-pages/espn/2025-26/serie-a`; JSON semplice o gzip. La join usa `providerFixtureId` del manifest normalizzato, mai il nome della partita. Alla verifica del 20 ottobre: 10 referti nel percorso corrente e 370 nell'archivio; nessun input esterno necessario, output rigenerato identico. Il builder elenca tutte le vere assenze e rifiuta sovrascritture divergenti del consolidato; usare `--output` per ispezionarle.

## Comandi

- `npm run build` genera tutte le pagine HTML dalle sorgenti condivise.
- `npm run import:calendar` rigenera squadre e calendario Serie A 2026/27.
- `npm run import:referee-calendars` prepara la join delle giornate 2025/26.
- `npm run import:referees:pilot` importa 10 gare di Serie A e 10 di Serie B.
- `npm run import:referees` importa l'intera stagione 2025/26 e genera gli aggregati.
- `npm run validate:referees:2025-26` controlla completezza, duplicati, stage e confronto fonti.
- `npm run download:logos` scarica e converte localmente gli stemmi.
- `npm run import:completed-teams` aggiorna rose e riepiloghi ESPN per Inter, Juventus e Napoli.
- `npm run build:completed-teams` rigenera i dataset e le pagine delle tre squadre usando la cache locale.
- `npm run import:all-teams` aggiorna le rose correnti di tutte le 20 squadre e completa le cache statistiche mancanti.
- `npm run build:all-teams` rigenera tutte le rose e le pagine usando le cache locali di Serie A e Serie B.
- `npm run import:sisal-odds -- --competition serie-a --matchday 1` apre una finestra browser temporanea e importa le quote delle 10 gare della giornata.
- `npm run normalize:sisal-odds -- --competition serie-a` rigenera il dataset normalizzato dall'ultimo raw senza riaprire Sisal.
- `npm run validate:sisal-odds -- --competition serie-a` valida raw, quote, identificatori e matching con il calendario.
- `npm run build:predictions` applica lo stesso motore a tutte le partite con quote abbinate e rigenera i pronostici preliminari.
- `npm run test:predictions` valida probabilità, risultati esatti, confidenza e fattore sorpresa.
- `npm test` esegue tutte le validazioni.

Per la verifica locale: `python -m http.server 8000`, poi aprire `http://localhost:8000`.

### Payload browser Champions MD2

Le Letture MD2 caricano `data/normalized/champions-md02-ui-2026-27.json`: una proiezione compatta di fixture ID, formazioni e disponibilità, senza ricalcolare previsioni. Quote, contratti e risultati pubblicati continuano a usare gli artefatti Schedina esistenti. L'integrazione completa `data/normalized/champions-md02-integration-2026-27.json` resta intatta ed è ancora usata da builder, audit, identità e liquidazioni.

Il build del sito rigenera automaticamente la proiezione quando include Champions, anche con `--presentation-only`. Per rigenerare soltanto questo artefatto usare `node scripts/build-champions-md02-browser-data.cjs`. Dopo un aggiornamento dell'archivio MD2 eseguire il build della pagina, senza rilanciare i motori previsionali per aggiornare la presentazione.

Verifiche: `npm run test:champions:md02:browser-data` confronta tutte le 18 fixture, filtro ufficiale, modelli, rose e markup; `npm run test:champions:md02:browser-data:browser` confronta l'archivio completo e il payload leggero in Edge a 1440/390 px, salvando evidenze in `output/reports/champions-md02-browser-data/`. Il test browser richiede Playwright, pngjs e pixelmatch del runtime locale; non installa dipendenze. I font esterni sono bloccati in entrambi i confronti. L'archivio tecnico non è un fallback di rete: un payload mancante deve essere rigenerato con il build.

### Caricamento Schedina per vista

Per Champions MD3 la sola Schedina carica `data/normalized/schedina-champions-md03-ui.json`: il workspace composto al build dall'adapter originale, con ogni contratto completo presente una sola volta. Il browser ricostruisce `all` dagli stessi match, riapplica il registro ufficiale e conta approvati/preliminari con gli stessi criteri. Diagnostiche, cataloghi intermedi e snapshot originali restano integralmente nei file tecnici; le Letture continuano a usare il loro percorso precedente. Il build Schedina genera automaticamente la proiezione con `scripts/build-champions-md3-browser-data.mjs`, senza ricalcolo delle previsioni. Verifiche: `npm run test:champions:md3:browser-data`, `npm run test:champions:md3:browser-data:browser` e, per la persistenza in una fixture programmata simulata, aggiungere `-- --md3-interactive` all'ultimo comando. Evidenze e baseline in `output/reports/champions-md3-browser-data/`.

Schedina risolve competizione e giornata prima delle richieste. Le giornate Champions caricano il proprio workspace; le giornate Serie A caricano il proprio archivio, risultati e liquidazioni, aggiungendo squadre e combinazioni soltanto quando servono. Il servizio dati deduplica le richieste nella singola vista Schedina e mantiene `no-store` sul registro ufficiale: un nuovo render svuota la cache e lo ricarica. Le altre pagine conservano il comportamento precedente.

L'indice usa `data/generated/schedina-index-2026-27.json`, con le card prodotte dallo stesso renderer e dagli stessi calcoli di archivio durante il build. `predictions-md05.json`, `predictions-md06.json` e `predictions-md07.json` sono proiezioni di `matchId` e combinazioni già esistenti, senza ricalcolo. MD6/MD7 le richiedono solo se manca un catalogo per una partita. Tutti gli originali restano intatti. Dopo aggiornamenti a esiti, quote, ufficialità o cataloghi rigenerare il sito: il build che include Schedina aggiorna automaticamente questi payload anche con `--presentation-only`. Comando limitato: `node scripts/build-site.js --presentation-only --betting-page-only`.

Verifiche: `npm run test:schedina:loading` e `npm run test:schedina:loading:browser`. Evidenze e baseline del confronto sono in `output/reports/schedina-loading/`. Il test browser usa Edge e i pacchetti del runtime locale senza installarli, blocca simmetricamente i font esterni e confronta DOM, richieste JSON, screenshot e persistenza delle selezioni giocabili.

## Statistiche arbitrali

I dati restano distinti in tre livelli:

- `data/raw/referee-stats`: risposte originali del provider e snapshot calendario;
- `data/normalized/referee-matches`: fixture normalizzate, divise per competizione e stage;
- `data/generated/referee-stats`: aggregati e report di validazione usati dal sito.

Il provider si configura con `REFEREE_STATS_PROVIDER`; eventuali chiavi si passano solo tramite variabili d'ambiente. ESPN non richiede chiavi nel repository. La tabella centrale degli alias è `data/normalized/referee-aliases.json` e tutti gli aggregati usano slug canonici.

Le stagioni 2023/24 e 2024/25 sono registrate nei profili dell'importatore ma hanno stato `prepared-not-run`: non vengono eseguite insieme alla validazione 2025/26.

## Quote Sisal

La configurazione e gli alias sono in `data/sources/sisal-odds.json`. L'importatore richiede Node.js 22 o successivo. Sisal protegge le API con Akamai, quindi l'importatore non esegue richieste HTTP isolate: apre Chrome o Edge con un profilo temporaneo, visita la pagina pubblica e cattura tramite DevTools i payload che il sito carica normalmente. Non usa credenziali e non salva cookie, token o header sensibili.

Ogni acquisizione produce un raw compresso e immutabile in `data/raw/odds/sisal/<competizione>/` e aggiorna il dataset normalizzato in `data/normalized/odds/sisal/<competizione>.json`. Per Serie A, l'importatore genera le URL delle singole partite dalla giornata richiesta in `data/normalized/matches.json`, poi collega squadre e gare agli identificatori canonici. La giornata predefinita è configurabile in `data/sources/sisal-odds.json`; `--matchday N` la sovrascrive. Gli eventi non riconosciuti restano espliciti e fanno fallire la validazione. Ogni mercato espone `marketScope`; i mercati giocatore sono conteggiati separatamente e, se Sisal non li pubblica, il conteggio resta esplicitamente `0`. La finestra del browser si chiude al termine. `--headless` è disponibile, ma può essere respinto da Sisal; `--url` consente di acquisire una sola scheda partita.

## Motore pronostici

`scripts/predictions/engine.js` è il motore unico condiviso da ogni partita. Combina quote 1X2 depurate dal margine (35%), rendimento storico (30%), profilo tattico (25%) e obiettivi (10%). Le quote sono quindi un controllo importante, non il segnale dominante. Il modello tattico distingue fascia sinistra, zona centrale e fascia destra e incrocia questi canali con le vulnerabilità avversarie.

Ogni pronostico contiene probabilità 1X2, tre risultati esatti, fattore sorpresa, confidenza, proiezioni per squadra di tiri totali, tiri nello specchio e corner e cinque probabili ammoniti. I volumi sono intervalli e non forzano una partita ricca o povera di gol. Il dataset generato è `data/normalized/predictions.json`. Indisponibili e designazione arbitrale entrano soltanto quando verificati.

## Flusso del sito

`scripts/build-site.js` genera le shell HTML; `js/app.js` Ã¨ un piccolo entry point ES module. Il bootstrap e il router vivono in `js/core/`, l'accesso ai JSON in `js/services/`, i componenti condivisi in `js/components/` e le viste in `js/pages/`. Il router importa soltanto il modulo richiesto dalla pagina corrente. Gli HTML generati non devono essere modificati manualmente.

Le pagine complete di tutte le 20 squadre sono collegate da `statistiche-squadre.html`. Le rose correnti e i dati 2025/26 restano separati; i dati della Serie B sono mantenuti distinti per le neopromosse. I nominativi rilevati durante il mercato estivo possono essere marcati `da verificare`; i campi non pubblicati dalla fonte restano `null` e sono mostrati come `N/D`.
