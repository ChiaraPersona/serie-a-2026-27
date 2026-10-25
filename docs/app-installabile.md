# App installabile

Il sito include un manifest PWA e un service worker. Il build condiviso inserisce manifest, icona Apple, stile e controllo di installazione nelle pagine principali e nelle pagine squadra, anche sotto una sottocartella di hosting.

Android: quando il browser rende disponibile l'installazione, compare «Installa app» a fondo pagina. È disponibile anche il comando di installazione del browser.

iPhone/iPad: il pulsante a fondo pagina mostra come usare Condividi → Aggiungi alla schermata Home. L'app apre la stessa home del sito in modalità standalone.

Serve un hosting HTTPS (oppure localhost per le prove). Pubblicare anche `manifest.webmanifest`, `sw.js`, `offline.html`, `assets/app/`, `js/install-app.js` e `css/install-app.css`. Non serve uno store. Nessun deploy viene eseguito dal build.

Il service worker memorizza esclusivamente la schermata di assenza connessione. Navigazioni e richieste in `data/` usano la rete senza cache HTTP; nessun pronostico o quota viene conservato dal service worker. Offline viene mostrato un messaggio esplicito. Le pagine già aperte mantengono il comportamento del sito esistente.

Verifica: `node scripts/check-install-app.cjs` controlla Chromium desktop/mobile, istruzioni iPhone, prompt Android simulato, hosting sotto una sottocartella, icone, navigazione offline, dati non disponibili offline e riconnessione. Non sostituisce una prova di installazione su dispositivi Android e iOS reali.

Riferimento: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

