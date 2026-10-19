# Restyling homepage Champions League — 19 ottobre 2026

Intervento limitato alla homepage: hero locale compatta (290px desktop, 210px mobile), navigazione per giornate e filtro squadra. Le card partita usano lo stesso renderer e gli stessi stili preesistenti. Barra squadre e riepilogo punti conservano markup identico al confronto prima/dopo. Nessun builder dati, commit, push o deploy eseguito.

## File dell'intervento
- `js/pages/champions.js`: eliminato il turno 3 forzato; stato derivato da tutte le partite del turno con stato finished e punteggi numerici; tre gruppi di pulsanti, apertura esclusiva e richiudibile; filtro squadra e contatore sul solo turno selezionato. Nessuna modifica al renderer dei dettagli.
- `css/champions.css`: regole circoscritte alla homepage per hero, pulsanti e responsive. Proporzioni dei pulsanti riprese da Letture (padding 12px, numero 29px, raggio 13px, gap 9px).
- `assets/images/champions-home-2026-27.png`: copia esatta dell'allegato, SHA256 62F1EDED5C908B117D25CA2758FA9C000A0CED9B11AF23E5E68EBC198E6DE63E. Ritaglio CSS responsive; nessuna modifica del contenuto.
- `scripts/check-champions-home-restyle.cjs`: controllo browser dedicato.
- Questa cartella: screenshot e baseline delle due sezioni preservate.

## Verifiche
Eseguito `node scripts/check-champions-home-restyle.cjs --after` con Edge headless a 1440, 1050, 901, 768, 390 e 320px.
- Tutti gli 8 pulsanti presenti; ognuna delle otto giornate mostra esclusivamente le proprie 18 card, senza duplicazioni.
- Secondo clic chiude il turno; cambio turno sostituisce le card.
- Giornate 1 e 2: 18 risultati numerici ciascuna. Giornata iniziale 3, derivata dai dati.
- Attivazione con Enter, filtro Inter (una card), reset (18 card) superati a tutte le larghezze.
- Nessun selettore Giornata residuo; aria-expanded aggiornato, aria-controls associato alla regione calendario.
- Nessun overflow orizzontale e nessun errore JavaScript rilevato.
- Barra delle 36 squadre e riepilogo punti: outerHTML identico alla baseline salvata prima dell'intervento; nessuna regola CSS introdotta su tali sezioni.
- Asset con hash identico all'allegato. Screenshot desktop/mobile ispezionati: logo intero e nessun testo sovrapposto.
- `node --check js/pages/champions.js` e `git diff --check` superati.
- Nessuna modifica nei dati. Le modifiche concorrenti alle Letture sono state lasciate intatte.

Le giornate parziali, rinviate o con punteggio mancante restano aperte: la conclusione richiede che tutte le gare siano finished e abbiano entrambi i punteggi numerici. Questi casi sono coperti dalla condizione nel renderer; non sono stati simulati nel browser con dati artificiali.

## Screenshot prima/dopo
| Vista | Prima | Dopo |
|---|---|---|
| Desktop 1440px | [Prima](before-1440.png) | [Dopo](after-1440.png) |
| Mobile 390px | [Prima](before-390.png) | [Dopo](after-390.png) |

Disponibili anche after-1050.png, after-901.png, after-768.png e after-320.png. Gli screenshot mostrano il primo viewport.
