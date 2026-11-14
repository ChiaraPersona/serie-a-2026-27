# Pulizia CSS conservativa — 14 novembre 2026

## Intervento

Rimosse 307 dichiarazioni superate e 61 blocchi svuotati in 11 fogli
sorgente. Riduzione dei sorgenti: 8.248 byte; dei dieci bundle per pagina:
40.820 byte complessivi, prima della compressione.

Il criterio è limitato allo stesso selettore e alla stessa proprietà nello
stesso ambito: valori identici oppure colori/numeri letterali consolidati.
Sono mantenute le precedenze `!important`, le relazioni shorthand/longhand,
gli ambiti media/supports/container e i fallback non riconosciuti. Le regole
non vengono spostate. Nessuna rimozione basata sulla sola assenza di una
classe nel DOM iniziale.

Rigenerati i bundle e i relativi riferimenti nelle 29 shell attraverso
`scripts/refresh-presentation-assets.cjs`. Nessun builder statistico, modifica
ai motori, commit, push o deploy.

## Verifica

- `scripts/test-css-modules.js`: superato.
- Controlli mirati su blocchi svuotati, priorità important e isolamento media:
  superati. Secondo passaggio del pulitore: nessuna ulteriore rimozione.
- Confronto browser prima/dopo: 12 percorsi a 390, 768 e 1440 px; confronto
  della geometria e degli stili calcolati di tutti gli elementi.
  Esito consolidato: 36/36 confronti superati, nessun errore JavaScript o
  foglio locale mancante. Il primo controllo completo aveva segnalato il
  campione asincrono Champions descritto sotto; il ricontrollo lo sostituisce
  nel riepilogo verificato, conservando entrambi i risultati originali.
- Richieste HTTPS esterne bloccate in entrambi i campioni per rendere il
  confronto indipendente dalla rete. Il confronto non certifica il caricamento
  dei font esterni. Stati interattivi non esplorati esaustivamente.
- Il dettaglio Champions è stato ricontrollato attendendo il completamento
  delle richieste asincrone: il primo campione aveva acquisito pannelli in
  momenti differenti. Il ricontrollo è registrato separatamente.

Evidenze locali: `output/css-cleanup/verified-report.json`, `changes.json`, `report.json`,
`recheck-4.json`, snapshot CSS iniziale `before.json` e screenshot per viewport.

## Riproduzione

Usare `scripts/check-css-cleanup.cjs --capture` **prima** di una nuova pulizia;
la cattura scrive lo snapshot locale iniziale. `scripts/clean-css-overrides.cjs`
mostra il piano senza scrivere; `--write` applica le rimozioni. Dopo la
rigenerazione delle shell, `scripts/check-css-cleanup.cjs` confronta il sito
con lo snapshot. `CHECK_ROUTE` limita il confronto a un percorso.

## Limiti e lavoro successivo

Questo intervento elimina ridondanze dimostrabili senza ridisegnare la
cascata. Restano la distribuzione delle responsabilità tra moduli, gli
override con variabili e shorthand e l'inclusione conservativa di componenti
estranei nei bundle. Richiedono una riorganizzazione distinta, con verifiche
degli stati interattivi e delle varianti delle competizioni.
