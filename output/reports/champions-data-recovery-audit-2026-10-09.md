# Champions League 2026/27 — Fase 7 data recovery audit

Cutoff: **2026-10-09**  
Gate finale: **CHAMPIONS DATA-RECOVERY GATE = PARTIAL**

## A. Recovery delle quattro squadre

| team | provider | competition | matches | players with minutes | players with shots | players with SOT | status |
|---|---|---|---:|---:|---:|---:|---|
| Sabah | Azerbaijan PFL official API | Misli Premyer Liqası 2026/27 | 2 | 9 | 0 | 0 | PARTIAL |
| Slavia Praha | Chance Liga official | Chance Liga 2026/27 | 10 | 24 | 5 | 5 | PARTIAL |
| Shakhtar Donetsk | Ukrainian Premier League official | UPL 2026/27 | 5 | 24 | 0 | 0 | PARTIAL |
| Slovan Bratislava | Niké Liga official | Niké Liga 2026/27 | N/D | 27 | 0 | 0 | PARTIAL |

Chance Liga espone minuti per tutti i ruoli ma tiri/SOT soltanto in alcune tabelle individuali dipendenti dal ruolo. I totali ufficiali di 10 gare sono stati acquisiti separatamente, ma la serie individuale non è completa: **0 gare promosse a riconciliazione esatta**. Per Sabah l'API PFL identifica titolari e subentranti, non il titolare sostituito: i minuti dei titolari restano `null`. `publishedAt` non è esposto dalle fonti catturate; `matchDate`, `retrievedAt` e `asOf` restano distinti nei raw e nel sidecar.

## B. Audit delle sette partite

| match | missing field | alternative source | independently comparable | outcome |
|---|---|---|---|---|
| Fenerbahce 1-2 Besiktas (401888301) | team shots and/or independent player shots/SOT | https://bjk.com.tr/en/mac_merkezi/canli/25441 | false | still_not_comparable_missing_team_or_player_series |
| AEK Athens 4-0 Iraklis (401896829) | team shots and/or independent player shots/SOT | N/D | false | still_not_comparable_missing_team_or_player_series |
| Lommel SK 0-1 Club Brugge (401879005) | team shots and/or independent player shots/SOT | https://www.proleague.be/fr/matchs/saison-2026-2027-jupiler-pro-league-5-lommel-sk-vs-club-brugge-632 | false | team_total_recovered_but_player_series_missing |
| Istanbul Basaksehir 2-3 Galatasaray (401888304) | team shots and/or independent player shots/SOT | https://www.galatasaray.org/haber/futbol/basaksehir-2-3-galatasaray/60892 | false | still_not_comparable_missing_team_or_player_series |
| SK Sturm Graz 2-1 LASK Linz (401881791) | team shots and/or independent player shots/SOT | https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56690/matchcenter | false | team_total_recovered_but_player_series_missing |
| TSV Hartberg 3-3 LASK Linz (401881783) | team shots and/or independent player shots/SOT | https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56698/matchcenter | false | team_total_recovered_but_player_series_missing |
| Sandefjord 1-1 Viking FK (401873920) | team shots and/or independent player shots/SOT | https://www.sandefjordfotball.no/lag/import/tournament/eliteserien-2026/season/fotballsesongen-2026/match/round-20-sandefjord-fotball-x-viking | false | still_not_comparable_missing_team_or_player_series |

Totali squadra ufficiali separati recuperati: Club Brugge **13/3**, LASK vs Sturm **26/4**, LASK vs Hartberg **16/6**. Poiché la serie individuale indipendente manca, nessuna delle sette gare viene dichiarata confrontabile. I raw ESPN originali non sono stati modificati.

## C. Identity resolution

Casi iniziali **65**; risolti **64**; aperti **1**; con ID UEFA **63**; con ID ESPN **27**.

