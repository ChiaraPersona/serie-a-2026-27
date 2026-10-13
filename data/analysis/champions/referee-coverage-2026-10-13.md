# Copertura archivio arbitri Champions League MD2

Snapshot: 2026-10-13 · designazioni UEFA: 18/18 · profili statistici: 18/18.

| Arbitro | UEFA | Storico gare | UCL 26/27 | UCL storico | Ultime 10 | Mancanze |
|---|---:|---:|---:|---:|---:|---|
| Igor Pajač | SI | 120 | 0 | 2 | 10/10 | Over 3,5 carriera |
| Sebastian Gishamer | SI | 137 | 0 | 4 | 10/10 | Over 3,5 carriera |
| Felix Zwayer | SI | 206 | 1 | 28 | 10/10 | Over 3,5 carriera |
| Glenn Nyberg | SI | 176 | 3 | 21 | 10/10 | Over 3,5 carriera |
| Rohit Saggi | SI | 166 | 1 | 8 | 10/10 | Over 3,5 carriera |
| Marco Guida | SI | 139 | 1 | 18 | 10/10 | Over 3,5 carriera |
| Nicholas Walsh | SI | 179 | 1 | 4 | 10/10 | Over 3,5 carriera |
| Georgi Kabakov | SI | 184 | 1 | 7 | 10/10 | Over 3,5 carriera |
| Daniel Siebert | SI | 110 | 1 | 18 | 10/10 | Over 3,5 carriera |
| Donatas Rumšas | SI | 61 | 1 | 14 | 10/10 | Over 3,5 carriera |
| Tobias Stieler | SI | 181 | 0 | 18 | 10/10 | Over 3,5 carriera |
| François Letexier | SI | 191 | 1 | 31 | 10/10 | Over 3,5 carriera |
| Ivan Kružliak | SI | 70 | 1 | 18 | 10/10 | Over 3,5 carriera |
| Chris Kavanagh | SI | 197 | 1 | 6 | 10/10 | Over 3,5 carriera |
| Urs Schnyder | SI | 163 | 0 | 8 | 10/10 | Over 3,5 carriera |
| Sven Jablonski | SI | 173 | 2 | 7 | 10/10 | Over 3,5 carriera |
| Clément Turpin | SI | 211 | 1 | 41 | 10/10 | Over 3,5 carriera |
| Irfan Peljto | SI | 72 | 1 | 23 | 10/10 | Over 3,5 carriera |

## Metodo

- Le designazioni sono verificate esclusivamente sulla pagina ufficiale UEFA e collegate ai fixture ID canonici.
- Le statistiche provengono da FootyMetrics e sono conservate con URL, timestamp, hash SHA-256 e snapshot HTML compresso.
- Ogni riga stagione/competizione resta separata. Gli aggregati sommano soltanto conteggi omogenei; le medie sono ricalcolate come totale/partite.
- Cartellini gialli, rossi e totali sono campi distinti. Totale cartellini = gialli + rossi secondo la definizione del provider.
- Stagione corrente = 26/27 oppure anno solare 2026; tutto il resto e storico.
- Champions League e un gruppo autonomo. I campionati nazionali sono le competizioni non internazionali/non di coppa; coppe, play-off e competizioni UEFA/FIFA diverse dalla Champions confluiscono in altre competizioni.
- Le ultime 10 sono le dieci gare piu recenti nello snapshot; i tassi Over sono ricalcolati sui totali gara disponibili.

## Anomalie e limiti

- FootyMetrics espone due profili per Sven Jablonski (ID 191 e 33247): e stato scelto l'ID 191, collegato alla designazione corrente e con il campione completo; 33247 resta registrato come duplicato rifiutato.
- Il provider non espone un tasso carriera Over 3,5 uniforme: il campo resta null. Over 3,5/4,5/5,5 e invece ricalcolato sulle ultime 10 gare.
- Lo split casa/trasferta delle ultime 10 non e disponibile nella tabella pubblica; e disponibile soltanto il profilo carriera aggregato.
- I nomi gara abbreviati nel log recente sono conservati come codici provider; non vengono inventate espansioni non verificate.
- Il dato statistico e di fonte secondaria, dinamico e soggetto a revisione; gli snapshot raw e gli hash congelano l'evidenza usata.
- Nessun dato di questo archivio e collegato al motore pronostici, alla schedina, alle letture o alla UI.
- Nicholas Walsh: il riepilogo carriera riporta 179 gare, mentre la somma delle righe stagione/competizione e 180; entrambi i valori sono conservati e non riconciliati arbitrariamente.
