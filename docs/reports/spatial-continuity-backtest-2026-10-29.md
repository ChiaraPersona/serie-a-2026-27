# Storico territoriale e continuità tecnica — 29 ottobre 2026

Confronto esplorativo successivo al primo backtest. Le giornate 8–9 sono già state esaminate: non sono un nuovo test indipendente. Nessuna promozione automatica, modifica dei pesi previsionali o delle selezioni.

## Dati e criteri

Ricostruiti 176 contesti squadra/partita su 88 gare: 175 con ID dell'allenatore principale e 175 con undici ID canonici completi. Un assistente a bordo campo non viene trasformato in cambio di allenatore: Cagliari MD7 rimane un'osservazione con head coach N/D, senza inventare un nuovo ciclo.

Quattro cambi sono osservati nei referti: bologna dal primo referto del 2026-09-19; parma dal primo referto del 2026-10-10; fiorentina dal primo referto del 2026-09-11; venezia dal primo referto del 2026-10-17. Per Bologna, Parma e Venezia sono conservate anche date dei comunicati ufficiali. Per Fiorentina è utilizzata la prima osservazione disponibile, non una data di nomina dedotta da articoli secondari.

L'identità dell'allenatore è legata all'ID presente nel referto della fixture canonica. Le nomine sono applicate solo dopo la data di pubblicazione e dalla decorrenza effettiva. Le assenze temporanee, gli assistenti e i ritorni dello stesso tecnico sono distinti da un ciclo unico illimitato. Nessuna anagrafica corrente viene retrodatata.

Continuità giocatori: quota di titolari comuni su 11 e quota dei minuti dell'ultima gara disputati da giocatori già impiegati nella precedente; N/D se le identità non sono complete. Il modulo è un'indicazione nominale: da solo non attiva una transizione né dimostra lo stesso assetto reale in campo. Non sono disponibili una ricostruzione completa dei ruoli in possesso/non possesso e una storia omogenea di stagioni precedenti; l'effetto del turnover estivo resta non verificato.

Regola descrittiva di transizione, non criterio di scommessa: prime tre partite dopo un cambio documentato/osservato, oppure almeno due coppie tra le ultime quattro gare con al massimo sei titolari in comune sotto lo stesso allenatore. Oltre 30 giorni senza un contesto aggiornato, la continuità è N/D. Nessun azzeramento provocato dal solo cambio di modulo.

## Politiche fissate per il confronto

- all: riferimento con tutto lo storico corrente ammissibile.
- recent: ultime cinque gare territoriali valide.
- decay: peso 2^(-i/3), dove i=0 identifica l'ultima gara valida; emivita tre gare. Sono riportati sia gare osservate sia numerosità effettiva dei pesi.
- coach-cycle: soltanto gare del ciclo osservato dell'allenatore principale noto prima del cutoff. Un ritorno dopo un altro tecnico apre un nuovo ciclo. Con meno di cinque gare territoriali valide il segnale resta N/D; non si prendono in prestito dati dal tecnico precedente.

Tutte le politiche mantengono almeno cinque gare storiche osservate per squadra, gli stessi priors di conversione/quote della lega e la stessa stima ridge del primo esperimento. Finestra cinque ed emivita tre sono policy sperimentali esplicite, non valori scelti ottimizzando il test. Le quote dei tiri e i gol per zona sono pesati congiuntamente per decay. Le coordinate e le revisioni sono ricostruite a posteriori; nessuna disponibilità prepartita certificata viene inventata.

## Stesso campione per tutte le politiche

I confronti diretti usano gli stessi ID sia nello sviluppo MD6–7 sia nella verifica MD8–9. Il controllo senza zone viene stimato sullo stesso campione, per distinguere il contributo della semplice calibrazione. Delta negativo = miglioramento rispetto al controllo.

| Politica | Gare sviluppo | Gare test | Log loss gol calibrazione | Log loss gol con zone | Delta zone − calibrazione |
|---|---:|---:|---:|---:|---:|
| all | 10 | 11 | 3.618132 | 3.635301 | 0.017169 |
| recent | 10 | 11 | 3.618132 | 3.632201 | 0.014069 |
| decay | 10 | 11 | 3.618132 | 3.631331 | 0.013198 |
| coach-cycle | 10 | 11 | 3.618132 | 3.633699 | 0.015567 |

