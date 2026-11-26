# Pannello locale formazioni

Su questo computer puoi aprire `tools/lineup-admin/avvia-pannello.cmd` con un
doppio clic e mantenere aperta la finestra. In alternativa, dalla radice:

```powershell
& 'C:/Program Files/nodejs/node.exe' tools/lineup-admin/server.cjs
```

Aprire <http://127.0.0.1:8787>. Il processo deve rimanere attivo.
Non richiede installazioni o dipendenze aggiuntive.

## Funzioni disponibili

- Serie A e Champions: gare future con stato scheduled, rose e ID canonici,
  compilazione di entrambi gli undici e panchine, modulo, stato e nota interna.
- Controllo di undici titolari, duplicati, appartenenza alla squadra, modulo,
  revisione dei dati e calcio d'inizio. Le formazioni ufficiali già acquisite
  non possono essere declassate a probabili.
- Campo interattivo con modulo iniziale 4-3-3 (o quello già salvato), undici
  posizioni e scelta dalla rosa tramite pulsante +. Il cambio di modulo
  ridispone i giocatori preservando la sequenza dall'area del portiere all'attacco.
  Ricerca per nome, sostituzione e rimozione di un titolare; panchina sotto il
  campo. Un giocatore promosso dalla panchina viene rimosso da essa; i titolari
  già assegnati ad altre posizioni non possono essere duplicati.
- Modulo e undici sono precompilati: precedenza a ufficiali/probabili della
  partita. In assenza, per Serie A si usa l'ultima probabile disponibile con
  ID ancora in rosa, oppure un undici ufficiale precedente compatibile;
  per Champions si usa il registro dei riferimenti precedenti. Questi casi
  restano probabili e sono segnalati come riferimenti da verificare, senza
  trasferire panchine storiche. Nessuna risoluzione approssimativa dei nomi.
- Bozze immutabili, recuperabili dal pannello, in `output/lineup-admin/drafts/`.
  Sono inserimenti dell'operatore, non certificazioni di una fonte esterna.
- Champions MD4/MD5: ricalcolo con il builder esistente, limitato alla fixture,
  seguito dal filtro ufficiale quando richiesto e dal build del sito nella copia.
  Sono obbligatorie entrambe le panchine verificate e le identità canoniche esatte.
  Gli ID provider mancanti restano null; non consentono di inventare contratti o quote.
  Non vengono autorizzate automaticamente panchine mancanti.
- Ogni ricalcolo crea `output/lineup-admin/runs/<id>/`, con input materializzati
  dall'adattatore di staging esistente, report e log. Non promuove file nel checkout,
  non modifica dati canonici e non esegue commit, push o deploy.
- A fine ricalcolo mostra prima/dopo per gol attesi, probabilità 1/X/2 e
  risultato centrale, conservando i limiti statistici del modello e gli N/D.

## Limiti espliciti

È un'applicazione locale, non un'area collaboratrice già disponibile online.
Il listener accetta soltanto 127.0.0.1, controlla Host, Origin e token per le
scritture e non serve i file del repository. Non è un sistema di autenticazione
multiutente: l'autore è `local-admin`. Non esporlo tramite tunnel o sulla rete.

Il ricalcolo Serie A e delle altre giornate Champions è disabilitato: prima
occorre collegare e verificare gli adattatori per singola fixture, senza
rigenerare operativamente gare estranee. Le bozze rimangono disponibili.

Il report conferma l'esecuzione dei comandi; non certifica esiti, liquidazioni
né approvazione statistica di nuove selezioni. Prima di introdurre promozione
automatica serviranno confronti completi su quote/contratti e fixture estranee,
suite delle competizioni e verifiche Lettura/Schedina/Preferiti/MyCombo.

Passi successivi: adattatore Serie A, confronto completo delle selezioni,
identità con permessi limitati, archivio remoto e processo di
pubblicazione autorizzato. Le credenziali tecniche dovranno rimanere sul server.

## Verifiche

```powershell
& 'C:/Program Files/nodejs/node.exe' tools/lineup-admin/test.cjs
```

Il test verifica validazione, revisioni, scadenza gara e protezioni HTTP senza
salvare formazioni di esempio nei dati canonici. Il pannello e i suoi file
sono sotto `tools/`, esclusi dalla whitelist del pacchetto pubblico Pages.

`check-browser.cjs` verifica desktop/mobile e salvataggio/ripresa delle bozze.
Con `--recalculate` esegue anche la pipeline reale sulla formazione canonica
già presente nella prima fixture Champions disponibile. Crea soltanto bozze,
log e copie isolate in `output/lineup-admin/`. Richiede il runtime Playwright
locale già usato dagli altri controlli browser del repository.