| squadra | giocatore | stato | ESPN ID | UEFA ID | metodo | fonte |
|---|---|---|---:|---:|---|---|
| Real Madrid | Javi Navarro | resolved | null | 250201421 | uefa_exact_name | UEFA List B |
| Real Madrid | Diego Villalba | resolved | null | 250206694 | uefa_exact_name | UEFA List B |
| Real Madrid | Gabriel Valero | resolved | null | 250213264 | uefa_exact_name | UEFA List B |
| Fenerbahçe | Yasir Caklı | resolved | null | 250222125 | uefa_exact_name | UEFA List B |
| Fenerbahçe | Çağan Sarıdikmen | resolved | null | 250222120 | uefa_exact_name | UEFA List B |
| Fenerbahçe | Bedirhan Korkmaz | resolved | null | 250222123 | uefa_exact_name | UEFA List B |
| Fenerbahçe | Gökmen Özdemir | resolved | 3144178 | 250222122 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Fenerbahce |
| Fenerbahçe | Güner Ekici | resolved | null | 250222124 | uefa_exact_name | UEFA List B |
| Fenerbahçe | Emirhan Ateş | resolved | null | 250207773 | uefa_exact_name | UEFA List B |
| Fenerbahçe | Çağrı Fedai | resolved | 360883 | null | espn_exact_name_team_affiliation | ESPN Fenerbahce |
| Bodø/Glimt | Matias Jaiteh | resolved | null | 250213119 | uefa_exact_name | UEFA List B |
| Bodø/Glimt | Mathias Blix Olsen | resolved | null | 250213088 | uefa_exact_name | UEFA List B |
| Bodø/Glimt | Kasper Solhaug | resolved | null | 250213132 | uefa_exact_name | UEFA List B |
| Feyenoord | Stenn De Mol | resolved | 385718 | 250199586 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Feyenoord Rotterdam |
| Feyenoord | Tim Haksteeg | resolved | null | 250183766 | uefa_exact_name | UEFA List B |
| Feyenoord | Mika Medina | open | null | null | N/D | nessuna evidenza univoca |
| Feyenoord | Marleyson Cruz | resolved | null | 250189848 | uefa_exact_name | UEFA List B |
| Feyenoord | Twan Schens | resolved | 3106341 | 250199595 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Feyenoord Rotterdam |
| Feyenoord | Matthew Mparaganda | resolved | null | 250199589 | uefa_exact_name | UEFA List B |
| Feyenoord | Dani Slory | resolved | null | 250200576 | uefa_exact_name | UEFA List B |
| Feyenoord | Boaz Plantinga | resolved | null | 250216077 | uefa_exact_name | UEFA List B |
| Feyenoord | Nick De Koning | resolved | null | 250200556 | uefa_exact_name | UEFA List B |
| Feyenoord | Nassim El Harmouz | resolved | 406920 | 250190226 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Feyenoord Rotterdam |
| Feyenoord | Kevin Khan | resolved | null | 250199588 | uefa_exact_name | UEFA List B |
| Feyenoord | Zino Sneijer | resolved | 406921 | 250189184 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Feyenoord Rotterdam |
| Feyenoord | Luca Dahl Tomasson | resolved | null | 250218024 | uefa_exact_name | UEFA List B |
| Feyenoord | Izu Onunta | resolved | 3106342 | 250199590 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Feyenoord Rotterdam |
| Feyenoord | Kelvin Neijenhuis | resolved | null | 250190224 | uefa_exact_name | UEFA List B |
| Galatasaray | Necati Yançel | resolved | 416235 | 250206687 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Galatasaray |
| Galatasaray | Onur Kağan Yıldız | resolved | 3144068 | 250224253 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Galatasaray |
| Galatasaray | Aleksei Batrakov | resolved | null | 250224345 | uefa_exact_name | UEFA List A |
| Galatasaray | Arda Tagay | resolved | 3102518 | 250212957 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Galatasaray |
| LASK | Christof Katzmayr | resolved | null | 250206921 | uefa_exact_name | UEFA List B |
| LASK | Jakob Wansch | resolved | 3106095 | 250223434 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| LASK | Ryan Rodriguez German | resolved | 3106091 | 250195616 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| LASK | Luca Ortner | resolved | 3106087 | 250223433 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| LASK | Joao Victor Tornich | resolved | null | 250223204 | uefa_exact_name | UEFA List A |
| LASK | Armin Midzic | resolved | 395943 | 250199268 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| LASK | Alan Wimmer | resolved | 3106092 | 250223435 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| LASK | Matthias Hartl | resolved | 3106083 | 250223432 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| LASK | Paul Krapf | resolved | 3106084 | 250217981 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN LASK Linz Amateure |
| Liverpool | Luke Chambers | resolved | 32572 | 250154417 | uefa_exact_name_plus_espn_team_affiliation | UEFA List A + ESPN Liverpool U21 |
| Liverpool | Isaac Mabaya | resolved | 329177 | 250154425 | uefa_exact_name_plus_espn_team_affiliation | UEFA List A + ESPN Liverpool U21 |
| Porto | Gonçalo Ribeiro | resolved | 364651 | 250169106 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN FC Porto |
| Porto | Martim Cunha | resolved | null | 250185409 | uefa_exact_name | UEFA List B |
| Porto | Mateus Mide | resolved | null | 250204916 | uefa_exact_name | UEFA List B |
| Sabah | Erivaldo Almeida | resolved | null | 250221486 | uefa_exact_name | UEFA List A |
| Sabah | Aleksey Isaev | resolved | null | 250129032 | uefa_exact_name | UEFA List A |
| Sabah | Jafar Mukhtarov | resolved | null | 250221231 | uefa_exact_name | UEFA List A |
| Sabah | Shahin Ibrahimov | resolved | null | 250202772 | uefa_exact_name | UEFA List B |
| Slavia Praha | Emmanuel Ayaosi | resolved | null | 250223128 | uefa_exact_name | UEFA List A |
| Slavia Praha | Adonija Ouanda | resolved | null | 250223132 | uefa_exact_name | UEFA List A |
| Shakhtar Donetsk | Gabriel Carvalho | resolved | null | 250224147 | uefa_exact_name | UEFA List A |
| Shakhtar Donetsk | Ryan Roberto | resolved | 417559 | 250211683 | uefa_exact_name_plus_espn_team_affiliation | UEFA List A + ESPN Shakhtar Donetsk |
| Shakhtar Donetsk | Bruninho | resolved | 417344 | 250224146 | uefa_exact_name_plus_espn_team_affiliation | UEFA List A + ESPN Shakhtar Donetsk |
| Slovan Bratislava | Aleksandar Popović | resolved | null | 250089413 | uefa_exact_name | UEFA List A |
| Slovan Bratislava | Dávid Balog | resolved | 408480 | 250198497 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Slovan Bratislava |
| Slovan Bratislava | Robert Tománek | resolved | 3107812 | 250222608 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Slovan Bratislava |
| Slovan Bratislava | Leo Hofstädter | resolved | 3099044 | 250208297 | uefa_exact_name_plus_espn_team_affiliation | UEFA List B + ESPN Slovan Bratislava |
| Stuttgart | Tom Walz | resolved | null | 250218212 | uefa_exact_name | UEFA List B |
| Stuttgart | Lucas Nagel | resolved | null | 250224503 | uefa_exact_name | UEFA List B |
| Stuttgart | Alexander Groiß | resolved | 290814 | 250212172 | uefa_exact_name_plus_espn_team_affiliation | UEFA List A + ESPN VfB Stuttgart |
| Stuttgart | Dominik Nothnagel | resolved | 205976 | 250212173 | uefa_exact_name_plus_espn_team_affiliation | UEFA List A + ESPN VfB Stuttgart |
| Villarreal | Yakiv Kinareikin | resolved | null | 250175645 | uefa_exact_name | UEFA List A |
| Villarreal | Nizar El Jmili | resolved | null | 250224969 | uefa_exact_name | UEFA List A |