## Copertura propria di ciascuna politica

Questa tabella serve a misurare la perdita di copertura: i risultati non vanno confrontati direttamente come se i campioni fossero identici.

| Politica | Gare sviluppo | Gare test | Log loss gol calibrazione | Log loss gol con zone | Delta zone − calibrazione |
|---|---:|---:|---:|---:|---:|
| all | 16 | 18 | 3.398695 | 3.401116 | 0.002421 |
| recent | 16 | 18 | 3.398695 | 3.397369 | -0.001326 |
| decay | 16 | 18 | 3.398695 | 3.396076 | -0.002619 |
| coach-cycle | 10 | 11 | 3.618132 | 3.633699 | 0.015567 |

## Prime tre gare successive ai cambi

Campioni propri, esclusi quelli senza storia sufficiente. Il ciclo dell'allenatore si astiene proprio nei primi incontri: un confronto comune in questo sottogruppo può essere impossibile. L'assenza di previsioni non è una prestazione pari a zero.

| Politica | Gare di test valutabili | Log loss gol calibrazione | Log loss gol con zone |
|---|---:|---:|---:|
| all | 3 | 2.673086 | 2.687377 |
| recent | 3 | 2.673086 | 2.679931 |
| decay | 3 | 2.673086 | 2.676784 |
| coach-cycle | 0 | N/D | N/D |

## Esito e riproduzione

Il campione resta limitato a due giornate di test, con intervallo per giornata N/D. Una variazione della metrica non consente di selezionare una politica operativa. La diagnosi nella Lettura riduce la forza del commento durante una transizione e mostra copertura/continuità senza cambiare probabilità o quote.

Eseguire node scripts/build-serie-a-technical-context.cjs e node scripts/research/spatial-backtest/continuity-run.cjs. Il secondo scrive soltanto l'analisi; nessun builder del sito o dei pronostici viene chiamato. results.json conserva campioni, pesi, fixture, coefficienti e separazione cronologica; input-hashes.json e production-integrity.json rendono verificabile la riproduzione. Gli archivi del primo backtest rimangono invariati.

Comunicati verificati: [Bologna](https://www.bolognafc.it/nota-del-club-45/), [Parma](https://www.parmacalcio1913.com/news/alberto-gilardino-e-il-nuovo-allenatore-del-parma-calcio/), [Venezia: nomina](https://www.veneziafc.it/news/davide-nicola-nominato-allenatore-della-prima-squadra), [Venezia: esonero](https://www.veneziafc.it/news/giovanni-stroppa-sollevato-dall-incarico-di-allenatore-della-prima-squadra). Metadati e copie HTML sono conservati internamente.

## Interpretazione e integrazione nella Lettura

Sul campione comune di 11 gare tutte le politiche territoriali peggiorano la log loss dei gol rispetto alla sola calibrazione. Sui 18 incontri dei campioni propri, storico recente e peso decrescente danno miglioramenti molto piccoli, che non stabiliscono una scelta operativa; le log loss Over 2,5 e Goal rimangono peggiori del controllo. Il confronto ha riutilizzato il test già osservato e non viene presentato come conferma indipendente.

La Lettura mostra due schede di continuità, con ultimo allenatore noto, gare osservate nel ciclo, titolari in comune, quota dei minuti a giocatori già impiegati e moduli nominali recenti. In transizione viene mostrato “Assetto in transizione, campione limitato” e il commento non identifica una vulnerabilità attuale. Quando è documentato un nuovo ciclo, la mappa usa soltanto le gare di quel ciclo; i dati precedenti rimangono integri negli archivi. Se il contesto è troppo vecchio o assente, rimane N/D.

Build completato sulle 380 proiezioni della Lettura. Superati i test specifici della continuità, il backtest originario invariato, le proiezioni e i contratti esistenti. Verificati 12 stati Serie A su Edge a 1440, 390 e 320 pixel, compreso Bologna–Inter con cambio tecnico; regressione Champions superata. Schermate transition-390.png e transition-1440.png in output/reading-spatial-2026-10-29/.

Nessuna modifica a previsioni, quote, catalogo mercati MD9, Schedina, risultati canonici, formazioni ufficiali o registro dei titolari; nessun commit, push o deploy.
