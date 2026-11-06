# Europa League e Conference nello storico recente

Correzione del 6 novembre 2026: il primo intervento leggeva esclusivamente il calendario Champions. Lo storico recente del Milan non conteneva quindi alcuna gara di Europa League, nonostante fosse già disponibile il referto Milan–Benfica. Il controllo sul dataset generato riproduceva l'errore: `Milan: nessuna partita Europa League nello storico`.

## Acquisizione e identità

`scripts/import-european-recent-results.cjs --refresh` ha acquisito undici referti ESPN aggiornati: quattro gare Europa League del Milan, quattro della Juventus e tre Conference dell'Atalanta. Gli ID evento e gli ID delle due squadre sono espliciti e confrontati con i referti archiviati; l'importatore verifica anche data, competizione, stato finale e punteggio intero. Nessun nome approssimativo. Le statistiche sono ricavate dal boxscore della squadra identificata dal provider ID, senza usare i riepiloghi di stagione delle gare ancora programmate.

- Archivio raw: `data/raw/european-recent-results/2026-11-06/`.
- Registro normalizzato: `data/normalized/european-recent-results-2026-27.json`, con URL, timestamp, percorso raw e hash interni.
- Il calendario degli impegni conserva il proprio ruolo originario; il nuovo registro dei referti alimenta le proiezioni descrittive, senza attivare mercati o pronostici europei.

## Presentazione

Il builder dello storico condiviso e le proiezioni Lettura leggono anche il nuovo registro. Le ultime dieci gare sono selezionate dopo aver unito le competizioni e applicato il cutoff strettamente precedente alla partita. La dicitura pubblica è «Serie A e coppe europee».

Per il Milan, prima della MD11, compaiono Ferencaros (5 novembre, 0–2), Bournemouth (22 ottobre, 0–3 dalla prospettiva Milan), Salisburgo (15 ottobre, 4–0) e Benfica (16 settembre, 0–2). Tiri, SOT, corner, falli, cartellini e possesso sono verificati; xG resta N/D quando assente.

Andamento recente e statistiche tattiche usano le stesse fixture, mantenendo distinti i campioni per competizione. La mappa espone la copertura Europa/Conference nel denominatore; i referti non contengono coordinate verificate utilizzabili, quindi non vengono creati punti artificiali. Nessuna modifica a formule, probabilità, quote, selezioni, risultati canonici Serie A o formazioni ufficiali. Nessun commit, push o deploy.

## Verifiche

- `node scripts/test-serie-a-team-history.cjs`: conteggi 4 Milan, 4 Juventus, 3 Atalanta; prospettiva del risultato, statistiche, cutoff, deduplica, N/D, proiezioni della MD11, riproduzione dai raw e rifiuto di ID evento errati.
- `node scripts/test-reading-spatial-matchup.cjs`: 380 confronti tra dati e proiezioni, cutoff e quarantena.
- `node scripts/check-european-recent-history.cjs`: nove stati browser (tre squadre a 1440/390/320 pixel), righe effettive della tabella, campioni tattici, copertura della mappa, assenza di overflow e di errori JavaScript.
- Evidenze: `output/european-recent-history-2026-11-06/browser-check.json` e `milan-1440.png`, `milan-390.png`, `milan-320.png`. Schermata desktop verificata visivamente.
