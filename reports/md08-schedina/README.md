# Schedina Serie A MD8

Struttura recente MD7: catalogo per partita, composizione libera, nessun numero prefissato, nessun Preferito e nessun profilo Safe/Balanced/Aggressive. Nessuna modifica ai criteri, alle formule o alle quote.

Totale: 211 esiti; 122 con quota verificata nello snapshot del 22/10/2026; 89 previsioni senza quota compatibile. Le probabilità individuali non sono probabilità DUO. Quote mancanti ed EV non calcolabili restano null. Quota equa calcolata quando la probabilità è disponibile.

| Partita | Esiti | Con quota | Senza quota |
|---|---:|---:|---:|
| torino-monza-2026-27-md-08 | 24 | 20 | 4 |
| cagliari-bologna-2026-27-md-08 | 22 | 18 | 4 |
| como-sassuolo-2026-27-md-08 | 22 | 18 | 4 |
| napoli-roma-2026-27-md-08 | 22 | 18 | 4 |
| lazio-parma-2026-27-md-08 | 26 | 22 | 4 |
| inter-fiorentina-2026-27-md-08 | 22 | 5 | 17 |
| atalanta-frosinone-2026-27-md-08 | 20 | 5 | 15 |
| genoa-venezia-2026-27-md-08 | 19 | 6 | 13 |
| lecce-juventus-2026-27-md-08 | 16 | 5 | 11 |
| udinese-milan-2026-27-md-08 | 18 | 5 | 13 |

Verifiche: identità dei cataloghi Lettura/Schedina; aggiunta e rimozione di tutti i 211 esiti nel registro; salvataggio e recupero di 10 selezioni; browser 1440/390 px su tutte le partite; collegamento dalla pagina indice; zero errori JS e overflow; test proiezioni 380 fixture; git diff --check. Hash invariati per previsioni, letture editoriali, calendario, MD7, quote, motore e selettore.

Rigenerazione: node --experimental-require-module scripts/build-schedina-md08.cjs; node scripts/build-reading-browser-data.cjs --matchday 8; node scripts/build-site.js --presentation-only --betting-page-only --matchday 8.

Nessun commit, push o deploy.
