# Sabah–Borussia Dortmund, MD3 — volumi fino al 20 ottobre 2026, 16:45 UTC

## Esito operativo

La pipeline collettiva esistente è stata rieseguita in memoria con le sole osservazioni prepartita documentate; nessun builder globale e nessuna scrittura degli altri 17 incontri. Il requisito numerico di campione (almeno sei gare complete, due in casa e due fuori) passa per entrambe le squadre. La pubblicazione è **bloccata**: la normalizzazione della pipeline confronta medie di competizione, ma non dispone di un trasferimento verificato della qualità degli avversari delle qualificazioni UEFA (TNS, KuPS, AGF, Hapoel) alla gara con il Dortmund. Il campione casalingo Sabah è dominato da 29 e 35 tiri contro AGF e Hapoel: media 20,6 su cinque gare, 13,0 senza quelle due. Non sono disponibili nel repository partite nazionali Sabah con tiri/SOT/corner osservati per controllare tale trasferimento. I sei target qui sotto restano quindi **diagnostici**, mentre Lettura e Schedina restano a N/D.

## Campioni osservati 2026/27, separati per competizione

| Squadra e campione | Gare | Tiri fatti/concessi | SOT fatti/concessi | Corner fatti/concessi |
| --- | ---: | ---: | ---: | ---: |
| Sabah, qualificazioni UCL | 8 | 16,63 / 9,63 | 6,25 / 3,38 | 6,25 / 3,63 |
| Sabah, fase campionato UCL | 2 | 12,00 / 19,50 | 3,00 / 9,00 | 2,50 / 6,50 |
| Sabah, UEFA complessiva | 10 | 15,70 / 11,60 | 5,60 / 4,50 | 5,50 / 4,20 |
| Sabah, UEFA in casa | 5 | 20,60 / 10,00 | 7,40 / 3,80 | 7,40 / 3,00 |
| Sabah, campionato azero | N/D | N/D | N/D | N/D |
| Dortmund, Bundesliga 2026/27 | 6 | 15,17 / 11,67 | 5,33 / 3,00 | 4,83 / 4,67 |
| Dortmund, UCL 2026/27 | 2 | 13,50 / 12,00 | 5,00 / 4,50 | 9,00 / 5,50 |
| Dortmund, 2026/27 complessiva | 8 | 14,75 / 11,75 | 5,25 / 3,38 | 5,88 / 4,88 |
| Dortmund, 2026/27 in trasferta | 4 | 11,25 / 13,00 | 3,00 / 3,50 | 4,75 / 6,25 |

La pipeline usa anche 44 gare storiche del Dortmund: profilo totale 52 (26 casa/26 trasferta). Per il Sabah il profilo completo è di 10 gare (5/5). La fonte locale del campionato azero contiene formazioni e minuti ma nessun volume di tiri/SOT/corner. Una pagina aggregata nazionale riporta 14,86 tiri/gara su 7 partite ma anche 63 tiri e 15,75/gara per un altro campione non chiarito; non è stata trasformata in statistiche osservate per partita.

## Simulazione isolata e controllo qualità

| Target del builder esistente | Sabah | Dortmund | Pubblicato |
| --- | ---: | ---: | --- |
| Tiri | 17,29 | 10,50 | N/D |
| SOT | 6,10 | 3,87 | N/D |
| Corner | 6,21 | 3,45 | N/D |
| Gol attesi, diagnostici | 1,60 | 1,67 | Conservati i valori congelati 1,62 / 1,70 |

La pipeline `scripts/build-champions-pilot-predictions.js` applica baseline per competizione/sede, produzione e concesso dell'avversario, e peso recente ridotto dal campione. Non applica ai **volumi di squadra** il correttivo di forza specifica degli avversari usato per alcune proiezioni individuali. Pubblicare i numeri sopra come target affidabili richiederebbe quindi una nuova regola o una calibrazione non autorizzata. La gara Union–Dortmund del 17 ottobre è registrata a 12 tiri Dortmund da StatMuse e results.fast, mentre Statz riporta 10: la differenza tra provider è documentata e la simulazione usa l'esplicito totale 12, mai la somma di fuori e bloccati.

