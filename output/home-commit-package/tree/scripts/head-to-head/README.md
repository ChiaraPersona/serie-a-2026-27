# Importazione scontri diretti

`import.js` recupera da ESPN gli ultimi cinque incontri ufficiali disponibili per ognuna delle 190 partite del girone di andata 2026/27. La ricerca comprende Serie A, Serie B e Coppa Italia dal 1999/00 al 2025/26.

I calendari e i riepiloghi originali vengono conservati come cache gzip ignorata da Git in `data/raw/head-to-head/espn/`. Il dataset normalizzato viene scritto in `data/generated/head-to-head/first-leg-2026-27.json`; `import-report.json` registra accoppiamenti con meno di cinque precedenti, discrepanze fra eventi e totali ESPN ed eventuali errori.

Comandi:

```powershell
npm run import:head-to-head
npm run test:head-to-head
npm run validate:head-to-head
```

Pilot su una sola coppia:

```powershell
node scripts/head-to-head/import.js --pair atalanta,sassuolo --seasons 2022-23,2023-24,2024-25,2025-26
```

`--refresh` forza il nuovo download anche quando la cache è già presente. Gli eventi mancanti restano esplicitamente segnalati; non vengono interpretati come zero gol o zero ammoniti.

Il dataset è collegato alla pagina `Lettura`: l'indice espone tutte le 19 giornate di andata e ogni scheda mostra risultato, marcatori, ammoniti, minuti e fonte dei precedenti. `scripts/build-predictions.js` passa inoltre lo storico al motore, che applica un correttivo sui gol attesi limitato al 5% per lato e non incluso nel backtest 2025/26.
