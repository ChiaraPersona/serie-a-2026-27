# Schedina Champions MD3 — verifica esiti, 22 ottobre 2026

Aggiornate le evidenze postpartita per le 18 gare del 20–21 ottobre, il registro degli undici effettivi, gli esiti del catalogo MD3, la proiezione leggera e la card dell'archivio Schedina. Nessun ricalcolo di pronostici, probabilità, quote, soglie o criteri di selezione. Nessuna modifica CSS o grafica, commit, push o deploy.

## Esiti e rendimento

| Perimetro | Vinti | Persi | Da verificare |
| --- | ---: | ---: | ---: |
| Catalogo operativo completo, incluse alternative già archiviate | 748 | 1.019 | 29 |
| Sole selezioni proposte dalla pubblicazione esistente | 108 | 52 | 26 |

Sono quindi verificati 1.767 contratti su 1.796 del catalogo operativo. Le alternative non diventano nuovi consigli o giocate. Il dataset analitico completo è `data/normalized/champions-md03-settlement.json`; ogni riga conserva selectionId, fixture, mercato, quota e risultato della verifica.

Simulazione filtrata sulle sole proposte quotate: **160 €** puntati (1 € per selezione verificata), **164,25 €** ritorno lordo, **+4,25 €** netto, **ROI +2,66%**. Le 26 proposte non verificabili sono escluse dal denominatore. Nessun rendimento viene attribuito alle previsioni prive di quota. Questi esiti sono verifiche statistiche: non attestano una liquidazione certificata del bookmaker.

Il rendimento originario non è ricostruito reinserendo giocatori esclusi: la pubblicazione prima del nuovo filtro contiene 187 proposte, quella operativa 186. Il nuovo escluso non riceve un risultato economico. Gli archivi prepartita e le quote originarie restano invariati; il JSON distingue `originalPublicationEconomics` da `filteredEconomics`, con esiti esclusi fuori dal capitale verificato.

## Contratti verificati

| Mercato | Vinti | Persi | N/D |
| --- | ---: | ---: | ---: |
| Esito finale 1X2 | 18 | 36 | 0 |
| Doppia chance | 19 | 15 | 0 |
| Corner totali | 41 | 69 | 0 |
| Corner squadra | 68 | 244 | 0 |
| Tiri in porta squadra | 115 | 163 | 0 |
| Tiri totali partita | 172 | 95 | 0 |
| Tiri totali squadra | 220 | 319 | 0 |
| Under/Over gol | 57 | 68 | 0 |
| Tiri totali giocatore DUO | 32 | 10 | 0 |
| Tiri in porta giocatore DUO, pali/traverse inclusi | 6 | 0 | 29 |

Il catalogo operativo MD3 esistente non contiene contratti individuali pubblicati su falli o cartellini: non sono state create nuove selezioni a posteriori. I relativi dati osservati sono conservati nei referti e disponibili internamente, ma la loro presenza non crea un contratto liquidabile. La verifica non estende la pubblicazione a tutte le quote grezze del provider.

## Esclusioni e dati mancanti

- Completate le ufficiali per Como–Manchester United e Lille–Galatasaray, prima assenti dal registro. Riconciliate le altre formazioni con gli undici effettivi del referto; il dettaglio dei 12 gruppi squadra aggiornati è nel JSON.
- Nuova esclusione operativa: **Andy Diouf**, Inter–Shakhtar, mercato «1+ tiri» DUO. Non partito titolare; nessuna sostituzione retroattiva. La selezione esclusa è in `data/technical-archive/champions-md03/settlement-excluded.json`.
- Le esclusioni tecniche precedenti rimangono archiviate; la selezione di Andy Diouf non compare nella Schedina operativa e viene rimossa dalla persistenza alla riconciliazione. Il filtro si applica anche a Preferiti e MyCombo tramite il registro condiviso.
- **29 contratti**, dei quali **26 proposti**, restano N/D: manca la misura verificata di pali/traverse richiesta dal contratto SOT DUO. I sei esiti positivi dimostrabili dal motore esistente sono conservati. Non sono stati imputati zeri.
- Gli ID canonici irrisolti restano null; nessun abbinamento approssimativo. La liquidazione individuale richiede un ID canonico esatto presente nel referto e titolarità effettiva.
- I minuti disponibili sono stimati sul tempo regolamentare, non minuti ufficiali; non vengono usati per inventare statistiche mancanti.

I subentrati sono conservati soltanto come evidenza del referto e dell'eventuale contratto DUO del titolare: non vengono reinseriti come selezioni. Per il contratto standard il sostituto non viene sommato. Il servizio dati preserva i referti completi, filtrando le selezioni operative: eliminare i subentrati dal referto alterava gli esiti DUO e rendeva incoerenti payload leggero e percorso completo.

## Evidenze interne

Risultati confrontati con il riepilogo UEFA consultato durante questa verifica:
https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-and-results/

Formazioni effettive, eventi e statistiche: referti integrali ESPN già acquisiti il 22 ottobre in `data/raw/champions-results/2026-10-22/`, con URL, data di acquisizione e identificativi esatti; normalizzazione in `data/sources/champions-results-md03-2026-27.json`. Le pagine partita UEFA aperte non espongono gli undici nel testo accessibile: non vengono dichiarate come seconda certificazione delle statistiche. Copia della precedente fonte ufficiali tracciata in Git conservata nell'archivio tecnico.

Nessuna sezione pubblica sulle fonti è stata aggiunta.

## Verifiche completate

- `test-champions-results-details.cjs`: referti, formazioni, somme statistiche, identità, calendario e dati domestici/storici preservati.
- `test-champions-md3-settlement.mjs`: tutti gli esiti del catalogo, 22 titolari per gara, referti completi, esclusione salvata prima del nuovo filtro, DUO/standard distinti e MD2 invariata.
- `test-champions-md3-browser-data.mjs`: parità percorso completo/proiezione leggera, 18 fixture, 1.796 contratti, 186 selezioni salvate esercitate.
- `test-champions-md3-approved.mjs`: sette singole originarie e gate risultato finale.
- `test-personal-betslip.mjs`: persistenza, contesti, deduplica, quote e compatibilità.
- `test-champions-md02-browser-data.mjs`: parità archivio e rose MD2, 18 confronti ciascuno.
- `test-schedina-loading.mjs`: cache, registro ufficiali aggiornato, contratti archiviati, proiezioni MD5/6/7 e dieci card.
- `check-champions-md3-settlement.cjs`: Edge a **1440 e 390 px**, rispettivamente 108 righe vinte, 52 perse e 26 N/D; assenza di Andy Diouf, nessuna nuova giocata su gare concluse, nessun overflow o errore JavaScript. Evidenze in `browser.json` e screenshot nella stessa cartella.

Il primo avvio Edge nel sandbox è fallito per l'ambiente. Il controllo dedicato è stato poi eseguito con successo fuori dal sandbox. Non viene dichiarata verde l'intera suite generale.
