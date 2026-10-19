# Archivio risultati: griglia giornate

Modifica limitata all'Archivio risultati di lettura.html. Sei pulsanti riutilizzano griglia, dimensioni, tipografia, raggi e spaziature del calendario futuro, con azzurro polvere e numeri blu. Un solo pannello mostra la giornata selezionata; un secondo clic la richiude. Le card sono prodotte dalla funzione esistente, conservando risultati e link. I template sono inerti e il pannello viene svuotato a ogni cambio, senza duplicare card attive.

Accessibilità: pulsanti nativi, Tab, Invio e Spazio, focus visibile, aria-expanded, aria-controls e regione etichettata dalla giornata selezionata.

Verifica Edge: PASS a 1440, 1050, 768, 390 e 320px. Dimensioni misurate identiche ai quadratini futuri; sei giornate e dieci incontri per giornata, link e testi corrispondenti, apertura/cambio/chiusura e tastiera funzionanti, nessun overflow orizzontale o errore JavaScript. Screenshot completi e dettagli per ogni larghezza nella presente cartella. Esiti in browser.json.

Controllo del codice: rendering di Giornata attuale, Giornate future e card invariato. Rigenerato esclusivamente lo shell Letture con node scripts/build-site.js --readings-index-only. Nessun dataset modificato; nessun builder statistico eseguito. Il lavoro post-Fase 5 non è stato toccato. Nessun commit, push o deploy.

Test CSS: PASS. Test generale test-app-modules.mjs: FAIL su asserzione Schedina relativa alle viste delle prime sei giornate (scripts/test-app-modules.mjs:45), estranea ai file modificati.
