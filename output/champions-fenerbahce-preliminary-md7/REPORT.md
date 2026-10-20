# Fenerbahçe–Slavia Praga: selezione preliminare MD7

Ambito esclusivo: ucl-2026-27-md03-01. Sei selezioni preliminari, zero approvate. Nessuna estensione alle altre 17 fixture.

| Pronostico | P centrale provvisoria | Quota Sisal | EV centrale provvisorio | Motivo |
|---|---:|---:|---:|---|
| Fenerbahçe vincente | 67,4% | 1,57 | +5,82% | Esito prevalente; precede la 1X secondo la gerarchia MD7 degli esiti e rimuove la stessa tesi ridondante. |
| Over 2,5 gol | 60,4% | 1,45 | −12,42% | Soglia canonica più equilibrata tra quelle ammissibili; compatibile con più scenari. |
| Fenerbahçe over 16,5 tiri | 58,3% | 1,60 | −6,72% | Miglior compromesso probabilità/soglia tra i contratti esatti disponibili; supera il supporto minimo condiviso. |
| Slavia over 10,5 tiri | 57,6% | 1,65 | −4,96% | Migliore soglia ammissibile della squadra, separata correttamente da quella avversaria. |
| Fenerbahçe over 6,5 SOT | 57,1% | 2,30 | +31,33% | Soglia ammissibile più vicina all'obiettivo MD7 della famiglia; quote inferiori alternative sono deduplicate. |
| Fenerbahçe over 5,5 corner | 51,2% | 1,70 | −12,96% | Soglia più equilibrata della famiglia; supera supporto minimo e criterio marginale di portafoglio. |

Le probabilità e gli EV riportati sono stime congelate preesistenti, non nuovi calcoli del motore. Probabilità prudenziali ed EV prudenziali restano null/N/D. L'EV positivo non è una condizione obbligatoria del selettore MD7: non è stato aggiunto un filtro economico diverso. Quote e contratti sono preservati, inclusa la data della verifica.

## Confronto effettivo con MD7

Il modulo condiviso `md06-suggested-forecasts.js` continua a utilizzare senza cambiamenti i propri valori predefiniti per Serie A: probabilità prudenziale, gate validazione, soglie, bilanciamento, confronto quota, gerarchia degli esiti, penalità marginale, deduplicazione e incompatibilità.

L'unica opzione nuova permette al pilota di usare esplicitamente la probabilità centrale per l'ordinamento e il supporto operativo. Nessun campo prudenziale viene valorizzato per far passare il selettore. I soli vincoli relativi alla certificazione vengono separati dall'ammissione preliminare; mancata probabilità dell'evento, quota non verificata, contraddizioni e contratti non giocabili continuano a escludere il mercato. Gli eventi di volume rimangono distribuzioni marginali: non viene dichiarata una distribuzione congiunta con il risultato.

L'adattatore è vincolato all'ID della singola fixture, riutilizzato anche dal builder esistente per mantenere riproducibile la selezione. Il comando dedicato modifica soltanto il match e i conteggi aggregati. Non esegue motori, validatori, acquisizioni o aggiornamenti degli snapshot.

## Esclusioni

Su 108 contratti presenti: 6 selezionati e 102 esclusi. Classificazione esclusiva del motivo principale:

- 73: probabilità dell'evento assente. Comprendono i corner totali e soglie non coperte dal modello; non sostituite con la proiezione centrale della squadra.
- 12: soglie alternative meno equilibrate, eliminate dalle stesse regole di soglia canonica MD7.
- 12: supporto probabilistico sotto lo standard del mercato.
- 3: esiti alternativi al prevalente (X, 2 e X2). X2 32,6%, quota 2,40.
- 1: 1X 82,3%, quota 1,16, stessa tesi del segno 1 già selezionato; la gerarchia MD7 privilegia 1X2 rispetto alla doppia chance.
- 1: Slavia over 3,5 SOT, 50%, quota 1,80: supporto marginale insufficiente dopo la prima selezione SOT della famiglia.

La doppia chance 12 non è ammessa e non compare nel catalogo operativo. L'elenco completo delle 102 esclusioni e dei rispettivi codici è in `selection-report.json`.

I pronostici individuali e DUO non sono aggiunti: i dieci titolari di movimento del Fenerbahçe sono già bloccati dalla riconciliazione individuale/squadra del modello esistente; lo Slavia è in modalità collettiva senza stime individuali/minuti utilizzabili. I due portieri non sono eleggibili per i tiri. Non sono stati aggirati questi vincoli né trasferite probabilità individuali ai DUO. Le funzioni MD7 di selezione individuale e le soglie 55/60 minuti e probabilistiche rimangono quelle esistenti, senza ricalcolare il modello per forzare candidati.

## Verifiche

PASS:
- `node scripts/test-champions-fenerbahce-preliminary.cjs`: integrità di 17 fixture, MyCombo, slips storici, 361 file protetti; quote/probabilità/validazione identiche; idempotenza; assenza dati e quote; confronto integrale del selettore precedente sui candidati Serie A MD7.
- `node scripts/test-md7-validation-parity.cjs`.
- `node scripts/test-schedina-md07.mjs`.
- `node scripts/test-personal-betslip.mjs`.
- `node scripts/test-betting-selection-contract.js`.
- `node scripts/test-champions-md3-publication.mjs` (83 preliminari complessivi, di cui solo il target passa da 1 a 6; le altre 17 fixture identiche).
- Build delle sole shell con `--md3-pages-only --presentation-only`.
- Edge: Schedina e Lettura a 1440, 390 e 320 px; sei selezioni coerenti, nessun overflow, sette ancore funzionanti, aggiunta/rimozione e persistenza dopo reload, nessun errore JavaScript. Screenshot ispezionati su desktop e mobile.
- `git diff --check`.

La suite completa e i builder statistici/di validazione non sono eseguiti: questa prova è limitata alla selezione di una fixture e deve preservare modello e snapshot. Nessun commit, push o deploy. Arresto dopo questa partita.
