# Importatore statistiche arbitrali

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
