# Champions MD5 — undici e schedina, 24 novembre 2026

Acquisiti gli undici di Bodø/Glimt–LASK e Galatasaray–Aston Villa come ufficiali, su dichiarazione esplicita dell’utente. Gli screenshot originali sono conservati in `data/sources/official-lineup-evidence/champions-md05-first-two/`. La dicitura “Probabili formazioni” presente nell’immagine Galatasaray–Aston Villa è conservata nell’evidenza; lo stato ufficiale deriva dalla dichiarazione dell’utente. Solo Bodø/Glimt–LASK include panchine confermate. La rosa residua di Galatasaray–Aston Villa resta da convocare, senza certificazione della panchina.

Per le altre 16 gare sono stati acquisiti esplicitamente come riferimenti provvisori gli ultimi undici canonici disponibili. Non sono probabili documentate della quinta giornata. Fixture e data precedenti restano nei metadati; l’interfaccia mostra il limite. Le indisponibilità delle gare precedenti non sono trasferite come fatti della nuova giornata. Gli undici provvisori non entrano nel registro ufficiale.

Il builder MD4 ora accetta `--matchday 5`, conserva i motori e le soglie esistenti e produce dataset MD5 separati. Le eccezioni manuali MD4 non vengono trasferite. Le 72 fixture estranee presenti negli Scenari condivisi sono identiche allo snapshot iniziale. I cataloghi MD1–MD4, quote e contratti estranei non sono stati ricalcolati.

Risultato: 18 gare, 396 titolari, 267 selezioni suggerite preliminari (170 squadra/partita e 97 giocatore); nessuna approvazione statistica. Le proiezioni individuali utilizzabili riguardano 289 titolari; 107 restano bloccati dai criteri esistenti. Le 27 proiezioni prive di quota sono escluse dal catalogo quotato. I contratti DUO restano giocatore più possibile sostituto: probabilità, quota equa ed EV del contratto restano N/D. Le fonti e gli URL rimangono interni.

Eseguiti:
- `node scripts/apply-official-starter-policy.js` e build del sito Champions/Schedina.
- `node scripts/test-champions-md04.cjs --matchday 5`: contratti esatti, quote/soglie, undici, budget minuti, riconciliazione, probabilità DUO N/D, fixture estranee invariate, rimozione dei non titolari precedentemente salvati e azzeramento delle metriche MyCombo filtrate.
- `node scripts/test-champions-shared-scenarios.cjs`: invarianti del motore Serie A, cutoff, N/D e indipendenza dalle quote.
- `node scripts/test-personal-betslip.mjs`: persistenza, contesti, compatibilità e deduplicazione.
- `node scripts/check-champions-md05-browser.cjs`: 1440/390 px, 18 Letture, sincronizzazione con Schedina, 22 identità per gara, salvataggio DUO, riferimenti provvisori, carta CL5 e regressioni MD3/MD4. Evidenze in `output/champions-md05/browser/`.

Il test storico `test-champions-reading-data.mjs` richiede `registry-md2.json`, non presente dopo il ritiro delle Letture delle giornate precedenti: si interrompe con ENOENT. Non sono stati rigenerati archivi storici per soddisfare questa aspettativa precedente. Le verifiche MD5 e browser sopra elencate passano.

Aggiornamenti successivi delle sole fixture ufficiali:

```text
node scripts/build-champions-md04.cjs --matchday 5 --official --fixtures <fixture-ID-canonici>
node scripts/apply-official-starter-policy.js
node scripts/build-site.js --presentation-only --champions-pages-only --matchday 5
node scripts/test-champions-md04.cjs --matchday 5
node scripts/check-champions-md05-browser.cjs
```

Prima aggiornare il file ufficiale canonico con entrambi gli undici e gli ID verificati. Non rieseguire l’importazione iniziale degli screenshot per acquisizioni successive: ricostruisce l’input iniziale. Le fixture già iniziate/concluse vengono rifiutate dal builder e non ricevono sostituzioni retroattive. Nessun commit, push, deploy o liquidazione certificata.
