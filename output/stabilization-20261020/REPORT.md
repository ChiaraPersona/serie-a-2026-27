# Stabilizzazione tecnica - 20 ottobre 2026

| Area | Problema iniziale | Correzione effettuata | Verifica |
|---|---|---|---|
| Formazioni MD7 | Ordine del referto trattato come tattico, quattro giocatori di movimento visualizzati in porta | reportIndex separato; tacticalOrder=false; fallback condiviso a elenco per i quattro XI non documentati; propagazione fonte-builder-renderer | Tutti i 20 XI e tutte le 10 Letture MD7; identita e panchine preservate |
| Volumi | 370 raw fuori dal vecchio percorso | Ricerca JSON/gzip in archivio e cache; errori aggregati; --output e blocco output consolidato divergente | 380/380 referti, 20 squadre, rigenerazione integralmente identica |
| Test | Baseline attuale: 41 comandi, 28 PASS e 13 FAIL | Contratti aggiornati senza cambiare quote e probabilita; runner completo; aggiunti contratti di regressione | 46 PASS, 0 FAIL; log ../test-suite/latest.json |
| Pipeline | Build generale rigenerava archivi; MD7 separata, catena MD3 incompleta | Build di presentazione; piani espliciti e staging separato; MD3 completa; gare concluse in validate-only; documentazione README | Staging Champions MD3 e Serie A MD7 completati, zero differenze finali; test del piano MD8 e guardie di scrittura |
| Squadre | Punti/posizione 2025/26 sotto testata 2026/27 | Etichetta 2025/26 sulle card, grafica invariata | Browser desktop/mobile |
| Rose e fonti | Provenienza visibile e sezioni dinamiche | Rimossa nota di provenienza; mantenuto avviso copertura parziale; sezioni interne marcate per public-presentation | Fonti e URL nei dati preservati; browser rose |

## Verifiche

- Browser Edge: 42 combinazioni pagina/viewport (1440 e 390 px), tutte le 10 Letture MD7, indice Letture, rose, squadre, classifica Home, calendario Parma, Schedina MD6/MD7, comparator giocatori, Champions MD1/MD2/MD3. Nessun errore JavaScript, overflow o collegamento locale rotto rilevato. Screenshot in browser/. Altri quattro controlli desktop/mobile hanno verificato selezione nei comparatori squadra/giocatori, cambio per90, classifica tiri e apertura del dettaglio giocatore senza sezioni pubbliche sulle fonti (browser/interactions.json).
- Tutte le 9421 risorse dati tracciate confrontate con la baseline iniziale. Le sole sei modifiche sono la fonte ufficiale e cinque derivati squadra/directory, per il contratto di disposizione tattica. Statistiche, risultati, esiti, quote Sisal, previsioni consolidate, contratti approvati e altre fixture inalterati. Dettaglio in integrity.json.
- Eseguiti apply-official-starter-policy (zero rimozioni), build di presentazione, suite completa, test del fallback futuro e del piano MD8. Validazioni Sisal e contratti MyCombo/BetSelection incluse nella suite.
- Node 22.11 locale non supporta il require ESM del build; usato Node 24.19 disponibile. package.json documenta >=22.12. Nessuna dipendenza esterna mancante. Avvio Edge fuori sandbox dopo il limite ambientale, controllo riuscito.

## Analisi dei 13 fallimenti riprodotti

