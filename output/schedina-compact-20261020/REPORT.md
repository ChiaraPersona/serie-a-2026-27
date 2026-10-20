# Schedina: presentazione compatta

Modifica esclusivamente visiva nelle viste di schedina.html, per tutte le 7 giornate Serie A e le 3 Champions disponibili.

## Modifiche

- Unica sequenza di card ordinata per risultati/doppie chance, tiri totali, tiri in porta e altri mercati.
- Etichette visive Tiri totali e Tiri in porta unificate tra individuali e DUO, senza cambiare le famiglie interne o i contratti.
- Nessuna intestazione intermedia delle categorie. Le card precedentemente nel contenitore Altri mercati disponibili restano nella stessa lista, con gli stati di selezione/approvazione originali e senza duplicazioni nuove. Rimossi contenitore, dicitura, conteggio e relative note di approvazione.
- Rimossi titolo e testo introduttivo Previsioni della partita; conservati tiri, SOT, corner, 1X e X2, con disposizione più compatta.
- Card, colori, tema, note sui sostituti e regole di conteggio conservati. La lettura completa conserva la propria presentazione: il modo compatto si attiva solo nel render della Schedina.

## File del sito modificati da questo intervento

1. js/pages/betting.js — etichette, ordinamento, rimozione delle intestazioni e del contenitore manuale nella sola Schedina.
2. css/betting.css — due regole di disposizione per il riepilogo numerico compatto, limitate a body[data-page=betting].
3. scripts/build-site.js — versione del modulo Schedina e opzione --betting-page-only per rigenerare esclusivamente il relativo shell.
4. schedina.html — shell rigenerato, riferimenti agli asset aggiornati.
5. champions-league.html — aggiornamento automatico dei riferimenti di versione agli asset durante il primo build condiviso; nessuna modifica applicata al markup dei contenuti della lettura. Sono state conservate anche le modifiche concorrenti rilevate nei file condivisi.

Script di verifica creato: output/schedina-compact-20261020/check.cjs. Nella stessa cartella: before.json, after.json, protected.json, result.json, betting.before.js, champions-shell.before.html e sei screenshot desktop/mobile.

## Verifiche

Confronto automatico prima/dopo su tutte le 10 giornate: stesse 1.814 card/righe complessive, stessi ID, valori numerici, quote, probabilità, EV, tipologia DUO/standard, stato selezionato/manuale, stato liquidazione/disabilitazione e collegamenti alla lettura. Le ripetizioni già esistenti tra blocchi di archivio e MyCombo sono conservate, non sono nuovi pronostici.

- schedina.html?giornata=1: 47 card/righe.
- schedina.html?giornata=2: 47 card/righe.
- schedina.html?giornata=3: 47 card/righe.
- schedina.html?giornata=4: 44 card/righe.
- schedina.html?giornata=5: 225 card/righe.
- schedina.html?giornata=6: 169 card/righe.
- schedina.html?giornata=7: 218 card/righe.
- schedina.html?competizione=champions&giornata=1: 156 card/righe.
- schedina.html?competizione=champions&giornata=2: 234 card/righe.
- schedina.html?competizione=champions&giornata=3: 627 card/righe.

Controlli Edge a 1440, 390 e 320 px su Serie A e Champions: nessun overflow orizzontale o errore JavaScript. Verificati aggiunta, persistenza dopo reload e rimozione di una selezione della Champions MD3. Le selezioni archiviate conservano la disabilitazione precedente.

Test store personale e test Champions MD3 lineage superati. Checksum SHA-256 di tutte le fonti e dei dataset normalizzati invariati. Nessuna rigenerazione di dati, quote o pronostici, nessuna modifica ai criteri di approvazione. Nessun commit, push o deploy eseguito dall'agente.
