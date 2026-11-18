# Audit delle statistiche individuali Champions League — 17 novembre 2026

L’audit copre tutte le righe delle rose Champions 2026/27 disponibili nel progetto, incluse Liste B e portieri. L’unità è il giocatore nella rosa del singolo club. La data del titolo è la data del controllo locale. Le date delle osservazioni dipendono dagli archivi indicati sotto. L’audit non comprende una nuova acquisizione esterna.

- Rose: **1288 giocatori di 36 club**. Snapshot del 2026-10-29.
- Scheda squadra 2026/27: **766** righe con minuti, tiri e tiri in porta valorizzati. **522** hanno almeno una lacuna, di cui 115 portieri. Tra chi ha minuti disponibili, 3 hanno tiri o tiri in porta N/D.
- Campione Champions osservato: **723** abbinamenti con presenze valorizzate. Date campione negli abbinamenti: 2026-10-22, 2026-11-04. **7** righe con lacune nella scheda hanno minuti, tiri e tiri in porta nel campione Champions.
- Registro per partita delle Letture: **581** giocatori della rosa con almeno una riga esattamente collegabile, per 4218 presenze. Il registro completo contiene 581 chiavi club–giocatore e 4218 presenze, con cutoff dichiarato 2026-10-20.
- Storico club 2025/26 collegato o disponibile tramite fallback di pagina: **827** righe. ID ESPN assente nella rosa: **317**. Numero di maglia N/D: **0**.

## Copertura dei campi della scheda 2026/27

| Statistica | Valorizzati | Zeri inclusi | N/D | Copertura |
|---|---:|---:|---:|---:|
| Presenze | 769 | 0 | 519 | 59,7% |
| Minuti | 769 | 1 | 519 | 59,7% |
| Gol | 769 | 489 | 519 | 59,7% |
| Assist | 769 | 525 | 519 | 59,7% |
| Tiri | 766 | 172 | 522 | 59,5% |
| Tiri in porta | 766 | 304 | 522 | 59,5% |
| Gialli | 769 | 472 | 519 | 59,7% |
| Falli commessi | 769 | 182 | 519 | 59,7% |
| Falli subiti | 769 | 172 | 519 | 59,7% |

## Copertura per club

| Club | Rosa | Minuti N/D | Tiri N/D | Tiri in porta N/D | Almeno una lacuna | Campione CL con presenze | Storico per gara |
|---|---:|---:|---:|---:|---:|---:|---:|
| AEK Athens | 22 | 3 | 3 | 3 | 3 | 17 | 19 |
| Arsenal | 52 | 31 | 31 | 31 | 31 | 21 | 18 |
| Aston Villa | 66 | 44 | 44 | 44 | 44 | 21 | 17 |
| Atlético de Madrid | 47 | 25 | 25 | 25 | 25 | 19 | 17 |
| Barcelona | 35 | 12 | 12 | 12 | 12 | 20 | 18 |
| Bayern München | 30 | 9 | 9 | 9 | 9 | 21 | 15 |
| Bodø/Glimt | 32 | 10 | 10 | 10 | 10 | 19 | 14 |
| Borussia Dortmund | 29 | 8 | 8 | 8 | 8 | 19 | 15 |
| Club Brugge | 40 | 20 | 21 | 21 | 21 | 18 | 15 |
| Como | 23 | 2 | 2 | 2 | 2 | 20 | 13 |
| Fenerbahçe | 34 | 14 | 14 | 14 | 14 | 18 | 16 |
| Feyenoord | 46 | 23 | 23 | 23 | 23 | 18 | 19 |
| Galatasaray | 33 | 13 | 13 | 13 | 13 | 18 | 15 |
| Inter | 28 | 6 | 6 | 6 | 6 | 22 | 14 |
| LASK | 32 | 9 | 11 | 11 | 11 | 20 | 18 |
| Leipzig | 29 | 7 | 7 | 7 | 7 | 20 | 17 |
| Lens | 35 | 13 | 13 | 13 | 13 | 21 | 17 |
| Lille | 26 | 3 | 3 | 3 | 3 | 21 | 14 |
| Liverpool | 48 | 28 | 28 | 28 | 28 | 21 | 14 |
| Manchester City | 27 | 5 | 5 | 5 | 5 | 23 | 19 |
| Manchester United | 35 | 11 | 11 | 11 | 11 | 23 | 16 |
| Napoli | 24 | 2 | 2 | 2 | 2 | 22 | 13 |
| Paris Saint-Germain | 27 | 6 | 6 | 6 | 6 | 21 | 15 |
| Porto | 35 | 14 | 14 | 14 | 14 | 21 | 19 |
| PSV Eindhoven | 52 | 31 | 31 | 31 | 31 | 20 | 17 |
| Real Betis | 51 | 28 | 28 | 28 | 28 | 23 | 18 |
| Real Madrid | 35 | 14 | 14 | 14 | 14 | 21 | 19 |
| Roma | 25 | 4 | 4 | 4 | 4 | 20 | 15 |
| Sabah | 27 | 10 | 10 | 10 | 10 | 17 | 8 |
| Shakhtar Donetsk | 29 | 10 | 10 | 10 | 10 | 19 | 13 |
| Slavia Praha | 45 | 23 | 23 | 23 | 23 | 22 | 18 |
| Slovan Bratislava | 29 | 10 | 10 | 10 | 10 | 19 | 15 |
| Sporting CP | 65 | 46 | 46 | 46 | 46 | 19 | 16 |
| Stuttgart | 32 | 11 | 11 | 11 | 11 | 19 | 19 |
| Viking | 30 | 3 | 3 | 3 | 3 | 21 | 18 |
| Villarreal | 33 | 11 | 11 | 11 | 11 | 19 | 18 |

## Metodo e fonti interne

- [Rose e identità](../../data/normalized/champions-registered-squads-2026-27.json). Inclusione di ogni giocatore e verifica dell’unicità dell’ID canonico entro il club.
- [Contesto delle schede](../../data/normalized/champions-player-history-context-2025-26.json) e [codice della pagina](../../js/pages/champions.js). I totali correnti riproducono il collegamento della pagina per club, ID canonico e ID UEFA esatti. L’ambito dei totali varia fra campionato nazionale e campione europeo. Per lo storico si applica anche il fallback del [registro MD3](../../data/normalized/champions-md03-player-database-2026-27.json).
- I totali correnti dell’archivio principale hanno cutoff generale al 22 ottobre. Il campione Champions è un campo distinto con osservazioni fino al 4 novembre.
- [Archivio individuale 2026/27](../../data/normalized/champions-player-stats-2026-27.json). Campione CL letto da `championsObserved` con ID ESPN esatto nello stesso club o ID canonico in assenza di ESPN, applicando l’alias Bodø/Glimt. Abbinamenti ambigui esclusi: nessuno. Le presenze e i minuti riguardano le gare coperte e possono includere minuti stimati.
- [Registro per partita delle Letture](../../data/generated/champions-player-match-history.json). Abbinamento per chiave esatta club–giocatore. Il conteggio riguarda le righe nel registro, prima dei filtri per data della singola Lettura.
- N/D indica un campo assente o privo di valore numerico. Gli zeri numerici sono conservati. I campioni restano separati e non sono usati per riempire i totali della scheda.

## Giocatori con una lacuna nella scheda e dati nel campione Champions

Hiroki Ito (Bayern München), Daniel Elfadli (LASK), Sasa Kalajdzic (LASK), Luke Chambers (Liverpool), Rayan Aït-Nouri (Manchester City), Kaique Pereira (Sporting CP), Ameen Al-Dakhil (Stuttgart). Per ognuno il campione contiene minuti, tiri e tiri in porta. La differenza di ambito va verificata prima di qualunque collegamento nella scheda.

## Dettaglio per giocatore

La colonna CL riporta presenze, minuti, tiri e tiri in porta del campione osservato, in quest’ordine. Le altre statistiche correnti riproducono la scheda squadra. I gialli sono il campo individuale del dataset. Il registro indica il numero di presenze archiviate.

### AEK Athens

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thomas Strakosha | thomas-strakosha | 250046901 | P | N/D | 1 | 2 | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 5 | Sì |
| Marios Balamotis | marios-balamotis | 250210649 | P | B | 41 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 | N/D |
| Alberto Brignoli | alberto-brignoli | 250085391 | P | N/D | 91 | 3 | 270 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 / 360 / 0 / 0 | 6 | Sì |
| Harold Moukoudi | harold-moukoudi | 250066898 | D | N/D | 2 | 5 | 450 | 1 | 0 | 3 | 1 | 0 | 7 | 3 | 4 / 360 / 5 / 1 | 10 | Sì |
| Stavros Pilios | stavros-pilios | 250187689 | D | N/D | 3 | 5 | 450 | 0 | 0 | 3 | 0 | 0 | 6 | 13 | 4 / 360 / 3 / 3 | 11 | Sì |
| Lazaros Rota | lazaros-rota | 250143747 | D | N/D | 12 | 4 | 357 | 0 | 0 | 5 | 2 | 3 | 6 | 3 | 4 / 360 / 1 / 0 | 9 | Sì |
| Domagoj Vida | domagoj-vida | 108567 | D | N/D | 21 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 2 | Sì |
| Charalampos Lykogiannis | charalampos-lykogiannis | 250013058 | D | N/D | 22 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Filipe Relvas | filipe-relvas | 250210435 | D | N/D | 44 | 5 | 450 | 1 | 0 | 4 | 1 | 0 | 0 | 1 | 4 / 360 / 2 / 1 | 10 | Sì |
| Kaan Kairinen | kaan-kairinen | 250079003 | C | N/D | 6 | 2 | 83 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 2 / 72 / 0 / 0 | 8 | Sì |
| Mijat Gaćinović | mijat-gacinovic | 250042749 | C | N/D | 8 | 4 | 212 | 1 | 1 | 5 | 2 | 0 | 7 | 5 | 4 / 86 / 2 / 1 | 10 | Sì |
| Lovro Majer | lovro-majer | 250098470 | C | N/D | 14 | 5 | 420 | 0 | 3 | 7 | 1 | 3 | 10 | 7 | 4 / 304 / 3 / 1 | 11 | Sì |
| Kervin Arriaga | kervin-arriaga | 250197123 | C | N/D | 16 | 3 | 173 | 0 | 0 | 1 | 0 | 1 | 3 | 1 | 3 / 173 / 1 / 0 | 6 | Sì |
| Răzvan Marin | razvan-marin | 250055294 | C | N/D | 18 | 5 | 440 | 1 | 2 | 5 | 3 | 0 | 4 | 5 | 4 / 248 / 7 / 2 | 10 | Sì |
| Petros Mantalos | petros-mantalos | 250012957 | C | N/D | 20 | 4 | 92 | 0 | 1 | 6 | 0 | 1 | 4 | 2 | N/D | 9 | Sì |
| Milán Vitális | milan-vitalis | 250126069 | C | N/D | 27 | 4 | 206 | 0 | 1 | 0 | 0 | 1 | 1 | 8 | 3 / 175 / 4 / 0 | 8 | Sì |
| Luka Jović | luka-jovic | 250058244 | A | N/D | 9 | 5 | 426 | 2 | 0 | 14 | 6 | 1 | 6 | 6 | 4 / 332 / 4 / 2 | 10 | Sì |
| Oleksandr Zubkov | oleksandr-zubkov | 250064446 | A | N/D | 10 | 3 | 36 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 3 / 36 / 2 / 1 | 9 | Sì |
| Aboubakary Koita | aboubakary-koita | 250110953 | A | N/D | 11 | 5 | 262 | 1 | 0 | 11 | 2 | 1 | 8 | 10 | 4 / 315 / 9 / 1 | 9 | Sì |
| Barnabás Varga | barnabas-varga | 250183450 | A | N/D | 19 | 4 | 176 | 0 | 0 | 4 | 0 | 1 | 4 | 2 | 4 / 176 / 4 / 0 | 9 | Sì |
| João Mário | joao-mario | 250014109 | A | N/D | 23 | 2 | 54 | 0 | 1 | 1 | 0 | 0 | 2 | 0 | 2 / 82 / 0 / 0 | 0 | Sì |
| Zini | zini | 250187664 | A | N/D | 90 | 5 | 191 | 1 | 0 | 9 | 5 | 0 | 2 | 6 | 4 / 161 / 4 / 2 | 0 | Sì |

