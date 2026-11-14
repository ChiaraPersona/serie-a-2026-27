# Importatore statistiche arbitrali

## Storico compatto nelle Letture

La proiezione informativa `data/generated/reading-referee-history.json` non alimenta il motore,
le stime disciplinari o la Schedina. Rigenerarla con `node scripts/build-reading-referee-history.js`
dopo modifiche a calendario, designazioni o archivi. Il builder riusa le partite normalizzate
Serie A/B e gli snapshot Champions esistenti; filtra prima della data della singola Lettura.

Per aggiornare le sole schede pubbliche italiane: `node scripts/referee-stats/import-reading-history.js YYYY-MM-DD`.
Il piccolo adattatore segue l'indice pubblico Calciotel, archivia gli HTML compressi nella
stessa struttura raw del sistema arbitrale e accetta solo identità esatte (ordine nome/cognome
irrilevante). Niente abbinamenti approssimativi: i nomi non coincidenti restano nel registro
`missing`, con ripiego sullo storico già normalizzato. Il file sorgente conserva URL, hash,
snapshot e definizioni; nessuna fonte compare nella nuova interfaccia.

Il totale espulsioni non viene mai interpretato come totale di rossi diretti: le due componenti
restano `null` se il riepilogo non distingue doppia ammonizione e rosso diretto. I rigori
`penaltyKickShots` del vecchio normalizzatore ESPN non provano quanti rigori siano stati
assegnati: nella nuova proiezione rimangono `null`, senza cambiare gli archivi esistenti.
Medie e totali sono pubblicati solo se completi per tutte le righe visualizzate.

Pipeline separata dagli HTML generati. Conserva snapshot raw, partite normalizzate e aggregati in cartelle differenti.

## Pilot ESPN senza credenziali

```powershell
$env:REFEREE_STATS_PROVIDER='espn'
npm run import:referees:pilot
```

Il feed ESPN è utile come provider iniziale senza chiave. Il report segnala ogni campo non esposto per una determinata partita.

## Pilot API-Football

```powershell
$env:REFEREE_STATS_PROVIDER='api-football'
$env:REFEREE_STATS_API_KEY='chiave-solo-nella-sessione'
npm run import:referees:pilot
```

Variabili opzionali: `REFEREE_STATS_API_BASE_URL`, `REFEREE_STATS_SEASON`. La chiave non viene scritta nei file prodotti.

## Provider file

Per riprodurre un import da snapshot locali impostare `REFEREE_STATS_PROVIDER=file` e `REFEREE_STATS_FILE_SOURCE` con il percorso di un JSON contenente le chiavi `serie-a` e `serie-b`.

Il pilot importa 10 gare concluse per competizione e genera un report dei campi mancanti. L'import completo richiede un'esecuzione esplicita con un limite adeguato.

## Stagioni storiche validate

Le stagioni `2023-24`, `2024-25` e `2025-26` sono supportate. Per ogni stagione storica eseguire nell'ordine il calendario, l'import e la validazione dedicata, per esempio:

```powershell
npm run import:referee-calendars:2024-25
npm run import:referees:2024-25
npm run validate:referees:2024-25
npm run build:referees
```

L'opzione `--reuse-raw` su `import.js` rinormalizza gli snapshot ESPN già presenti senza riscaricare ogni scheda partita. Nel 2023/24 ESPN espone arbitro e fixture della Serie B, ma non tutti gli indicatori disciplinari: questi valori restano `N/D`.
