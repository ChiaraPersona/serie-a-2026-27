# Serie A 2026/27

Sito statico autonomo per Serie A e Coppa Italia, compatibile con GitHub Pages.

## Comandi

- `npm run build` genera le pagine HTML dalle sorgenti condivise.
- `npm run import:calendar` rigenera squadre e 380 partite dagli snapshot OCR del C.U. n. 205 e dal testo del C.U. n. 208.
- `npm run download:logos` scarica dal CDN Lega Serie A e converte localmente i 20 stemmi ufficiali.
- `npm test` valida dati, riferimenti e calcolo della classifica.
- Per la verifica locale: `python -m http.server 8000`, poi aprire `http://localhost:8000`.

Il calendario Serie A 2026/27 deriva dai C.U. n. 205 e n. 208 della Lega Serie A. Le date oltre la quinta giornata restano intenzionalmente non determinate; le cinque gare condizionate dal calendario UEFA sono marcate come provvisorie.

## Flusso dati

`data/raw` conserva gli input originali; `data/normalized` contiene il modello usato dal sito; `scripts` valida e genera; le pagine HTML sono shell generate e `js/app.js` esegue il rendering condiviso.
