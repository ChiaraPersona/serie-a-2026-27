# Audit post-partita Serie A 2026/27 — 18 ottobre 2026

Stato: parziale, con anomalie non riconciliate. Usati esclusivamente i verificatori esistenti settleLeg e settleArchivedLeg. Nessuna formula, soglia, quota o previsione modificata. Nessun commit, push o deploy.

## Ambito documentato

60 gare finished nel repository; 58 con snapshot Git precedente al kickoff. Recuperate 373 occorrenze di selezione dall'ultimo snapshot prepartita per fixture, con contratti e quote integrali nel JSON. MD1–5 conserva il conteggio per gamba delle schedine; MD6 usa le selezioni suggerite quotate e uniche, come archiveStats. La presenza in Git non certifica la pubblicazione sul sito.

## Verifica attuale sugli originali

215 vinte, 136 perse, 7 VOID, 15 grigie. Simulazione da 1 euro per mercato definito: 358,00 euro puntati, 359,65 euro restituiti, +1,65 euro netti, ROI +0,46%. Grigi esclusi dal rendimento, VOID rimborsati. Le statistiche registrate includono StatMuse; questi esiti non sono una liquidazione certificata del bookmaker, ne una nuova certificazione esclusivamente ufficiale.

## Archivio storico separato

settleArchivedLeg mantiene 15 esiti legacy che settleLeg oggi considera non verificabili. Includendoli: 221 vinte, 143 perse, 9 VOID, 373,00 euro puntati, 379,92 euro restituiti, +6,92 euro netti. Questo rendimento storico non deve essere presentato come ricertificazione attuale. I dettagli e la provenienza interna sono nel JSON.

## Differenze e dati mancanti

- Genoa–Frosinone e Venezia–Fiorentina MD4: nessuno snapshot Git precedente al kickoff; esclusi dal campione dimostrabile.
- Bologna–Inter, Frosinone–Sassuolo, Roma–Genoa e Venezia–Napoli MD7: date precedenti al 18 ottobre, ma stato scheduled e risultati finali non acquisiti. Non dedotto un esito dal solo calendario.
- 21 quote correnti diverse dagli originali; 8 contratti originali non piu presenti. Originali conservati nel report, nessuna sovrascrittura retroattiva.
- MD6: il browser mostra 96 verdi e 73 rossi; archiveStats/card e test dati restituiscono 104 vinte e 65 perse. Coorti non riconciliate; non modificata la logica.

## Interfaccia e validazione

Estesa alle card delle giornate concluse la visualizzazione di puntato, ritorno e netto gia esistente per MD6; stessi dati, calcolo, stili e colori. Le card continuano a rappresentare il dataset corrente e il registro storico, non la coorte originale del presente audit. Nessun collegamento pubblico alle fonti aggiunto.

Build sito superato. Test MD1, MD2, MD4, MD5, MD6 superati; completezza dati MD6 99,68%. Test MD3 fallito per minuto espulsione Gianluca Gaetano in Roma–Atalanta: null anziche 90+7. Dati non corretti senza ulteriore verifica.

Test browser esistente superato a 1440 e 390 px: nove card archivio, nessun overflow o errore pagina, MyCombo aggiunta/ricaricamento/rimozione verificati. La discrepanza MD6 sopra riportata rimane.