La sola somiglianza nominale non è usata. L'unico caso ancora aperto è **Mika Medina (Feyenoord)**; `providerPlayerId` resta `null`.

## D. UEFA squad audit

| giocatore | squadra | stato UEFA | fonte | discrepanza registro interno |
|---|---|---|---|---|
| Pio Esposito | Inter | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50138/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Aleksandar Stankovic | Inter | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50138/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Myles Lewis-Skelly | Arsenal | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52280/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Max Dowman | Arsenal | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52280/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Kojo Peprah Oppong | Fenerbahçe | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52692--fenerbahce/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Neil El Aynaoui | Roma | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50137--roma/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Maxence Caqueret | Como | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/79946--como/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Antonio Nusa | Leipzig | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/2603790/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Assan Ouédraogo | Leipzig | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/2603790/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Samba Konate | Leipzig | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/2603790/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Arthur Vermeeren | Leipzig | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/2603790/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Conrad Harder | Leipzig | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/2603790/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Dereck Kutesa | AEK Athens | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50129--aek-athens/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| George Hemmings | Aston Villa | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52683--aston-villa/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Carlos Martín | Atlético de Madrid | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50124--athletic-club/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Jorge Domínguez | Atlético de Madrid | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50124--athletic-club/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| José María Giménez | Atlético de Madrid | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50124--athletic-club/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Lennart Karl | Bayern München | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50037--bayern-munchen/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Kasper Høgh | Bodø/Glimt | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/59333--bodo-glimt/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Daniel Bassi | Bodø/Glimt | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/59333--bodo-glimt/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Mikkel Hansen | Bodø/Glimt | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/59333--bodo-glimt/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Anders Klynge | Bodø/Glimt | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/59333--bodo-glimt/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Kouakou Gadou | Borussia Dortmund | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52758--dort/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Joey Veerman | Borussia Dortmund | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52758--dort/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Ethan Nwaneri | Borussia Dortmund | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52758--dort/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Konstantinos Karetsas | Borussia Dortmund | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52758--dort/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Giannis Konstantelias | Borussia Dortmund | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52758--dort/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Kauã Prates | Borussia Dortmund | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52758--dort/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Joaquin Seys | Club Brugge | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50043--club-brugge/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Kyriani Sabbe | Club Brugge | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50043--club-brugge/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Jorne Spileers | Club Brugge | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50043--club-brugge/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Bjorn Meijer | Club Brugge | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50043--club-brugge/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Mika Mármol | Feyenoord | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52749--feyenoord/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Ayase Ueda | Feyenoord | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52749--feyenoord/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Jordan Lotomba | Feyenoord | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52749--feyenoord/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Alexey Batrakov | Galatasaray | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50067/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Kazimcan Karatas | Galatasaray | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50067/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Kaan Ayhan | Galatasaray | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50067/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Alemão | LASK | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/63405--lask/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Maik Nawrocki | Lens | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52277--lens/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Mezian Soares | Lens | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52277--lens/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Rio Ngumoha | Liverpool | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/7889--liverpool/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Trey Nyoni | Liverpool | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/7889--liverpool/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Lewis Koumas | Liverpool | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/7889--liverpool/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Nico O'Reilly | Manchester City | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52919--man-city/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Ryan McAidoo | Manchester City | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52919--man-city/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Jack Grealish | Manchester City | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52919--man-city/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Kaden Braithwaite | Manchester City | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52919--man-city/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Felix Correia | Lille | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/75797/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Kobbie Mainoo | Manchester United | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52682--man-utd/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Leny Yoro | Manchester United | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52682--man-utd/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Shea Lacey | Manchester United | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52682--man-utd/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Harry Amass | Manchester United | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/52682--man-utd/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Deniz Gül | Porto | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50064--porto/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Rodrigo Mora | Porto | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50064--porto/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Samu Aghehowa | Porto | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50064--porto/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Stephen Eustáquio | Porto | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50064--porto/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Noah Fernandez | PSV Eindhoven | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50062/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Amir Bouhamdi | PSV Eindhoven | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50062/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Joey Veerman | PSV Eindhoven | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50062/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Shuryjano Cornecion | PSV Eindhoven | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50062/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Pablo García | Real Betis | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52265--real-betis/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Aleksey Isayev | Sabah | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/2609356/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Júnior Almeida | Sabah | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/2609356/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Emmanuel Dennis Ayaosi | Slavia Praha | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52498--slavia-praha/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Leonidas Stergiou | Stuttgart | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50107--stuttgart/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Chema Andrés | Stuttgart | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50107--stuttgart/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Henrik Rorvik Bjordal | Viking | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52319/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Erik Botheim | Viking | uefa_list_a_verified | https://www.uefa.com/uefachampionsleague/clubs/52319/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Hilmir Rafn Mikaelsson | Viking | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52319/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Fillip Botnen | Viking | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/52319/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Flávio Gonçalves | Sporting CP | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50149/squad/ | official_uefa_list_presence_missing_from_internal_registry |
| Rodrigo Dias | Sporting CP | uefa_eligibility_unknown | https://www.uefa.com/uefachampionsleague/clubs/50149/squad/ | internal_absence_with_uefa_eligibility_unresolved |
| Rafael Nel | Sporting CP | uefa_list_b_verified | https://www.uefa.com/uefachampionsleague/clubs/50149/squad/ | official_uefa_list_presence_missing_from_internal_registry |