### Arsenal

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| David Raya | david-raya | 250171278 | P | N/D | 1 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 4 / 360 / 0 / 0 | 10 | Sì |
| Kepa Arrizabalaga | kepa-arrizabalaga | 250039900 | P | N/D | 13 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 | Sì |
| Illan Meslier | illan-meslier | 250127437 | P | N/D | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Khari Ranson | khari-ranson | 250190788 | P | B | 42 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jack Porter | jack-porter | 250190774 | P | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jack Talbot | jack-talbot | 250200618 | P | B | 84 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| William Saliba | william-saliba | 250127439 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Cristhian Mosquera | cristhian-mosquera | 250129972 | D | N/D | 3 | 2 | 169 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 / 28 / 0 / 0 | 3 | Sì |
| Ben White | ben-white | 250156002 | D | N/D | 4 | 6 | 444 | 0 | 2 | 1 | 0 | 0 | 2 | 6 | 3 / 172 / 1 / 1 | 9 | Sì |
| Piero Hincapié | piero-hincapie | 250163454 | D | N/D | 5 | 3 | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 180 / 3 / 0 | 5 | Sì |
| Gabriel | gabriel | 250131901 | D | N/D | 6 | 7 | 630 | 0 | 0 | 7 | 2 | 2 | 6 | 8 | 4 / 360 / 2 / 0 | 11 | Sì |
| Jurriën Timber | jurrien-timber | 250101728 | D | N/D | 12 | 4 | 156 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 3 / 180 / 3 / 2 | 5 | Sì |
| Ezri Konsa | ezri-konsa | 250123068 | D | N/D | 15 | 6 | 461 | 0 | 0 | 1 | 0 | 0 | 6 | 10 | 4 / 332 / 0 / 0 | 9 | Sì |
| Riccardo Calafiori | riccardo-calafiori | 250113392 | D | N/D | 33 | 7 | 590 | 1 | 2 | 9 | 2 | 0 | 4 | 1 | 1 / 90 / 4 / 0 | 8 | Sì |
| Brayden Clarke | brayden-clarke | 250172511 | D | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Joshua Ogunnaike | joshua-ogunnaike | 250199779 | D | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Josiah King | josiah-king | 250199776 | D | B | 75 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Teshaun Murisa | teshaun-murisa | 250199778 | D | B | 77 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Abraham Owusu-Gyasi | abraham-owusu-gyasi | 250199800 | D | B | 78 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Patrick Stachow | patrick-stachow | 250212945 | D | B | 82 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Joshua Tahou | joshua-tahou | 250212941 | D | B | 83 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Hakeem Abubakar | hakeem-abubakar | 250225121 | D | B | 85 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Elyon Mbala | elyon-mbala | 250225288 | D | B | 87 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Marli Salmon | marli-salmon | 250199801 | D | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Joshua Sesay | joshua-sesay | 250212940 | D | B | 95 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Martin Ødegaard | martin-degaard | 250081341 | C | N/D | 8 | 7 | 562 | 2 | 0 | 9 | 4 | 1 | 3 | 7 | 4 / 212 / 5 / 1 | 0 | Sì |
| Eberechi Eze | eberechi-eze | 250134376 | C | N/D | 10 | 5 | 130 | 0 | 0 | 1 | 0 | 0 | 1 | 6 | 4 / 293 / 10 / 5 | 9 | Sì |
| Noni Madueke | noni-madueke | 250113134 | C | N/D | 20 | 4 | 157 | 1 | 0 | 5 | 1 | 1 | 2 | 0 | 4 / 262 / 6 / 3 | 8 | Sì |
| Mikel Merino | mikel-merino | 250080572 | C | N/D | 23 | 7 | 105 | 0 | 0 | 3 | 1 | 1 | 4 | 4 | 4 / 225 / 8 / 5 | 10 | Sì |
| Kai Havertz | kai-havertz | 250087938 | C | N/D | 29 | 7 | 567 | 2 | 0 | 14 | 7 | 1 | 8 | 9 | 3 / 110 / 1 / 0 | 10 | Sì |
| Martín Zubimendi | martin-zubimendi | 250143679 | C | N/D | 36 | 5 | 89 | 0 | 0 | 3 | 0 | 0 | 3 | 0 | 2 / 98 / 0 / 0 | 8 | Sì |
| Bruno Guimarães | bruno-guimaraes | 250138893 | C | N/D | 39 | 5 | 217 | 2 | 0 | 3 | 2 | 0 | 1 | 9 | 3 / 184 / 8 / 3 | 9 | Sì |
| Declan Rice | declan-rice | 250083732 | C | N/D | 41 | 7 | 594 | 0 | 4 | 5 | 0 | 1 | 6 | 2 | 4 / 360 / 3 / 1 | 10 | Sì |
| Andre Annous | andre-annous | 250199773 | C | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ife Ibrahim | ife-ibrahim | 250190779 | C | B | 44 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Theo Julienne | theo-julienne | 250190777 | C | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Louie Copley | louie-copley | 250189261 | C | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Myles Lewis-Skelly | myles-lewis-skelly | 250181082 | C | B | 49 | 2 | 111 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 2 / 111 / 0 / 0 | 0 | Sì |
| Max Dowman | max-dowman | 250195774 | C | B | 56 | 2 | 5 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 2 / 5 / 1 / 0 | 0 | Sì |
| Brando Bailey-Joseph | brando-bailey-joseph | 250195772 | C | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Maalik Hashi | maalik-hashi | 250212925 | C | B | 74 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Saurap Sampang | saurap-sampang | 250212928 | C | B | 81 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Emerson Nwaneri | emerson-nwaneri | 250216491 | C | B | 90 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Charlie Purdy | charlie-purdy | 250225289 | C | B | 94 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Bukayo Saka | bukayo-saka | 250106939 | A | N/D | 7 | 7 | 599 | 3 | 0 | 17 | 10 | 0 | 5 | 21 | 3 / 108 / 7 / 2 | 0 | Sì |
| Viktor Gyökeres | viktor-gyokeres | 250105927 | A | N/D | 14 | 4 | 80 | 0 | 0 | 1 | 0 | 0 | 6 | 0 | 4 / 238 / 2 / 1 | 8 | Sì |
| Christos Tzolis | christos-tzolis | 250124460 | A | N/D | 17 | 5 | 365 | 0 | 1 | 4 | 2 | 2 | 2 | 8 | 2 / 52 / 4 / 2 | 8 | Sì |
| Ceadach O'Neill | ceadach-o-neill | 250192294 | A | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Louis Zečević-John | louis-zecevic-john | 250190785 | A | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Marley Frohock | marley-frohock | 250199775 | A | B | 72 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Bowen Phillips | bowen-phillips | 250212939 | A | B | 79 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jayden Oba | jayden-oba | 250212926 | A | B | 91 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Aston Villa

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zion Suzuki | zion-suzuki | 250218560 | P | N/D | 1 | 6 | 540 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 3 / 270 / 0 / 0 | 9 | Sì |
| Marco Bizot | marco-bizot | 250006714 | P | N/D | 40 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 3 | Sì |
| James Wright | james-wright | 250188465 | P | N/D | 42 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Owen Asemota | owen-asemota | 250190784 | P | B | 60 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Sam Lewis | sam-lewis | 250199538 | P | B | 65 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Theo Houston | theo-houston | 250212029 | P | B | 81 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rhys Oakley | rhys-oakley | 250212031 | P | B | 95 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jack Allan | jack-allan | 250199780 | P | B | 96 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jayden Garthwaite | jayden-garthwaite | 250224671 | P | B | 97 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Matty Cash | matty-cash | 250169376 | D | N/D | 2 | 6 | 478 | 0 | 0 | 3 | 0 | 3 | 11 | 8 | 2 / 110 / 2 / 1 | 8 | Sì |
| Victor Lindelöf | victor-lindelof | 250055905 | D | N/D | 3 | 7 | 630 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 3 / 270 / 0 / 0 | 0 | Sì |
| Taylor Harwood-Bellis | taylor-harwood-bellis | 250117505 | D | N/D | 4 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Tyrone Mings | tyrone-mings | 250133856 | D | N/D | 5 | 6 | 441 | 0 | 0 | 4 | 0 | 1 | 3 | 2 | 1 / 90 / 0 / 0 | 8 | Sì |
| Pau Torres | pau-torres | 250088461 | D | N/D | 14 | 4 | 202 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 3 / 270 / 2 / 0 | 7 | Sì |
| Ian Maatsen | ian-maatsen | 250117581 | D | N/D | 22 | 4 | 337 | 0 | 0 | 5 | 1 | 1 | 5 | 0 | 1 / 90 / 1 / 0 | 6 | Sì |
| Lamare Bogarde | lamare-bogarde | 250139057 | D | N/D | 26 | 1 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 22 / 1 / 1 | 0 | Sì |
| Aaron Wan-Bissaka | aaron-wan-bissaka | 250123067 | D | N/D | 29 | 6 | 274 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 / 158 / 0 / 0 | 0 | Sì |
| Vincely Mudame | vincely-mudame | 250224165 | D | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Travis Patterson | travis-patterson | 250167834 | D | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Harry Pinnell | harry-pinnell | 250212032 | D | B | 64 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Leon Routh | leon-routh | 250199803 | D | B | 66 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| TJ Carroll | tj-carroll | 250199786 | D | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ashton McWilliams | ashton-mcwilliams | 250199796 | D | B | 72 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Teddie Bloomfield | teddie-bloomfield | 250199782 | D | B | 78 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Clay Atkins | clay-atkins | 250211799 | D | B | 85 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Farid Addey | farid-addey | 250211798 | D | B | 86 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| MJ Lyeli | mj-lyeli | 250224163 | D | B | 91 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kairi Ketebu | kairi-ketebu | 250224161 | D | B | 93 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Curtis Mitchell | curtis-mitchell | 250224164 | D | B | 99 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ross Barkley | ross-barkley | 250007655 | C | N/D | 6 | 7 | 333 | 0 | 0 | 8 | 2 | 0 | 4 | 4 | 3 / 175 / 4 / 3 | 11 | Sì |
| John McGinn | john-mcginn | 250058958 | C | N/D | 7 | 7 | 571 | 1 | 2 | 7 | 3 | 2 | 8 | 20 | 3 / 270 / 6 / 3 | 11 | Sì |
| Boubacar Kamara | boubacar-kamara | 250091722 | C | N/D | 8 | 7 | 624 | 0 | 1 | 2 | 0 | 0 | 13 | 16 | 2 / 141 / 1 / 1 | 10 | Sì |
| Leon Goretzka | leon-goretzka | 250041771 | C | N/D | 27 | 1 | 18 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 / 27 / 0 / 0 | 2 | Sì |
| João Gomes | joao-gomes | 250194571 | C | N/D | 35 | 4 | 338 | 0 | 1 | 0 | 0 | 2 | 5 | 6 | 3 / 177 / 1 / 0 | 7 | Sì |
| Johan Manzambi | johan-manzambi | 250192993 | C | N/D | 44 | 4 | 257 | 2 | 2 | 14 | 4 | 0 | 0 | 6 | 1 / 73 / 2 / 1 | 6 | Sì |
| Lennon Moss | lennon-moss | 250206791 | C | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| George Hemmings | george-hemmings | 250199792 | C | B | 53 | 2 | 105 | 0 | 0 | 4 | 1 | 0 | 2 | 4 | 2 / 105 / 4 / 1 | 0 | Sì |
| Cole Brannigan | cole-brannigan | 250173016 | C | B | 69 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rodrigo Fortes | rodrigo-fortes | 250199797 | C | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Vinnie Hayward | vinnie-hayward | 250199791 | C | B | 76 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Keilan Quinn | keilan-quinn | 250199802 | C | B | 77 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Woody Burgess | woody-burgess | 250199784 | C | B | 80 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jahmi Kellyman | jahmi-kellyman | 250205938 | C | B | 92 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Olly Lloyd | olly-lloyd | 250224162 | C | B | 94 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lennon Melhuish | lennon-melhuish | 250212030 | C | B | 98 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Emiliano Buendía | emiliano-buendia | 250080569 | A | N/D | 10 | 7 | 540 | 1 | 0 | 14 | 2 | 1 | 5 | 13 | 2 / 158 / 12 / 5 | 10 | Sì |
| Nicolas Jackson | nicolas-jackson | 250163689 | A | N/D | 11 | 6 | 469 | 2 | 0 | 16 | 5 | 2 | 2 | 3 | 3 / 229 / 12 / 8 | 9 | Sì |
| Alejandro Garnacho | alejandro-garnacho | 250135496 | A | N/D | 17 | 3 | 31 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 29 / 3 / 1 | 4 | Sì |
| Tammy Abraham | tammy-abraham | 250067629 | A | N/D | 18 | 4 | 71 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 41 / 1 / 1 | 8 | Sì |
| Ibrahim Mbaye | ibrahim-mbaye | 250190117 | A | N/D | 19 | 4 | 77 | 0 | 0 | 5 | 2 | 0 | 2 | 1 | 2 / 151 / 5 / 3 | 6 | Sì |
| Jamaldeen Jimoh-Aloba | jamaldeen-jimoh-aloba | 250199794 | A | B | 20 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alysson | alysson | 250221088 | A | N/D | 47 | 6 | 136 | 1 | 0 | 1 | 1 | 2 | 3 | 1 | 3 / 114 / 5 / 1 | 0 | Sì |
| Erin Orebowale | erin-orebowale | 250224166 | A | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rory Wilson | rory-wilson | 250165345 | A | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alfie Lynskey | alfie-lynskey | 250185386 | A | B | 63 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mason Cotcher | mason-cotcher | 250199787 | A | B | 67 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Trai-Varn Mulley | trai-varn-mulley | 250199798 | A | B | 68 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Max Jenner | max-jenner | 250199793 | A | B | 73 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Tay'Veon Smithen | tay-veon-smithen | 250212033 | A | B | 75 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Oscar Johnson | oscar-johnson | 250224160 | A | B | 82 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jack McGrath | jack-mcgrath | 250205710 | A | B | 83 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Markie Meade | markie-meade | 250205711 | A | B | 84 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Daniel Adediran | daniel-adediran | 250224157 | A | B | 87 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Oliver Bindley | oliver-bindley | 250211800 | A | B | 88 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Josh Blake | josh-blake | 250224158 | A | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rio Hammond | rio-hammond | 250212028 | A | B | 90 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Atlético de Madrid

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Juan Musso | juan-musso | 250137521 | P | N/D | 1 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Jan Oblak | jan-oblak | 250012069 | P | N/D | 13 | 9 | 810 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 270 / 0 / 0 | 11 | Sì |
| Salvador Esquivel | salvador-esquivel | 250164595 | P | B | 25 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alvaro Moreno | alvaro-moreno | 250164599 | P | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Daniel Rubio | daniel-rubio | 250189825 | P | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Olarieta | miguel-olarieta | 250200688 | P | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dávid Hancko | david-hancko | 250092668 | D | N/D | 17 | 9 | 663 | 0 | 2 | 11 | 1 | 1 | 2 | 3 | 3 / 270 / 4 / 1 | 11 | Sì |
| Marc Pubill | marc-pubill | 250194472 | D | N/D | 18 | 7 | 493 | 1 | 0 | 3 | 1 | 2 | 7 | 6 | 3 / 210 / 1 / 0 | 2 | Sì |
| Cristian Romero | cristian-romero | 250144325 | D | N/D | 21 | 6 | 435 | 1 | 0 | 6 | 3 | 2 | 5 | 7 | 2 / 167 / 0 / 0 | 0 | Sì |
| Alejandro Grimaldo | alejandro-grimaldo | 250042422 | D | N/D | 22 | 8 | 670 | 3 | 1 | 13 | 7 | 0 | 7 | 4 | 3 / 211 / 4 / 1 | 10 | Sì |
| Robin Le Normand | robin-le-normand | 250112513 | D | N/D | 24 | 5 | 333 | 1 | 0 | 1 | 1 | 1 | 5 | 3 | 3 / 27 / 0 / 0 | 7 | Sì |
| Romeo Hueso | romeo-hueso | 250200685 | D | B | 26 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lituba | lituba | 250212698 | D | B | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dani Martínez | dani-martinez | 250176826 | D | N/D | 30 | 2 | 135 | 0 | 0 | 2 | 0 | 0 | 1 | 0 | N/D | 2 | Sì |
| Arnau Solà | arnau-sola | 250135429 | D | N/D | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Miguel Gil | miguel-gil | 250200683 | D | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Cristian Grant | cristian-grant | 250212703 | D | B | 48 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Daniel Perez | daniel-perez | 250200691 | D | B | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Adrian Almeida | adrian-almeida | 250182712 | D | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Pablo Pan | pablo-pan | 250200689 | D | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Adrián Martínez | adrian-martinez | 250212704 | D | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| David Arza | david-arza | 250176948 | D | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Obed Vargas | obed-vargas | 250216944 | C | N/D | 3 | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 12 / 0 / 0 | 0 | Sì |
| Rodrigo Mendoza | rodrigo-mendoza | 250172343 | C | N/D | 4 | 4 | 130 | 0 | 0 | 5 | 3 | 1 | 2 | 2 | N/D | 4 | Sì |
| Johnny Cardoso | johnny-cardoso | 250150915 | C | N/D | 5 | 6 | 315 | 0 | 1 | 3 | 0 | 2 | 6 | 2 | 2 / 111 / 0 / 0 | 0 | Sì |
| Koke | koke | 1909917 | C | N/D | 6 | 8 | 448 | 0 | 0 | 2 | 1 | 0 | 2 | 7 | 1 / 59 / 0 / 0 | 9 | Sì |
| Kang-in Lee | kang-in-lee | 250121584 | C | N/D | 7 | 9 | 564 | 2 | 1 | 22 | 7 | 2 | 12 | 10 | 2 / 120 / 0 / 0 | 11 | Sì |
| Pablo Barrios | pablo-barrios | 250139036 | C | N/D | 8 | 6 | 406 | 0 | 1 | 4 | 2 | 0 | 3 | 6 | 3 / 215 / 2 / 2 | 8 | Sì |
| Álex Baena | alex-baena | 250106963 | C | N/D | 10 | 9 | 528 | 5 | 2 | 20 | 9 | 2 | 12 | 8 | 3 / 213 / 5 / 1 | 11 | Sì |
| Marcos Llorente | marcos-llorente | 250079670 | C | N/D | 14 | 9 | 590 | 0 | 1 | 7 | 5 | 1 | 9 | 2 | 3 / 270 / 1 / 1 | 11 | Sì |
| Morten Hjulmand | morten-hjulmand | 250101557 | C | N/D | 23 | 8 | 432 | 0 | 0 | 6 | 0 | 2 | 4 | 10 | 3 / 96 / 1 / 0 | 0 | Sì |
| Taufyk Zanzi | taufyk-zanzi | 250189128 | C | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jorge Castillo | jorge-castillo | 250176947 | C | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ruben Gomez | ruben-gomez | 250200684 | C | B | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| David Fernandez | david-fernandez | 250200682 | C | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alexander Sørloth | alexander-s-rloth | 250061361 | A | N/D | 9 | 1 | 17 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1 / 3 / 0 / 0 | 0 | Sì |
| Ademola Lookman | ademola-lookman | 250099258 | A | N/D | 11 | 9 | 550 | 1 | 0 | 14 | 3 | 2 | 9 | 7 | 3 / 95 / 2 / 1 | 11 | Sì |
| Jonathan David | jonathan-david | 250102035 | A | N/D | 15 | 5 | 295 | 3 | 2 | 14 | 9 | 0 | 1 | 5 | 3 / 91 / 1 / 1 | 7 | Sì |
| Arnau Ortiz | arnau-ortiz | 250197651 | A | N/D | 16 | 5 | 149 | 0 | 0 | 2 | 0 | 0 | 2 | 4 | N/D | 5 | N/D |
| Julián Alvarez | julian-alvarez | 250172668 | A | N/D | 19 | 5 | 173 | 0 | 1 | 11 | 4 | 0 | 2 | 3 | 3 / 239 / 8 / 4 | 7 | Sì |
| Giuliano Simeone | giuliano-simeone | 250153634 | A | N/D | 20 | 9 | 637 | 2 | 2 | 11 | 2 | 0 | 8 | 10 | 3 / 265 / 1 / 0 | 11 | Sì |
| Sergio Esteban | sergio-esteban | 250192150 | A | B | 28 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Llorente | miguel-llorente | 250190790 | A | B | 29 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jesus Barrios | jesus-barrios | 250200678 | A | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Abdou Kemo Badji | abdou-kemo-badji | 250207760 | A | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Joel Sanchez | joel-sanchez | 250193838 | A | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gonzalo Gross | gonzalo-gross | 250189828 | A | B | 59 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Barcelona

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Joan García | joan-garcia | 250118131 | P | N/D | 1 | 8 | 675 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 270 / 0 / 0 | 10 | Sì |
| Wojciech Szczęsny | wojciech-szczesny | 108501 | P | N/D | 13 | 1 | 45 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 1 | Sì |
| Dominik Livaković | dominik-livakovic | 250042625 | P | N/D | 25 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 1 | Sì |
| Eder Aller | eder-aller | 250190381 | P | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Iker Rodriguez | iker-rodriguez | 250192613 | P | B | 35 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| João Cancelo | joao-cancelo | 250024746 | D | N/D | 2 | 6 | 206 | 1 | 0 | 5 | 2 | 1 | 3 | 0 | 3 / 270 / 5 / 2 | 8 | Sì |
| Alejandro Balde | alejandro-balde | 250135416 | D | N/D | 3 | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 / 16 / 0 / 0 | 1 | Sì |
| Pau Cubarsí | pau-cubarsi | 250176453 | D | N/D | 5 | 6 | 512 | 0 | 2 | 3 | 0 | 1 | 4 | 1 | 3 / 270 / 0 / 0 | 8 | Sì |
| Xavi Espart | xavi-espart | 250190377 | D | N/D | 12 | 7 | 620 | 1 | 2 | 8 | 2 | 1 | 12 | 5 | 1 / 74 / 1 / 1 | 0 | Sì |
| Andreas Christensen | andreas-christensen | 250041718 | D | N/D | 15 | 6 | 402 | 0 | 1 | 4 | 0 | 0 | 8 | 2 | 1 / 90 / 0 / 0 | 0 | Sì |
| Gerard Martín | gerard-martin | 250197801 | D | N/D | 18 | 8 | 571 | 0 | 0 | 1 | 0 | 1 | 7 | 3 | 2 / 180 / 0 / 0 | 9 | Sì |
| Jules Koundé | jules-kounde | 250096309 | D | N/D | 23 | 6 | 351 | 1 | 1 | 2 | 2 | 0 | 4 | 5 | 2 / 107 / 2 / 0 | 0 | Sì |
| Eric García | eric-garcia | 250103561 | D | N/D | 24 | 8 | 604 | 1 | 0 | 6 | 2 | 0 | 4 | 1 | 1 / 73 / 0 / 0 | 0 | Sì |
| Pesquer | pesquer | 250215029 | D | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Landry Farré | landry-farre | 250191898 | D | B | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Guillem Victor | guillem-victor | 250192220 | D | B | 40 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alex Campos | alex-campos | 250193829 | D | B | 41 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Brian Fariñas | brian-farinas | 250190376 | C | B | 4 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gavi | gavi | 250139255 | C | N/D | 6 | 4 | 146 | 0 | 0 | 2 | 1 | 0 | 3 | 2 | 3 / 45 / 1 / 1 | 6 | Sì |
| Pedri | pedri | 250143693 | C | N/D | 8 | 9 | 620 | 1 | 1 | 7 | 1 | 0 | 2 | 6 | 3 / 196 / 2 / 0 | 11 | Sì |
| Rodri | rodri | 250082664 | C | N/D | 16 | 8 | 517 | 1 | 0 | 5 | 1 | 1 | 4 | 5 | 3 / 203 / 1 / 0 | 10 | Sì |
| Frenkie de Jong | frenkie-de-jong | 50327423 | C | N/D | 21 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Marc Bernal | marc-bernal | 250190383 | C | N/D | 22 | 8 | 311 | 0 | 2 | 4 | 1 | 0 | 5 | 2 | 3 / 104 / 2 / 0 | 10 | Sì |
| Orian Goren | orian-goren | 250206576 | C | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Pedro Villar | pedro-villar | 250205313 | C | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fermín López | fermin-lopez | 250164780 | A | N/D | 7 | 8 | 538 | 4 | 3 | 14 | 9 | 3 | 10 | 7 | 3 / 164 / 7 / 3 | 10 | Sì |
| Gabriel Jesus | gabriel-jesus | 250106649 | A | N/D | 9 | 5 | 195 | 3 | 0 | 8 | 3 | 0 | 2 | 3 | 2 / 39 / 3 / 2 | 7 | Sì |
| Lamine Yamal | lamine-yamal | 250176450 | A | N/D | 10 | 9 | 741 | 8 | 6 | 48 | 16 | 2 | 8 | 13 | 3 / 270 / 13 / 3 | 11 | Sì |
| Raphinha | raphinha | 250112880 | A | N/D | 11 | 8 | 575 | 12 | 3 | 26 | 16 | 0 | 3 | 5 | 2 / 131 / 5 / 3 | 9 | Sì |
| Karim Adeyemi | karim-adeyemi | 250127347 | A | N/D | 14 | 9 | 323 | 2 | 2 | 16 | 7 | 1 | 3 | 11 | 3 / 124 / 8 / 3 | 11 | Sì |
| Anthony Gordon | anthony-gordon | 250117036 | A | N/D | 17 | 8 | 496 | 1 | 4 | 18 | 8 | 0 | 2 | 4 | 3 / 176 / 6 / 4 | 10 | Sì |
| Dani Olmo | dani-olmo | 250081720 | A | N/D | 20 | 9 | 348 | 1 | 3 | 14 | 5 | 1 | 2 | 8 | 3 / 168 / 8 / 3 | 0 | Sì |
| Jesse Bisiwu | jesse-bisiwu | 250194007 | A | N/D | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Hamza Abdelkarim | hamza-abdelkarim | 250221011 | A | N/D | 29 | 2 | 12 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | N/D | 2 | N/D |
| Shane Kluivert | shane-kluivert | 250192616 | A | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Bayern München

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Manuel Neuer | manuel-neuer | 97923 | P | N/D | 1 | 4 | 360 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 180 / 0 / 0 | 6 | Sì |
| Sven Ulreich | sven-ulreich | 1902445 | P | N/D | 26 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| David Poder-Stiube | david-poder-stiube | 250224191 | P | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jonas Urbig | jonas-urbig | 250153936 | P | N/D | 40 | 2 | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 0 / 0 | 4 | Sì |
| Dayot Upamecano | dayot-upamecano | 250079545 | D | N/D | 2 | 6 | 495 | 1 | 0 | 7 | 4 | 2 | 8 | 2 | 3 / 225 / 2 / 1 | 8 | Sì |
| Minjae Kim | minjae-kim | 250162325 | D | N/D | 3 | 4 | 296 | 0 | 0 | 0 | 0 | 1 | 6 | 0 | 2 / 135 / 0 / 0 | 0 | Sì |
| Jonathan Tah | jonathan-tah | 250055660 | D | N/D | 4 | 4 | 276 | 0 | 0 | 2 | 1 | 0 | 2 | 2 | 3 / 180 / 1 / 0 | 8 | Sì |
| Nathaniel Brown | nathaniel-brown | 250190350 | D | N/D | 11 | 6 | 291 | 1 | 1 | 6 | 3 | 0 | 4 | 2 | 2 / 50 / 0 / 0 | 9 | Sì |
| Hiroki Ito | hiroki-ito | 250181455 | D | N/D | 21 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 2 / 17 / 1 / 0 | 2 | Sì |
| Sacha Boey | sacha-boey | 250136348 | D | N/D | 23 | 1 | 13 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | N/D | 1 | Sì |
| Cassiano Kiala | cassiano-kiala | 250205321 | D | B | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Filip Pavić | filip-pavic | 250212725 | D | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Josip Stanišić | josip-stanisic | 250112220 | D | N/D | 44 | 5 | 294 | 0 | 0 | 2 | 1 | 0 | 3 | 1 | 3 / 129 / 1 / 0 | 9 | Sì |
| Joshua Kimmich | joshua-kimmich | 250070417 | C | N/D | 6 | 6 | 475 | 0 | 3 | 4 | 2 | 0 | 0 | 5 | 2 / 170 / 4 / 1 | 10 | Sì |
| Tom Bischof | tom-bischof | 250168211 | C | N/D | 8 | 6 | 148 | 0 | 2 | 6 | 2 | 0 | 2 | 1 | 3 / 190 / 5 / 2 | 10 | Sì |
| Jamal Musiala | jamal-musiala | 250124430 | C | N/D | 10 | 3 | 148 | 1 | 1 | 5 | 1 | 0 | 2 | 4 | 1 / 65 / 3 / 2 | 0 | Sì |
| Michael Olise | michael-olise | 250171184 | C | N/D | 17 | 6 | 483 | 5 | 2 | 27 | 16 | 0 | 2 | 14 | 2 / 163 / 10 / 5 | 10 | Sì |
| Alphonso Davies | alphonso-davies | 250128120 | C | N/D | 19 | 5 | 362 | 0 | 2 | 3 | 0 | 0 | 1 | 4 | 3 / 210 / 3 / 2 | 9 | Sì |
| Konrad Laimer | konrad-laimer | 250065413 | C | N/D | 27 | 3 | 239 | 0 | 0 | 3 | 1 | 1 | 8 | 2 | 3 / 245 / 3 / 0 | 7 | Sì |
| Ismael Saibari | ismael-saibari | 250134320 | C | N/D | 34 | 6 | 304 | 2 | 2 | 16 | 6 | 0 | 5 | 2 | 3 / 131 / 4 / 0 | 0 | Sì |
| Bara Sapoko Ndiaye | bara-sapoko-ndiaye | 250221022 | C | N/D | 39 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 0 / 0 / 0 | 0 | Sì |
| Lennart Karl | lennart-karl | 250201120 | C | B | 42 | 3 | 77 | 0 | 1 | 2 | 0 | 0 | 1 | 0 | 3 / 77 / 2 / 0 | 0 | Sì |
| Aleksandar Pavlović | aleksandar-pavlovic | 250163777 | C | N/D | 45 | 6 | 457 | 2 | 1 | 7 | 3 | 1 | 8 | 4 | 2 / 180 / 2 / 0 | 9 | Sì |
| Tim Binder | tim-binder | 250201112 | C | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| David Daiber | david-daiber | 250193156 | C | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Serge Gnabry | serge-gnabry | 250041770 | A | N/D | 7 | 3 | 67 | 0 | 0 | 5 | 1 | 0 | 0 | 0 | 1 / 68 / 2 / 1 | 0 | Sì |
| Harry Kane | harry-kane | 250016833 | A | N/D | 9 | 6 | 445 | 4 | 5 | 29 | 9 | 0 | 2 | 7 | 3 / 270 / 15 / 7 | 10 | Sì |
| Luis Díaz | luis-diaz | 250132811 | A | N/D | 14 | 6 | 445 | 4 | 1 | 18 | 9 | 0 | 9 | 5 | 3 / 178 / 5 / 4 | 0 | Sì |
| Bastian Assomo | bastian-assomo | 250224184 | A | N/D | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Maycon Cardozo | maycon-cardozo | 250212724 | A | N/D | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Bodø/Glimt

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Julian Faye Lund | julian-faye-lund | 250085663 | P | N/D | 1 | 2 | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 45 / 0 / 0 | 3 | N/D |
| Nikita Haikin | nikita-haikin | 250141864 | P | N/D | 12 | 21 | 1890 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 3 / 225 / 0 / 0 | 23 | Sì |
| Martin Lund Andersen | martin-lund-andersen | 250212817 | P | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Isak Sjong | isak-sjong | 250182524 | P | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Villads Nielsen | villads-nielsen | 250189213 | D | N/D | 2 | 6 | 370 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 1 / 90 / 0 / 0 | 10 | Sì |
| Odin Bjørtuft | odin-bj-rtuft | 250134063 | D | N/D | 4 | 23 | 2009 | 0 | 1 | 22 | 5 | 1 | 24 | 13 | 2 / 177 / 2 / 0 | 0 | Sì |
| Haitam Aleesami | haitam-aleesami | 250084903 | D | N/D | 5 | 17 | 1193 | 1 | 0 | 6 | 2 | 0 | 11 | 5 | 2 / 96 / 0 / 0 | 1 | Sì |
| Jostein Gundersen | jostein-gundersen | 250109274 | D | N/D | 6 | 8 | 562 | 0 | 0 | 0 | 0 | 0 | 7 | 4 | 2 / 174 / 0 / 0 | 1 | Sì |
| Fredrik Bjørkan | fredrik-bj-rkan | 250104207 | D | N/D | 15 | 21 | 1228 | 3 | 2 | 16 | 5 | 0 | 15 | 17 | 3 / 255 / 0 / 0 | 0 | Sì |
| Matias Jaiteh | matias-jaiteh | 250213119 | D | B | 35 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mathias Blix Olsen | mathias-blix-olsen | 250213088 | D | B | 36 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Patrick Berg | patrick-berg | 250065292 | C | N/D | 7 | 21 | 1790 | 2 | 2 | 52 | 14 | 1 | 6 | 9 | 3 / 270 / 4 / 1 | 2 | Sì |
| Sondre Auklend | sondre-auklend | 250129159 | C | N/D | 8 | 22 | 1591 | 1 | 5 | 35 | 10 | 3 | 15 | 45 | 3 / 263 / 2 / 1 | 2 | Sì |
| Ulrik Saltnes | ulrik-saltnes | 250141867 | C | N/D | 14 | 12 | 310 | 0 | 0 | 11 | 0 | 0 | 5 | 6 | 2 / 26 / 0 / 0 | 15 | Sì |
| Joshua Kitolano | joshua-kitolano | 250109026 | C | N/D | 16 | 6 | 195 | 0 | 0 | 1 | 0 | 0 | 2 | 7 | 1 / 71 / 0 / 0 | 7 | Sì |
| Sondre Brunstad Fet | sondre-brunstad-fet | 250141862 | C | N/D | 19 | 22 | 1425 | 4 | 2 | 27 | 10 | 1 | 16 | 19 | 3 / 245 / 5 / 2 | 24 | Sì |
| Fredrik Sjøvold | fredrik-sj-vold | 250173424 | C | N/D | 20 | 23 | 1980 | 3 | 3 | 21 | 7 | 1 | 15 | 7 | 3 / 270 / 2 / 1 | 0 | Sì |
| Magnus Riisnæs | magnus-riisn-s | 250138997 | C | N/D | 23 | 3 | 22 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Håkon Evjen | hakon-evjen | 250107249 | C | N/D | 26 | 13 | 780 | 5 | 1 | 18 | 8 | 1 | 5 | 10 | N/D | 0 | Sì |
| Assan Sanyang | assan-sanyang | 250225019 | C | N/D | 28 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kasper Solhaug | kasper-solhaug | 250213132 | C | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Levi Monsen Yeboah | levi-monsen-yeboah | 250213128 | C | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Erling Eliassen | erling-eliassen | 250213099 | C | B | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jesper Rabben Nygård | jesper-rabben-nygard | 250213129 | C | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| August Mikkelsen | august-mikkelsen | 250186245 | C | N/D | 94 | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Andreas Helmersen | andreas-helmersen | 250078507 | A | N/D | 9 | 20 | 898 | 12 | 1 | 44 | 22 | 1 | 26 | 12 | 3 / 247 / 6 / 2 | 22 | Sì |
| Jens Petter Hauge | jens-petter-hauge | 250104487 | A | N/D | 10 | 20 | 1293 | 5 | 4 | 33 | 13 | 1 | 14 | 8 | 3 / 193 / 5 / 2 | 2 | Sì |
| Ole Didrik Blomberg | ole-didrik-blomberg | 250187645 | A | N/D | 11 | 23 | 1729 | 6 | 7 | 28 | 17 | 2 | 20 | 37 | 3 / 264 / 2 / 0 | 0 | Sì |
| Ola Brynhildsen | ola-brynhildsen | 250117917 | A | N/D | 17 | 17 | 825 | 2 | 1 | 33 | 14 | 0 | 3 | 9 | 3 / 35 / 1 / 0 | 2 | Sì |
| Joel Mvuka | joel-mvuka | 250160883 | A | N/D | 22 | 5 | 130 | 1 | 0 | 4 | 2 | 0 | 2 | 1 | 1 / 6 / 0 / 0 | 6 | Sì |
| Isak Määttä | isak-maatta | 250138384 | A | N/D | 25 | 23 | 1057 | 1 | 0 | 18 | 3 | 0 | 6 | 12 | 2 / 15 / 0 / 0 | 0 | Sì |
| Hindrin Chooly | hindrin-chooly | 250213093 | A | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Borussia Dortmund

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gregor Kobel | gregor-kobel | 250069832 | P | N/D | 1 | 6 | 540 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 / 360 / 0 / 0 | 9 | Sì |
| Patrick Drewes | patrick-drewes | 250077579 | P | N/D | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Silas Ostrzinski | silas-ostrzinski | 250153408 | P | N/D | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alexander Meyer | alexander-meyer | 250174737 | P | N/D | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 | N/D |
| Waldemar Anton | waldemar-anton | 250101238 | D | N/D | 3 | 6 | 540 | 0 | 1 | 3 | 0 | 1 | 8 | 6 | 4 / 360 / 1 / 0 | 10 | Sì |
| Nico Schlotterbeck | nico-schlotterbeck | 250134856 | D | N/D | 4 | 4 | 347 | 1 | 0 | 5 | 2 | 1 | 2 | 2 | 2 / 180 / 3 / 0 | 4 | Sì |
| Ramy Bensebaini | ramy-bensebaini | 250119677 | D | N/D | 5 | 2 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 237 / 4 / 0 | 4 | Sì |
| Joane Gadou | kouakou-gadou | 250177594 | D | N/D | 22 | 4 | 213 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 4 / 213 / 0 / 0 | 0 | Sì |
| Daniel Svensson | daniel-svensson | 250156423 | D | N/D | 24 | 6 | 540 | 1 | 0 | 2 | 1 | 1 | 3 | 8 | 4 / 347 / 2 / 1 | 10 | Sì |
| Julian Ryerson | julian-ryerson | 250092517 | D | N/D | 26 | 5 | 413 | 0 | 0 | 0 | 0 | 2 | 6 | 7 | 4 / 284 / 1 / 0 | 9 | Sì |
| Kauã Prates | kaua-prates | 250224143 | D | N/D | 36 | 1 | 8 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 1 / 8 / 0 / 0 | 0 | N/D |
| Filippo Mane | filippo-mane | 250168729 | D | N/D | 39 | 2 | 48 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | N/D | 3 | Sì |
| Jan Luca Riedl | jan-luca-riedl | 250200719 | D | B | 42 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Adje | miguel-adje | 250211913 | D | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Luca Reggiani | luca-reggiani | 250193505 | D | B | 49 | 1 | 27 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | N/D | 0 | Sì |
| Jobe Bellingham | jobe-bellingham | 250167832 | C | N/D | 7 | 6 | 460 | 0 | 1 | 4 | 0 | 2 | 6 | 3 | 4 / 214 / 5 / 2 | 9 | Sì |
| Felix Nmecha | felix-nmecha | 250112224 | C | N/D | 8 | 6 | 414 | 2 | 0 | 6 | 3 | 1 | 5 | 8 | 4 / 251 / 6 / 3 | 10 | Sì |
| Carney Chukwuemeka | carney-chukwuemeka | 250169276 | C | N/D | 17 | 1 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 / 107 / 0 / 0 | 4 | Sì |
| Ethan Nwaneri | ethan-nwaneri | 250170117 | C | N/D | 18 | 4 | 93 | 0 | 0 | 8 | 2 | 0 | 2 | 0 | 4 / 93 / 8 / 2 | 0 | Sì |
| Marcel Sabitzer | marcel-sabitzer | 250024349 | C | N/D | 20 | 5 | 144 | 0 | 1 | 5 | 2 | 0 | 0 | 1 | 2 / 94 / 0 / 0 | 0 | Sì |
| Joey Veerman | joey-veerman | 250105890 | C | N/D | 25 | 4 | 330 | 0 | 1 | 4 | 2 | 1 | 4 | 3 | 4 / 330 / 4 / 2 | 0 | Sì |
| Enzo Duarte | enzo-duarte | 250203284 | C | N/D | 44 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mussa Kaba | mussa-kaba | 250200716 | C | N/D | 48 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Serhou Guirassy | serhou-guirassy | 250080553 | A | N/D | 9 | 6 | 521 | 2 | 2 | 19 | 8 | 1 | 11 | 10 | 4 / 244 / 16 / 7 | 3 | Sì |
| Maximilian Beier | maximilian-beier | 250124222 | A | N/D | 14 | 6 | 421 | 1 | 1 | 16 | 3 | 1 | 2 | 6 | 4 / 188 / 2 / 0 | 10 | Sì |
| Konstantinos Karetsas | konstantinos-karetsas | 250182174 | A | N/D | 19 | 3 | 143 | 1 | 0 | 4 | 2 | 0 | 4 | 3 | 3 / 143 / 4 / 2 | 0 | Sì |
| Fábio Silva | fabio-silva | 250113350 | A | N/D | 21 | 5 | 164 | 2 | 1 | 5 | 2 | 0 | 4 | 3 | 4 / 255 / 8 / 6 | 9 | Sì |
| Samuele Inácio | samuele-inacio | 250200715 | A | B | 40 | 1 | 16 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 / 60 / 0 / 0 | 4 | Sì |
| Mathis Albert | mathis-albert | 250200705 | A | B | 41 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Club Brugge

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Yann Sommer | yann-sommer | 97746 | P | N/D | 1 | 8 | 720 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 / 360 / 0 / 0 | 11 | Sì |
| Nordin Jackers | nordin-jackers | 250066521 | P | N/D | 29 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Axl De Corte | axl-de-corte | 250176200 | P | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Argus Vanden Driessche | argus-vanden-driessche | 250177693 | P | B | 81 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Thibeau Kestemont | thibeau-kestemont | 250199817 | P | B | 91 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Han-beom Lee | han-beom-lee | 250197263 | D | N/D | 3 | 7 | 630 | 1 | 0 | 4 | 3 | 1 | 6 | 3 | 2 / 119 / 0 / 0 | 9 | Sì |
| Joel Ordóñez | joel-ordonez | 250176201 | D | N/D | 4 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Matteo Dams | matteo-dams | 250169764 | D | N/D | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Hugo Siquet | hugo-siquet | 250128898 | D | N/D | 41 | 5 | 86 | 0 | 0 | 2 | 0 | 0 | 1 | 2 | 4 / 74 / 0 / 0 | 8 | Sì |
| Brandon Mechele | brandon-mechele | 250053044 | D | N/D | 44 | 8 | 720 | 2 | 0 | 8 | 2 | 1 | 2 | 1 | 4 / 360 / 1 / 0 | 11 | Sì |
| Samba Coulibaly | samba-coulibaly | 250200895 | D | N/D | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jorne Spileers | jorne-spileers | 250153677 | D | B | 58 | 3 | 241 | 0 | 0 | 1 | 0 | 2 | 4 | 0 | 3 / 241 / 1 / 0 | 0 | Sì |
| Kyriani Sabbe | kyriani-sabbe | 250138985 | D | B | 64 | 4 | 289 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 4 / 289 / 2 / 0 | 0 | Sì |
| Samuel Van Hoogen | samuel-van-hoogen | 250189614 | D | N/D | 82 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Andre Garcia | andre-garcia | 250216973 | D | N/D | 90 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Alexander Vandeperre | alexander-vandeperre | 250176198 | D | B | 92 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Wout Verlinden | wout-verlinden | 250199819 | D | B | 93 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Axl Wins | axl-wins | 250201160 | D | B | 98 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Freddie Potts | freddie-potts | 250165376 | C | N/D | 8 | 8 | 708 | 0 | 0 | 5 | 0 | 4 | 7 | 7 | 4 / 356 / 2 / 1 | 10 | Sì |
| Hugo Vetlesen | hugo-vetlesen | 250115134 | C | N/D | 10 | 8 | 632 | 4 | 0 | 18 | 7 | 1 | 7 | 8 | 4 / 242 / 4 / 2 | 11 | Sì |
| Cheveyo Tsawa | cheveyo-tsawa | 250172155 | C | N/D | 16 | 4 | 39 | 0 | 0 | 3 | 1 | 0 | 1 | 0 | 1 / 13 / 0 / 0 | 6 | Sì |
| Hans Vanaken | hans-vanaken | 250064188 | C | N/D | 20 | 7 | 623 | 1 | 2 | 7 | 4 | 0 | 2 | 6 | 4 / 347 / 4 / 1 | 10 | Sì |
| Lynnt Audoor | lynnt-audoor | 250130405 | C | N/D | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Joaquin Seys | joaquin-seys | 250163786 | C | B | 65 | 4 | 360 | 1 | 2 | 3 | 2 | 0 | 3 | 2 | 4 / 360 / 3 / 2 | 0 | Sì |
| Jessi Da Silva | jessi-da-silva | 250194181 | C | B | 72 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lucas Delorge | lucas-delorge | 250199812 | C | B | 76 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Félix Lemaréchal | felix-lemarechal | 250160006 | C | N/D | 80 | 8 | 188 | 1 | 1 | 8 | 2 | 0 | 3 | 3 | 4 / 163 / 2 / 0 | 11 | Sì |
| Tian Koren | tian-koren | 250201806 | C | N/D | 85 | 4 | 21 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | N/D | 0 | N/D |
| Gianluca Okon | gianluca-okon | 250201177 | C | B | 86 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mohamed Galal Elbay | mohamed-galal-elbay | 250199815 | C | B | 95 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Naim Amengai | naim-amengai | 250195671 | C | B | 97 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Nicolò Tresoldi | nicolo-tresoldi | 250181849 | A | N/D | 7 | 8 | 611 | 4 | 0 | 23 | 6 | 0 | 5 | 12 | 4 / 336 / 14 / 8 | 11 | Sì |
| Carlos Forbs | carlos-forbs | 250138957 | A | N/D | 9 | 7 | 591 | 2 | 3 | 16 | 6 | 1 | 4 | 7 | 4 / 349 / 9 / 5 | 10 | Sì |
| Jan Virgili | jan-virgili | 250200748 | A | N/D | 11 | 7 | 343 | 2 | 0 | 11 | 5 | 0 | 0 | 6 | 4 / 278 / 5 / 1 | 9 | Sì |
| Romeo Vermant | romeo-vermant | 250138982 | A | N/D | 17 | 8 | 192 | 0 | 1 | 9 | 4 | 1 | 2 | 5 | 4 / 28 / 3 / 2 | 11 | Sì |
| Wisdom Mike | wisdom-mike | 250201122 | A | N/D | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Milan Robberechts | milan-robberechts | 250225251 | A | N/D | 39 | 1 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 8 / 0 / 0 | 0 | N/D |
| Mamadou Diakhon | mamadou-diakhon | 250192955 | A | N/D | 67 | 7 | 360 | 1 | 2 | 13 | 4 | 0 | 0 | 11 | 4 / 37 / 3 / 1 | 10 | Sì |
| Andrej Vasović | andrej-vasovic | 250184377 | A | N/D | 77 | 1 | 9 | 0 | 0 | N/D | N/D | 0 | 0 | 0 | N/D | 1 | Sì |
| Jakke Van Britsom | jakke-van-britsom | 250201157 | A | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Como

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jean Butez | jean-butez | 250074004 | P | N/D | 1 | 6 | 540 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 270 / 0 / 0 | 7 | Sì |
| Lorenzo Luigi Ginelli | lorenzo-luigi-ginelli | 250224223 | P | B | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Robert Sánchez | robert-sanchez | 250154983 | P | N/D | 97 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 0 / 0 | 2 | Sì |
| Marc-Oliver Kempf | marc-oliver-kempf | 250046524 | D | N/D | 2 | 4 | 207 | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 3 / 186 / 1 / 1 | 1 | Sì |
| Àlex Valle | alex-valle | 250164785 | D | N/D | 3 | 5 | 388 | 0 | 2 | 5 | 1 | 1 | 5 | 2 | 4 / 360 / 0 / 0 | 7 | Sì |
| Jacobo Ramón | jacobo-ramon | 250176488 | D | N/D | 4 | 7 | 616 | 1 | 0 | 6 | 2 | 1 | 5 | 2 | 4 / 360 / 1 / 1 | 9 | Sì |
| Alberto Dossena | alberto-dossena | 250223139 | D | N/D | 13 | 1 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 10 / 0 / 0 | 0 | Sì |
| Kaiki Bruno | kaiki-bruno | 250218352 | D | N/D | 16 | 5 | 251 | 1 | 0 | 7 | 2 | 0 | 3 | 5 | 2 / 81 / 0 / 0 | 0 | Sì |
| Yan Couto | yan-couto | 250163731 | D | N/D | 27 | 6 | 505 | 0 | 1 | 6 | 3 | 1 | 3 | 4 | 4 / 274 / 2 / 0 | 8 | Sì |
| Ivan Smolčić | ivan-smolcic | 250113686 | D | N/D | 28 | 3 | 123 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 4 / 104 / 0 / 0 | 5 | Sì |
| Trevoh Chalobah | trevoh-chalobah | 250076233 | D | N/D | 99 | 6 | 464 | 0 | 0 | 4 | 1 | 0 | 1 | 5 | 2 / 180 / 1 / 0 | 0 | Sì |
| Máximo Perrone | maximo-perrone | 250182150 | C | N/D | 5 | 7 | 383 | 0 | 1 | 6 | 0 | 0 | 4 | 3 | 4 / 285 / 3 / 2 | 9 | Sì |
| Luis Milla | luis-milla | 250063509 | C | N/D | 6 | 7 | 365 | 0 | 0 | 2 | 1 | 0 | 2 | 6 | 4 / 298 / 1 / 0 | 9 | Sì |
| Lucas Da Cunha | lucas-da-cunha | 250116003 | C | N/D | 7 | 7 | 476 | 0 | 0 | 11 | 1 | 0 | 2 | 2 | 4 / 222 / 9 / 5 | 9 | Sì |
| Maxence Caqueret | maxence-caqueret | 250101128 | C | N/D | 8 | 1 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Nico Paz | nico-paz | 250153621 | C | N/D | 10 | 7 | 571 | 2 | 2 | 35 | 11 | 1 | 13 | 7 | 4 / 318 / 14 / 6 | 0 | Sì |
| Martin Baturina | martin-baturina | 250140940 | C | N/D | 20 | 6 | 281 | 2 | 1 | 12 | 4 | 2 | 3 | 5 | 4 / 241 / 5 / 4 | 8 | Sì |
| Samuele Ricci | samuele-ricci | 250117839 | C | N/D | 21 | 4 | 73 | 0 | 0 | 1 | 1 | 0 | 1 | 1 | 3 / 46 / 0 / 0 | 5 | Sì |
| Mattia Liberali | mattia-liberali | 250182962 | C | N/D | 30 | 3 | 108 | 1 | 0 | 6 | 2 | 0 | 1 | 2 | 2 / 43 / 2 / 2 | 4 | Sì |
| Riccardo Cassano | riccardo-cassano | 250224235 | C | B | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Tasos Douvikas | tasos-douvikas | 250116683 | A | N/D | 9 | 7 | 497 | 3 | 0 | 19 | 10 | 0 | 4 | 13 | 4 / 246 / 9 / 7 | 0 | Sì |
| Assane Diao | assane-diao | 250186227 | A | N/D | 11 | 6 | 427 | 2 | 1 | 10 | 3 | 2 | 6 | 3 | 2 / 109 / 3 / 2 | 0 | Sì |
| Moise Kean | moise-kean | 250087919 | A | N/D | 90 | 3 | 133 | 0 | 1 | 4 | 3 | 0 | 1 | 3 | 1 / 25 / 1 / 0 | 0 | Sì |

