# Giocatori compatti — tre fixture pilota

File applicativi modificati esclusivamente: `js/pages/reading-detail/people.mjs` e `css/reading-detail.css`.

Due colonne casa/ospite a tutte le larghezze; righe native espandibili da tastiera. Nome, numero verificato, Tiri e SOT sempre visibili; tutti i dettagli, minuti, probabilità, statistiche storiche, fonti e collegamenti ai mercati conservati nell'espansione. Ricerca e filtri invariati; outsider indicati discretamente. Le colonne scorrono verticalmente in modo indipendente dall'altezza delle righe dell'altra squadra. Nessuna paginazione.

## Altezza sezione, tutte le righe chiuse

| Fixture | Giocatori | Desktop 1440 / tablet 768 | Mobile 390 |
|---|---:|---|---|
| Atalanta–Venezia MD6 | 20 | 3164 → 778 px (−75,4%) | 6066 → 832 px (−86,3%) |
| Inter–Club Brugge MD2 | 22 | 3458 → 825 px (−76,1%) | 6645 → 881 px (−86,7%) |
| Milan–Atalanta MD7 | 20 | 3164 → 778 px (−75,4%) | 6066 → 839 px (−86,2%) |

Misure sullo stesso browser Edge headless, font caricati, stessa altezza viewport 1000px, inclusi titolo, strumenti e disclosure originale chiusa. Nessun giocatore precedente eliminato; il numero non viene esteso artificialmente agli undici quando il dataset individuale precedente non li comprendeva.

## Verifiche

- Nove casi browser (tre fixture × 1440/768/390): tutti i giocatori, identità, outsider e valori Tiri/SOT/minuti uguali alla baseline; ricerca, nessun risultato, filtri, espansione da tastiera e indipendenza della colonna opposta.
- Espansione contemporanea di tutte le righe e appartenenza esatta alla squadra verificata nei sei casi desktop/mobile.
- Nessun overflow o errore console rilevato; fallback `layout=legacy` verificato nei nove casi.
- Tutte le altre otto sezioni confrontate integralmente con il DOM precedente, senza cambiamenti.
- Test `test-reading-detail-internals.mjs` e `test-reading-detail-adapters.mjs` superati; `git diff --check` superato.
- HEAD invariato. Confronto hash dei file tracciati: ammesse soltanto le due modifiche UI indicate; nessun cambiamento a dati, motori, mercati, quote, contratti, store o snapshot. Nessun build, commit, push o deploy.

## Artefatti creati

Solo questa directory: `before.json`, `after.json` (misure, giocatori, hash e DOM di confronto), `integrity.json`, script locali `check.cjs`, `screenshots.cjs`, `edit.py`, questo documento e screenshot `{atalanta,inter,milan}-{1440,768,390}.png`, più `*-390-expanded.png`.

Gli screenshot sono ritagliati sulla sola sezione; il pulsante flottante viene nascosto esclusivamente durante l'acquisizione per evitare sovrapposizioni all'immagine. Nell'app resta invariato.
