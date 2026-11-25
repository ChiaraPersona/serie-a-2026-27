# Champions MD5: ufficiali del 25 novembre, ore 21:00

Integrate le sette gare Atlético de Madrid–Viking, Club Brugge–Liverpool, Inter–Stuttgart, Shakhtar Donetsk–Fenerbahçe, Lille–Bayern München, Paris Saint-Germain–Roma e Sporting CP–Manchester United (fixture canoniche MD5-12–MD5-18). Registrati 154 titolari e 160 riserve dai 14 screenshot forniti dall'utente, conservati nelle cartelle `data/sources/official-lineup-evidence/champions-md05-nov25-evening-first/` e `champions-md05-nov25-evening-rest/`.

Aggiornate entrambe le fonti canoniche ufficiale/probabile, il registro condiviso, le previsioni individuali e gli scenari delle sole fixture interessate. Nessuna modifica a formule, pesi, approvazioni o politica dei suggerimenti. Nessuna applicazione dei filtri prudenti sperimentali. Le sette gare passano complessivamente da 102 a 118 suggerimenti preliminari; il totale MD5 è 287, con zero selezioni statisticamente approvate.

## Identità e dati mancanti

- Il numero 2 del Viking è Herman Haugen, ID canonico `herman-haugen`, provider ID ESPN 303105; non Kristoffer Haugen, che ha numero 28 nella rosa canonica.
- Mile Svilar, numero 99 della Roma, era già nelle statistiche Champions con ID `mile-svilar` e provider ID 238798. Recuperato questo collegamento esatto e aggiunta la voce nel registro rose, conservando `registered: null` e UEFA ID N/D: l'undici ufficiale non viene usato per inventare metadati di registrazione UEFA.
- Cinque riserve conservate con nome e numero ma ID N/D: Bovo L. (Inter, 44), Lavelli M. (Inter, 53), Obah P. (Shakhtar, 68), Codjo-Evora N. (Bayern, 36), Bar A. (PSG, 90). Nessun abbinamento approssimativo; nessuna statistica inventata.

## Mercati e verifiche dati

Archiviati nove contratti dei non titolari: Federico Dimarco, Deniz Undav (due), Romelu Lukaku, Dilane Bakwa, Soriba Diaoune, Donyell Malen (due), Rodrigo Mora. Nessuna previsione trasferita al sostituto. Le eventuali nuove proposte derivano dal ricalcolo dei builder esistenti con contratti provider verificati; probabilità, quota equa ed EV DUO restano N/D.

- `build-champions-md04.cjs --matchday 5 --official --fixtures ...`: completato per i due gruppi e per la verifica finale dell'identità Viking.
- `apply-official-starter-policy.js`: completato.
- `build-site.js --presentation-only --champions-pages-only --matchday 5`: completato.
- `check-champions-md05-nov25-evening-data.cjs`: superato; 22 titolari canonici per gara, quote/soglie/modificatori conservati invariati, non titolari archiviati, DUO N/D e hash delle fixture/scenari estranei invariati.
- `test-champions-md04.cjs --matchday 5`: superato, 18 fixture e 287 suggerimenti; inclusi riconciliazione della schedina personale salvata e filtro MyCombo. Il test ora sceglie una riserva con ID risolto per la simulazione di una selezione salvata; una riserva con ID nullo non costituisce un contratto identificabile per quel test.
- `test-betting-selection-contract.js`: superato.
- Controlli sintattici degli importatori e `git diff --check` dei file pertinenti: superati.

Evidenze: `output/champions-md05/nov25-evening-all/data-check.json` e baseline nei gruppi `nov25-evening-first` / `nov25-evening-rest`.

## Desktop e mobile

`check-champions-md05-nov25-evening-all-browser.cjs`: superato a 1440 e 390 pixel sulle sette gare. Verificati nomi e conteggi di titolari/panchine, corrispondenza dei suggerimenti Lettura/Schedina, nessun overflow o errore JavaScript e nessun pannello pubblico di provenienza statistica. Report e screenshot in `output/champions-md05/nov25-evening-all/browser/`.

Aggiornamento locale. Nessun nuovo commit, push o deploy; nessuna modifica retroattiva agli esiti o ai rendimenti delle gare concluse.
