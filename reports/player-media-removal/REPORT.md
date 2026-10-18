# Rimozione definitiva fotografie calciatori

Eliminati 279 file dedicati (50.868.853 byte, circa 48,5 MiB): 230 immagini tra fotografie, originali, copie verificate/ridimensionate e segnaposto; registri, associazioni, licenze, audit, recuperi, ricerche, componente JavaScript e script fotografici. Elenco completo in deleted-files.json.

Rimosso il rendering da Rosa completa, dettagli, classifica e comparatori. Nessun avatar sostitutivo; spazi del comparatore riallineati. Eliminati import, fallback, CSS esclusivamente fotografici, download dagli importatori Milan/rose, comando npm e dipendenze del builder. Nessuna dipendenza npm era esclusivamente fotografica. Conservati tutti gli identificativi, inclusi Wikidata.

Ripuliti 586 JSON dai soli campi fotografici e relative attribuzioni. Confronto semantico su 957 JSON: dati sportivi invariati. Il manifest storico production-before.json ha perso esclusivamente checksum di file fotografici eliminati (conteggio in integrity.json). Loghi e altre immagini del sito invariati.

## Test

- Build: node scripts/build-site.js --presentation-only: PASS. Nessun file eliminato rigenerato.
- node scripts/team-pages/test-all-teams.js: PASS, 20 squadre e 533 calciatori.
- node scripts/test-css-modules.js: PASS.
- node scripts/check-player-statistics-browser.cjs: PASS a 1440/390 px; classifiche complete, tre stagioni, filtri, ordinamento, scroll, intestazioni, comparatore, sostituzione A/B e tastiera.
- node scripts/check-player-tables-browser.cjs: PASS a 1440/390 px; Atalanta, Milan, Inter, dettagli, comparatore squadra e Champions. Zero errori JavaScript, zero risposte HTTP fallite e zero richieste al sistema fotografico eliminato.
- Controllo screenshot mobile: tabelle e comparatore senza fotografie o colonne vuote.

## Riferimenti residui

Nessun riferimento operativo nei renderer, CSS, importatori e dati attivi. Restano menzioni storiche e checksum in report misti di precedenti interventi grafici/sportivi e nel presente elenco di cancellazione; non vengono caricati dal sito e non costituiscono un registro fotografico operativo. Conservata la policy condivisa delle attribuzioni legali per altre immagini. I test di regressione controllano esplicitamente l'assenza di richieste fotografiche.

Nessun commit, push o deploy.