### Fenerbahçe

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tarık Çetin | tar-k-cetin | 250067422 | P | N/D | 13 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Ederson | ederson | 250073809 | P | N/D | 31 | 7 | 630 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 4 / 360 / 0 / 0 | 11 | Sì |
| Mert Günok | mert-gunok | 103243 | P | N/D | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 4 | Sì |
| Kuzey Sapaz | kuzey-sapaz | 250222121 | P | B | 75 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Yasir Caklı | yasir-cakl | 250222125 | P | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Yiğit Efe Demir | yigit-efe-demir | 250174545 | D | N/D | 14 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Nathan Aké | nathan-ake | 250027008 | D | N/D | 15 | 8 | 720 | 0 | 0 | 3 | 1 | 0 | 6 | 2 | 3 / 201 / 1 / 0 | 0 | Sì |
| Mert Müldür | mert-muldur | 250097238 | D | N/D | 18 | 2 | 157 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 / 105 / 0 / 0 | 6 | Sì |
| Kojo Peprah Oppong | kojo-peprah-oppong | 250210900 | D | N/D | 21 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Nélson Semedo | nelson-semedo | 250086090 | D | N/D | 27 | 8 | 563 | 0 | 0 | 2 | 2 | 0 | 7 | 4 | 3 / 255 / 2 / 0 | 15 | Sì |
| Milan Škriniar | milan-skriniar | 250041563 | D | N/D | 37 | 8 | 700 | 1 | 0 | 4 | 1 | 1 | 5 | 4 | 4 / 360 / 2 / 1 | 16 | Sì |
| Ognjen Mimović | ognjen-mimovic | 250164004 | D | N/D | 77 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Çağan Sarıdikmen | cagan-sar-dikmen | 250222120 | D | B | 78 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Bedirhan Korkmaz | bedirhan-korkmaz | 250222123 | D | B | 82 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gökmen Özdemir | gokmen-ozdemir | 250222122 | D | B | 86 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Archie Brown | archie-brown | 250135831 | C | N/D | 3 | 7 | 521 | 0 | 1 | 6 | 3 | 0 | 3 | 3 | 4 / 360 / 4 / 3 | 13 | Sì |
| İsmail Yüksek | ismail-yuksek | 250174144 | C | N/D | 5 | 7 | 252 | 0 | 0 | 8 | 4 | 0 | 9 | 3 | 4 / 257 / 2 / 0 | 12 | Sì |
| Mattéo Guendouzi | matteo-guendouzi | 250122927 | C | N/D | 6 | 8 | 682 | 1 | 0 | 7 | 2 | 1 | 9 | 5 | 3 / 270 / 4 / 0 | 15 | Sì |
| İrfan Can Kahveci | irfan-can-kahveci | 250046542 | C | N/D | 17 | 7 | 406 | 2 | 3 | 10 | 3 | 1 | 8 | 4 | 3 / 173 / 3 / 0 | 0 | Sì |
| Levent Mercan | levent-mercan | 250123981 | C | N/D | 22 | 5 | 203 | 0 | 2 | 1 | 0 | 0 | 2 | 4 | 1 / 28 / 0 / 0 | 7 | Sì |
| Bartuğ Elmaz | bartug-elmaz | 250129575 | C | N/D | 28 | 3 | 12 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 2 / 83 / 3 / 1 | 6 | Sì |
| Oğuz Aydın | oguz-ayd-n | 250118077 | C | N/D | 70 | 8 | 378 | 2 | 3 | 12 | 5 | 2 | 6 | 3 | 4 / 172 / 9 / 1 | 0 | Sì |
| Efe Fettahoğlu | efe-fettahoglu | 250207778 | C | B | 80 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Emin Sayar | emin-sayar | 250207784 | C | B | 84 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Güner Ekici | guner-ekici | 250222124 | C | B | 85 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Emirhan Ateş | emirhan-ates | 250207773 | C | B | 90 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| N'Golo Kanté | n-golo-kante | 250097248 | C | N/D | 91 | 8 | 589 | 0 | 0 | 2 | 0 | 0 | 6 | 1 | 3 / 270 / 1 / 0 | 13 | Sì |
| Kerem Aktürkoğlu | kerem-akturkoglu | 250146674 | A | N/D | 7 | 7 | 369 | 1 | 3 | 11 | 2 | 1 | 3 | 6 | 3 / 169 / 5 / 2 | 13 | Sì |
| Romelu Lukaku | romelu-lukaku | 250010802 | A | N/D | 9 | 7 | 246 | 1 | 1 | 9 | 2 | 2 | 5 | 2 | 4 / 129 / 3 / 1 | 11 | Sì |
| Marco Asensio | marco-asensio | 250080570 | A | N/D | 10 | 3 | 187 | 2 | 0 | 3 | 2 | 0 | 0 | 0 | N/D | 0 | Sì |
| Mason Greenwood | mason-greenwood | 250116767 | A | N/D | 11 | 8 | 597 | 4 | 2 | 29 | 12 | 1 | 2 | 7 | 4 / 330 / 11 / 4 | 16 | Sì |
| Vedat Muriqi | vedat-muriqi | 250059699 | A | N/D | 19 | 8 | 414 | 7 | 1 | 20 | 11 | 1 | 9 | 6 | 4 / 231 / 5 / 5 | 13 | Sì |
| Dorgeles Nene | dorgeles-nene | 250187184 | A | N/D | 45 | 4 | 79 | 0 | 0 | 2 | 1 | 0 | 1 | 1 | 2 / 48 / 3 / 1 | 7 | Sì |
| Alaettin Ekici | alaettin-ekici | 250216848 | A | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Feyenoord

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tjark Ernst | tjark-ernst | 250128150 | P | N/D | 1 | 9 | 810 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 270 / 0 / 0 | 11 | Sì |
| Florian Kastenmeier | florian-kastenmeier | 250225049 | P | N/D | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Mannou Berger | mannou-berger | 250178085 | P | N/D | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Liam Bossin | liam-bossin | 250065934 | P | N/D | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Stenn de Mol | stenn-de-mol | 250199586 | P | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Tim Haksteeg | tim-haksteeg | 250183766 | P | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Bart Nieuwkoop | bart-nieuwkoop | 250056685 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Tsuyoshi Watanabe | tsuyoshi-watanabe | 250187148 | D | N/D | 4 | 7 | 581 | 0 | 0 | 5 | 2 | 0 | 4 | 1 | 3 / 112 / 0 / 0 | 9 | Sì |
| Gijs Smal | gijs-smal | 250174851 | D | N/D | 5 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Jerry St. Juste | jerry-st-juste | 250087967 | D | N/D | 6 | 7 | 619 | 0 | 0 | 2 | 0 | 0 | 4 | 6 | 3 / 248 / 0 / 0 | 0 | Sì |
| Jordan Bos | jordan-bos | 250192004 | D | N/D | 15 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Javi López | javi-lopez | 250126914 | D | N/D | 16 | 5 | 247 | 1 | 0 | 5 | 1 | 2 | 3 | 3 | 3 / 225 / 3 / 0 | 7 | Sì |
| Mats Deijl | mats-deijl | 250197412 | D | N/D | 20 | 2 | 25 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | N/D | 2 | Sì |
| Thijs Kraaijeveld | thijs-kraaijeveld | 250182482 | D | B | 24 | 6 | 189 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | N/D | 6 | Sì |
| Givairo Read | givairo-read | 250183808 | D | B | 26 | 9 | 751 | 0 | 5 | 12 | 2 | 0 | 6 | 12 | 3 / 270 / 1 / 0 | 11 | Sì |
| Tijme Wessels | tijme-wessels | 250199597 | D | B | 32 | 1 | 18 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | N/D | 0 | N/D |
| Mika Mármol | mika-medina | 250123956 | D | N/D | 35 | 3 | 270 | 0 | 0 | 0 | 0 | 1 | 3 | 4 | 3 / 270 / 0 / 0 | 0 | N/D |
| Marleyson Cruz | marleyson-cruz | 250189848 | D | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Twan Schens | twan-schens | 250199595 | D | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Hakeem Agboluaje | hakeem-agboluaje | 250190228 | D | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Matthew Mparaganda | matthew-mparaganda | 250199589 | D | B | 63 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dani Slory | dani-slory | 250200576 | D | B | 65 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Boaz Plantinga | boaz-plantinga | 250216077 | D | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jakub Moder | jakub-moder | 250092129 | C | N/D | 7 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Gjivai Zechiël | gjivai-zechiel | 250178067 | C | N/D | 8 | 9 | 764 | 5 | 4 | 21 | 11 | 2 | 8 | 7 | 3 / 270 / 6 / 1 | 2 | Sì |
| Luciano Valente | luciano-valente | 250208803 | C | N/D | 10 | 9 | 704 | 4 | 1 | 18 | 8 | 0 | 7 | 12 | 3 / 211 / 0 / 0 | 11 | Sì |
| Sem Steijn | sem-steijn | 250174850 | C | N/D | 14 | 5 | 189 | 2 | 1 | 15 | 10 | 0 | 0 | 1 | 2 / 26 / 2 / 1 | 6 | Sì |
| Tobias Van Den Elshout | tobias-van-den-elshout | 250193618 | C | B | 22 | 4 | 59 | 0 | 0 | 6 | 2 | 0 | 4 | 0 | 3 / 17 / 0 / 0 | 6 | Sì |
| Oussama Targhalline | oussama-targhalline | 250163878 | C | N/D | 28 | 8 | 461 | 0 | 1 | 5 | 0 | 2 | 4 | 6 | 3 / 225 / 2 / 0 | 10 | Sì |
| Charles Vanhoutte | charles-vanhoutte | 250187845 | C | N/D | 34 | 9 | 624 | 0 | 1 | 3 | 0 | 2 | 8 | 7 | 3 / 241 / 0 / 0 | 11 | Sì |
| Nick de Koning | nick-de-koning | 250200556 | C | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Nassim El Harmouz | nassim-el-harmouz | 250190226 | C | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kevin Khan | kevin-khan | 250199588 | C | B | 60 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Zino Sneijer | zino-sneijer | 250189184 | C | B | 66 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Luca Dahl Tomasson | luca-dahl-tomasson | 250218024 | C | B | 67 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gonçalo Borges | goncalo-borges | 250113342 | A | N/D | 11 | 1 | 26 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1 / 18 / 0 / 0 | 2 | Sì |
| Reiss Nelson | reiss-nelson | 250077450 | A | N/D | 17 | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | N/D | 1 | Sì |
| Nacho Ferri | nacho-ferri | 250176378 | A | N/D | 19 | 8 | 415 | 5 | 1 | 20 | 11 | 1 | 8 | 15 | 3 / 232 / 1 / 0 | 2 | Sì |
| Anis Hadj Moussa | anis-hadj-moussa | 250198119 | A | N/D | 23 | 8 | 706 | 5 | 1 | 23 | 9 | 1 | 4 | 12 | 3 / 252 / 11 / 6 | 10 | Sì |
| Gaoussou Diarra | gaoussou-diarra | 250210895 | A | N/D | 27 | 8 | 413 | 2 | 1 | 24 | 8 | 1 | 4 | 4 | 2 / 56 / 3 / 1 | 9 | Sì |
| Jivayno Zinhagel | jivayno-zinhagel | 250200578 | A | B | 36 | 2 | 44 | 1 | 0 | 4 | 1 | 0 | 0 | 0 | N/D | 0 | Sì |
| Shaqueel Van Persie | shaqueel-van-persie | 250183765 | A | B | 49 | 6 | 99 | 0 | 0 | 4 | 1 | 0 | 2 | 1 | 1 / 27 / 0 / 0 | 1 | Sì |
| Jerayno Schaken | jerayno-schaken | 250216080 | A | N/D | 57 | 1 | 31 | 1 | 0 | 2 | 2 | 0 | 0 | 0 | 1 / 0 / 0 / 0 | 1 | N/D |
| Arman Nahany | arman-nahany | 250218399 | A | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Izu Onunta | izu-onunta | 250199590 | A | B | 59 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kelvin Neijenhuis | kelvin-neijenhuis | 250190224 | A | B | 64 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Galatasaray

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Uğurcan Çakır | ugurcan-cak-r | 250078452 | P | N/D | 1 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 270 / 0 / 0 | 0 | Sì |
| Günay Güvenç | gunay-guvenc | 250073722 | P | N/D | 19 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Jankat Yılmaz | jankat-y-lmaz | 250139356 | P | N/D | 24 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Enes Büyük | enes-buyuk | 250177185 | P | N/D | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| El Chadaille Bitshiabu | el-chadaille-bitshiabu | 250153851 | D | N/D | 3 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Ismail Jakobs | ismail-jakobs | 250117015 | D | N/D | 4 | 8 | 492 | 0 | 1 | 4 | 1 | 0 | 3 | 1 | 3 / 270 / 0 / 0 | 10 | Sì |
| Davinson Sánchez | davinson-sanchez | 250099374 | D | N/D | 6 | 8 | 701 | 1 | 0 | 7 | 2 | 2 | 5 | 5 | 3 / 270 / 1 / 1 | 10 | Sì |
| Roland Sallai | roland-sallai | 250065179 | D | N/D | 7 | 7 | 589 | 1 | 0 | 13 | 4 | 2 | 9 | 8 | 3 / 203 / 2 / 1 | 9 | Sì |
| Eren Elmalı | eren-elmal | 250163343 | D | N/D | 17 | 8 | 260 | 0 | 0 | 3 | 2 | 1 | 6 | 0 | 3 / 195 / 0 / 0 | 0 | Sì |
| Abdülkerim Bardakcı | abdulkerim-bardakc | 250043129 | D | N/D | 42 | 8 | 611 | 2 | 0 | 9 | 4 | 1 | 7 | 3 | 1 / 90 / 0 / 0 | 0 | Sì |
| Yusuf Kahraman | yusuf-kahraman | 250206683 | D | B | 64 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Cihan Akgün | cihan-akgun | 250212907 | D | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Wilfried Singo | wilfried-singo | 250132323 | D | N/D | 90 | 2 | 41 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | N/D | 2 | Sì |
| Gabriel Sara | gabriel-sara | 250199220 | C | N/D | 8 | 8 | 619 | 2 | 2 | 21 | 6 | 0 | 7 | 3 | 3 / 178 / 4 / 1 | 10 | Sì |
| Lesley Ugochukwu | lesley-ugochukwu | 250136342 | C | N/D | 18 | 4 | 59 | 0 | 0 | 1 | 0 | 0 | 2 | 3 | 2 / 37 / 1 / 1 | 6 | Sì |
| İlkay Gündoğan | ilkay-gundogan | 250005335 | C | N/D | 20 | 2 | 35 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 10 / 0 / 0 | 3 | Sì |
| Lucas Torreira | lucas-torreira | 250118286 | C | N/D | 34 | 7 | 593 | 1 | 2 | 1 | 1 | 0 | 7 | 7 | 3 / 256 / 2 / 0 | 9 | Sì |
| Necati Yançel | necati-yancel | 250206687 | C | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Eyüp Karasu | eyup-karasu | 250212934 | C | B | 67 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Furkan Koçak | furkan-kocak | 250200405 | C | B | 68 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Berat Luş | berat-lus | 250189922 | C | B | 73 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Renato Nhaga | renato-nhaga | 250216977 | C | N/D | 74 | 2 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 15 / 0 / 0 | 4 | Sì |
| Onur Kağan Yıldız | onur-kagan-y-ld-z | 250224253 | C | B | 76 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Aleksei Batrakov | aleksei-batrakov | 250224345 | C | N/D | 83 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mario Lemina | mario-lemina | 250134357 | C | N/D | 99 | 6 | 333 | 1 | 0 | 3 | 1 | 0 | 5 | 1 | 2 / 86 / 1 / 1 | 7 | Sì |
| Leroy Sané | leroy-sane | 250063984 | A | N/D | 10 | 8 | 390 | 0 | 0 | 8 | 4 | 1 | 3 | 7 | 3 / 104 / 2 / 0 | 10 | Sì |
| Yunus Akgün | yunus-akgun | 250103764 | A | N/D | 11 | 8 | 613 | 1 | 0 | 15 | 3 | 1 | 2 | 14 | 3 / 219 / 2 / 2 | 10 | Sì |
| Deniz Gül | deniz-gul | 250163534 | A | N/D | 21 | 5 | 219 | 0 | 0 | 9 | 3 | 1 | 12 | 2 | 2 / 32 / 0 / 0 | 6 | Sì |
| Rafael Leão | rafael-leao | 250089228 | A | N/D | 27 | 5 | 294 | 0 | 0 | 12 | 3 | 2 | 2 | 3 | 2 / 122 / 0 / 0 | 7 | Sì |
| Victor Osimhen | victor-osimhen | 250132987 | A | N/D | 45 | 6 | 406 | 6 | 3 | 41 | 16 | 1 | 0 | 6 | 2 / 174 / 5 / 1 | 7 | Sì |
| Arda Tagay | arda-tagay | 250212957 | A | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Barış Alper Yılmaz | bar-s-alper-y-lmaz | 250158929 | A | N/D | 53 | 8 | 596 | 1 | 0 | 10 | 2 | 1 | 8 | 13 | 3 / 232 / 3 / 0 | 0 | Sì |
| Ada Yüzgeç | ada-yuzgec | 250207790 | A | B | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Inter

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Josep Martínez | josep-martinez | 250096761 | P | N/D | 1 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 270 / 0 / 0 | 9 | Sì |
| Raffaele Di Gennaro | raffaele-di-gennaro | 250017814 | P | N/D | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Ivan Provedel | ivan-provedel | 250088946 | P | N/D | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| John Stones | john-stones | 250064233 | D | N/D | 6 | 3 | 99 | 0 | 0 | 2 | 0 | 0 | 1 | 1 | 1 / 45 / 1 / 0 | 0 | Sì |
| Manuel Akanji | manuel-akanji | 250085369 | D | N/D | 25 | 6 | 503 | 0 | 1 | 7 | 1 | 2 | 4 | 3 | 2 / 180 / 1 / 1 | 7 | Sì |
| Benjamin Pavard | benjamin-pavard | 250081921 | D | N/D | 28 | 3 | 208 | 0 | 0 | 1 | 0 | 0 | 2 | 2 | 1 / 45 / 0 / 0 | 4 | Sì |
| Carlos Augusto | carlos-augusto | 250188223 | D | N/D | 30 | 5 | 265 | 2 | 2 | 3 | 3 | 1 | 4 | 1 | 2 / 173 / 2 / 2 | 6 | Sì |
| Yann Bisseck | yann-bisseck | 250116951 | D | N/D | 31 | 6 | 459 | 1 | 0 | 5 | 2 | 0 | 1 | 2 | 3 / 211 / 0 / 0 | 0 | Sì |
| Federico Dimarco | federico-dimarco | 250056189 | D | N/D | 32 | 7 | 458 | 0 | 1 | 12 | 4 | 0 | 2 | 1 | 2 / 137 / 4 / 0 | 8 | Sì |
| Francesco Stante | francesco-stante | 250189632 | D | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Leonardo Bovio | leonardo-bovio | 250195897 | D | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mattia Marello | mattia-marello | 250211929 | D | N/D | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alessandro Bastoni | alessandro-bastoni | 250091199 | D | N/D | 95 | 6 | 482 | 0 | 0 | 3 | 0 | 1 | 5 | 1 | 3 / 248 / 5 / 2 | 0 | Sì |
| Djed Spence | djed-spence | 250171293 | D | N/D | 99 | 1 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 71 / 0 / 0 | 2 | Sì |
| Aleksandar Stanković | aleksandar-stankovic | 250163409 | C | B | 5 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 / 2 / 0 / 0 | 0 | Sì |
| Piotr Zieliński | piotr-zielinski | 250024370 | C | N/D | 7 | 6 | 431 | 1 | 2 | 11 | 2 | 0 | 1 | 4 | 3 / 149 / 1 / 0 | 8 | Sì |
| Petar Sučić | petar-sucic | 250135339 | C | N/D | 8 | 6 | 362 | 1 | 0 | 4 | 2 | 0 | 2 | 6 | 3 / 126 / 1 / 1 | 8 | Sì |
| Andy Diouf | andy-diouf | 250136353 | C | N/D | 17 | 6 | 439 | 0 | 3 | 5 | 2 | 0 | 3 | 2 | 3 / 211 / 4 / 2 | 8 | Sì |
| Hakan Çalhanoğlu | hakan-calhanoglu | 250022829 | C | N/D | 20 | 5 | 209 | 3 | 0 | 5 | 3 | 1 | 2 | 1 | 3 / 186 / 7 / 1 | 7 | Sì |
| Curtis Jones | curtis-jones | 250106935 | C | N/D | 21 | 4 | 152 | 0 | 0 | 2 | 0 | 0 | 2 | 4 | 1 / 90 / 3 / 1 | 0 | Sì |
| Henrikh Mkhitaryan | henrikh-mkhitaryan | 98023 | C | N/D | 22 | 3 | 163 | 0 | 1 | 8 | 1 | 1 | 0 | 1 | 2 / 22 / 2 / 1 | 4 | Sì |
| Nicolò Barella | nicolo-barella | 250066739 | C | N/D | 23 | 6 | 540 | 1 | 2 | 11 | 6 | 1 | 4 | 4 | 3 / 228 / 4 / 0 | 8 | Sì |
| Marcus Thuram | marcus-thuram | 250068805 | A | N/D | 9 | 6 | 370 | 4 | 2 | 19 | 7 | 1 | 9 | 6 | 3 / 217 / 8 / 3 | 8 | Sì |
| Lautaro Martínez | lautaro-martinez | 250118281 | A | N/D | 10 | 5 | 353 | 4 | 0 | 25 | 6 | 2 | 5 | 4 | 2 / 180 / 16 / 6 | 0 | Sì |
| Luis Henrique | luis-henrique | 250146919 | A | N/D | 11 | 5 | 209 | 0 | 0 | 4 | 1 | 0 | 0 | 1 | 1 / 17 / 0 / 0 | 0 | Sì |
| Ange-Yoan Bonny | ange-yoan-bonny | 250173062 | A | N/D | 14 | 6 | 128 | 2 | 0 | 8 | 4 | 0 | 4 | 2 | 3 / 117 / 4 / 3 | 8 | Sì |
| Mattia Mosconi | mattia-mosconi | 250184849 | A | B | 48 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Francesco Pio Esposito | pio-esposito | 250163404 | A | B | 94 | 1 | 23 | 0 | 0 | 1 | 1 | 0 | 0 | 2 | 1 / 23 / 1 / 1 | 0 | Sì |