Riepilogo: `uefa_list_a_verified` 7; `uefa_list_b_verified` 26; `uefa_not_registered_verified` 0; `uefa_eligibility_unknown` 41. Il simbolo ufficiale UEFA `*` è trattato come evidenza Lista B; non è stata fatta alcuna inferenza dall'età. L'assenza dalla pagina corrente non diventa prova di mancata registrazione. Tutti i 74 flag `predictionCandidateEligible` restano `false`.

## E. Diagnostica delle 36 squadre

| squadra | gare | minuti obs. | tiri obs. | SOT obs. | quota registrati con evidenza | irrisolti | fuori rosa | qualità | campione | futuro backtest |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| Real Madrid | 7 | 108 | 108 | 108 | 0.5714 | 0 | 0 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Inter | 5 | 80 | 80 | 80 | 0.8261 | 0 | 2 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Napoli | 5 | 78 | 78 | 78 | 0.913 | 0 | 0 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Arsenal | 5 | 80 | 80 | 80 | 0.8636 | 0 | 2 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Fenerbahçe | 7 | 110 | 95 | 95 | 0.5833 | 0 | 1 | partial | medium | not_ready_or_limited |
| Roma | 6 | 96 | 96 | 96 | 0.8333 | 0 | 1 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Como | 5 | 80 | 80 | 80 | 0.9524 | 0 | 1 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Leipzig | 4 | 63 | 63 | 63 | 0.8636 | 0 | 5 | complete_for_current_fields | small | not_ready_or_limited |
| AEK Athens | 5 | 61 | 61 | 61 | 0.8636 | 0 | 1 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Aston Villa | 5 | 79 | 79 | 79 | 0.913 | 0 | 1 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Atlético de Madrid | 7 | 111 | 111 | 111 | 0.8333 | 0 | 3 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Barcelona | 7 | 113 | 113 | 113 | 0.92 | 0 | 0 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Bayern München | 4 | 62 | 62 | 62 | 0.75 | 0 | 1 | complete_for_current_fields | small | not_ready_or_limited |
| Bodø/Glimt | 11 | 173 | 173 | 173 | 0.6563 | 0 | 4 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Borussia Dortmund | 4 | 64 | 64 | 64 | 0.5714 | 0 | 6 | complete_for_current_fields | small | not_ready_or_limited |
| Club Brugge | 7 | 109 | 93 | 93 | 0.64 | 0 | 4 | partial | medium | not_ready_or_limited |
| Feyenoord | 7 | 112 | 112 | 112 | 0.4783 | 1 | 3 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Galatasaray | 8 | 128 | 112 | 112 | 0.6061 | 0 | 3 | partial | medium | not_ready_or_limited |
| LASK | 7 | 102 | 80 | 80 | 0.5938 | 0 | 1 | partial | medium | not_ready_or_limited |
| Lens | 6 | 96 | 96 | 96 | 0.84 | 0 | 2 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Liverpool | 5 | 77 | 77 | 77 | 0.6 | 0 | 3 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Manchester City | 5 | 71 | 71 | 71 | 0.7826 | 0 | 4 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Lille | 5 | 79 | 79 | 79 | 0.7917 | 0 | 1 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Manchester United | 6 | 91 | 91 | 91 | 0.68 | 0 | 4 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Paris Saint-Germain | 6 | 95 | 95 | 95 | 0.8077 | 0 | 0 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Porto | 7 | 112 | 112 | 112 | 0.6061 | 0 | 4 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| PSV Eindhoven | 9 | 139 | 139 | 139 | 0.8696 | 0 | 4 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Real Betis | 7 | 110 | 110 | 110 | 0.88 | 0 | 1 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Sabah | 3 | 26 | 16 | 16 | 0.5185 | 0 | 2 | partial | small | not_ready_or_limited |
| Slavia Praha | 11 | 173 | 50 | 50 | 0.6 | 0 | 1 | partial | medium | not_ready_or_limited |
| Shakhtar Donetsk | 6 | 95 | 15 | 15 | 0.5172 | 0 | 0 | partial | medium | not_ready_or_limited |
| Slovan Bratislava | 1 | 16 | 16 | 16 | 0.5714 | 0 | 0 | partial | small | not_ready_or_limited |
| Stuttgart | 4 | 63 | 63 | 63 | 0.5625 | 0 | 2 | complete_for_current_fields | small | not_ready_or_limited |
| Viking | 21 | 334 | 318 | 318 | 0.8667 | 0 | 4 | partial | broad | not_ready_or_limited |
| Villarreal | 7 | 112 | 112 | 112 | 0.88 | 0 | 0 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |
| Sporting CP | 8 | 125 | 125 | 125 | 0.76 | 0 | 3 | complete_for_current_fields | medium | ready_for_diagnostic_backtest |

