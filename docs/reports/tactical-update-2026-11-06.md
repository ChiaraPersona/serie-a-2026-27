# Aggiornamento tattico — 6 novembre 2026

Le Letture Serie A mostrano i volumi osservati della stagione della fixture: possesso, tiri prodotti e concessi, SOT, gol fatti/subiti, xG prodotti/concessi e corner. Ogni metrica conserva il proprio denominatore; valori mancanti N/D, zeri osservati mantenuti. Solo gare Serie A concluse, della medesima stagione, con data strettamente precedente alla fixture. La stagione è recuperata anche dal match canonico nell'analisi, perché l'adapter della presentazione non la copia nella fixture.

La baseline 2025/26 rimane distinta ed espandibile. Nessuna modifica a formule predittive, pesi, approvazioni, contratti o liquidazioni. Nessuna nuova esposizione pubblica delle fonti. Le direzioni storiche restano invariate.

Rigenerazione Champions con il builder descrittivo esistente: 1.940 osservazioni, nessuna quarantena, 18 osservazioni in più rispetto all'archivio precedente. La proiezione prepartita resta invariata: i nuovi referti acquisiti dopo le fixture non sono inseriti retroattivamente nei campioni disponibili prima della gara.

Build presentazione limitati alla Lettura MD11 e alla pagina Champions; acquisizioni prospettiche disattivate con SPATIAL_CAPTURE_DISABLED=1. Nessun commit, push o deploy.

Verifiche:

- `scripts/test-current-tactics.mjs`: PASS su 20 campioni MD11, separazione temporale/stagionale/competizione, zeri, assenze e stagione nel match canonico.
- `scripts/test-champions-tactical-profiles.cjs`: PASS.
- `scripts/check-current-tactics.cjs`: PASS sulle 10 fixture MD11 a 1440/390/320 px, storico aperto/chiuso, nessun overflow o errore JavaScript. Screenshot in `output/current-tactics/`, verificato visivamente quello mobile.
- `scripts/test-reading-browser-data.mjs`: FAIL sulla riconciliazione dei contratti di Fiorentina–Como MD7, file estranei alla modifica tattica e non rigenerati da questo lavoro.
- `scripts/check-champions-tactics-layout.cjs`: FAIL sul controllo di overflow dell'intero documento (riga 15); la proiezione e il renderer tattico Champions non sono cambiati.

Il workspace contiene ulteriori aggiornamenti concorrenti non prodotti da questo intervento; non sono stati ripristinati o inclusi in operazioni Git.
