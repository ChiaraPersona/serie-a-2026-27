# Prototipo descrittivo dei duelli — 24 ottobre 2026

Il prototipo permette di ispezionare confronti nominativi tra giocatori delle due formazioni, distinti per difesa organizzata, pressing e contesa offensiva. Include centrocampisti e attaccanti. Risponde alla domanda «chi può incontrare chi con i ruoli disponibili?», senza sostenere che un confronto sia osservato, prevalente o predittivo di un cartellino.

## Aprire e riprodurre

- [Anteprima interattiva autonoma](../output/reports/card-tactical-prototype-md08.html): contiene dati, modello, stile e policy di presentazione. Può essere copiata e aperta in un browser anche senza server o connessione. Le interazioni sono locali e non persistono al ricaricamento.
- [Anteprima sul server locale](http://127.0.0.1:8080/output/reports/card-tactical-prototype-md08.html): richiede che il server locale sia attivo.
- [Payload e manifest degli input](../data/analysis/card-prediction-research/tactical-prototype-md08.json).
- [Audit di integrità](../output/reports/card-tactical-prototype-md08-audit.json).

Rigenerazione locale, con il runtime Node del workspace che supporta i moduli già utilizzati dal progetto:

```powershell
& 'C:\Users\utente\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/research/cards/build-tactical-prototype.cjs --matchday 8
```

Il builder scrive soltanto il payload di ricerca, l'HTML autonomo e il relativo audit. Non richiama builder di produzione né servizi esterni. Il comando `node` di sistema, v22.11 nella verifica, non carica un modulo ESM condiviso; utilizzare il runtime indicato senza modificare quel modulo.

## Risultato del campione MD8

10 fixture, 220 posti negli undici iniziali: 9 anteprime prima del calcio d'inizio e 1 ispezione storica, Torino–Monza. Lo stato è determinato al momento della generazione. Le formazioni ufficiali, dove presenti, hanno precedenza sulle probabili.

| Ruolo | Giocatori inclusi | Con almeno un confronto compatibile |
| --- | ---: | ---: |
| Portiere | 20 | 0 |
| Difensore | 83 | 79 |
| Centrocampista | 68 | 63 |
| Attaccante | 47 | 45 |
| Ruolo N/D | 2 | 0 |
| Totale | 220 | 187 |

47 dei 50 candidati già pubblicati hanno almeno un confronto compatibile. Le 1.307 relazioni contano separatamente le fasi della stessa coppia: non sono duelli osservati, né un indicatore di accuratezza. 12 posizioni non sono interpretabili; i 20 portieri richiedono eventi specifici e un ulteriore giocatore non ha confronti ammessi dalle posizioni disponibili. Questi casi restano espliciti.

## Regole e limiti

- Join esclusivamente per team ID e player ID canonici. Gli avversari devono appartenere all'undici opposto attivo. Nessun abbinamento approssimativo per nome.
- Le posizioni dettagliate della fixture sono preferite; il ripiego sul ruolo storico è etichettato e non certifica un compito nella partita. Anche una formazione ufficiale non certifica la marcatura.
- I confronti possono essere molteplici: centrali contro punte/trequartisti, confronti di fascia, coperture dei centrocampisti, pressing degli attaccanti e contese offensive. Non vengono assegnati quote di esposizione, probabilità o nuovi punteggi.
- In difesa, il canale si riferisce alla posizione dell'avversario della singola coppia; in attacco, al giocatore in esame. Il pressing richiede informazioni sulla costruzione, qui N/D. Le etichette tattiche storiche non diventano percentuali osservate o moltiplicatori.
- Falli subiti/90 correnti e storici sono descrittivi. Il campione corrente esclude tutta la giornata target e ogni partita non precedente alla fixture. Gli input non hanno una certificazione temporale completa: questo payload non è un dataset di backtest o uno snapshot prospettico congelato.
- Proteste, cause dei cartellini, eventi di transizione e frequenze dei singoli duelli restano N/D. I totali disciplinari non permettono di ricostruire queste cause.
- La graduatoria legacy è mostrata soltanto come filtro di confronto. Le nuove relazioni non spiegano retroattivamente il suo punteggio e non lo modificano.
- La pagina incorpora `js/public-presentation.js`; riferimenti e provenienza rimangono nel manifest interno, senza sezioni pubbliche dedicate.

## Verifiche eseguite

- Build completato; 354 file protetti e 27 input invariati durante l'ultima esecuzione. Un primo audit aveva rilevato modifiche contemporanee in tre file estranei della pagina Giocatori; il risultato originale è conservato in `output/reports/card-tactical-prototype-md08-audit-first-run.json`. Non sono stati ripristinati quei file.
- Controllo dei 220 giocatori: identità e appartenenza degli avversari all'undici opposto, probabilità nulle, esclusione della fixture target. Oscurando la posizione, nessuno riceve un avversario nominativo.
- Verificate regole di orientamento, centrale, copertura laterale, pressing e contesa dell'attaccante. Il contesto del canale differenzia un avversario centrale da uno laterale.
- Quattro script inline validi; zero asset esterni e zero chiamate di rete o storage. Il browser integrato non consente URL `file:`: l'apertura diretta offline non è stata eseguita lì. L'autonomia dell'HTML è stata verificata staticamente; le interazioni sono state provate tramite localhost.
- Casi guidati, fasi, filtro dei candidati pubblicati, combinazione di filtri vuota, reset, simulazione dati mancanti e distinzione ufficiale/storica verificati nel browser. Nessun errore o avviso nella console osservata.
- Layout verificato a 1440, 390 e 440 pixel; nessun overflow orizzontale, stessa struttura mobile. Evidenze: [desktop](../output/reports/card-tactical-prototype-md08-desktop.png), [mobile 390](../output/reports/card-tactical-prototype-md08-mobile390.png), [mobile 440](../output/reports/card-tactical-prototype-md08-mobile440.png).

## Valutazione

### Accesso dal sito — integrazione successiva del 24 ottobre

La pagina pubblica autonoma è `duelli.html`, generata da `scripts/build-tactical-duels-page.cjs` con il medesimo modello descrittivo e lo snapshot esistente. Il builder rimuove manifest e riferimenti tecnici dal payload pubblico e produce l'indice di disponibilità `js/components/tactical-duels-availability.mjs`. Il build del sito la aggiorna quando lo snapshot è presente; il comando dedicato è `npm run build:tactical-duels`. Questo passaggio pubblica solo la presentazione locale: non ricalcola o promuove previsioni.

La sezione Probabili ammoniti mostra un solo link “Esplora i duelli” per le fixture coperte dall'indice. `?match=<ID canonico>` seleziona la gara; “Torna alla lettura” usa la fixture attualmente selezionata e l'ancora Disciplina. Un ID non disponibile produce un avviso esplicito. Verificati navigazione di andata/ritorno, cambio gara, disponibilità del link e layout mobile; i 24 contratti UI/data di `scripts/test-reading-prediction-v2.mjs` passano.

Il prototipo dimostra che si possono descrivere confronti nominativi per i ruoli prima esclusi, mantenendo visibili i limiti. Non dimostra che questi confronti migliorino le previsioni dei cartellini. La molteplicità delle relazioni e l'uso delle posizioni storiche richiedono una revisione dei compiti effettivi prima di introdurre una prevalenza o un peso.

Il passo successivo del [piano di ricerca](disciplinary-tactical-model-proposal-2026-10-24.md) è consolidare posizioni e compiti con evidenze temporali, poi congelare snapshot prima delle gare e confrontare i modelli sullo stesso campione valido. Il protocollo C0–C4 e i contratti disciplinari esistenti restano i riferimenti per la valutazione. Non è stata eseguita alcuna promozione del modello, pubblicazione, commit, push o deploy.