Qualità del dato e numerosità sono indicatori separati. Nessun coefficiente o moltiplicatore è stato creato.

### E.1 Competizioni usate

| squadra | competizioni separate |
|---|---|
| Real Madrid | esp.1 |
| Inter | ita.1 |
| Napoli | ita.1 |
| Arsenal | eng.1 |
| Fenerbahçe | tur.1, uefa.champions |
| Roma | ita.1, uefa.champions |
| Como | ita.1 |
| Leipzig | ger.1 |
| AEK Athens | gre.1 |
| Aston Villa | eng.1 |
| Atlético de Madrid | esp.1 |
| Barcelona | esp.1 |
| Bayern München | ger.1 |
| Bodø/Glimt | nor.1 |
| Borussia Dortmund | ger.1 |
| Club Brugge | bel.1 |
| Feyenoord | ned.1 |
| Galatasaray | tur.1, uefa.champions |
| LASK | aut.1 |
| Lens | fra.1, uefa.champions |
| Liverpool | eng.1 |
| Manchester City | eng.1 |
| Lille | fra.1 |
| Manchester United | eng.1, uefa.champions |
| Paris Saint-Germain | fra.1, uefa.champions |
| Porto | por.1 |
| PSV Eindhoven | ned.1, uefa.champions |
| Real Betis | esp.1 |
| Sabah | uefa.champions, Misli Premyer Liqası 2026/27 |
| Slavia Praha | uefa.champions, Chance Liga 2026/27 |
| Shakhtar Donetsk | uefa.champions, UPL 2026/27 |
| Slovan Bratislava | uefa.champions, Niké Liga 2026/27 |
| Stuttgart | ger.1 |
| Viking | nor.1 |
| Villarreal | esp.1 |
| Sporting CP | por.1, uefa.champions |

