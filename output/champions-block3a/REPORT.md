# Blocco 3A - esito

Conteggi della pagina Schedina: selezionate piu alternative valutabili, senza promozione automatica.

| Famiglia di mercato | Prima | Dopo | Selezioni effettivamente disponibili |
|---|---:|---:|---|
| 1X2 e doppia chance | 7 | 106 | Con quota; 1X, X2 e 12 derivate solo da 1X2 congelato |
| Gol e multigol | 0 | 108 | Under/Over 1.5, 2.5, 3.5; multigol escluso |
| Tiri squadra | 0 | 100 | Soglie e probabilita gia serializzate, quota esatta |
| SOT squadra | 0 | 114 | Soglie e probabilita gia serializzate, quota esatta |
| Corner | 0 | 123 | Corner squadra; partita senza probabilita di soglia esclusa |
| Tiri individuali | 45 | 702 | 1+, 2+, 3+; senza quota, non giocabili |
| SOT individuali | 3 | 468 | 1+, 2+; senza quota, non giocabili |
| Giocatore + sostituto | 0 | 0 | Contratto aggregato non modellato |

- Mercati Sisal nel catalogo: 426 -> 1177; rispettive selezioni quotate 657 -> 1522. Le voci senza probabilita restano fuori dalle alternative valutabili della pagina.
- Soglie individuali valutabili: 48 -> 1170, su 234 titolari ammissibili. Nessun panchinaro o giocatore bloccato ammesso. Le probabilita di 3+ tiri e 2+ SOT erano gia presenti nei dati: nessun nuovo calcolo Poisson.
- Righe effettivamente raggiunte dalla Schedina/Lettura: 55 -> 1721, di cui 551 con quota esatta; 18/18 partite con almeno una selezione.
- Preliminari individuali selezionate: 48 -> 48 (39 da 1+ tiro, 6 da 2+ tiri, 3 da 1+ SOT). Proposte collettive del builder: 18 -> 18. Singole approvate: 7 -> 7, contratti/quote/probabilita preservati. Le altre righe sono alternative WATCH, non nuovi consigli approvati.
- Esclusi: SOT/tiri/corner dell'intera partita senza probabilita di soglia serializzata; GG/NG senza probabilita congiunta disponibile; multigol senza contratto Sisal esatto per la banda congelata; DUO/sostituto senza modello aggregato. Non convertite medie o intervalli in probabilita. Quote sospese o con soglia/semantica non esatta restano escluse.

## Verifica

5 test mirati superati, 0 falliti: test-champions-md3-market-expansion.mjs --live; test-champions-md3-preliminary.mjs; test-champions-md3-approved.mjs; test-champions-md3-squads.mjs; test-app-modules.mjs.

Il primo esegue il render reale della pagina Schedina e il render per fixture usato dalle Letture: verifica tutte le 1721 righe, 55 selezionate e 1666 alternative; test di inserimento nello store per le nuove famiglie quotate e la doppia chance 12, probabilita monotone/complementari, quote esatte e conservazione delle sette approvate. Nessun nuovo browser o screenshot necessario. Protetti e confrontati 271 file dati/CSS/moduli Champions. Nessuna modifica agli storici o ai motori. Staging limitato al serializzatore del catalogo, senza rieseguire la pipeline completa di modelli/rose; piano esistente conservato in staging-plan.json. Validato lo staging e promossi soltanto catalogo MD3 e relativo draft.

## File interessati

- scripts/build-champions-md3-preliminary.js
- js/pages/champions-md3-individual-markets.mjs
- js/pages/champions-workspace-catalog.mjs
- js/pages/betting.js
- data/normalized/champions-md03-preliminary-2026-27.json
- data/normalized/schedina-champions-md03-draft.json
- scripts/test-champions-md3-market-expansion.mjs
- scripts/test-champions-md3-preliminary.mjs

Grafica e CSS invariati. Nessuna acquisizione Sisal, ricalcolo di pronostici, commit, push o deploy eseguiti.