### LASK

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lukas Jungwirth | lukas-jungwirth | 250188376 | P | N/D | 1 | 9 | 810 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 232 / 0 / 0 | 13 | Sì |
| Tobias Schützenauer | tobias-schutzenauer | 250065421 | P | N/D | 33 | 1 | 38 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 / 38 / 0 / 0 | 0 | N/D |
| Christof Katzmayr | christof-katzmayr | 250206921 | P | B | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fabian Schillinger | fabian-schillinger | 250184503 | P | N/D | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| George Bello | george-bello | 250188092 | D | N/D | 2 | 8 | 625 | 0 | 0 | 4 | 0 | 0 | 2 | 8 | 1 / 90 / 1 / 0 | 0 | Sì |
| Miguel Freckleton | miguel-freckleton | 250223202 | D | N/D | 3 | 3 | 117 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 5 | Sì |
| Xavier Mbuyamba | xavier-mbuyamba | 250137804 | D | N/D | 4 | 8 | 720 | 1 | 0 | 6 | 4 | 3 | 3 | 2 | 3 / 270 / 1 / 1 | 4 | Sì |
| Andrés Andrade | andres-andrade | 250133203 | D | N/D | 16 | 8 | 719 | 2 | 1 | 11 | 5 | 0 | 0 | 3 | 3 / 270 / 3 / 0 | 13 | Sì |
| Kasper Jørgensen | kasper-j-rgensen | 250116667 | D | N/D | 20 | 7 | 570 | 0 | 1 | 15 | 4 | 0 | 1 | 8 | 3 / 193 / 3 / 0 | 0 | Sì |
| Manoël Verhaeghe | manoel-verhaeghe | 250217987 | D | N/D | 21 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 1 | N/D |
| Daniel Elfadli | daniel-elfadli | 250225138 | D | N/D | 23 | 1 | 90 | 0 | 0 | N/D | N/D | 0 | 0 | 0 | 1 / 19 / 0 / 0 | 2 | Sì |
| Yvan Dibango | yvan-dibango | 250197947 | D | N/D | 25 | 4 | 156 | 0 | 0 | 0 | 0 | 1 | 3 | 0 | 2 / 180 / 1 / 0 | 7 | N/D |
| Jakob Wansch | jakob-wansch | 250223434 | D | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ryan Rodriguez German | ryan-rodriguez-german | 250195616 | D | B | 36 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Luca Ortner | luca-ortner | 250223433 | D | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| João Victor Tornich | joao-victor-tornich | 250223204 | D | N/D | 43 | 3 | 270 | 0 | 0 | 2 | 0 | 0 | 4 | 2 | 3 / 270 / 2 / 0 | 0 | Sì |
| Armin Midzic | armin-midzic | 250199268 | D | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jonas Ilk | jonas-ilk | 250184494 | D | B | 47 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | N/D |
| Alan Wimmer | alan-wimmer | 250223435 | D | B | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Melayro Bogarde | melayro-bogarde | 250124223 | C | N/D | 6 | 9 | 544 | 1 | 2 | 3 | 1 | 2 | 6 | 3 | 2 / 152 / 1 / 1 | 12 | Sì |
| Kryštof Daněk | krystof-danek | 250130771 | C | N/D | 9 | 6 | 376 | 1 | 1 | 5 | 2 | 0 | 4 | 3 | 2 / 180 / 3 / 2 | 10 | Sì |
| Robert Ljubičić | robert-ljubicic | 250143322 | C | N/D | 10 | 6 | 473 | 0 | 0 | 4 | 1 | 0 | 6 | 4 | 3 / 183 / 2 / 1 | 11 | Sì |
| Alessandro Schöpf | alessandro-schopf | 250050403 | C | N/D | 18 | 5 | 206 | 1 | 0 | 4 | 1 | 0 | 6 | 5 | 3 / 121 / 0 / 0 | 12 | Sì |
| Christoph Lang | christoph-lang | 250162184 | C | N/D | 27 | 8 | 547 | 5 | 0 | 11 | 9 | 0 | 3 | 5 | 3 / 221 / 6 / 4 | 4 | Sì |
| Florian Flecker | florian-flecker | 250159904 | C | N/D | 29 | 5 | 227 | 1 | 1 | 4 | 1 | 1 | 0 | 2 | 3 / 77 / 2 / 2 | 10 | Sì |
| Sascha Horvath | sascha-horvath | 250055894 | C | N/D | 30 | 9 | 715 | 1 | 1 | 7 | 1 | 1 | 1 | 4 | 2 / 155 / 3 / 1 | 12 | Sì |
| Samuel Adeniran | samuel-adeniran | 250223201 | A | N/D | 7 | 4 | 289 | 5 | 1 | 11 | 5 | 1 | 1 | 0 | 2 / 96 / 1 / 0 | 9 | Sì |
| Moses Usor | moses-usor | 250174644 | A | N/D | 8 | 8 | 446 | 2 | 3 | 15 | 5 | 1 | 3 | 2 | 2 / 97 / 2 / 0 | 11 | Sì |
| Sasa Kalajdzic | sasa-kalajdzic | 250116789 | A | N/D | 11 | 2 | 171 | 1 | 0 | N/D | N/D | 0 | 0 | 0 | 3 / 118 / 3 / 2 | 6 | Sì |
| Matthias Hartl | matthias-hartl | 250223432 | A | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Paul Krapf | paul-krapf | 250217981 | A | B | 40 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Nael Kane | nael-kane | 250224881 | A | N/D | 45 | 4 | 27 | 0 | 0 | 2 | 2 | 0 | 1 | 2 | 1 / 8 / 0 / 0 | 6 | N/D |

### Leipzig

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ørjan Nyland | rjan-nyland | 108923 | P | N/D | 1 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Maarten Vandevoordt | maarten-vandevoordt | 250118787 | P | N/D | 26 | 6 | 540 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 / 360 / 0 / 0 | 9 | Sì |
| Franz Hantschmann | franz-hantschmann | 250201511 | P | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Janos Kanyai | janos-kanyai | 250201515 | P | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Elian Hähner | elian-hahner | 250224276 | P | B | 48 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Abdoul Kone | abdoul-kone | 250223167 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Willi Orbán | willi-orban | 250051754 | D | N/D | 4 | 6 | 540 | 1 | 0 | 9 | 2 | 0 | 3 | 5 | 4 / 360 / 2 / 1 | 9 | Sì |
| Lukas Klostermann | lukas-klostermann | 250058260 | D | N/D | 16 | 1 | 59 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 4 / 0 / 0 | 2 | Sì |
| David Raum | david-raum | 250110361 | D | N/D | 22 | 6 | 540 | 0 | 0 | 4 | 2 | 0 | 6 | 1 | 4 / 343 / 2 / 0 | 9 | Sì |
| Castello Lukeba | castello-lukeba | 250124068 | D | N/D | 23 | 4 | 344 | 0 | 0 | 1 | 0 | 1 | 4 | 1 | 4 / 360 / 0 / 0 | 7 | Sì |
| Max Finkgräfe | max-finkgrafe | 250162917 | D | N/D | 35 | 2 | 38 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 / 17 / 1 / 1 | 0 | Sì |
| Benjamin Henrichs | benjamin-henrichs | 250058258 | D | N/D | 39 | 5 | 160 | 0 | 1 | 2 | 0 | 1 | 2 | 3 | 2 / 18 / 0 / 0 | 7 | Sì |
| Maxime Estève | maxime-esteve | 250124756 | C | N/D | 3 | 3 | 196 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | N/D | 3 | Sì |
| Ezechiel Banzuzi | ezechiel-banzuzi | 250171161 | C | N/D | 6 | 6 | 448 | 1 | 2 | 9 | 4 | 0 | 10 | 8 | 3 / 206 / 8 / 0 | 9 | Sì |
| Antonio Nusa | antonio-nusa | 250163400 | C | B | 7 | 4 | 326 | 1 | 0 | 11 | 5 | 1 | 2 | 6 | 4 / 326 / 11 / 5 | 0 | Sì |
| Assan Ouédraogo | assan-ouedraogo | 250170137 | C | B | 8 | 1 | 30 | 0 | 0 | 1 | 0 | 0 | 0 | 2 | 1 / 30 / 1 / 0 | 0 | N/D |
| Nicolas Seiwald | nicolas-seiwald | 250114167 | C | N/D | 13 | 5 | 280 | 0 | 0 | 1 | 1 | 0 | 3 | 0 | 4 / 170 / 0 / 0 | 8 | Sì |
| Christoph Baumgartner | christoph-baumgartner | 250089289 | C | N/D | 14 | 2 | 69 | 0 | 1 | 3 | 1 | 1 | 3 | 0 | 2 / 69 / 3 / 1 | 0 | Sì |
| Ridle Baku | ridle-baku | 250104720 | C | N/D | 17 | 5 | 321 | 2 | 0 | 5 | 2 | 0 | 2 | 9 | 4 / 338 / 8 / 5 | 8 | Sì |
| Rocco Reitz | rocco-reitz | 250144303 | C | N/D | 20 | 3 | 171 | 1 | 0 | 4 | 1 | 0 | 1 | 3 | 3 / 58 / 1 / 0 | 5 | Sì |
| Neil El Aynaoui | neil-el-aynaoui | 250187059 | C | N/D | 21 | 5 | 403 | 0 | 1 | 7 | 2 | 2 | 6 | 6 | 4 / 317 / 1 / 0 | 7 | Sì |
| Christopher Nkunku | christopher-nkunku | 250076654 | C | N/D | 28 | 6 | 358 | 4 | 1 | 14 | 7 | 0 | 4 | 9 | 4 / 261 / 2 / 1 | 8 | Sì |
| Andrija Maksimović | andrija-maksimovic | 250177722 | C | N/D | 30 | 4 | 138 | 1 | 1 | 2 | 1 | 0 | 2 | 0 | 2 / 97 / 2 / 2 | 5 | Sì |
| Benno Kaltefleiter | benno-kaltefleiter | 250201514 | C | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Viggo Gebel | viggo-gebel | 250189610 | C | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Brajan Gruda | brajan-gruda | 250178786 | A | N/D | 10 | 4 | 279 | 0 | 1 | 8 | 3 | 0 | 5 | 8 | 4 / 249 / 6 / 4 | 7 | Sì |
| Johan Bakayoko | johan-bakayoko | 250130406 | A | N/D | 11 | 2 | 80 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | N/D | 3 | Sì |
| Tidiam Gomis | tidiam-gomis | 250183342 | A | N/D | 27 | 6 | 300 | 2 | 2 | 16 | 4 | 0 | 0 | 6 | 4 / 99 / 3 / 1 | 9 | Sì |
| Rômulo Cardoso | romulo-cardoso | 250221087 | A | N/D | 40 | 4 | 203 | 1 | 0 | 5 | 3 | 0 | 1 | 3 | 3 / 218 / 6 / 2 | 0 | Sì |

### Lens

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Régis Gurtner | regis-gurtner | 101529 | P | N/D | 1 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Mathieu Gorgelin | mathieu-gorgelin | 107754 | P | N/D | 16 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Daivy Lefranc-Yeboah | daivy-lefranc-yeboah | 250224414 | P | B | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Robin Risser | robin-risser | 250181514 | P | N/D | 40 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 / 360 / 0 / 0 | 10 | Sì |
| Arthur Mogo Njimfo | arthur-mogo-njimfo | 250224419 | P | B | 41 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fedwan Messaoudi | fedwan-messaoudi | 250224418 | P | B | 42 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ruben Aguilar | ruben-aguilar | 250061132 | D | N/D | 2 | 6 | 440 | 1 | 1 | 7 | 1 | 1 | 9 | 2 | 4 / 232 / 4 / 2 | 9 | Sì |
| Nidal Čelik | nidal-celik | 250171976 | D | N/D | 4 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Samson Baidoo | samson-baidoo | 250139010 | D | N/D | 6 | 2 | 67 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 3 / 193 / 0 / 0 | 3 | Sì |
| Matthieu Udol | matthieu-udol | 250221057 | D | N/D | 14 | 6 | 474 | 2 | 0 | 8 | 3 | 0 | 5 | 4 | 4 / 360 / 10 / 2 | 9 | Sì |
| Jean-Clair Todibo | jean-clair-todibo | 250128268 | D | N/D | 20 | 3 | 140 | 0 | 0 | 2 | 0 | 0 | 4 | 0 | 1 / 45 / 1 / 1 | 3 | Sì |
| Michał Skóraś | micha-skoras | 250105686 | D | N/D | 22 | 6 | 363 | 0 | 1 | 2 | 0 | 1 | 6 | 10 | 4 / 219 / 1 / 0 | 0 | Sì |
| Saud Abdulhamid | saud-abdulhamid | 250181167 | D | N/D | 23 | 2 | 80 | 1 | 0 | 1 | 1 | 0 | 1 | 2 | 3 / 203 / 2 / 0 | 4 | Sì |
| Jonathan Gradit | jonathan-gradit | 250007575 | D | N/D | 24 | 3 | 153 | 0 | 0 | 2 | 0 | 1 | 4 | 3 | N/D | 3 | Sì |
| Ismaëlo Ganiou | ismaelo-ganiou | 250189553 | D | N/D | 25 | 5 | 439 | 1 | 0 | 4 | 2 | 0 | 3 | 4 | 2 / 180 / 2 / 2 | 0 | Sì |
| Souleymane Sagnan | souleymane-sagnan | 250189550 | D | N/D | 31 | 3 | 246 | 0 | 0 | 1 | 1 | 0 | 2 | 1 | 1 / 62 / 0 / 0 | 4 | N/D |
| Kyllian Antonio | kyllian-antonio | 250189812 | D | N/D | 32 | 5 | 450 | 0 | 0 | 2 | 0 | 0 | 5 | 9 | 4 / 278 / 1 / 0 | 8 | Sì |
| Djulian Fernoc | djulian-fernoc | 250224403 | D | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Noé Kemtchoum | noe-kemtchoum | 250224411 | D | B | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Andrija Bulatović | andrija-bulatovic | 250173262 | C | N/D | 5 | 7 | 264 | 0 | 0 | 9 | 3 | 1 | 5 | 4 | 2 / 110 / 4 / 0 | 9 | Sì |
| Yacine Titraoui | yacine-titraoui | 250209953 | C | N/D | 8 | 5 | 361 | 0 | 0 | 1 | 0 | 1 | 4 | 7 | 2 / 30 / 1 / 0 | 7 | Sì |
| Amadou Haidara | amadou-haidara | 250102866 | C | N/D | 21 | 6 | 256 | 0 | 0 | 2 | 1 | 1 | 2 | 3 | 4 / 295 / 6 / 2 | 9 | Sì |
| Mickaël Cuisance | mickael-cuisance | 250091018 | C | N/D | 27 | 6 | 390 | 0 | 0 | 5 | 2 | 1 | 5 | 2 | 3 / 270 / 5 / 0 | 0 | Sì |
| Léopold Joursky | leopold-joursky | 250224408 | C | B | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Nathanaël Gane Bernardino | nathanael-gane-bernardino | 250224404 | C | B | 36 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lucas Robbe | lucas-robbe | 250189805 | C | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Florian Sotoca | florian-sotoca | 250186121 | A | N/D | 7 | 4 | 180 | 1 | 0 | 6 | 3 | 0 | 1 | 2 | 1 / 15 / 1 / 0 | 5 | Sì |
| Thorgan Hazard | thorgan-hazard | 250012551 | A | N/D | 9 | 5 | 161 | 0 | 0 | 5 | 1 | 0 | 3 | 3 | 2 / 148 / 6 / 1 | 5 | Sì |
| Florian Thauvin | florian-thauvin | 250050319 | A | N/D | 10 | 7 | 607 | 3 | 6 | 18 | 11 | 2 | 5 | 10 | 4 / 282 / 13 / 7 | 10 | Sì |
| Odsonne Édouard | odsonne-edouard | 250076641 | A | N/D | 11 | 6 | 252 | 1 | 0 | 8 | 3 | 0 | 2 | 3 | 3 / 92 / 4 / 3 | 0 | Sì |
| Abdallah Sima | abdallah-sima | 250147342 | A | N/D | 19 | 5 | 384 | 1 | 1 | 9 | 3 | 0 | 7 | 7 | 1 / 75 / 1 / 1 | 0 | Sì |
| Junior Kadile | junior-kadile | 250118957 | A | N/D | 28 | 2 | 90 | 0 | 0 | 1 | 1 | 0 | 1 | 1 | 4 / 193 / 7 / 2 | 4 | N/D |
| Franjo Ivanović | franjo-ivanovic | 250169350 | A | N/D | 29 | 5 | 224 | 2 | 0 | 5 | 4 | 1 | 5 | 4 | 4 / 222 / 6 / 1 | 8 | Sì |
| Mohamed Seddik | mohamed-seddik | 250193597 | A | B | 35 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mezian Mesloub Soares | mezian-mesloub-soares | 250208751 | A | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Lille

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Berke Özer | berke-ozer | 250102646 | P | N/D | 1 | 6 | 540 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 / 270 / 0 / 0 | 8 | Sì |
| Orlando Gill | orlando-gill | 250218467 | P | N/D | 12 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 1 | Sì |
| Zadig Lanssade | zadig-lanssade | 250216711 | P | B | 40 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Thomas Sajous | thomas-sajous | 250201706 | P | B | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Loun Srdanović | loun-srdanovic | 250179746 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Nathan Ngoy | nathan-ngoy | 250130418 | D | N/D | 3 | 6 | 540 | 0 | 0 | 0 | 0 | 0 | 5 | 6 | 3 / 270 / 0 / 0 | 8 | Sì |
| Alexsandro | alexsandro | 250188247 | D | N/D | 4 | 6 | 540 | 0 | 0 | 3 | 0 | 0 | 5 | 5 | 3 / 270 / 3 / 1 | 0 | Sì |
| Romain Perraud | romain-perraud | 250068803 | D | N/D | 15 | 7 | 518 | 0 | 0 | 5 | 0 | 2 | 5 | 6 | 2 / 166 / 0 / 0 | 0 | Sì |
| Tiago Santos | tiago-santos | 250188246 | D | N/D | 22 | 6 | 472 | 2 | 0 | 9 | 6 | 0 | 4 | 14 | 1 / 90 / 0 / 0 | 0 | Sì |
| Tanguy Nianzou | tanguy-nianzou | 250118959 | D | N/D | 23 | 2 | 180 | 0 | 1 | 3 | 1 | 0 | 1 | 2 | 1 / 27 / 0 / 0 | 2 | Sì |
| Calvin Verdonk | calvin-verdonk | 250066559 | D | N/D | 24 | 5 | 122 | 0 | 0 | 1 | 0 | 1 | 4 | 1 | 2 / 102 / 0 / 0 | 6 | Sì |
| Isaac Cossier | isaac-cossier | 250201718 | D | N/D | 26 | 1 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 1 | Sì |
| Maxima Goffi | maxima-goffi | 250201725 | D | N/D | 38 | 2 | 158 | 0 | 0 | 3 | 0 | 1 | 2 | 4 | 2 / 153 / 0 / 0 | 3 | Sì |
| Nabil Bentaleb | nabil-bentaleb | 250057690 | C | N/D | 6 | 7 | 533 | 0 | 1 | 8 | 3 | 0 | 8 | 5 | 3 / 192 / 2 / 0 | 0 | Sì |
| Ethan Mbappé | ethan-mbappe | 250189110 | C | N/D | 8 | 6 | 352 | 1 | 0 | 10 | 6 | 0 | 4 | 9 | 1 / 56 / 1 / 0 | 0 | Sì |
| Hákon Haraldsson | hakon-haraldsson | 250128943 | C | N/D | 10 | 7 | 494 | 1 | 0 | 8 | 4 | 1 | 7 | 10 | 3 / 270 / 2 / 0 | 0 | Sì |
| Osame Sahraoui | osame-sahraoui | 250146610 | C | N/D | 11 | 4 | 115 | 0 | 0 | 2 | 1 | 0 | 0 | 4 | 1 / 18 / 0 / 0 | 5 | Sì |
| Maurits Kjærgaard | maurits-kj-rgaard | 250129343 | C | N/D | 14 | 4 | 158 | 0 | 2 | 4 | 1 | 2 | 2 | 1 | 3 / 59 / 1 / 0 | 0 | Sì |
| Ngal'Ayel Mukau | ngal-ayel-mukau | 250198114 | C | N/D | 17 | 7 | 401 | 0 | 0 | 2 | 1 | 0 | 5 | 2 | 3 / 180 / 0 / 0 | 9 | Sì |
| Başar Önal | basar-onal | 250178658 | C | N/D | 19 | 4 | 211 | 0 | 0 | 1 | 1 | 0 | 2 | 5 | 2 / 17 / 1 / 0 | 0 | Sì |
| Benjamin André | benjamin-andre | 250025791 | C | N/D | 21 | 5 | 284 | 0 | 0 | 2 | 1 | 1 | 7 | 6 | 3 / 229 / 1 / 0 | 7 | Sì |
| Dilane Bakwa | dilane-bakwa | 250112700 | A | N/D | 7 | 6 | 328 | 2 | 1 | 7 | 2 | 0 | 7 | 6 | 3 / 201 / 6 / 2 | 8 | Sì |
| Olivier Giroud | olivier-giroud | 250020851 | A | N/D | 9 | 7 | 402 | 2 | 2 | 7 | 4 | 1 | 2 | 5 | 3 / 52 / 1 / 0 | 9 | Sì |
| Ayase Ueda | ayase-ueda | 250181460 | A | N/D | 18 | 4 | 227 | 2 | 0 | 9 | 7 | 0 | 8 | 0 | 2 / 155 / 2 / 1 | 0 | Sì |
| Gaëtan Perrin | gaetan-perrin | 250062684 | A | N/D | 28 | 4 | 132 | 0 | 0 | 1 | 0 | 0 | 2 | 1 | 2 / 76 / 2 / 0 | 5 | Sì |
| Soriba Diaoune | soriba-diaoune | 250201719 | A | N/D | 35 | 1 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 / 83 / 3 / 3 | 2 | Sì |

