# Letture

Ogni lettura vive in un file JSON separato. Copiare `_template.json`, rinominare il file con l'ID della partita e compilare `matchId` usando l'identificatore presente in `data/normalized/matches.json`.

Le sette sezioni restano sempre presenti. Un contenuto non ancora verificato deve rimanere `null`: nell'interfaccia verra mostrato come `N/D`. Ogni fonte di sezione usa la forma `{ "label": "...", "url": "..." }`.

Eseguire `npm run build:readings` per validare i file sorgente e rigenerare `data/normalized/readings.json`.

Il file `matchday-01-prototype.json` e un batch: genera le dieci bozze della prima giornata con tutti i campi editoriali ancora a `null`. Il renderer completa soltanto i dati gia verificati nel repository, come calendario, stadio, allenatore, modulo di riferimento, stagione precedente e obiettivi.