## Quote e selezione MD7

Il file Sisal originale contiene contratti aperti e quotati per il match: 32 selezioni tiri squadra, 15 SOT squadra, 36 corner squadra, 16 corner totali, 3 esiti 1X2, 3 doppie chance, 14 over/under gol. Il collegamento resta esclusivamente diagnostico e richiede squadra, soglia, verso e ID provider esatti; nessuna quota è stata modificata o associata a probabilità inventate. La doppia chance 12 resta esclusa.

La riesecuzione del selettore MD7 sul catalogo operativo esistente restituisce **0 pronostici**. Per 2, X2 e gli Over gol più forti il motivo principale è `RELIABILITY_NOT_ASSESSED`; altre righe hanno supporto sportivo sotto soglia, incoerenza con lo scenario prevalente oppure probabilità N/D. I mercati di volume nuovi non entrano nel catalogo perché il controllo di qualità del trasferimento qualificazioni→MD3 fallisce. I mercati individuali/DUO non sono stati forzati: Sabah resta `TEAM_ONLY`; i target Dortmund sono soltanto diagnostici e non sbloccano una pubblicazione individuale.

## Isolamento e verifiche

- Sono stati aggiunti un file di evidenze per 13 gare prepartita e un artefatto derivato **diagnostico** per questa sola fixture. Il replay idempotente produce gli stessi sei target e scrive zero altre fixture.
- SHA-256 del preview congelato, catalogo ufficiale, quote Sisal, formazioni ufficiali e sorgente collettiva: identici prima e dopo il replay. Le 17 fixture non target nei cataloghi derivati sono uguali alle rispettive righe tracciate in Git.
- `node scripts/test-champions-md3-sabah-dortmund-volumes.cjs`: PASS (cutoff, identità delle squadre, 10/52 gare, soglia SOT≤tiri, hash, altre 17, MD7 0, contratti Sisal).
- `node scripts/check-champions-md3-sabah-dortmund-volumes-browser.cjs`: PASS a 1440 e 390 px. Lettura ancora N/D, 18 card Schedina, nessun overflow o errore pagina. Screenshot e risultato JSON in questa cartella.
- Nessun build del sito, push o deploy eseguito; non ho lanciato comandi di commit. Durante la lavorazione è comparso il commit esterno `3a42408c` (autore Chiarabob, 18:33:40), che include alcuni file diagnostici già creati. Lettura e Schedina non sono state modificate perché il controllo di pubblicazione non è passato.

## Fonti delle osservazioni

Le 8 gare di qualificazione sono documentate con URL specifici nel file delle evidenze; [PlayerStats, Sabah–AGF](https://playerstats.football/fixture/sabah-1/agf/2026-08-11) mostra anche i campi disciplinari richiesti dal builder. [Football Web Pages, Sabah–Slavia](https://www.footballwebpages.co.uk/match/2026-2027/uefa-champions-league/sabah-fa/slavia-prague/591979) copre MD2; Manchester United–Sabah è già nel dataset locale ESPN. Le gare recenti Dortmund sono corroborate da [PlayerStats, Dortmund–Villarreal](https://playerstats.football/fixture/borussia-dortmund/villarreal/2026-09-08), [PlayerStats, Dortmund–Werder](https://playerstats.football/fixture/borussia-dortmund/werder-bremen/2026-10-09), [PlayerStats, Bodø/Glimt–Dortmund](https://playerstats.football/fixture/bodo-glimt/borussia-dortmund/2026-10-14) e [StatMuse, Union–Dortmund](https://www.statmuse.com/fc/match/-113195). La pagina [FootyStats Sabah](https://footystats.org/clubs/sabah-fk-3041) resta soltanto un riscontro aggregato nazionale non integrato.