### Liverpool

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alisson Becker | alisson-becker | 250099867 | P | N/D | 1 | 7 | 630 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 4 / 360 / 0 / 0 | 9 | Sì |
| Giorgi Mamardashvili | giorgi-mamardashvili | 250101805 | P | N/D | 25 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 | Sì |
| Freddie Woodman | freddie-woodman | 250056572 | P | N/D | 28 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Vítězslav Jaroš | vitezslav-jaros | 250113263 | P | N/D | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Bailey Hall | bailey-hall | 250201696 | P | B | 80 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Joe Gomez | joe-gomez | 250058215 | D | N/D | 2 | 2 | 13 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 / 110 / 1 / 0 | 0 | Sì |
| Virgil van Dijk | virgil-van-dijk | 50327420 | D | N/D | 4 | 7 | 630 | 0 | 0 | 3 | 1 | 2 | 3 | 2 | 4 / 298 / 5 / 2 | 9 | Sì |
| Jérémy Jacquet | jeremy-jacquet | 250177928 | D | N/D | 5 | 7 | 595 | 0 | 0 | 2 | 1 | 2 | 7 | 7 | 4 / 316 / 3 / 0 | 10 | Sì |
| Milos Kerkez | milos-kerkez | 250163153 | D | N/D | 6 | 7 | 566 | 0 | 0 | 3 | 1 | 2 | 10 | 10 | 2 / 102 / 0 / 0 | 9 | Sì |
| Conor Bradley | conor-bradley | 250135607 | D | N/D | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Giovanni Leoni | giovanni-leoni | 250203207 | D | N/D | 15 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kostas Tsimikas | kostas-tsimikas | 250076631 | D | N/D | 21 | 2 | 64 | 0 | 0 | 1 | 1 | 0 | 4 | 0 | 4 / 258 / 1 / 0 | 0 | Sì |
| Jeremie Frimpong | jeremie-frimpong | 250113276 | D | N/D | 30 | 5 | 239 | 0 | 0 | 1 | 0 | 1 | 2 | 1 | 2 / 120 / 2 / 1 | 0 | Sì |
| Ronald Araújo | ronald-araujo | 250134170 | D | N/D | 33 | 7 | 405 | 0 | 0 | 0 | 0 | 2 | 4 | 1 | 3 / 197 / 7 / 2 | 10 | Sì |
| Luke Chambers | luke-chambers | 250154417 | D | N/D | 44 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 / 5 / 0 / 0 | 0 | Sì |
| Isaac Mabaya | isaac-mabaya | 250154425 | D | N/D | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Joseph Bradshaw | joseph-bradshaw | 250201687 | D | B | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Oliver O'Connor | oliver-o-connor | 250201692 | D | B | 81 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| DJ Esdaille | dj-esdaille | 250201691 | D | B | 84 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lucas Pitt | lucas-pitt | 250182784 | D | B | 88 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Wellity Lucky | wellity-lucky | 250165088 | D | B | 92 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Florian Wirtz | florian-wirtz | 250139445 | C | N/D | 7 | 7 | 560 | 0 | 2 | 15 | 3 | 1 | 13 | 7 | 4 / 249 / 10 / 4 | 9 | Sì |
| Dominik Szoboszlai | dominik-szoboszlai | 250104066 | C | N/D | 8 | 6 | 473 | 1 | 0 | 14 | 5 | 1 | 10 | 3 | 2 / 180 / 3 / 1 | 8 | Sì |
| Alexis Mac Allister | alexis-mac-allister | 250172672 | C | N/D | 10 | 7 | 488 | 0 | 0 | 11 | 3 | 2 | 8 | 5 | 4 / 254 / 8 / 4 | 10 | Sì |
| Víctor Muñoz | victor-munoz | 250164215 | C | N/D | 23 | 7 | 428 | 2 | 0 | 12 | 5 | 1 | 8 | 10 | 3 / 113 / 5 / 1 | 9 | Sì |
| Ryan Gravenberch | ryan-gravenberch | 250113001 | C | N/D | 38 | 6 | 282 | 0 | 1 | 5 | 2 | 0 | 8 | 5 | 3 / 201 / 4 / 1 | 0 | Sì |
| Joshua Abe | joshua-abe | 250213092 | C | B | 40 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Trey Nyoni | trey-nyoni | 250200248 | C | B | 42 | 3 | 251 | 1 | 0 | 3 | 1 | 0 | 3 | 0 | 3 / 251 / 3 / 1 | 0 | Sì |
| James McConnell | james-mcconnell | 250154426 | C | N/D | 53 | 1 | 9 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 / 9 / 0 / 0 | 1 | Sì |
| La'More Lee Forrester | la-more-lee-forrester | 250213100 | C | B | 59 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lewis Koumas | lewis-koumas | 250164834 | C | B | 67 | 4 | 163 | 1 | 1 | 3 | 1 | 0 | 1 | 1 | 4 / 163 / 3 / 1 | 0 | N/D |
| Joseph Upton | joseph-upton | 250201703 | C | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Hadyn Murray-Holme | hadyn-murray-holme | 250213115 | C | B | 72 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Erik Farkas | erik-farkas | 250213098 | C | B | 77 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Prince Cisse | prince-cisse | 250201688 | C | B | 85 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alvin Ayman | alvin-ayman | 250201685 | C | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ben Trueman | ben-trueman | 250201702 | C | B | 91 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Michael Laffey | michael-laffey | 250165087 | C | B | 94 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Afolami Onanuga | afolami-onanuga | 250177640 | C | B | 99 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alexander Isak | alexander-isak | 250089868 | A | N/D | 9 | 6 | 494 | 5 | 0 | 17 | 8 | 1 | 1 | 3 | 3 / 136 / 7 / 1 | 8 | Sì |
| Cody Gakpo | cody-gakpo | 250096849 | A | N/D | 18 | 5 | 371 | 1 | 3 | 10 | 1 | 0 | 6 | 6 | 2 / 114 / 4 / 1 | 6 | Sì |
| Hugo Ekitiké | hugo-ekitike | 250144643 | A | N/D | 22 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Bradley Barcola | bradley-barcola | 250134138 | A | N/D | 29 | 5 | 348 | 0 | 1 | 7 | 1 | 1 | 2 | 1 | 4 / 239 / 11 / 7 | 8 | Sì |
| Rio Ngumoha | rio-ngumoha | 250195782 | A | B | 73 | 4 | 285 | 0 | 2 | 7 | 0 | 0 | 3 | 9 | 4 / 285 / 7 / 0 | 0 | Sì |
| Jayden Danns | jayden-danns | 250165085 | A | B | 76 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Finn Inglethorpe | finn-inglethorpe | 250213105 | A | B | 78 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Josh Sonni-Lambie | josh-sonni-lambie | 250201701 | A | B | 82 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Clae Ewing | clae-ewing | 250201694 | A | B | 83 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Manchester City

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gianluigi Donnarumma | gianluigi-donnarumma | 250078922 | P | N/D | 1 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 / 360 / 0 / 0 | 10 | Sì |
| Marcus Bettinelli | marcus-bettinelli | 250011491 | P | N/D | 13 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gerónimo Rulli | geronimo-rulli | 250073918 | P | N/D | 28 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 | Sì |
| Max-Edgar Chabot | max-edgar-chabot | 250225269 | P | N/D | 94 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rúben Dias | ruben-dias | 250058220 | D | N/D | 3 | 7 | 630 | 0 | 0 | 5 | 3 | 0 | 10 | 1 | 4 / 229 / 1 / 0 | 10 | Sì |
| Marc Guéhi | marc-guehi | 250086928 | D | N/D | 6 | 7 | 630 | 1 | 1 | 3 | 1 | 0 | 5 | 8 | 3 / 270 / 1 / 0 | 10 | Sì |
| Rayan Aït-Nouri | rayan-ait-nouri | 250127436 | D | N/D | 21 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 2 / 33 / 2 / 0 | 2 | Sì |
| Vitor Reis | vitor-reis | 250205653 | D | N/D | 22 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 18 / 0 / 0 | 2 | Sì |
| Joško Gvardiol | josko-gvardiol | 250127284 | D | N/D | 24 | 7 | 488 | 1 | 3 | 4 | 1 | 2 | 4 | 5 | 3 / 210 / 3 / 2 | 10 | Sì |
| Abdukodir Khusanov | abdukodir-khusanov | 250187698 | D | N/D | 45 | 4 | 283 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | 4 / 312 / 0 / 0 | 8 | Sì |
| Kaden Braithwaite | kaden-braithwaite | 250193656 | D | B | 61 | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 7 / 0 / 0 | 0 | N/D |
| Rico Lewis | rico-lewis | 250139207 | D | N/D | 82 | 1 | 57 | 0 | 0 | 1 | 1 | 0 | 1 | 2 | 1 / 90 / 0 / 0 | 3 | Sì |
| Elliot Anderson | elliot-anderson | 250117617 | C | N/D | 5 | 7 | 518 | 0 | 1 | 6 | 1 | 1 | 7 | 23 | 4 / 291 / 7 / 2 | 10 | Sì |
| Mateo Kovačić | mateo-kovacic | 250023551 | C | N/D | 8 | 3 | 92 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 2 / 22 / 0 / 0 | 6 | Sì |
| Rayan Cherki | rayan-cherki | 250124063 | C | N/D | 10 | 6 | 395 | 4 | 2 | 14 | 5 | 1 | 5 | 5 | 4 / 287 / 10 / 4 | 10 | Sì |
| Jeremy Doku | jeremy-doku | 250113142 | C | N/D | 11 | 3 | 126 | 1 | 1 | 4 | 1 | 0 | 2 | 6 | 2 / 71 / 2 / 1 | 5 | Sì |
| Enzo Fernández | enzo-fernandez | 250174838 | C | N/D | 17 | 5 | 368 | 1 | 0 | 8 | 4 | 1 | 6 | 9 | 4 / 335 / 9 / 2 | 7 | Sì |
| Matheus Nunes | matheus-nunes | 250145803 | C | N/D | 27 | 5 | 379 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 3 / 214 / 0 / 0 | 7 | Sì |
| Ayyoub Bouaddi | ayyoub-bouaddi | 250191448 | C | N/D | 32 | 4 | 122 | 0 | 0 | 1 | 0 | 1 | 2 | 3 | 3 / 127 / 1 / 0 | 7 | Sì |
| Nico O’Reilly | nico-o-reilly | 250165221 | C | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Phil Foden | phil-foden | 250101534 | C | N/D | 47 | 5 | 363 | 1 | 2 | 9 | 2 | 1 | 4 | 6 | 3 / 229 / 7 / 4 | 7 | Sì |
| Floyd Samba | floyd-samba | 250193658 | C | B | 75 | 1 | 62 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 / 62 / 0 / 0 | 0 | N/D |
| Iliman Ndiaye | iliman-ndiaye | 250181626 | A | N/D | 7 | 5 | 353 | 0 | 1 | 7 | 0 | 0 | 4 | 13 | 3 / 156 / 6 / 3 | 7 | Sì |
| Erling Haaland | erling-haaland | 250103758 | A | N/D | 9 | 7 | 620 | 8 | 0 | 27 | 13 | 0 | 6 | 6 | 3 / 270 / 17 / 10 | 10 | Sì |
| Allan Elias | allan-elias | 250225023 | A | N/D | 37 | 1 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 97 / 2 / 1 | 0 | Sì |
| Antoine Semenyo | antoine-semenyo | 250181717 | A | N/D | 42 | 7 | 553 | 2 | 3 | 8 | 4 | 0 | 9 | 6 | 2 / 152 / 7 / 2 | 0 | Sì |
| Ryan McAidoo | ryan-mcaidoo | 250194516 | A | B | 56 | 1 | 28 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 / 28 / 0 / 0 | 0 | N/D |

### Manchester United

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Senne Lammens | senne-lammens | 250118908 | P | N/D | 1 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 270 / 0 / 0 | 9 | Sì |
| Karl Darlow | karl-darlow | 250021790 | P | N/D | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 | Sì |
| Tom Heaton | tom-heaton | 69582 | P | N/D | 22 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dermot Mee | dermot-mee | 250128702 | P | N/D | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Diogo Dalot | diogo-dalot | 250081628 | D | N/D | 2 | 7 | 469 | 0 | 0 | 8 | 1 | 2 | 7 | 3 | 2 / 180 / 2 / 0 | 9 | Sì |
| Noussair Mazraoui | noussair-mazraoui | 250075995 | D | N/D | 3 | 4 | 142 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 2 / 180 / 4 / 0 | 6 | Sì |
| Matthijs de Ligt | matthijs-de-ligt | 50327424 | D | N/D | 4 | 1 | 79 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 79 / 0 / 0 | 0 | Sì |
| Harry Maguire | harry-maguire | 250075007 | D | N/D | 5 | 7 | 630 | 0 | 0 | 9 | 2 | 2 | 7 | 7 | 2 / 100 / 3 / 0 | 8 | Sì |
| Lisandro Martínez | lisandro-martinez | 250132803 | D | N/D | 6 | 6 | 495 | 0 | 0 | 7 | 2 | 1 | 4 | 1 | 2 / 180 / 1 / 1 | 8 | Sì |
| Patrick Dorgu | patrick-dorgu | 250178823 | D | N/D | 13 | 5 | 171 | 0 | 1 | 6 | 1 | 1 | 7 | 1 | 1 / 72 / 2 / 0 | 0 | Sì |
| Leny Yoro | leny-yoro | 250165232 | D | B | 15 | 2 | 164 | 0 | 0 | 1 | 0 | 0 | 3 | 0 | 2 / 164 / 1 / 0 | 0 | Sì |
| Luke Shaw | luke-shaw | 250042705 | D | N/D | 23 | 5 | 427 | 0 | 1 | 2 | 0 | 2 | 3 | 1 | N/D | 0 | Sì |
| Harry Amass | harry-amass | 250190140 | D | B | 41 | 2 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 / 29 / 0 / 0 | 0 | N/D |
| Jaydan Kamason | jaydan-kamason | 250190132 | D | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Daniel Armer | daniel-armer | 250190131 | D | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Albert Mills | albert-mills | 250190130 | D | B | 66 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mason Mount | mason-mount | 250076240 | C | N/D | 7 | 2 | 26 | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 3 / 159 / 1 / 0 | 5 | Sì |
| Bruno Fernandes | bruno-fernandes | 250078886 | C | N/D | 8 | 7 | 630 | 3 | 1 | 23 | 6 | 2 | 5 | 4 | 3 / 237 / 7 / 3 | 10 | Sì |
| Andrey Santos | andrey-santos | 250182090 | C | N/D | 17 | 4 | 173 | 0 | 0 | 0 | 0 | 1 | 2 | 5 | 3 / 161 / 0 / 0 | 7 | Sì |
| Youri Tielemans | youri-tielemans | 250064006 | C | N/D | 18 | 7 | 547 | 0 | 1 | 8 | 3 | 0 | 4 | 13 | 3 / 201 / 1 / 1 | 10 | Sì |
| Carlos Baleba | carlos-baleba | 250188249 | C | N/D | 20 | 2 | 105 | 0 | 0 | 3 | 0 | 0 | 3 | 2 | 2 / 111 / 1 / 1 | 3 | Sì |
| Manuel Ugarte | manuel-ugarte | 250161762 | C | N/D | 25 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Ayden Heaven | ayden-heaven | 250189295 | C | N/D | 26 | 2 | 90 | 0 | 0 | 2 | 0 | 0 | 1 | 3 | 1 / 80 / 0 / 0 | 4 | Sì |
| Kobbie Mainoo | kobbie-mainoo | 250165175 | C | B | 37 | 1 | 64 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 64 / 0 / 0 | 0 | Sì |
| Jack Fletcher | jack-fletcher | 250177777 | C | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Tyler Fletcher | tyler-fletcher | 250182726 | C | B | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Jim Thwaites | jim-thwaites | 250202328 | C | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Marcus Rashford | marcus-rashford | 250088246 | A | N/D | 9 | 6 | 355 | 0 | 0 | 13 | 4 | 0 | 2 | 8 | 1 / 66 / 1 / 0 | 0 | Sì |
| Matheus Cunha | matheus-cunha | 250110943 | A | N/D | 10 | 7 | 506 | 1 | 2 | 15 | 4 | 0 | 7 | 9 | 3 / 145 / 6 / 4 | 10 | Sì |
| Joshua Zirkzee | joshua-zirkzee | 250106762 | A | N/D | 11 | 3 | 51 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 3 / 73 / 4 / 3 | 6 | Sì |
| Amad Diallo | amad-diallo | 250121405 | A | N/D | 16 | 2 | 149 | 0 | 0 | 4 | 1 | 0 | 0 | 2 | 2 / 69 / 3 / 2 | 3 | Sì |
| Bryan Mbeumo | bryan-mbeumo | 250137260 | A | N/D | 19 | 7 | 630 | 4 | 0 | 24 | 10 | 1 | 7 | 7 | 3 / 248 / 4 / 2 | 10 | Sì |
| Tynan Thompson | tynan-thompson | 250213748 | A | N/D | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Benjamin Šeško | benjamin-sesko | 250127111 | A | N/D | 30 | 4 | 76 | 1 | 0 | 4 | 1 | 0 | 1 | 0 | 1 / 64 / 2 / 1 | 0 | Sì |
| Shea Lacey | shea-lacey | 250182699 | A | B | 31 | 2 | 22 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 2 / 22 / 0 / 0 | 0 | Sì |

### Napoli

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alex Meret | alex-meret | 250066753 | P | N/D | 1 | 5 | 450 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 225 / 0 / 0 | 6 | Sì |
| Claudio Pugliese | claudio-pugliese | 250213090 | P | B | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Nikita Contini | nikita-contini | 250064393 | P | N/D | 14 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Vanja Milinković-Savić | vanja-milinkovic-savic | 250065792 | P | N/D | 32 | 2 | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 135 / 0 / 0 | 4 | Sì |
| Benoît Badiashile | benoit-badiashile | 250113290 | D | N/D | 5 | 3 | 190 | 0 | 0 | 2 | 1 | 1 | 2 | 2 | 1 / 90 / 0 / 0 | 0 | Sì |
| Amir Rrahmani | amir-rrahmani | 250059233 | D | N/D | 13 | 7 | 630 | 0 | 1 | 8 | 0 | 1 | 8 | 5 | 4 / 360 / 3 / 2 | 9 | Sì |
| Rafa Marín | rafa-marin | 250129412 | D | N/D | 16 | 6 | 531 | 0 | 0 | 3 | 0 | 1 | 9 | 5 | 4 / 340 / 2 / 0 | 8 | Sì |
| Mathías Olivera | mathias-olivera | 250134196 | D | N/D | 17 | 5 | 165 | 0 | 0 | 6 | 1 | 0 | 3 | 1 | 2 / 101 / 0 / 0 | 0 | Sì |
| Giovanni Di Lorenzo | giovanni-di-lorenzo | 250064229 | D | N/D | 22 | 7 | 630 | 0 | 1 | 5 | 2 | 1 | 4 | 8 | 3 / 270 / 1 / 1 | 0 | Sì |
| Sam Beukema | sam-beukema | 250161248 | D | N/D | 31 | 1 | 63 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 / 101 / 0 / 0 | 1 | Sì |
| Leonardo Spinazzola | leonardo-spinazzola | 250020885 | D | N/D | 37 | 6 | 467 | 0 | 0 | 4 | 1 | 0 | 3 | 0 | 2 / 109 / 0 / 0 | 0 | Sì |
| Billy Gilmour | billy-gilmour | 250107117 | C | N/D | 6 | 5 | 264 | 1 | 0 | 3 | 1 | 0 | 2 | 3 | 3 / 252 / 1 / 0 | 7 | Sì |
| Scott McTominay | scott-mctominay | 250088240 | C | N/D | 8 | 4 | 265 | 0 | 0 | 9 | 3 | 0 | 3 | 1 | 3 / 240 / 12 / 4 | 5 | Sì |
| Kevin De Bruyne | kevin-de-bruyne | 250008901 | C | N/D | 11 | 7 | 389 | 3 | 1 | 10 | 4 | 0 | 4 | 1 | 4 / 360 / 3 / 1 | 9 | Sì |
| Stanislav Lobotka | stanislav-lobotka | 250055982 | C | N/D | 68 | 7 | 600 | 1 | 0 | 5 | 3 | 0 | 3 | 12 | 3 / 126 / 0 / 0 | 0 | Sì |
| Frank Anguissa | frank-anguissa | 250086987 | C | N/D | 99 | 4 | 237 | 0 | 0 | 5 | 1 | 0 | 2 | 3 | 2 / 137 / 0 / 0 | 4 | Sì |
| David Neres | david-neres | 250106648 | A | N/D | 7 | 4 | 131 | 0 | 0 | 5 | 1 | 0 | 2 | 1 | 2 / 43 / 0 / 0 | 0 | Sì |
| Rasmus Højlund | rasmus-h-jlund | 250130221 | A | N/D | 19 | 7 | 460 | 2 | 0 | 12 | 5 | 0 | 3 | 7 | 4 / 346 / 8 / 2 | 0 | Sì |
| Lorenzo Lucca | lorenzo-lucca | 250164476 | A | N/D | 20 | 7 | 170 | 0 | 0 | 4 | 1 | 0 | 6 | 0 | 3 / 40 / 1 / 0 | 9 | Sì |
| Matteo Politano | matteo-politano | 250050381 | A | N/D | 21 | 7 | 373 | 1 | 1 | 6 | 4 | 1 | 4 | 4 | 4 / 279 / 6 / 5 | 9 | Sì |
| Giovane | giovane | 250222131 | A | N/D | 23 | 3 | 83 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 3 / 83 / 0 / 0 | 0 | Sì |
| Antonio Vergara | antonio-vergara | 250165363 | A | N/D | 26 | 3 | 130 | 1 | 1 | 3 | 1 | 1 | 1 | 2 | 2 / 110 / 1 / 1 | 1 | Sì |
| Alisson Santos | alisson-santos | 250211008 | A | N/D | 27 | 4 | 216 | 0 | 0 | 14 | 4 | 0 | 0 | 1 | 1 / 58 / 1 / 0 | 0 | Sì |
| Noa Lang | noa-lang | 250091165 | A | N/D | 70 | 5 | 255 | 1 | 0 | 9 | 3 | 0 | 1 | 0 | 3 / 121 / 5 / 4 | 6 | Sì |