## F. Invarianti e hash prima/dopo

| controllo | elementi | esito |
|---|---:|---|
| Squadre protette | 7 | UNCHANGED_BY_HASH_TEST |
| File protetti | 7 | UNCHANGED_BY_HASH_TEST |
| Raw Champions preesistenti | 5266 | UNCHANGED_BY_HASH_TEST |
| Flag predictionCandidateEligible | 74 | UNCHANGED_BY_HASH_TEST |

Modello, Elo, League Strength, expected minutes, team shots/SOT, blending, predizioni, HTML, UI e logiche Serie A sono invariati.

## G. File creati o aggiornati

- `package.json`
- `scripts/create-champions-data-recovery-control.js`
- `scripts/fetch-champions-data-recovery.js`
- `scripts/build-champions-data-recovery-audit.js`
- `scripts/test-champions-data-recovery.js`
- `data/analysis/champions/data-recovery-control-2026-10-09.json`
- `data/analysis/champions/data-recovery-audit-2026-10-09.json`
- `data/analysis/champions/player-identity-recovery-2026-10-09.json`
- `data/analysis/champions/uefa-squad-audit-2026-10-09.json`
- `data/normalized/champions-domestic-recovery-2026-27.json`
- `data/raw/champions-recovery/2026-10-09/manifest.json` e **172** snapshot attivi elencati nel manifest; **12** snapshot esplorativi con season-id errato sono preservati ma esclusi dal builder
- `output/reports/champions-data-recovery-audit-2026-10-09.md`

## H. Test

- `test-champions-data-recovery.js`: PASS — identity matching, separazione fonti/competizioni, cutoff, immutabilità, complete-match evidence, null/zero e 5.266 raw protetti.
- `test-champions-full-data-coverage.js`: PASS.
- `test-champions-player-coverage-audit.js`: PASS.
- `test-champions-multileague-current-season-data.js`: PASS.
- `test-player-identities.js`: PASS.
- `test-european-player-match-stats.js`: PASS — separazione competizioni preservata.
- `validate-data.js`: PASS.
- `git diff --check`: PASS; soli avvisi CRLF preesistenti.

## I. Gate finale

**CHAMPIONS DATA-RECOVERY GATE = PARTIAL**

Nessuna promozione in produzione. 4 priority teams retain unavailable fields; 1 identities remain unresolved; 41 outside contributors retain unknown UEFA eligibility; 7 audited matches remain non-comparable. Attendere revisione prima della Fase 8.
