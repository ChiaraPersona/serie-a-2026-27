# Serie A 2026/27

Sito statico autonomo per Serie A e Coppa Italia, compatibile con GitHub Pages.

## Comandi

- `npm run build` genera le pagine HTML dalle sorgenti condivise.
- `npm test` valida dati, riferimenti e calcolo della classifica.
- Per la verifica locale: `python -m http.server 8000`, poi aprire `http://localhost:8000`.

I contenuti iniziali sono esclusivamente dimostrativi e non rappresentano calendario, quote o pronostici ufficiali.

## Flusso dati

`data/raw` conserva gli input originali; `data/normalized` contiene il modello usato dal sito; `scripts` valida e genera; le pagine HTML sono shell generate e `js/app.js` esegue il rendering condiviso.
