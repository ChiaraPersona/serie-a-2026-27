# Archivio arbitri Champions League

Questo archivio e separato dai dati usati dal motore pronostici.

- `registry-2026-27.json` contiene identita interne stabili, alias e ID dei provider.
- Le designazioni restano nei file canonici `data/sources/champions-referee-assignments-*.json` e devono avere una fonte UEFA ufficiale e un `refereeId` risolto nel registro.
- `scripts/import-champions-referee-history.js` verifica le coppie gara-arbitro nella pagina UEFA, salva snapshot HTML compressi, normalizza i profili statistici e genera il report di copertura.
- I campioni stagione/competizione non vengono fusi nel sorgente. Gli aggregati derivati usano soltanto conteggi omogenei e dichiarano la regola di classificazione.

Import MD2 riproducibile dagli snapshot gia presenti:

```powershell
npm run import:champions-referees
npm run test:champions-referees
```

Per una giornata successiva, creare prima il file di designazioni con la stessa struttura, estendere il registro solo per i nuovi arbitri e poi eseguire:

```powershell
node scripts/import-champions-referee-history.js --as-of AAAA-MM-GG --assignments data/sources/champions-referee-assignments-mdNN-2026-27.json
```

Usare `--refresh` soltanto per acquisire un nuovo snapshot live. Senza `--refresh`, uno snapshot raw gia presente per la data richiesta viene riutilizzato, evitando che una fonte dinamica riscriva retroattivamente il campione.
