# Champions: acquisizione referti al 22 ottobre 2026

Perimetro: tutte le 54 gare concluse della fase campionato, giornate 1–3. Acquisiti 54 referti ESPN, abbinati per data e ID esatti delle due squadre; stato finale e punteggio confrontati con il calendario canonico verificato UEFA. I raw integrali e i relativi SHA-256 sono nel manifest interno.

- 1.698 presenze e 701 posizioni in panchina senza ingresso.
- 221 eventi gol, 159 assist, 182 ammonizioni e 7 eventi di espulsione.
- 510 sostituzioni, formazioni effettive, statistiche di squadra e metriche individuali disponibili.
- 720 profili canonici aggiornati, di cui 33 già presenti nei registri identità ma assenti dal precedente aggregato statistico.
- 1.679 presenze associate a ID canonici; 19 presenze di 11 identità restano conservate con ID provider e identità canonica null. Nessun collegamento per nomi approssimativi.

I minuti delle 1.698 presenze sono **stimati sul tempo regolamentare**, usando titolarità, sostituzioni ed espulsioni, con limite di 90 minuti. Non includono il recupero e non sono minuti ufficialmente osservati. Le metriche assenti non sono dedotte come zero. Gli zeri dei panchinari non entrati derivano dall'esplicito appearances=0.

Due discrepanze sono conservate in import-report.json: Lille–Real Betis MD1, falli ospiti 12 preesistenti contro 13 acquisiti; Sporting–Galatasaray MD1, corner ospiti 2 contro 4. I valori primari precedenti restano invariati; la nuova osservazione è archiviata separatamente.

## Verifiche

Superati test di copertura, unicità delle presenze, somme individuali/squadra per tiri, SOT, falli e gialli, conteggi gol, preservazione statistiche domestiche e storiche, risultati/calendario e prove già certificate. Riesecuzione dell'importatore identica byte per byte sui dati canonici. Superato test storico delle statistiche giocatori Champions.

Build del sito eseguito nella modalità di sola presentazione Champions. Verifiche Edge a 1440 e 390 px: calendario con 18 risultati MD3, calendario Inter con tre risultati, lettura Como–Manchester United, nessun overflow o errore JavaScript. Nessuna nuova sezione pubblica sulle fonti.

Le letture prepartita e le relative proiezioni restano archiviate con i valori originari: i nuovi dati sono evidenza postpartita nel database, senza ricalcolo retroattivo. Quote, pronostici, Schedine, MyCombo, liquidazioni e Serie A invariati. Nessun commit, push o deploy.
