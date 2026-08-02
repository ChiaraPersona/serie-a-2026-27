# Letture

Ogni lettura vive in un file JSON separato. Copiare `_template.json`, rinominare il file con l'ID della partita e compilare `matchId` usando l'identificatore presente in `data/normalized/matches.json`.

Le sette sezioni restano sempre presenti. Un contenuto non ancora verificato deve rimanere `null`: nell'interfaccia verra mostrato come `N/D`. Ogni fonte di sezione usa la forma `{ "label": "...", "url": "..." }`.

Eseguire `npm run build:readings` per validare i file sorgente e rigenerare `data/normalized/readings.json`.