| Test | Classificazione e intervento |
|---|---|
| referee-stats/validate-season 2023-24, 2024-25; validate-2025-26 | Tre errori di percorso: resolver archivio originale, confronti raw invariati; report su dati solo con --write-report |
| test-team-matchup-profiles | Conteggio MD1-MD6 obsoleto: confronto integrale con buildProfiles sui dati correnti; conservati gli scenari storici as-of |
| test-app-modules | Assunzioni UI obsolete su MD7, dimensioni condivise e copertura Champions: aggiornati i contratti mantenendo le altre verifiche |
| test-reading-prediction-v2 | Titolo disciplina cambiato: mantenuti i controlli statistici, N/D, escaping e probabilita |
| team-pages/test | Markup indice, policy fonti interne, pagina Giocatori e navbar obsoleti: adeguati alle implementazioni correnti |
| team-pages/test-milan | Rosa e copertura storiche non piu correnti: identita confrontate con il roster canonico attivo; statistiche e provider ID riconciliati ai profili individuali; controlli per90 preservati |
| sisal/test-consumers | Aspettava tre inserimenti anche per non titolari ora esclusi dalla policy: verifica numero ammissibile, rifiuti, deduplica e reload, con/senza identificatori originari |
| test-predictions | Alias Parma-Torino e confusione tra forecast archiviato e XI attuale: identita canonica per le gare operative; previsioni concluse mantenute e controllate come archivio |
| test-schedina-md06 | Ultimo snapshot Sisal usato per quote storiche: normalizzazione del raw MD6 del 10 ottobre, con timestamp uguale all'archivio |
| test-head-to-head-integration | Indice Letture precedente: mantenuti copertura H2H, limiti modello e integrita; verificata la navigazione attuale |
| test-champions-reading-page | Vecchi campi per squadra sostituiti dal campo condiviso: verificati 22 giocatori, due portieri e identita, oltre ai controlli previsionali esistenti |

## Differenze delle rigenerazioni

Volumi: nessuna. Champions MD3: nessuna (champions-stage-run.json). Serie A MD7 finale: nessuna (serie-a-stage-run.json).

La prima prova isolata del vecchio builder MD7 ha invece prodotto cinque artefatti differenti, incluso il ricalcolo dei modelli Parma-Torino/Roma-Genoa dopo la conclusione. Non promossi. Questo ha motivato il blocco preventivo delle rigenerazioni di giornate concluse e la correzione di validate-only, che prima riscriveva i vincoli MyCombo. Il confronto della prova respinta e in serie-a-stage-rejected-rebuild.json; i soli cinque candidati sono conservati separatamente in candidates-serie-a/. La copia completa di staging e stata rimossa dopo aver conservato l'evidenza, senza toccare i raw originali.

## Pipeline e limiti operativi

Procedure e comandi in README.md. Aggiornamenti delle fonti risultati/undici rimangono import documentati, con normalizzazione nella copia isolata e confronto delle fixture non richieste; nessuna acquisizione quote o approvazione automatica. Champions oltre MD3 viene rifiutata finche non esiste una catena documentata. Giornate Serie A con gare concluse: validazione soltanto, nessuna ricostruzione retroattiva. La promozione dei candidati resta un passaggio esplicito dopo il confronto. Nessun blocco residuo per la manutenzione richiesta.

## File modificati da questo intervento (36)

- README.md
- data/sources/official-lineups-2026-27.json
- data/teams/genoa.json
- data/teams/index.json
- data/teams/parma.json
- data/teams/roma.json
- data/teams/torino.json
- js/components/lineup-field.mjs
- js/pages/reading-detail/evidence.mjs
- js/pages/reading-detail/people.mjs
- js/pages/teams.js
- js/team-squads.js
- package.json
- scripts/build-betting-matchday.js
- scripts/build-betting-md07.js
- scripts/build-team-volume-profiles.js
- scripts/referee-stats/validate-2025-26.js
- scripts/referee-stats/validate-season.js
- scripts/sisal/test-consumers.mjs
- scripts/team-pages/build.js
- scripts/team-pages/test-milan.js
- scripts/team-pages/test.js
- scripts/test-app-modules.mjs
- scripts/test-champions-reading-page.mjs
- scripts/test-head-to-head-integration.js
- scripts/test-lineup-field.mjs
- scripts/test-predictions.js
- scripts/test-reading-prediction-v2.mjs
- scripts/test-schedina-md06.js
- scripts/test-team-matchup-profiles.js
- scripts/update-results-md07-2026-10-20.js
- scripts/check-stabilization-browser.cjs
- scripts/referee-stats/raw-path.js
- scripts/run-test-suite.cjs
- scripts/test-update-workflow.cjs
- scripts/update-matchday.cjs

Evidenze aggiuntive: output/stabilization-20261020/ e output/test-suite/.

## Git

Branch: main. Workspace modificato, senza commit, push o deploy. Conservate le tre modifiche Champions gia presenti e i due artefatti utente preesistenti: scripts/audit-champions-md3-final.mjs e output/champions-md3-final-verification-20261020/. git-before.txt e git-after.txt conservano gli stati osservati.