### Paris Saint-Germain

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alessandro Longoni | alessandro-longoni | 250193777 | P | N/D | 16 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lucas Chevalier | lucas-chevalier | 250135068 | P | N/D | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Matvei Safonov | matvei-safonov | 250090101 | P | N/D | 39 | 7 | 630 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 / 270 / 0 / 0 | 0 | Sì |
| Arthur Vignaud | arthur-vignaud | 250192231 | P | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Adam Mouak | adam-mouak | 250213230 | P | B | 80 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Achraf Hakimi | achraf-hakimi | 250088061 | D | N/D | 2 | 6 | 408 | 0 | 0 | 13 | 2 | 1 | 0 | 7 | 3 / 244 / 7 / 3 | 10 | Sì |
| Lucas Beraldo | lucas-beraldo | 250193442 | D | N/D | 4 | 5 | 208 | 1 | 0 | 3 | 1 | 0 | 0 | 1 | 2 / 23 / 0 / 0 | 9 | Sì |
| Marquinhos | marquinhos | 250064064 | D | N/D | 5 | 5 | 450 | 3 | 0 | 4 | 4 | 1 | 4 | 2 | 2 / 149 / 0 / 0 | 0 | Sì |
| Illia Zabarnyi | illia-zabarnyi | 250119185 | D | N/D | 6 | 2 | 180 | 1 | 0 | 1 | 1 | 0 | 1 | 0 | 2 / 121 / 0 / 0 | 0 | Sì |
| Lucas Digne | lucas-digne | 250014002 | D | N/D | 12 | 3 | 161 | 0 | 0 | 3 | 0 | 0 | 0 | 4 | 1 / 26 / 0 / 0 | 5 | Sì |
| Lucas Hernández | lucas-hernandez | 250063803 | D | N/D | 21 | 4 | 296 | 0 | 0 | 1 | 0 | 1 | 1 | 4 | 3 / 110 / 1 / 1 | 7 | Sì |
| Nuno Mendes | nuno-mendes | 250136465 | D | N/D | 25 | 3 | 217 | 0 | 0 | 4 | 2 | 1 | 2 | 8 | 2 / 154 / 3 / 2 | 0 | Sì |
| David Boly | david-boly | 250200894 | D | B | 42 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Willian Pacho | willian-pacho | 250174126 | D | N/D | 51 | 5 | 450 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 3 / 244 / 0 / 0 | 9 | Sì |
| Fabián Ruiz | fabian-ruiz | 250115436 | C | N/D | 8 | 6 | 326 | 0 | 2 | 8 | 3 | 1 | 2 | 2 | 3 / 264 / 10 / 4 | 10 | Sì |
| Maghnes Akliouche | maghnes-akliouche | 250160436 | C | N/D | 11 | 7 | 406 | 1 | 0 | 7 | 4 | 0 | 6 | 3 | 3 / 197 / 4 / 1 | 10 | Sì |
| Vitinha | vitinha | 250101444 | C | N/D | 17 | 7 | 496 | 1 | 1 | 13 | 3 | 1 | 3 | 1 | 3 / 270 / 4 / 4 | 11 | Sì |
| Senny Mayulu | senny-mayulu | 250177597 | C | N/D | 24 | 1 | 18 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 / 38 / 2 / 2 | 4 | Sì |
| Dro Fernández | dro-fernandez | 250192609 | C | N/D | 27 | 5 | 151 | 0 | 0 | 1 | 1 | 1 | 1 | 3 | 1 / 90 / 4 / 2 | 7 | Sì |
| Warren Zaïre-Emery | warren-zaire-emery | 250153849 | C | N/D | 33 | 7 | 503 | 0 | 1 | 5 | 1 | 0 | 2 | 3 | 2 / 96 / 2 / 1 | 10 | Sì |
| João Neves | joao-neves | 250164991 | C | N/D | 87 | 6 | 451 | 0 | 0 | 11 | 4 | 0 | 6 | 4 | 2 / 104 / 1 / 1 | 8 | Sì |
| Khvicha Kvaratskhelia | khvicha-kvaratskhelia | 250101808 | A | N/D | 7 | 7 | 377 | 1 | 1 | 14 | 6 | 0 | 2 | 4 | 2 / 83 / 5 / 2 | 0 | Sì |
| Ferran Torres | ferran-torres | 250088320 | A | N/D | 9 | 7 | 432 | 4 | 1 | 12 | 6 | 0 | 1 | 8 | 3 / 157 / 10 / 6 | 9 | Sì |
| Ousmane Dembélé | ousmane-dembele | 250066886 | A | N/D | 10 | 5 | 238 | 1 | 2 | 20 | 5 | 0 | 0 | 0 | 3 / 160 / 12 / 5 | 0 | Sì |
| Désiré Doué | desire-doue | 250162177 | A | N/D | 14 | 7 | 355 | 1 | 1 | 20 | 7 | 0 | 6 | 10 | 2 / 144 / 5 / 3 | 10 | Sì |
| Mika Godts | mika-godts | 250154132 | A | N/D | 22 | 6 | 177 | 0 | 1 | 5 | 1 | 0 | 2 | 6 | 1 / 26 / 2 / 1 | 7 | Sì |
| Quentin Ndjantou | quentin-ndjantou | 250177602 | A | N/D | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Porto

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cláudio Ramos | claudio-ramos | 1909059 | P | N/D | 14 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| João Costa | joao-costa | 250040614 | P | N/D | 24 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| João Afonso | joao-afonso | 250210106 | P | N/D | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Gonçalo Ribeiro | goncalo-ribeiro | 250169106 | P | B | 91 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Diogo Costa | diogo-costa | 250076675 | P | N/D | 99 | 8 | 720 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 / 360 / 0 / 0 | 11 | Sì |
| Jakub Kiwior | jakub-kiwior | 250105681 | D | N/D | 4 | 8 | 720 | 1 | 1 | 4 | 1 | 1 | 10 | 1 | 4 / 360 / 3 / 1 | 3 | Sì |
| Jan Bednarek | jan-bednarek | 250056266 | D | N/D | 5 | 8 | 673 | 1 | 0 | 5 | 1 | 0 | 6 | 1 | 2 / 180 / 2 / 1 | 9 | Sì |
| Zaidu Sanusi | zaidu-sanusi | 250144327 | D | N/D | 12 | 4 | 288 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 2 / 92 / 0 / 0 | 5 | Sì |
| Nehuén Pérez | nehuen-perez | 250128223 | D | N/D | 18 | 5 | 133 | 1 | 0 | 1 | 1 | 0 | 2 | 0 | 1 / 90 / 0 / 0 | 6 | Sì |
| Alberto Costa | alberto-costa | 250174182 | D | N/D | 20 | 7 | 542 | 0 | 0 | 7 | 2 | 0 | 15 | 9 | 4 / 301 / 5 / 2 | 10 | Sì |
| Souza | souza | 250224970 | D | N/D | 33 | 1 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 21 / 0 / 0 | 0 | Sì |
| Martim Fernandes | martim-fernandes | 250163559 | D | B | 52 | 5 | 251 | 0 | 0 | 1 | 0 | 0 | 2 | 4 | 3 / 199 / 1 / 0 | 8 | Sì |
| Luis Gomes | luis-gomes | 250163561 | D | B | 64 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Francisco Moura | francisco-moura | 250112138 | D | N/D | 74 | 4 | 265 | 0 | 0 | 2 | 2 | 1 | 5 | 2 | 2 / 107 / 0 / 0 | 6 | Sì |
| Martim Cunha | martim-cunha | 250185409 | D | B | 84 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Martim Chelmik | martim-chelmik | 250204909 | D | B | 94 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Victor Froholdt | victor-froholdt | 250169957 | C | N/D | 8 | 7 | 630 | 2 | 0 | 10 | 6 | 0 | 10 | 6 | 3 / 256 / 2 / 1 | 9 | Sì |
| Pablo Rosario | pablo-rosario | 250097271 | C | N/D | 13 | 8 | 617 | 0 | 1 | 6 | 1 | 0 | 11 | 8 | 4 / 360 / 4 / 2 | 11 | Sì |
| Inbeom Hwang | inbeom-hwang | 250134536 | C | N/D | 16 | 7 | 270 | 1 | 1 | 2 | 1 | 2 | 6 | 3 | 4 / 85 / 1 / 0 | 0 | Sì |
| Alan Varela | alan-varela | 250188256 | C | N/D | 22 | 4 | 131 | 0 | 0 | 0 | 0 | 1 | 2 | 2 | 2 / 158 / 2 / 0 | 7 | Sì |
| Seko Fofana | seko-fofana | 250042773 | C | N/D | 42 | 2 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 33 / 1 / 0 | 3 | Sì |
| Tiago Silva | tiago-silva | 250185405 | C | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Bernardo Lima | bernardo-lima | 250204915 | C | B | 66 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| João Teixeira | joao-teixeira | 250169491 | C | B | 92 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| William Gomes | william-gomes | 250205755 | A | N/D | 7 | 8 | 521 | 2 | 2 | 19 | 8 | 0 | 8 | 10 | 1 / 68 / 1 / 0 | 0 | Sì |
| Samu | samu | 250186228 | A | N/D | 9 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 3 | Sì |
| Gabriel Veiga | gabriel-veiga | 250153874 | A | N/D | 10 | 8 | 529 | 4 | 3 | 22 | 8 | 1 | 11 | 6 | 4 / 290 / 9 / 3 | 3 | Sì |
| Pepê | pepe | 250159919 | A | N/D | 11 | 8 | 673 | 0 | 4 | 13 | 2 | 1 | 6 | 10 | 4 / 343 / 3 / 0 | 11 | Sì |
| Borja Sainz | borja-sainz | 250137272 | A | N/D | 17 | 8 | 199 | 3 | 0 | 11 | 8 | 0 | 3 | 5 | 4 / 180 / 2 / 0 | 11 | Sì |
| André Silva | andre-silva | 250042521 | A | N/D | 19 | 8 | 552 | 3 | 2 | 17 | 7 | 0 | 5 | 8 | 4 / 220 / 2 / 1 | 3 | Sì |
| Santiago Giménez | santiago-gimenez | 250177879 | A | N/D | 29 | 2 | 43 | 1 | 0 | 3 | 3 | 0 | 1 | 2 | 3 / 45 / 4 / 3 | 4 | Sì |
| Duarte Cunha | duarte-cunha | 250198318 | A | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| André Miranda | andre-miranda | 250193624 | A | B | 72 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Oskar Pietuszewski | oskar-pietuszewski | 250191115 | A | N/D | 77 | 2 | 16 | 1 | 0 | 3 | 1 | 1 | 1 | 4 | 2 / 89 / 3 / 0 | 3 | Sì |
| Mateus Mide | mateus-mide | 250204916 | A | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### PSV Eindhoven

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nick Olij | nick-olij | 250046909 | P | N/D | 1 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Matěj Kovář | matej-kovar | 250117491 | P | N/D | 32 | 9 | 810 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 / 360 / 0 / 0 | 12 | Sì |
| Tijn Smolenaars | tijn-smolenaars | 250187771 | P | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Stijn Kuijsten | stijn-kuijsten | 250190601 | P | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jim Aerts | jim-aerts | 250224305 | P | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kane Aerts | kane-aerts | 250203293 | P | B | 81 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lutsharel Geertruida | lutsharel-geertruida | 250104075 | D | N/D | 2 | 5 | 348 | 1 | 1 | 4 | 1 | 1 | 4 | 4 | 4 / 347 / 1 / 0 | 7 | Sì |
| Yarek Gasiorowski | yarek-gasiorowski | 250171006 | D | N/D | 3 | 3 | 33 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 / 87 / 0 / 0 | 5 | Sì |
| Armando Obispo | armando-obispo | 250088117 | D | N/D | 4 | 9 | 772 | 0 | 0 | 3 | 0 | 3 | 16 | 5 | 4 / 286 / 5 / 0 | 11 | Sì |
| Ryan Flamingo | ryan-flamingo | 250189506 | D | N/D | 6 | 8 | 522 | 1 | 0 | 6 | 2 | 0 | 4 | 3 | 3 / 37 / 0 / 0 | 11 | Sì |
| Sergiño Dest | sergino-dest | 250112998 | D | N/D | 8 | 8 | 719 | 2 | 2 | 10 | 5 | 0 | 5 | 22 | 4 / 360 / 9 / 6 | 10 | Sì |
| Mauro Júnior | mauro-junior | 250122213 | D | N/D | 17 | 9 | 750 | 1 | 2 | 7 | 4 | 0 | 5 | 8 | 3 / 261 / 4 / 0 | 11 | Sì |
| Filip Kostić | filip-kostic | 250024301 | D | N/D | 18 | 4 | 147 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 4 / 317 / 4 / 1 | 6 | Sì |
| Kiliann Sildillia | kiliann-sildillia | 250177927 | D | N/D | 25 | 2 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Michael Bresser | michael-bresser | 250192405 | D | B | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Wessel Kuhn | wessel-kuhn | 250180113 | D | B | 36 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fabian Merién | fabian-merien | 250201840 | D | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Floris Bos | floris-bos | 250189613 | D | B | 40 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Madi Nsosemo | madi-nsosemo | 250164529 | D | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dyran Stam | dyran-stam | 250216497 | D | B | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Brent Jonkers | brent-jonkers | 250195681 | D | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rivas Manuhutu | rivas-manuhutu | 250182485 | D | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kyano Penso | kyano-penso | 250211963 | D | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ezechiel Siani Emaga | ezechiel-siani-emaga | 250215862 | D | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jorvimar Martina | jorvimar-martina | 250213239 | D | B | 59 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Sébastien Ditmer | sebastien-ditmer | 250201831 | D | B | 60 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Paul Wanner | paul-wanner | 250163784 | C | N/D | 10 | 7 | 402 | 0 | 2 | 8 | 5 | 0 | 2 | 5 | 1 / 90 / 0 / 0 | 0 | Sì |
| Guus Til | guus-til | 250099671 | C | N/D | 20 | 9 | 708 | 5 | 1 | 17 | 8 | 0 | 7 | 8 | 4 / 360 / 6 / 2 | 3 | Sì |
| Sven Mijnans | sven-mijnans | 250172703 | C | N/D | 21 | 8 | 464 | 5 | 1 | 23 | 8 | 0 | 5 | 5 | 4 / 271 / 10 / 3 | 11 | Sì |
| Kodai Sano | kodai-sano | 250218556 | C | N/D | 24 | 8 | 657 | 1 | 0 | 11 | 4 | 1 | 8 | 7 | 4 / 360 / 3 / 2 | 10 | Sì |
| Noah Fernandez | noah-fernandez | 250192037 | C | B | 31 | 1 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 9 / 0 / 0 | 0 | Sì |
| Ayoni Santos | ayoni-santos | 250218836 | C | N/D | 35 | 3 | 65 | 0 | 0 | 2 | 0 | 0 | 1 | 2 | 1 / 6 / 1 / 0 | 4 | Sì |
| Amir Bouhamdi | amir-bouhamdi | 250211967 | C | B | 37 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 2 / 0 / 0 | 0 | N/D |
| Shuryjano Cornecion | shuryjano-cornecion | 250211969 | C | B | 42 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Boet Mulders | boet-mulders | 250201844 | C | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gino Verhulst | gino-verhulst | 250192404 | C | B | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jaden de Guzman | jaden-de-guzman | 250191292 | C | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Loek Schakenraad | loek-schakenraad | 250224303 | C | B | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ivan Perišić | ivan-perisic | 103310 | A | N/D | 5 | 8 | 511 | 2 | 1 | 15 | 5 | 2 | 3 | 0 | 4 / 358 / 7 / 1 | 11 | Sì |
| Ruben van Bommel | ruben-van-bommel | 250187458 | A | N/D | 7 | 8 | 532 | 2 | 2 | 16 | 6 | 3 | 13 | 4 | 3 / 243 / 7 / 2 | 11 | Sì |
| Ricardo Pepi | ricardo-pepi | 250187620 | A | N/D | 9 | 7 | 435 | 3 | 0 | 19 | 7 | 0 | 0 | 1 | 2 / 104 / 2 / 0 | 8 | Sì |
| Sami Ouaissa | sami-ouaissa | 250216420 | A | N/D | 11 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Esmir Bajraktarević | esmir-bajraktarevic | 250200525 | A | N/D | 19 | 5 | 192 | 1 | 2 | 7 | 2 | 0 | 2 | 1 | 2 / 87 / 6 / 2 | 6 | Sì |
| Mikkel Bro Hansen | mikkel-bro-hansen | 250205751 | A | N/D | 23 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dennis Man | dennis-man | 250104534 | A | N/D | 27 | 4 | 98 | 0 | 0 | 5 | 2 | 1 | 6 | 0 | 1 / 9 / 1 / 0 | 5 | Sì |
| Sam Lammers | sam-lammers | 250088106 | A | N/D | 29 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Manuel Bahaty | manuel-bahaty | 250201823 | A | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jairo Beerens | jairo-beerens | 250201829 | A | B | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Austyn Jones | austyn-jones | 250205083 | A | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fabio Kluit | fabio-kluit | 250189544 | A | B | 44 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Liam van Nistelrooy | liam-van-nistelrooy | 250211965 | A | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Samuel Dumbili | samuel-dumbili | 250205082 | A | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Real Betis

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Álvaro Vallés | alvaro-valles | 250212322 | P | N/D | 1 | 9 | 810 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 / 360 / 0 / 0 | 11 | Sì |
| Diego Conde | diego-conde | 250076131 | P | N/D | 13 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Manu González | manu-gonzalez | 250194260 | P | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Victor Kroes | victor-kroes | 250216908 | P | B | 41 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Héctor Bellerín | hector-bellerin | 250047082 | D | N/D | 2 | 9 | 674 | 0 | 1 | 5 | 3 | 2 | 8 | 2 | 2 / 172 / 0 / 0 | 10 | Sì |
| Diego Llorente | diego-llorente | 250057121 | D | N/D | 3 | 4 | 309 | 0 | 0 | 1 | 0 | 1 | 3 | 1 | 1 / 90 / 0 / 0 | 4 | Sì |
| Natan | natan | 250187998 | D | N/D | 4 | 7 | 630 | 1 | 0 | 4 | 1 | 2 | 2 | 4 | 4 / 331 / 0 / 0 | 9 | Sì |
| Marc Bartra | marc-bartra | 250010245 | D | N/D | 5 | 5 | 333 | 1 | 0 | 5 | 3 | 0 | 0 | 0 | 3 / 270 / 5 / 4 | 7 | Sì |
| Fran García | fran-garcia | 250091175 | D | N/D | 11 | 8 | 661 | 0 | 1 | 1 | 0 | 1 | 5 | 6 | 4 / 209 / 1 / 1 | 10 | Sì |
| Ángel Ortiz | angel-ortiz | 250178134 | D | N/D | 12 | 3 | 136 | 0 | 0 | 1 | 0 | 1 | 3 | 0 | 3 / 188 / 2 / 2 | 4 | Sì |
| Valentín Gómez | valentin-gomez | 250212314 | D | N/D | 16 | 4 | 348 | 1 | 0 | 1 | 1 | 1 | 5 | 3 | 2 / 99 / 0 / 0 | 5 | Sì |
| Junior Firpo | junior-firpo | 250122839 | D | N/D | 23 | 2 | 149 | 0 | 0 | 0 | 0 | 1 | 4 | 2 | 1 / 81 / 0 / 0 | 0 | Sì |
| Carlos De Roa | carlos-de-roa | 250202605 | D | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jorge Oreiro | jorge-oreiro | 250189624 | D | B | 35 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Oscar Masque | oscar-masque | 250202615 | D | B | 36 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Cuevas | miguel-cuevas | 250184341 | D | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alvaro Díez | alvaro-diez | 250213935 | D | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Carlos Lara | carlos-lara | 250213939 | D | B | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Curro Macías | curro-macias | 250213941 | D | B | 65 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fabian Embalo | fabian-embalo | 250202606 | D | B | 68 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Marcos Solis | marcos-solis | 250191081 | D | B | 73 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Facundo Bernal | facundo-bernal | 250221822 | C | N/D | 6 | 8 | 504 | 0 | 0 | 6 | 1 | 2 | 5 | 4 | 3 / 148 / 1 / 0 | 10 | Sì |
| Pablo Fornals | pablo-fornals | 250092715 | C | N/D | 8 | 8 | 606 | 0 | 1 | 10 | 0 | 0 | 6 | 6 | 3 / 157 / 3 / 1 | 10 | Sì |
| Iker Losada | iker-losada | 250153599 | C | N/D | 14 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Álvaro Fidalgo | alvaro-fidalgo | 250076692 | C | N/D | 15 | 3 | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 29 / 0 / 0 | 0 | Sì |
| Rodrigo Riquelme | rodrigo-riquelme | 250101313 | C | N/D | 17 | 9 | 407 | 2 | 0 | 7 | 4 | 0 | 4 | 10 | 3 / 107 / 3 / 1 | 11 | Sì |
| Nelson Deossa | nelson-deossa | 250212313 | C | N/D | 18 | 9 | 373 | 0 | 1 | 19 | 6 | 0 | 7 | 6 | 4 / 171 / 6 / 1 | 11 | Sì |
| Giovani Lo Celso | giovani-lo-celso | 250100013 | C | N/D | 20 | 2 | 70 | 0 | 1 | 0 | 0 | 0 | 2 | 3 | 1 / 10 / 0 / 0 | 2 | Sì |
| Marc Roca | marc-roca | 250123073 | C | N/D | 21 | 6 | 506 | 0 | 1 | 3 | 0 | 2 | 10 | 6 | 4 / 212 / 5 / 2 | 8 | Sì |
| Isco | isco | 150711837 | C | N/D | 22 | 8 | 401 | 2 | 0 | 17 | 8 | 0 | 5 | 11 | 4 / 256 / 8 / 3 | 10 | Sì |
| Dani Ceballos | dani-ceballos | 250086709 | C | N/D | 25 | 5 | 134 | 0 | 0 | 1 | 0 | 0 | 1 | 7 | 3 / 116 / 0 / 0 | 6 | Sì |
| Ismael Barea | ismael-barea | 250225769 | C | B | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rica | rica | 250202609 | C | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Iván Corralejo | ivan-corralejo | 250184340 | C | B | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Angel Castilla | miguel-angel-castilla | 250202603 | C | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kike Collantes | kike-collantes | 250213932 | C | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ruben Lidueña | ruben-liduena | 250225771 | C | B | 63 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Marcos Mora | marcos-mora | 250202616 | C | B | 66 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Angel | miguel-angel | 250202621 | C | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Antony | antony | 250144211 | A | N/D | 7 | 8 | 540 | 0 | 0 | 32 | 13 | 0 | 7 | 9 | 4 / 306 / 13 / 2 | 10 | Sì |
| Cucho Hernández | cucho-hernandez | 250212316 | A | N/D | 9 | 9 | 589 | 2 | 2 | 16 | 7 | 1 | 5 | 7 | 1 / 28 / 1 / 1 | 0 | Sì |
| Abde Ezzalzouli | abde-ezzalzouli | 250174874 | A | N/D | 10 | 6 | 424 | 3 | 0 | 9 | 5 | 0 | 3 | 9 | 3 / 270 / 15 / 5 | 0 | Sì |
| Troy Parrott | troy-parrott | 250109003 | A | N/D | 19 | 6 | 205 | 1 | 1 | 6 | 3 | 0 | 1 | 2 | 4 / 310 / 6 / 2 | 8 | Sì |
| Aitor Ruibal | aitor-ruibal | 250163279 | A | N/D | 24 | 1 | 28 | 1 | 0 | 2 | 1 | 0 | 1 | 0 | 1 / 28 / 2 / 1 | 0 | Sì |
| José Antonio Morante | jose-antonio-morante | 250204240 | A | B | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rodrigo Marina | rodrigo-marina | 250191087 | A | B | 29 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kwame Sosu | kwame-sosu | 250202626 | A | B | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Cayetano Cordón | cayetano-cordon | 250202604 | A | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Antonio Gonzalez | antonio-gonzalez | 250202610 | A | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fran Batán | fran-batan | 250213940 | A | B | 64 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Juan Rodriguez | juan-rodriguez | 250213945 | A | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Real Madrid

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thibaut Courtois | thibaut-courtois | 250011668 | P | N/D | 1 | 9 | 810 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 / 360 / 0 / 0 | 11 | Sì |
| Andriy Lunin | andriy-lunin | 250089824 | P | N/D | 13 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Sergio Mestre | sergio-mestre | 250154301 | P | B | 26 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Javi Navarro | javi-navarro | 250201421 | P | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Raúl Asencio | raul-asencio | 250153617 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Éder Militão | eder-militao | 250121965 | D | N/D | 3 | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 2 / 1 | 1 | Sì |
| Dean Huijsen | dean-huijsen | 250194474 | D | N/D | 4 | 7 | 630 | 0 | 0 | 6 | 2 | 1 | 6 | 5 | 2 / 180 / 0 / 0 | 8 | Sì |
| Trent Alexander-Arnold | trent-alexander-arnold | 250076357 | D | N/D | 12 | 5 | 265 | 0 | 1 | 3 | 1 | 0 | 0 | 1 | 1 / 79 / 1 / 0 | 6 | Sì |
| Ibrahima Konaté | ibrahima-konate | 250091013 | D | N/D | 16 | 8 | 720 | 0 | 0 | 5 | 1 | 4 | 11 | 4 | 2 / 180 / 1 / 0 | 10 | Sì |
| Marc Cucurella | marc-cucurella | 250076168 | D | N/D | 17 | 9 | 565 | 0 | 0 | 0 | 0 | 1 | 4 | 2 | 4 / 269 / 3 / 1 | 11 | Sì |
| Álvaro Carreras | alvaro-carreras | 250153945 | D | N/D | 18 | 5 | 246 | 1 | 0 | 1 | 1 | 1 | 1 | 2 | 4 / 94 / 0 / 0 | 7 | Sì |
| Antonio Rüdiger | antonio-rudiger | 250028211 | D | N/D | 22 | 4 | 306 | 1 | 0 | 3 | 2 | 1 | 2 | 2 | 3 / 270 / 1 / 1 | 5 | Sì |
| Denzel Dumfries | denzel-dumfries | 250112690 | D | N/D | 24 | 7 | 418 | 0 | 0 | 6 | 2 | 1 | 2 | 2 | 3 / 239 / 2 / 1 | 9 | Sì |
| Jesús Fortea | jesus-fortea | 250179703 | D | B | 28 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Joan Martínez | joan-martinez | 250191276 | D | B | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mario Rivas | mario-rivas | 250193666 | D | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jude Bellingham | jude-bellingham | 250128377 | C | N/D | 5 | 9 | 689 | 3 | 3 | 18 | 7 | 2 | 7 | 24 | 4 / 354 / 10 / 3 | 11 | Sì |
| Eduardo Camavinga | eduardo-camavinga | 250128270 | C | N/D | 6 | 8 | 265 | 0 | 0 | 0 | 0 | 2 | 5 | 5 | 2 / 180 / 1 / 1 | 8 | Sì |
| Federico Valverde | federico-valverde | 250101284 | C | N/D | 8 | 9 | 739 | 0 | 2 | 7 | 2 | 0 | 5 | 4 | 4 / 293 / 6 / 3 | 11 | Sì |
| Aurélien Tchouaméni | aurelien-tchouameni | 250105244 | C | N/D | 14 | 5 | 358 | 0 | 1 | 5 | 1 | 1 | 1 | 2 | 2 / 81 / 0 / 0 | 0 | Sì |
| Arda Güler | arda-guler | 250161881 | C | N/D | 15 | 9 | 504 | 2 | 2 | 13 | 5 | 1 | 6 | 13 | 2 / 109 / 3 / 3 | 0 | Sì |
| Bernardo Silva | bernardo-silva | 250059115 | C | N/D | 20 | 7 | 302 | 0 | 1 | 1 | 0 | 0 | 5 | 5 | 3 / 177 / 2 / 1 | 8 | Sì |
| Yan Diomande | yan-diomande | 250220373 | C | N/D | 25 | 9 | 457 | 2 | 2 | 9 | 3 | 1 | 7 | 12 | 4 / 176 / 5 / 2 | 11 | Sì |
| Thiago Pitarch | thiago-pitarch | 250205688 | C | B | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Jorge Cestero | jorge-cestero | 250189623 | C | B | 29 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Diego Villalba | diego-villalba | 250206694 | C | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gabriel Valero | gabriel-valero | 250213264 | C | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Sergio Martínez | sergio-martinez | 250225046 | C | N/D | 38 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Vinícius Júnior | vinicius-junior | 250121533 | A | N/D | 7 | 8 | 603 | 1 | 3 | 23 | 7 | 2 | 7 | 23 | 4 / 297 / 8 / 2 | 10 | Sì |
| Endrick | endrick | 250194573 | A | N/D | 9 | 2 | 73 | 0 | 0 | 4 | 1 | 0 | 0 | 2 | 3 / 56 / 4 / 2 | 3 | Sì |
| Kylian Mbappé | kylian-mbappe | 250076574 | A | N/D | 10 | 9 | 805 | 9 | 2 | 49 | 27 | 1 | 8 | 11 | 4 / 358 / 19 / 13 | 11 | Sì |
| Rodrygo | rodrygo | 250132829 | A | N/D | 11 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Carlos Espí | carlos-espi | 250223168 | A | N/D | 19 | 5 | 30 | 2 | 0 | 4 | 3 | 0 | 0 | 1 | 4 / 18 / 3 / 1 | 7 | Sì |
| Brahim Díaz | brahim-diaz | 250088039 | A | N/D | 21 | 4 | 120 | 0 | 0 | 1 | 0 | 0 | 0 | 2 | 3 / 100 / 3 / 0 | 5 | Sì |
| Daniel Yáñez | daniel-yanez | 250189858 | A | B | 35 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Roma

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Devis Vasquez | devis-vasquez | 250182057 | P | N/D | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Giorgio De Marzi | giorgio-de-marzi | 250205559 | P | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Pierluigi Gollini | pierluigi-gollini | 250058930 | P | N/D | 95 | 2 | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 180 / 0 / 0 | 0 | Sì |
| Devyne Rensch | devyne-rensch | 250123555 | D | N/D | 2 | 4 | 128 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 / 105 / 1 / 0 | 5 | Sì |
| Konstantinos Koulierakis | konstantinos-koulierakis | 250129645 | D | N/D | 3 | 3 | 94 | 0 | 0 | 1 | 0 | 1 | 5 | 1 | 2 / 22 / 0 / 0 | 4 | Sì |
| Evan N'Dicka | evan-n-dicka | 250122785 | D | N/D | 5 | 5 | 367 | 0 | 0 | 3 | 0 | 1 | 9 | 1 | 2 / 180 / 0 / 0 | 0 | Sì |
| Nahuel Molina | nahuel-molina | 250172673 | D | N/D | 20 | 5 | 298 | 0 | 1 | 3 | 1 | 0 | 4 | 0 | 3 / 196 / 3 / 1 | 7 | Sì |
| Mario Hermoso | mario-hermoso | 250063940 | D | N/D | 22 | 7 | 506 | 1 | 0 | 4 | 1 | 2 | 3 | 6 | 3 / 248 / 2 / 2 | 9 | Sì |
| Gianluca Mancini | gianluca-mancini | 250075982 | D | N/D | 23 | 6 | 482 | 0 | 2 | 4 | 2 | 0 | 7 | 3 | 3 / 150 / 0 / 0 | 8 | Sì |
| Leonardo Balerdi | leonardo-balerdi | 250128118 | D | N/D | 26 | 5 | 299 | 0 | 0 | 2 | 0 | 0 | 3 | 2 | 3 / 133 / 1 / 1 | 7 | Sì |
| Wesley França | wesley-franca | 250212323 | D | N/D | 43 | 6 | 432 | 0 | 1 | 3 | 0 | 0 | 5 | 6 | 3 / 239 / 1 / 0 | 0 | Sì |
| Emanuele Lulli | emanuele-lulli | 250216846 | D | N/D | 77 | 6 | 401 | 1 | 0 | 2 | 1 | 0 | 3 | 4 | N/D | 6 | Sì |
| Daniele Ghilardi | daniele-ghilardi | 250166174 | D | N/D | 87 | 4 | 144 | 0 | 0 | 0 | 0 | 1 | 2 | 2 | 1 / 90 / 3 / 1 | 4 | Sì |
| Bryan Cristante | bryan-cristante | 250041741 | C | N/D | 4 | 5 | 424 | 0 | 0 | 8 | 1 | 0 | 9 | 2 | 1 / 90 / 1 / 1 | 6 | Sì |
| Lorenzo Pellegrini | lorenzo-pellegrini | 250070130 | C | N/D | 7 | 2 | 72 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 2 / 78 / 4 / 1 | 0 | Sì |
| Marten De Roon | marten-de-roon | 250014709 | C | N/D | 15 | 4 | 212 | 0 | 0 | 0 | 0 | 1 | 3 | 0 | 3 / 170 / 1 / 1 | 6 | Sì |
| Manu Koné | manu-kone | 250132062 | C | N/D | 17 | 6 | 411 | 2 | 0 | 7 | 3 | 2 | 9 | 6 | 2 / 70 / 0 / 0 | 0 | Sì |
| Niccolò Pisilli | niccolo-pisilli | 250183335 | C | N/D | 61 | 6 | 243 | 2 | 0 | 4 | 3 | 2 | 5 | 0 | 3 / 200 / 4 / 1 | 8 | Sì |
| Alessandro Di Nunzio | alessandro-di-nunzio | 250184843 | C | B | 63 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Santiago Castro | santiago-castro | 250196543 | A | N/D | 9 | 5 | 195 | 1 | 0 | 11 | 1 | 0 | 9 | 3 | 1 / 31 / 3 / 0 | 5 | Sì |
| Donyell Malen | donyell-malen | 250081555 | A | N/D | 14 | 6 | 435 | 6 | 0 | 22 | 10 | 1 | 4 | 6 | 3 / 236 / 13 / 6 | 8 | Sì |
| Matías Soulé | matias-soule | 250140929 | A | N/D | 18 | 7 | 414 | 2 | 1 | 18 | 9 | 2 | 1 | 4 | 3 / 176 / 5 / 1 | 9 | Sì |
| Paulo Dybala | paulo-dybala | 250086333 | A | N/D | 21 | 6 | 496 | 0 | 4 | 21 | 6 | 0 | 3 | 7 | 2 / 135 / 3 / 2 | 0 | Sì |
| Antonio Arena | antonio-arena | 250206586 | A | N/D | 68 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Rodrigo Mora | rodrigo-mora | 250177837 | A | N/D | 86 | 5 | 234 | 1 | 0 | 12 | 4 | 0 | 0 | 2 | 3 / 151 / 3 / 2 | 7 | Sì |

