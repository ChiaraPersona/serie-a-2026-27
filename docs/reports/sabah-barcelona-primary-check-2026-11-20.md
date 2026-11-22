# Sabah–Barcelona: riscontro primario dei risultati

Verifica del 20 novembre 2026. Ricerca interna, nessuna modifica al modello o al sito. I risultati seguenti sono osservazioni, non una nuova previsione.

## Campioni correnti verificati

| Squadra / ambito | Gare | Fatti | Subiti | Fatti/gara | Subiti/gara |
|---|---:|---:|---:|---:|---:|
| Barcelona Liga, fino all'8 novembre | 12 | 48 | 13 | 4,00 | 1,083 |
| Barcelona Liga in trasferta | 6 | 24 | 6 | 4,00 | 1,00 |
| Barcelona Champions fase campionato | 4 | 14 | 6 | 3,50 | 1,50 |
| Barcelona Champions in trasferta | 2 | 6 | 5 | 3,00 | 2,50 |
| Barcelona Liga + fase campionato Champions | 16 | 62 | 19 | 3,875 | 1,188 |
| Sabah Champions fase campionato | 4 | 4 | 10 | 1,00 | 2,50 |
| Sabah Champions in casa | 2 | 3 | 2 | 1,50 | 1,00 |
| Sabah Champions in trasferta | 2 | 1 | 8 | 0,50 | 4,00 |
| Sabah Premyer Liqa, risultati completati nel calendario AFFA fino all'8 novembre | 10 | 22 | 6 | 2,20 | 0,60 |

Conteggi Barcelona ricalcolati dalla [pagina risultati ufficiale del club](https://www.fcbarcelona.com/en/football/first-team/results): Liga 2,5,5,5,4,7,3,3,5,1,6,2 gol; Champions 5,4,2,3. Escluse amichevoli e altre competizioni. Non è una media di 4–5 gol in Champions: è 4,00 in Liga e 3,50 nella fase campionato Champions.

Sabah verificato nel [riepilogo ufficiale UEFA](https://www.uefa.com/uefachampionsleague/news/02a8-2176fa83582b-d99f0b27f405-1000--champions-league-league-phase-fixtures-and-results-by-team/): Manchester United 4–0 Sabah; Sabah 2–0 Slavia Praha; Sabah 1–2 Borussia Dortmund; Viking 4–1 Sabah. La vittoria sullo Slavia va inclusa. I due quattro a sfavore sono entrambi in trasferta, mentre Sabah–Barcelona è in casa Sabah.

Il [referto UEFA Viking–Sabah](https://www.uefa.com/newsfiles/UCL/2027/2049624_FR.pdf) riporta espulsione di Aden McCarthy al 77', terzo gol Viking all'81' e quarto nel recupero. Non consente di trattare tutti e quattro i gol come evidenza omogenea di difesa a undici contro undici.

Il [calendario ufficiale AFFA](https://www.affa.az/index.php/yarlar/topaz-premyer-liqas/tqvim/i-dvr/2436) elenca, fino all'8 novembre, Sabah–Kapaz 2–0, Araz–Sabah 0–1, Sabah–Zira 5–0, Shafa–Sabah 0–3, Sabah–Imishli 3–1, Neftchi–Sabah 0–0, Qabala–Sabah 0–4, Sabah–Qarabag 0–0, Turan–Sabah 3–2, Sabah–Shamakhi 2–2. Totale 22–6. Sabah–Sumqayit del 21 agosto compare senza risultato e non entra nel totale. Eventuali gare del 20 novembre non sono incluse: verificare lo stato prima di presentare questo campione come aggiornato alla conclusione della giornata.

## Campionati e trasferibilità

Le medie in Liga e Premyer Liqa descrivono avversari differenti: non costituiscono da sole una scala comune di gol. Il [metodo UEFA dei coefficienti nazionali](https://www.uefa.com/nationalassociations/uefarankings/country/) aggrega risultati e bonus delle coppe europee su cinque stagioni; non offre un rapporto da moltiplicare direttamente per i gol. L'[overview UEFA](https://www.uefa.com/nationalassociations/uefarankings/) mostra Spagna terza con 97,046, ma la pagina statica non espone il rango azero: nessun numero azero ricostruito da siti secondari viene qui certificato.

È ragionevole sottoporre a verifica i 2,39 gol del candidato rispetto alla produzione corrente Barcelona; non è giustificato fissare automaticamente 4 o 5 gol attesi. Il campione specifico Sabah in casa in Champions ha soltanto due gare e contraddice una descrizione di quattro gol subiti abitualmente in casa. Anche il campione Barcelona fuori casa in Champions è di sole due gare, una delle quali al PSG.

## Riscontro degli archivi interni

`data/generated/champions-team-history.json` riproduce le quattro gare europee di ciascuna squadra. `data/sources/champions-sabah-domestic-volumes-2026-27.json` contiene otto gare Sabah, 15 fatti e 6 subiti: è un sottoinsieme recuperato per i volumi, non l'intera stagione. Mancano nel sottoinsieme il 2–0 Kapaz e il 5–0 Zira; il calendario AFFA completa il dato dei soli risultati senza certificare tiri o altri volumi mancanti.

Nell'ultima lettura concorde del file `data/sources/champions-pilot-match-stats-2025-27.json` sono presenti undici gare Barcelona Liga 2026/27 fino al 31 ottobre (46–12). Il riscontro primario attuale comprende anche Atlético–Barcelona 1–2 dell'8 novembre, da cui 48–13. Una lettura precedente durante il lavoro aveva restituito dodici gare: i file condivisi sono cambiati nel corso della verifica, pertanto questi conteggi descrivono lo snapshot consultato e non uno stato immutabile del progetto. Non è stato aggiornato alcun dataset da questa ricerca.
