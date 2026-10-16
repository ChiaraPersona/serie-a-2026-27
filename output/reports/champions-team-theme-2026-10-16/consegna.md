# Tema delle 36 squadre Champions

Modificato esclusivamente `css/champions.css`, integrando il tema overview già presente senza duplicarlo. Il selettore del canvas condiviso riconosce i contenitori overview e squadra, escludendo le singole Letture.

- Sfondo blu notte continuo, sfumature diffuse, navbar e footer armonizzati su tutte le 36 pagine generate dal template condiviso.
- Stemmi direttamente sulla testata: eliminati sfondo, bordo, angoli arrotondati e ombre del riquadro. Corretta la base flex che limitava l'immagine a 34px effettivi; ora 160px su desktop/tablet e 110px su mobile. File, proporzioni e trasparenza originali conservati; `object-fit:contain`, nessun ritaglio.
- Due indicatori senza riquadri, bordi o ombre, con numeri e testi identici. Affiancati anche su mobile; nessun nuovo separatore o contenitore.
- Sezioni interne, calendari, formazioni e statistiche invariati, comprese le relative sfumature blu.

## Verifiche

- Nove casi browser Edge: Inter (circolare), Arsenal (scudo), Slavia Praha (stella) a 1440/768/390. Logo più grande, nessun bordo/sfondo/ombra dei contenitori, proporzioni e sorgenti immutate, indicatori invariati, assenza di sovrapposizioni e overflow/errori console. Screenshot della testata, del contesto iniziale e del footer.
- Confronto completo dell'HTML di ciascuna pagina squadra con la baseline e dei gradienti delle altre sezioni: identici. Modifica soltanto di presentazione CSS.
- Dodici confronti DOM/stili desktop/mobile: overview Champions, Lettura Inter–Club Brugge, Lettura MD1 legacy, Lettura Milan–Atalanta, Coppa Italia e Schedina. Nessuna variazione.
- Test `test-champions-team-page.mjs` superato su tutte le 36 squadre; `test-champions-reading-page.mjs` e `git diff --check` superati.
- Due letture iniziali stabili e confronto hash finale: soltanto `css/champions.css` differisce dalla baseline. I valori dello stato Git sono registrati in `integrity.json`.

Nessun intervento su JavaScript, dataset, immagini, motori, quote, pronostici, contratti o store. Nessun commit, push, deploy o rigenerazione eseguito dall'agente. Il precedente lavoro presente nel working tree è stato preservato.

## Artefatti

Questa directory contiene `before.json`, `after.json`, `integrity.json`, `check.cjs`, questo documento e 27 screenshot `{inter,arsenal,slavia-praha}-{1440,768,390}{,-hero,-footer}.png`.