### Sabah

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amin Ramazanov | amin-ramazanov | 250138479 | P | N/D | 1 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rauf Ayyubov | rauf-ayyubov | 250202766 | P | B | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Stas Pokatilov | stas-pokatilov | 250059361 | P | N/D | 92 | 4 | 360 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 / 360 / 0 / 0 | 2 | Sì |
| Ravan Mirzammadov | ravan-mirzammadov | 250193107 | P | B | 94 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Steve Solvet | steve-solvet | 250209341 | D | N/D | 3 | 3 | 252 | 0 | 0 | 2 | 0 | 2 | 3 | 2 | 3 / 252 / 2 / 0 | 1 | Sì |
| Aden McCarthy | aden-mccarthy | 250221230 | D | N/D | 4 | 4 | 347 | 1 | 0 | 2 | 1 | 1 | 3 | 2 | 4 / 347 / 2 / 1 | 0 | N/D |
| Rahman Dashdamirov | rahman-dashdamirov | 250186986 | D | N/D | 5 | 3 | 119 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 119 / 0 / 0 | 0 | Sì |
| Tellur Mutallimov | tellur-mutallimov | 250087979 | D | N/D | 17 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Tymoteusz Puchacz | tymoteusz-puchacz | 250090285 | D | N/D | 27 | 4 | 360 | 0 | 1 | 5 | 1 | 0 | 2 | 3 | 4 / 360 / 5 / 1 | 0 | N/D |
| Erivaldo Almeida | erivaldo-almeida | 250221486 | D | N/D | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Akim Zedadka | akim-zedadka | 250188243 | D | N/D | 80 | 4 | 346 | 0 | 0 | 3 | 0 | 2 | 5 | 12 | 4 / 346 / 3 / 0 | 2 | Sì |
| Abdulakh Khaibulaev | abdulakh-khaibulaev | 250171312 | C | N/D | 6 | 4 | 103 | 0 | 0 | 5 | 0 | 0 | 7 | 0 | 4 / 103 / 5 / 0 | 0 | Sì |
| Umarali Rakhmonaliev | umarali-rakhmonaliev | 250209340 | C | N/D | 7 | 4 | 321 | 0 | 1 | 6 | 3 | 1 | 5 | 5 | 4 / 321 / 6 / 3 | 2 | Sì |
| Khayal Aliyev | khayal-aliyev | 250169206 | C | N/D | 9 | 1 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 20 / 0 / 0 | 0 | Sì |
| Aleksey Isaev | aleksey-isaev | 250129032 | C | N/D | 10 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kaheem Parris | kaheem-parris | 250174049 | C | N/D | 11 | 3 | 201 | 1 | 0 | 4 | 3 | 0 | 5 | 1 | 3 / 201 / 4 / 3 | 2 | Sì |
| Ivan Lepinjica | ivan-lepinjica | 250110583 | C | N/D | 13 | 4 | 360 | 0 | 1 | 3 | 0 | 2 | 6 | 2 | 4 / 360 / 3 / 0 | 2 | Sì |
| Rauf Rustamli | rauf-rustamli | 250130045 | C | N/D | 16 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Du Queiroz | du-queiroz | 250225045 | C | N/D | 37 | 4 | 172 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 4 / 172 / 2 / 0 | 0 | N/D |
| Rodrigo Fernandes | rodrigo-fernandes | 250106774 | C | N/D | 88 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jafar Mukhtarov | jafar-mukhtarov | 250221231 | C | N/D | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Shahin Ibrahimov | shahin-ibrahimov | 250202772 | C | B | 95 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Christian Nwachukwu | christian-nwachukwu | 250196599 | A | N/D | 8 | 4 | 142 | 0 | 0 | 2 | 1 | 0 | 0 | 2 | 4 / 142 / 2 / 1 | 0 | N/D |
| Joy-Lance Mickels | joy-lance-mickels | 250081185 | A | N/D | 20 | 4 | 318 | 1 | 0 | 7 | 3 | 1 | 3 | 5 | 4 / 318 / 7 / 3 | 2 | Sì |
| Veljko Simić | veljko-simic | 250042209 | A | N/D | 21 | 4 | 284 | 0 | 0 | 5 | 1 | 1 | 4 | 1 | 4 / 284 / 5 / 1 | 0 | N/D |
| Xander Severina | xander-severina | 250221487 | A | N/D | 34 | 1 | 19 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 19 / 0 / 0 | 0 | Sì |
| Orphé Mbina | orphe-mbina | 250198298 | A | N/D | 99 | 4 | 157 | 1 | 1 | 7 | 1 | 0 | 0 | 4 | 4 / 157 / 7 / 1 | 2 | Sì |

### Shakhtar Donetsk

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kiril Fesiun | kiril-fesiun | 250160835 | P | N/D | 23 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Dmytro Riznyk | dmytro-riznyk | 250121017 | P | N/D | 31 | 3 | 270 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 270 / 0 / 0 | 2 | Sì |
| Rostyslav Bahlai | rostyslav-bahlai | 250188875 | P | B | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Marlon Santos | marlon-santos | 250101096 | D | N/D | 4 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Valeriy Bondar | valeriy-bondar | 250087118 | D | N/D | 5 | 3 | 270 | 0 | 0 | 1 | 1 | 1 | 3 | 2 | 3 / 270 / 1 / 1 | 2 | Sì |
| Pedro Henrique | pedro-henrique | 250187672 | D | N/D | 13 | 3 | 270 | 0 | 0 | 3 | 0 | 1 | 3 | 6 | 3 / 270 / 3 / 0 | 2 | Sì |
| Irakli Azarov | irakli-azarov | 250108031 | D | N/D | 16 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Vinícius Tobías | vinicius-tobias | 250176491 | D | N/D | 17 | 3 | 270 | 1 | 0 | 2 | 1 | 1 | 4 | 3 | 3 / 270 / 2 / 1 | 2 | Sì |
| Alaa Ghram | alaa-ghram | 250194557 | D | N/D | 18 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Oleksandr Karavaiev | oleksandr-karavaiev | 250004740 | D | N/D | 20 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Mykola Matviyenko | mykola-matviyenko | 250064444 | D | N/D | 22 | 3 | 270 | 0 | 0 | 2 | 1 | 0 | 0 | 1 | 3 / 270 / 2 / 1 | 2 | Sì |
| Marlon Gomes | marlon-gomes | 250193518 | C | N/D | 6 | 3 | 261 | 0 | 0 | 0 | 0 | 3 | 8 | 5 | 3 / 261 / 0 / 0 | 2 | Sì |
| Dmytro Kryskiv | dmytro-kryskiv | 250112978 | C | N/D | 8 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 1 / 1 / 0 / 0 | 1 | Sì |
| Pedrinho | pedrinho | 250144964 | C | N/D | 10 | 2 | 95 | 1 | 0 | 2 | 2 | 0 | 1 | 0 | 2 / 95 / 2 / 2 | 0 | Sì |
| Newertton | newertton | 250187671 | C | B | 11 | 3 | 105 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 3 / 105 / 3 / 1 | 0 | Sì |
| Isaque | isaque | 250212206 | C | N/D | 14 | 3 | 134 | 0 | 2 | 1 | 1 | 0 | 1 | 1 | 3 / 134 / 1 / 1 | 2 | Sì |
| Viktor Tsukanov | viktor-tsukanov | 250176838 | C | B | 24 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gabriel Carvalho | gabriel-carvalho | 250224147 | C | N/D | 25 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Oleh Ocheretko | oleh-ocheretko | 250134776 | C | N/D | 27 | 3 | 252 | 0 | 0 | 3 | 0 | 1 | 6 | 2 | 3 / 252 / 3 / 0 | 0 | Sì |
| Yehor Nazaryna | yehor-nazaryna | 250123440 | C | N/D | 29 | 2 | 67 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 / 67 / 1 / 0 | 0 | Sì |
| Alisson Santana | alisson-santana | 250209228 | C | N/D | 30 | 3 | 259 | 0 | 1 | 5 | 1 | 0 | 4 | 7 | 3 / 259 / 5 / 1 | 2 | Sì |
| Lucas Ferreira | lucas-ferreira | 250211402 | C | N/D | 37 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 4 / 0 / 0 | 2 | Sì |
| Denys Smetana | denys-smetana | 250176861 | C | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ryan Roberto | ryan-roberto | 250211683 | C | N/D | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gleiker Mendoza | gleiker-mendoza | 250220576 | C | N/D | 77 | 3 | 165 | 2 | 0 | 5 | 2 | 1 | 4 | 2 | 3 / 165 / 5 / 2 | 0 | N/D |
| Bruninho | bruninho | 250224146 | C | N/D | 99 | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 7 / 0 / 0 | 0 | N/D |
| Lassina Traoré | lassina-traore | 250128222 | A | N/D | 2 | 2 | 42 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 2 / 42 / 1 / 0 | 1 | Sì |
| Kauã Elias | kaua-elias | 250209227 | A | N/D | 9 | 3 | 225 | 0 | 0 | 3 | 0 | 0 | 5 | 6 | 3 / 225 / 3 / 0 | 2 | Sì |
| Luca Meirelles | luca-meirelles | 250212190 | A | N/D | 49 | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 3 / 0 / 0 | 1 | Sì |

### Slavia Praha

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nazar Domchak | nazar-domchak | 250215254 | P | N/D | 29 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 0 / 0 | 0 | N/D |
| Jakub Markovič | jakub-markovic | 250115748 | P | N/D | 35 | 3 | 270 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 3 / 270 / 0 / 0 | 13 | Sì |
| Adam Rezek | adam-rezek | 250176510 | P | B | 40 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Adam Paar | adam-paar | 250203273 | P | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ondřej Suchý | ondrej-suchy | 250211976 | P | B | 63 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Štěpán Chaloupek | stepan-chaloupek | 250190353 | D | N/D | 2 | 2 | 99 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 2 / 99 / 3 / 0 | 10 | Sì |
| Tomáš Holeš | tomas-holes | 250054481 | D | N/D | 3 | 2 | 152 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 2 / 152 / 1 / 0 | 9 | Sì |
| David Zima | david-zima | 250124916 | D | N/D | 4 | 4 | 315 | 0 | 0 | 3 | 1 | 0 | 1 | 4 | 4 / 315 / 3 / 1 | 10 | Sì |
| Ange N'Guessan | ange-n-guessan | 250223131 | D | N/D | 6 | 3 | 210 | 0 | 0 | 3 | 1 | 0 | 9 | 2 | 3 / 210 / 3 / 1 | 7 | N/D |
| Tomáš Vlček | tomas-vlcek | 250115749 | D | N/D | 27 | 4 | 286 | 0 | 0 | 1 | 0 | 0 | 2 | 1 | 4 / 286 / 1 / 0 | 8 | Sì |
| Mikuláš Konečný | mikulas-konecny | 250170001 | D | N/D | 42 | 2 | 74 | 0 | 0 | 3 | 1 | 0 | 1 | 0 | 2 / 74 / 3 / 1 | 8 | N/D |
| Jakub Kolísek | jakub-kolisek | 250182655 | D | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| David Barčot | david-barcot | 250208021 | D | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Štěpán Chaluš | stepan-chalus | 250211981 | D | B | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Filip Kočvara | filip-kocvara | 250211984 | D | B | 52 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Martin Kovář | martin-kovar | 250195744 | D | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jáchym Palivec | jachym-palivec | 250182663 | D | B | 59 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Vít Skokan | vit-skokan | 250203274 | D | B | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Oskar Kubiak | oskar-kubiak | 250223130 | C | N/D | 8 | 4 | 256 | 0 | 0 | 6 | 3 | 1 | 6 | 4 | 4 / 256 / 6 / 3 | 5 | N/D |
| Danijel Šturm | danijel-sturm | 250158167 | C | N/D | 10 | 4 | 287 | 2 | 0 | 8 | 2 | 0 | 5 | 1 | 4 / 287 / 8 / 2 | 12 | Sì |
| Samuel Isife | samuel-isife | 250221826 | C | N/D | 14 | 3 | 129 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 3 / 129 / 2 / 0 | 0 | N/D |
| Mubarak Suleiman | mubarak-suleiman | 250211977 | C | N/D | 15 | 3 | 158 | 0 | 0 | 4 | 1 | 0 | 1 | 0 | 3 / 158 / 4 / 1 | 7 | N/D |
| David Moses | david-moses | 250210225 | C | N/D | 16 | 3 | 261 | 0 | 0 | 0 | 0 | 1 | 6 | 4 | 3 / 261 / 0 / 0 | 7 | Sì |
| Lukáš Provod | lukas-provod | 250064811 | C | N/D | 17 | 2 | 175 | 1 | 0 | 11 | 5 | 0 | 2 | 5 | 2 / 175 / 11 / 5 | 11 | Sì |
| Emmanuel Ayaosi | emmanuel-ayaosi | 250223128 | C | N/D | 20 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Toumani Diakité | toumani-diakite | 250209358 | C | N/D | 22 | 2 | 23 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 23 / 0 / 0 | 4 | Sì |
| Michal Sadílek | michal-sadilek | 250077931 | C | N/D | 23 | 4 | 247 | 0 | 0 | 3 | 1 | 0 | 3 | 4 | 4 / 247 / 3 / 1 | 12 | Sì |
| Ivan Schranz | ivan-schranz | 250012660 | C | N/D | 26 | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 6 / 0 / 0 | 0 | Sì |
| Wiktor Nowak | wiktor-nowak | 250212505 | C | N/D | 30 | 4 | 290 | 1 | 0 | 5 | 2 | 1 | 3 | 1 | 4 / 290 / 5 / 2 | 13 | N/D |
| Pavel Kačor | pavel-kacor | 250218489 | C | N/D | 32 | 1 | 5 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 1 / 5 / 1 / 1 | 6 | N/D |
| David Jurásek | david-jurasek | 250166772 | C | N/D | 39 | 2 | 33 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 2 / 33 / 1 / 0 | 4 | Sì |
| Eliáš Piták | elias-pitak | 250170005 | C | N/D | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Karel Belžík | karel-belzik | 250182651 | C | B | 48 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ondřej Frolík | ondrej-frolik | 250195737 | C | B | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Aleksa Ilinčič | aleksa-ilincic | 250208032 | C | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Jakub Kratochvíl | jakub-kratochvil | 250211987 | C | B | 55 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ondřej Mašek | ondrej-masek | 250224492 | C | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Martin Palaščák | martin-palascak | 250206515 | C | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mojmír Chytil | mojmir-chytil | 250092161 | A | N/D | 13 | 4 | 166 | 0 | 0 | 1 | 1 | 0 | 3 | 2 | 4 / 166 / 1 / 1 | 2 | Sì |
| Adonija Ouanda | adonija-ouanda | 250223132 | A | N/D | 18 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Tomáš Chorý | tomas-chory | 250042406 | A | N/D | 25 | 2 | 87 | 0 | 0 | 3 | 2 | 0 | 0 | 2 | 2 / 87 / 3 / 2 | 0 | Sì |
| Dan Kohout | dan-kohout | 250224491 | A | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Matěj Kotrba | matej-kotrba | 250211986 | A | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Petr Potměšil | petr-potmesil | 250195749 | A | B | 60 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Adam Procházka | adam-prochazka | 250215863 | A | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Slovan Bratislava

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aleksandar Popović | aleksandar-popovic | 250089413 | P | N/D | 1 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Daniel Gramblička | daniel-gramblicka | 250201960 | P | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dávid Balog | david-balog | 250198497 | P | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Matúš Macík | matus-macik | 250110137 | P | N/D | 44 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dominik Takáč | dominik-takac | 250157134 | P | N/D | 71 | 3 | 270 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 270 / 0 / 0 | 8 | Sì |
| Samuel Kozlovský | samuel-kozlovsky | 250089337 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Kevin Wimmer | kevin-wimmer | 250043066 | D | N/D | 6 | 2 | 23 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 / 23 / 0 / 0 | 9 | Sì |
| Kenan Bajrić | kenan-bajric | 250061721 | D | N/D | 12 | 3 | 202 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 3 / 202 / 0 / 0 | 8 | Sì |
| Svetozar Marković | svetozar-markovic | 250105502 | D | N/D | 15 | 3 | 270 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 270 / 0 / 0 | 9 | Sì |
| Matúš Tomáško | matus-tomasko | 250204451 | D | B | 24 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Robert Tománek | robert-tomanek | 250222608 | D | B | 26 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| César Blackman | cesar-blackman | 250131541 | D | N/D | 28 | 3 | 270 | 0 | 0 | 2 | 0 | 1 | 4 | 2 | 3 / 270 / 2 / 0 | 9 | Sì |
| Sahmkou Camara | sahmkou-camara | 250223129 | D | N/D | 49 | 1 | 68 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 / 68 / 0 / 0 | 0 | N/D |
| Sandro Cruz | sandro-cruz | 250116653 | D | N/D | 57 | 3 | 247 | 0 | 0 | 1 | 0 | 0 | 4 | 4 | 3 / 247 / 1 / 0 | 5 | Sì |
| Peter Pokorný | peter-pokorny | 250114171 | C | N/D | 3 | 3 | 270 | 0 | 0 | 1 | 0 | 1 | 5 | 1 | 3 / 270 / 1 / 0 | 8 | Sì |
| Rahim Ibrahim | rahim-ibrahim | 250210294 | C | N/D | 5 | 2 | 129 | 0 | 0 | 0 | 0 | 0 | 4 | 3 | 2 / 129 / 0 / 0 | 7 | Sì |
| Leo Hofstädter | leo-hofstadter | 250208297 | C | B | 7 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Artur Gajdoš | artur-gajdos | 250139101 | C | N/D | 8 | 3 | 94 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 / 94 / 0 / 0 | 7 | Sì |
| Tigran Barseghyan | tigran-barseghyan | 250013022 | C | N/D | 11 | 3 | 196 | 0 | 1 | 5 | 2 | 1 | 2 | 5 | 3 / 196 / 5 / 2 | 10 | Sì |
| Alen Mustafić | alen-mustafic | 250116759 | C | N/D | 20 | 3 | 141 | 0 | 0 | 2 | 1 | 0 | 0 | 1 | 3 / 141 / 2 / 1 | 11 | Sì |
| Cristian Martínez | cristian-martinez | 250221031 | C | N/D | 70 | 3 | 176 | 0 | 0 | 4 | 0 | 1 | 2 | 3 | 3 / 176 / 4 / 0 | 0 | N/D |
| Danylo Ihnatenko | danylo-ihnatenko | 250121132 | C | N/D | 77 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Daiki Matsuoka | daiki-matsuoka | 250222222 | C | N/D | 88 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 9 | Sì |
| Nino Marcelli | nino-marcelli | 250183092 | A | B | 10 | 3 | 129 | 0 | 0 | 3 | 0 | 0 | 0 | 1 | 3 / 129 / 3 / 0 | 10 | Sì |
| Roman Čerepkai | roman-cerepkai | 250117638 | A | N/D | 13 | 1 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 9 / 0 / 0 | 0 | Sì |
| Alasana Yirajang | alasana-yirajang | 250210296 | A | N/D | 14 | 2 | 44 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 / 44 / 0 / 0 | 0 | Sì |
| Suleiman Camara | suleiman-camara | 250223119 | A | N/D | 21 | 3 | 240 | 1 | 0 | 5 | 2 | 1 | 2 | 7 | 3 / 240 / 5 / 2 | 0 | N/D |
| Alexej Maroš | alexej-maros | 250193070 | A | B | 29 | 2 | 31 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 31 / 0 / 0 | 8 | N/D |
| Andraž Šporar | andraz-sporar | 250050391 | A | N/D | 99 | 2 | 161 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 2 / 161 / 2 / 0 | 7 | Sì |

### Sporting CP

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rui Silva | rui-silva | 250062141 | P | N/D | 1 | 8 | 720 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 0 / 0 | 9 | Sì |
| Kaique Pereira | kaique-pereira | 250224837 | P | N/D | 30 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 2 / 180 / 0 / 0 | 1 | Sì |
| Diego Callai | diego-callai | 250160990 | P | N/D | 41 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| William Lodmell | william-lodmell | 250214689 | P | B | 46 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Gouveia | miguel-gouveia | 250185410 | P | B | 51 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Guilherme Pires | guilherme-pires | 250184572 | P | B | 74 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Francisco Silva | francisco-silva | 250169894 | P | B | 99 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Sergi Altimira | sergi-altimira | 250130006 | D | N/D | 5 | 8 | 717 | 1 | 0 | 4 | 1 | 2 | 12 | 8 | 3 / 270 / 1 / 1 | 10 | Sì |
| Zeno Debast | zeno-debast | 250137390 | D | N/D | 6 | 5 | 435 | 0 | 0 | 1 | 1 | 0 | 5 | 2 | 1 / 6 / 0 / 0 | 0 | Sì |
| Giorgos Vagiannidis | giorgos-vagiannidis | 250187284 | D | N/D | 13 | 4 | 231 | 0 | 0 | 1 | 1 | 0 | 5 | 6 | 1 / 84 / 0 / 0 | 0 | Sì |
| Moncef Zekri | moncef-zekri | 250224838 | D | N/D | 18 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Iván Fresneda | ivan-fresneda | 250179137 | D | N/D | 22 | 8 | 559 | 0 | 1 | 2 | 2 | 1 | 12 | 4 | 3 / 186 / 0 / 0 | 10 | Sì |
| Gonçalo Inácio | goncalo-inacio | 250136464 | D | N/D | 25 | 7 | 630 | 1 | 0 | 3 | 1 | 2 | 6 | 3 | 3 / 270 / 1 / 0 | 9 | Sì |
| Francisco Cabeçana | francisco-cabecana | 250218320 | D | B | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| João Muniz | joao-muniz | 250164922 | D | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Diego Coxi | diego-coxi | 250202027 | D | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| João Rijo | joao-rijo | 250208760 | D | B | 48 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rodrigo Dias | rodrigo-dias | 250182835 | D | B | 50 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Bruno Ramos | bruno-ramos | 250205713 | D | B | 54 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ibrahima Ba | ibrahima-ba | 250223275 | D | N/D | 55 | 1 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | N/D | 1 | Sì |
| Andre Machado | andre-machado | 250204888 | D | B | 64 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Alves | miguel-alves | 250177771 | D | B | 66 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Daniel Costa | daniel-costa | 250202185 | D | B | 68 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Salvador Blopa | salvador-blopa | 250202032 | D | B | 70 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Denilson Santos | denilson-santos | 250182431 | D | B | 71 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Eduardo Quaresma | eduardo-quaresma | 250117415 | D | N/D | 72 | 5 | 318 | 0 | 0 | 0 | 0 | 2 | 5 | 3 | 3 / 264 / 0 / 0 | 7 | Sì |
| Daniel Ciesielski | daniel-ciesielski | 250202182 | D | B | 79 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Atanásio | atanasio | 250185408 | D | B | 84 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rafael Mota | rafael-mota | 250182444 | D | B | 85 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Afonso Lee | afonso-lee | 250202026 | D | B | 86 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Duarte Tomás | duarte-tomas | 250213599 | D | B | 92 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lucas Dominguez | lucas-dominguez | 250179734 | D | B | 95 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Silas Andersen | silas-andersen | 250139182 | C | N/D | 4 | 6 | 154 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 / 33 / 1 / 0 | 8 | Sì |
| João Simões | joao-simoes | 250180059 | C | B | 8 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Rodrigo Zalazar | rodrigo-zalazar | 250187727 | C | N/D | 17 | 8 | 540 | 2 | 1 | 11 | 4 | 0 | 0 | 6 | 1 / 66 / 1 / 1 | 0 | Sì |
| Maximiliano Araújo | maximiliano-araujo | 250200231 | C | N/D | 20 | 7 | 560 | 1 | 2 | 6 | 3 | 2 | 7 | 14 | 3 / 270 / 2 / 1 | 0 | Sì |
| Pedro Lima | pedro-lima | 250197406 | C | N/D | 21 | 2 | 6 | 0 | 0 | 2 | 1 | 0 | 1 | 1 | 1 / 5 / 0 / 0 | 3 | Sì |
| Micael Sanhá | micael-sanha | 250182836 | C | B | 47 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Diego Farinha | diego-farinha | 250216499 | C | B | 53 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rayhan Momade | rayhan-momade | 250180060 | C | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Flávio Gonçalves | flavio-goncalves | 250202036 | C | B | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Sandro Gambôa | sandro-gamboa | 250198317 | C | B | 61 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ivanildo | ivanildo | 250177498 | C | B | 62 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rafael Camacho | rafael-camacho | 250182445 | C | B | 63 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Martim Almeida | martim-almeida | 250225370 | C | B | 65 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Eduardo Felicíssimo | eduardo-felicissimo | 250182436 | C | B | 73 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Victor Bastianele | victor-bastianele | 250225371 | C | B | 75 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Issa Doumbia | issa-doumbia | 250208842 | C | N/D | 77 | 8 | 668 | 0 | 1 | 8 | 0 | 0 | 8 | 2 | 3 / 239 / 3 / 1 | 10 | Sì |
| Leonardo Varela | leonardo-varela | 250215867 | C | B | 89 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Samuel Justo | samuel-justo | 250164927 | C | N/D | 96 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Fotis Ioannidis | fotis-ioannidis | 250127400 | A | N/D | 7 | 7 | 273 | 2 | 2 | 15 | 5 | 0 | 6 | 5 | 3 / 31 / 0 / 0 | 9 | Sì |
| Rafael Nel | rafael-nel | 250177501 | A | B | 9 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Geny Catamo | geny-catamo | 250145845 | A | N/D | 10 | 8 | 599 | 1 | 4 | 14 | 5 | 3 | 7 | 16 | 3 / 235 / 6 / 1 | 10 | Sì |
| Nuno Santos | nuno-santos | 250064482 | A | N/D | 11 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Nestory Irankunda | nestory-irankunda | 250198116 | A | N/D | 19 | 6 | 205 | 0 | 1 | 4 | 0 | 1 | 2 | 5 | 2 / 152 / 3 / 0 | 7 | Sì |
| Jesse Derry | jesse-derry | 250192702 | A | N/D | 28 | 3 | 27 | 0 | 0 | 1 | 1 | 1 | 0 | 3 | 2 / 28 / 3 / 1 | 4 | Sì |
| Luis Guilherme | luis-guilherme | 250216956 | A | N/D | 31 | 6 | 170 | 0 | 0 | 5 | 3 | 0 | 0 | 3 | 3 / 125 / 1 / 0 | 8 | Sì |
| Chris Grombahi | chris-grombahi | 250202043 | A | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Rodrigo Rodrigues | rodrigo-rodrigues | 250218236 | A | N/D | 76 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Mauro Couto | mauro-couto | 250192699 | A | B | 78 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Sandro Ferreira | sandro-ferreira | 250215329 | A | B | 81 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gabriel Silva | gabriel-silva | 250177516 | A | B | 82 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Miguel Almeida | miguel-almeida | 250202028 | A | B | 91 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Luis Suárez | luis-suarez | 250147458 | A | N/D | 97 | 8 | 488 | 7 | 1 | 15 | 9 | 4 | 7 | 7 | 3 / 249 / 11 / 7 | 10 | Sì |
| Martim Ribeiro | martim-ribeiro | 250216119 | A | B | 98 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |

### Stuttgart

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fabian Bredlow | fabian-bredlow | 250070418 | P | N/D | 1 | 4 | 360 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2 / 180 / 0 / 0 | 7 | Sì |
| Marius Funk | marius-funk | 250058261 | P | N/D | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Dennis Seimen | dennis-seimen | 250170952 | P | B | 41 | 2 | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 0 / 0 | 2 | Sì |
| Tom Walz | tom-walz | 250218212 | P | B | 56 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Lucas Nagel | lucas-nagel | 250224503 | P | B | 57 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ameen Al-Dakhil | ameen-al-dakhil | 250127149 | D | N/D | 2 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 1 / 4 / 0 / 0 | 2 | Sì |
| Ramon Hendriks | ramon-hendriks | 250106750 | D | N/D | 3 | 5 | 362 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 3 / 199 / 2 / 0 | 7 | Sì |
| Josha Vagnoman | josha-vagnoman | 250127538 | D | N/D | 4 | 6 | 531 | 2 | 1 | 9 | 4 | 0 | 4 | 5 | 3 / 166 / 4 / 2 | 0 | Sì |
| Maximilian Mittelstädt | maximilian-mittelstadt | 250090766 | D | N/D | 7 | 5 | 438 | 1 | 1 | 5 | 1 | 1 | 4 | 6 | 2 / 176 / 0 / 0 | 7 | Sì |
| Luca Jaquez | luca-jaquez | 250186841 | D | N/D | 14 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Lorenz Assignon | lorenz-assignon | 250136347 | D | N/D | 22 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 42 / 0 / 0 | 2 | Sì |
| Jeff Chabot | jeff-chabot | 250107477 | D | N/D | 24 | 6 | 506 | 1 | 0 | 7 | 3 | 1 | 9 | 5 | 3 / 270 / 3 / 0 | 3 | Sì |
| Maximilian Herwerth | maximilian-herwerth | 250199540 | D | B | 37 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Yanik Spalt | yanik-spalt | 250184508 | D | B | 47 | 2 | 55 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | N/D | 2 | Sì |
| Alexander Groiß | alexander-groi | 250212172 | D | N/D | 58 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Dominik Nothnagel | dominik-nothnagel | 250212173 | D | N/D | 59 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Angelo Stiller | angelo-stiller | 250112217 | C | N/D | 6 | 6 | 483 | 0 | 2 | 3 | 0 | 1 | 6 | 5 | 3 / 260 / 3 / 1 | 0 | Sì |
| Ermedin Demirović | ermedin-demirovic | 250079383 | C | N/D | 9 | 6 | 356 | 1 | 0 | 17 | 8 | 1 | 5 | 5 | 3 / 89 / 5 / 4 | 9 | Sì |
| Chris Führich | chris-fuhrich | 250192048 | C | N/D | 10 | 5 | 307 | 1 | 0 | 4 | 3 | 0 | 0 | 5 | 3 / 248 / 6 / 1 | 8 | Sì |
| Bilal El Khannouss | bilal-el-khannouss | 250154129 | C | N/D | 11 | 6 | 283 | 1 | 0 | 7 | 2 | 0 | 0 | 3 | 3 / 242 / 6 / 2 | 9 | Sì |
| Atakan Karazor | atakan-karazor | 250196709 | C | N/D | 16 | 2 | 157 | 0 | 0 | 1 | 0 | 0 | 3 | 0 | 1 / 10 / 0 / 0 | 3 | Sì |
| Grischa Prömel | grischa-promel | 250101240 | C | N/D | 21 | 6 | 382 | 1 | 0 | 9 | 3 | 1 | 5 | 4 | 3 / 270 / 6 / 1 | 9 | Sì |
| Nikolas Nartey | nikolas-nartey | 250101564 | C | N/D | 28 | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 2 | Sì |
| Finn Jeltsch | finn-jeltsch | 250170132 | C | N/D | 29 | 6 | 468 | 0 | 1 | 9 | 2 | 1 | 5 | 6 | 2 / 161 / 0 / 0 | 9 | Sì |
| Ertugrul Yigit | ertugrul-yigit | 250201762 | C | B | 39 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Leo Sauer | leo-sauer | 250164450 | C | N/D | 44 | 5 | 45 | 0 | 0 | 3 | 1 | 0 | 1 | 1 | 3 / 41 / 2 / 0 | 0 | Sì |
| Lauri Penna | lauri-penna | 250201752 | C | B | 49 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Tiago Tomás | tiago-tomas | 250126369 | A | N/D | 8 | 1 | 62 | 0 | 0 | 2 | 1 | 0 | 1 | 2 | N/D | 2 | Sì |
| Dženan Pejčinović | dzenan-pejcinovic | 250168144 | A | N/D | 17 | 6 | 295 | 0 | 0 | 13 | 2 | 0 | 2 | 0 | 3 / 102 / 1 / 0 | 9 | Sì |
| Jamie Leweling | jamie-leweling | 250138382 | A | N/D | 18 | 6 | 237 | 0 | 0 | 2 | 1 | 0 | 2 | 4 | 3 / 153 / 5 / 2 | 8 | Sì |
| Deniz Undav | deniz-undav | 250194673 | A | N/D | 26 | 6 | 408 | 0 | 0 | 12 | 4 | 0 | 9 | 1 | 3 / 267 / 8 / 3 | 9 | Sì |
| Jarzinho Malanga | jarzinho-malanga | 250180810 | A | B | 43 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |

### Viking

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arild Østbø | arild-stb | 1905505 | P | N/D | 1 | 12 | 1080 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 4 / 360 / 0 / 0 | 0 | Sì |
| Erlend Jacobsen | erlend-jacobsen | 250223246 | P | N/D | 12 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Ľubomír Belko | lubomir-belko | 250124826 | P | N/D | 30 | 11 | 990 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | N/D | 11 | Sì |
| Herman Haugen | herman-haugen | 250210010 | D | N/D | 2 | 18 | 523 | 0 | 0 | 5 | 2 | 1 | 7 | 13 | 4 / 144 / 1 / 1 | 4 | Sì |
| Viljar Vevatne | viljar-vevatne | 250055970 | D | N/D | 3 | 5 | 104 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 / 5 / 0 / 0 | 7 | Sì |
| Martin Roseth | martin-roseth | 250086599 | D | N/D | 4 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | Sì |
| Henrik Heggheim | henrik-heggheim | 250144866 | D | N/D | 5 | 22 | 1679 | 6 | 3 | 17 | 10 | 4 | 38 | 19 | 4 / 315 / 2 / 1 | 4 | Sì |
| Gianni Stensness | gianni-stensness | 250174059 | D | N/D | 6 | 21 | 1845 | 4 | 0 | 28 | 11 | 4 | 22 | 12 | 4 / 360 / 4 / 1 | 4 | Sì |
| Essiën Bassey | essien-bassey | 250201827 | D | N/D | 17 | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 4 / 0 / 0 | 0 | N/D |
| Sondre Bjørshol | sondre-bj-rshol | 250144186 | D | N/D | 18 | 12 | 396 | 1 | 0 | 8 | 2 | 2 | 8 | 3 | N/D | 0 | Sì |
| Anders Bærtelsen | anders-baertelsen | 250103898 | D | N/D | 21 | 11 | 512 | 0 | 0 | 7 | 3 | 1 | 6 | 4 | N/D | 0 | Sì |
| Vetle Auklend | vetle-auklend | 250196225 | D | B | 24 | 16 | 687 | 0 | 1 | 1 | 0 | 1 | 12 | 9 | 3 / 58 / 1 / 0 | 17 | Sì |
| Henrik Falchener | henrik-falchener | 250139481 | D | N/D | 25 | 16 | 1290 | 2 | 1 | 10 | 3 | 2 | 16 | 8 | 3 / 208 / 2 / 1 | 4 | Sì |
| Jesper Daland | jesper-daland | 250103750 | D | N/D | 27 | 4 | 238 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 / 168 / 1 / 0 | 7 | Sì |
| Kristoffer Haugen | kristoffer-haugen | 250027039 | D | N/D | 28 | 17 | 1351 | 3 | 1 | 18 | 7 | 1 | 13 | 8 | 3 / 196 / 0 / 0 | 4 | Sì |
| Kristoffer Askildsen | kristoffer-askildsen | 250117864 | C | N/D | 7 | 21 | 1750 | 5 | 1 | 37 | 9 | 7 | 24 | 38 | 4 / 360 / 5 / 1 | 4 | Sì |
| Joe Bell | joe-bell | 250138504 | C | N/D | 8 | 17 | 1168 | 0 | 1 | 13 | 1 | 2 | 15 | 10 | 3 / 237 / 1 / 0 | 4 | Sì |
| Zlatko Tripić | zlatko-tripic | 250051338 | C | N/D | 10 | 22 | 1766 | 6 | 19 | 32 | 12 | 7 | 14 | 39 | 4 / 345 / 10 / 5 | 4 | Sì |
| Ola Visted | ola-visted | 250223290 | C | B | 15 | 12 | 253 | 0 | 0 | 5 | 3 | 1 | 3 | 1 | N/D | 0 | Sì |
| Henrik Bjørdal | henrik-rorvik-bjordal | 250065289 | C | N/D | 16 | 4 | 245 | 0 | 1 | 2 | 1 | 0 | 5 | 1 | 4 / 245 / 2 / 1 | 0 | Sì |
| Amin Cosic | amin-cosic | 250215287 | C | N/D | 19 | 3 | 90 | 0 | 0 | 3 | 1 | 0 | 0 | 2 | 1 / 15 / 1 / 0 | 3 | N/D |
| Tobias Moi | tobias-moi | 250169944 | C | B | 29 | 16 | 963 | 0 | 0 | 9 | 3 | 4 | 17 | 6 | 4 / 225 / 2 / 1 | 20 | Sì |
| Jakob Hansen | jakob-hansen | 250210217 | C | B | 33 | 11 | 205 | 0 | 0 | 2 | 0 | 0 | 2 | 1 | 1 / 4 / 0 / 0 | 0 | Sì |
| Nick D'Agostino | nick-d-agostino | 250210009 | A | N/D | 9 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Romano Postema | romano-postema | 250223247 | A | N/D | 11 | 5 | 70 | 0 | 1 | 4 | 0 | 0 | 2 | 1 | N/D | 6 | Sì |
| Veton Berisha | veton-berisha | 250022815 | A | N/D | 14 | 1 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/D | 0 | Sì |
| Peter Christiansen | peter-christiansen | 250145630 | A | N/D | 20 | 22 | 1889 | 14 | 7 | 57 | 27 | 2 | 30 | 24 | 4 / 304 / 8 / 4 | 4 | Sì |
| Erik Botheim | erik-botheim | 250102068 | A | N/D | 22 | 4 | 266 | 2 | 1 | 5 | 2 | 0 | 2 | 4 | 4 / 266 / 5 / 2 | 0 | Sì |
| Niklas Fuglestad | niklas-fuglestad | 250203364 | A | B | 23 | 19 | 754 | 3 | 2 | 23 | 9 | 0 | 10 | 4 | 1 / 4 / 1 / 0 | 19 | Sì |
| Simen Kvia-Egeskog | simen-kvia-egeskog | 250174185 | A | N/D | 26 | 23 | 1565 | 9 | 3 | 24 | 13 | 2 | 14 | 23 | 4 / 137 / 2 / 1 | 4 | Sì |

### Villarreal

| Giocatore | ID canonico | ID UEFA | Ruolo | Lista | Maglia | Presenze | Minuti | Gol | Assist | Tiri | Tiri in porta | Gialli | Falli commessi | Falli subiti | CL P/M/T/SOT | Registro | Storico club |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Luiz Júnior | luiz-junior | 250210287 | P | N/D | 1 | 4 | 360 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 / 90 / 0 / 0 | 5 | Sì |
| Rubén Gómez | ruben-gomez | 250193930 | P | N/D | 13 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Péter Gulácsi | peter-gulacsi | 102420 | P | N/D | 25 | 5 | 450 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 / 180 / 0 / 0 | 6 | Sì |
| Yakiv Kinareikin | yakiv-kinareikin | 250175645 | P | N/D | 35 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Pablo Polo | pablo-polo | 250184350 | P | B | 45 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Logan Costa | logan-costa | 250106707 | D | N/D | 2 | 2 | 173 | 0 | 0 | 4 | 0 | 0 | 1 | 0 | N/D | 2 | Sì |
| Alex Freeman | alex-freeman | 250209023 | D | N/D | 3 | 8 | 494 | 0 | 0 | 3 | 1 | 1 | 3 | 6 | 3 / 102 / 1 / 0 | 10 | Sì |
| Pau Navarro | pau-navarro | 250210288 | D | N/D | 6 | 4 | 349 | 0 | 0 | 0 | 0 | 1 | 4 | 1 | 3 / 263 / 1 / 0 | 6 | Sì |
| Juan Foyth | juan-foyth | 250147278 | D | N/D | 8 | 5 | 416 | 0 | 0 | 4 | 1 | 3 | 3 | 2 | 2 / 58 / 0 / 0 | 0 | Sì |
| Renato Veiga | renato-veiga | 250164935 | D | N/D | 12 | 8 | 720 | 0 | 1 | 5 | 0 | 3 | 6 | 1 | 3 / 270 / 2 / 0 | 10 | Sì |
| Santiago Mouriño | santiago-mourino | 250188006 | D | N/D | 15 | 6 | 337 | 0 | 0 | 2 | 1 | 2 | 7 | 3 | 3 / 270 / 3 / 3 | 8 | Sì |
| Carlos Romero | carlos-romero | 250177929 | D | N/D | 20 | 6 | 421 | 0 | 0 | 5 | 1 | 1 | 2 | 8 | 1 / 90 / 1 / 0 | 7 | Sì |
| Sergi Cardona | sergi-cardona | 250210289 | D | N/D | 23 | 5 | 427 | 0 | 0 | 3 | 0 | 0 | 7 | 6 | 3 / 141 / 2 / 1 | 7 | Sì |
| Diatta Alassane | diatta-alassane | 250216861 | C | B | 5 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alberto Moleiro | alberto-moleiro | 250168991 | C | N/D | 10 | 9 | 587 | 2 | 3 | 16 | 8 | 0 | 5 | 4 | 3 / 153 / 3 / 0 | 11 | Sì |
| Santi Comesaña | santi-comesana | 250188937 | C | N/D | 14 | 8 | 480 | 0 | 0 | 2 | 1 | 1 | 14 | 5 | 3 / 251 / 2 / 1 | 10 | Sì |
| Carlos Macià | carlos-macia | 250212013 | C | N/D | 16 | 5 | 124 | 0 | 0 | 0 | 0 | 0 | 3 | 1 | N/D | 5 | Sì |
| Pape Gueye | pape-gueye | 250144229 | C | N/D | 18 | 9 | 640 | 3 | 0 | 10 | 6 | 1 | 7 | 16 | 3 / 264 / 4 / 1 | 11 | Sì |
| Tani Oluwaseyi | tani-oluwaseyi | 250195532 | C | N/D | 21 | 5 | 120 | 0 | 0 | 5 | 2 | 0 | 3 | 0 | 3 / 131 / 5 / 3 | 7 | Sì |
| Nathan Saliba | nathan-saliba | 250209018 | C | N/D | 24 | 6 | 354 | 0 | 0 | 6 | 1 | 0 | 7 | 6 | 3 / 194 / 3 / 0 | 0 | Sì |
| Nizar El Jmili | nizar-el-jmili | 250224969 | C | N/D | 27 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Joselillo Gaitán | joselillo-gaitan | 250212006 | C | B | 28 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Mahamoud Barry | mahamoud-barry | 250225169 | C | B | 31 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| César Bonafé | cesar-bonafe | 250216862 | C | B | 32 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Alvaro Alcaide | alvaro-alcaide | 250211998 | C | B | 33 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Moussa Traore | moussa-traore | 250212024 | C | B | 36 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
| Gerard Moreno | gerard-moreno | 250074565 | A | N/D | 7 | 8 | 333 | 2 | 0 | 10 | 3 | 0 | 5 | 2 | 3 / 82 / 3 / 0 | 0 | Sì |
| Georges Mikautadze | georges-mikautadze | 250155025 | A | N/D | 9 | 9 | 466 | 2 | 1 | 21 | 11 | 0 | 3 | 4 | 3 / 213 / 5 / 2 | 11 | Sì |
| Ilias Akhomach | ilias-akhomach | 250139241 | A | N/D | 11 | 8 | 323 | 0 | 2 | 8 | 2 | 1 | 4 | 5 | N/D | 0 | Sì |
| Tajon Buchanan | tajon-buchanan | 250173127 | A | N/D | 17 | 7 | 378 | 0 | 0 | 11 | 4 | 2 | 9 | 14 | 2 / 135 / 4 / 3 | 8 | Sì |
| Nicolas Pépé | nicolas-pepe | 250106003 | A | N/D | 19 | 6 | 423 | 2 | 0 | 14 | 7 | 1 | 0 | 5 | 1 / 31 / 2 / 1 | 7 | Sì |
| Ayoze Pérez | ayoze-perez | 250075625 | A | N/D | 22 | 9 | 525 | 1 | 2 | 18 | 8 | 0 | 5 | 13 | 2 / 37 / 3 / 0 | 10 | Sì |
| Douga Fofana | douga-fofana | 250224499 | A | B | 34 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D | 0 | N/D |
