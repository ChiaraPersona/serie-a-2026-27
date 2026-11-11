# Audit nomi e identificativi dei giocatori Champions — 11 novembre 2026

## Ambito e risultato

Verificati tutti i record con minuti, tiri o SOT mancanti nelle rose delle 36 squadre: 523 record prima della correzione. Nessun filtro preventivo per ruolo o Lista B. Inclusi anche i casi già accettati dall’utente, separati dalle priorità di recupero.

- 76 ID ESPN non propagati nella rosa sono stati ricostruiti univocamente e salvati nelle fonti canoniche. Il registro interno conserva le prove per ciascun giocatore.
- Un caso recupera statistiche correnti già esistenti: Hákon Haraldsson, Lille, UEFA 250128943 / ESPN 318779, corrisponde al record `hakon-arnar-haraldsson`, Ligue 1, 494 minuti. Nessun valore o denominatore ricalcolato.
- Dopo la correzione: 519 giocatori con minuti N/D e altri 3 con minuti presenti ma tiri/SOT N/D (Vasovic, Elfadli, Kalajdzic). Totale 522 record lacunosi.
- 115 portieri con lacune accettati per istruzione dell’utente; nessuno zero inventato e nessuna rimozione dalla rosa o dai dati pubblici.
- Considerate anche le accettazioni precedenti della chat, rimangono 346 casi prioritari: 343 con minuti mancanti e 3 con sole lacune tiri/SOT.
- Tra i 522 record lacunosi residui, 225 hanno identità coerenti con i registri verificabili e 297 non dispongono ancora di un ID provider risolvibile. Per questi ultimi non si può escludere un problema di nome o di copertura. Non sono classificati come zero presenze.

## Metodo e limiti

Controllo per squadra canonica, ID UEFA, ID ESPN, ID canonico del giocatore e alias già revisionati. Verificate anche 72 rose provider compresse già archiviate (due snapshot per ciascuna squadra), accettando solo fullName/displayName esatti o equivalenze esplicite già approvate. Nessuna corrispondenza approssimativa; nessun dato trasferito tra squadre o competizioni. Nessun ID provider uguale associato ad un’altra squadra del database corrente nei casi residui.

Le identità sono riconciliate rispetto alle evidenze locali esistenti; non è una nuova certificazione online di tutte le registrazioni. L’identità corretta non dimostra presenze o disponibilità. Le statistiche giovanili, di coppa o Champions non sostituiscono un totale domestico mancante. Nessun aggiornamento di pronostici, mercati, DUO, quote, formazioni o liquidazioni.

## Copertura per club

| Club | Record lacunosi residui | Portieri accettati | Altri casi accettati | Ancora prioritari | Senza ID risolvibile |
|---|---:|---:|---:|---:|---:|
| AEK Athens | 3 | 1 | 0 | 2 | 0 |
| Arsenal | 31 | 5 | 26 | 0 | 24 |
| Aston Villa | 44 | 7 | 1 | 36 | 41 |
| Atlético de Madrid | 25 | 5 | 0 | 20 | 22 |
| Barcelona | 12 | 2 | 0 | 10 | 8 |
| Bayern München | 9 | 2 | 0 | 7 | 4 |
| Bodø/Glimt | 10 | 2 | 0 | 8 | 3 |
| Borussia Dortmund | 8 | 3 | 0 | 5 | 1 |
| Club Brugge | 21 | 4 | 0 | 17 | 10 |
| Como | 2 | 1 | 1 | 0 | 0 |
| Fenerbahçe | 14 | 3 | 0 | 11 | 7 |
| Feyenoord | 23 | 5 | 0 | 18 | 8 |
| Galatasaray | 13 | 2 | 0 | 11 | 2 |
| Inter | 6 | 2 | 4 | 0 | 1 |
| LASK | 11 | 2 | 0 | 9 | 1 |
| Leipzig | 7 | 4 | 0 | 3 | 3 |
| Lens | 13 | 5 | 0 | 8 | 10 |
| Lille | 3 | 2 | 0 | 1 | 0 |
| Liverpool | 28 | 4 | 24 | 0 | 18 |
| Manchester City | 5 | 3 | 1 | 1 | 1 |
| Manchester United | 11 | 3 | 2 | 6 | 3 |
| Napoli | 2 | 2 | 0 | 0 | 0 |
| Paris Saint-Germain | 6 | 4 | 0 | 2 | 0 |
| Porto | 14 | 4 | 0 | 10 | 4 |
| PSV Eindhoven | 31 | 5 | 0 | 26 | 25 |
| Real Betis | 28 | 3 | 0 | 25 | 25 |
| Real Madrid | 14 | 3 | 0 | 11 | 3 |
| Roma | 4 | 2 | 2 | 0 | 1 |
| Sabah | 10 | 3 | 0 | 7 | 4 |
| Shakhtar Donetsk | 10 | 2 | 0 | 8 | 1 |
| Slavia Praha | 23 | 3 | 0 | 20 | 18 |
| Slovan Bratislava | 10 | 4 | 0 | 6 | 2 |
| Sporting CP | 46 | 6 | 0 | 40 | 34 |
| Stuttgart | 11 | 3 | 0 | 8 | 2 |
| Viking | 3 | 1 | 0 | 2 | 1 |
| Villarreal | 11 | 3 | 0 | 8 | 10 |

## Premier League: prossimi casi

Arsenal e Liverpool non hanno casi prioritari residui per le accettazioni dell’utente. Accettati anche Taylor Harwood-Bellis, Rayan Aït-Nouri, Manuel Ugarte e Tynan Thompson sulla base della ricerca dedicata. Negli altri tre club Premier rimangono 43 casi prioritari, tutti Lista B: Aston Villa 36, Manchester City 1, Manchester United 6. Questi gruppi non sono stati ancora accettati in blocco dall’utente.

L’accettazione di Harwood-Bellis conserva l’aggiornamento domestico noto da integrare (1 presenza, 90 minuti); non dichiara che il dato sia già pubblicato. Infortuni, zeri Premier e attività Under 21 rimangono distinti. Evidenze: `docs/reports/champions-four-premier-missing-reasons-2026-11-11.md`.

## Verifiche

- Test mirato Haraldsson prima fallito sull’ID mancante, poi superato.
- Verificati tutti i 76 mapping per ID univoco e assenza di duplicati provider all’interno della squadra.
- Prova strutturale nel riconciliatore: nessuna statistica corrente modificata; nella rosa solo providerIds aggiornati.
- Seconda esecuzione: zero correzioni residue e nessuna scrittura del registro di correzioni precedente.
- Test completo di rendering delle 36 schede superato.
- Test di integrità rose Champions e regressione Roma/Como superati.
- Browser Lille, Roma e Como a 1280 e 390 px superato: minuti corretti e assenza di overflow.

## Evidenze interne

- `data/sources/champions-player-identity-reconciliation-2026-11-11.json`: 76 mapping e relative prove.
- `data/sources/champions-statistical-gap-review-2026-11-11.json`: accettazioni esplicite dell’utente, solo per priorità di audit.
- `output/champions-missing-identities-2026-11-11.json`: audit completo dei record residui, campi mancanti, identità candidate e provenienza.
- `scripts/audit-champions-missing-identities.py`: riproduzione del controllo senza modifiche ai dati di produzione.
- `scripts/reconcile-champions-missing-identities.py`: applicazione esplicita con `--apply`; nessuna formula statistica.

## Elenco completo dei record residui

Accettato significa fuori dalle priorità di recupero, non dato valorizzato né zero certificato.

| Club | Giocatore | Lista B | Campi mancanti | Identità | Revisione |
|---|---|---|---|---|
| AEK Athens | Marios Balamotis | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| AEK Athens | Domagoj Vida | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| AEK Athens | Charalampos Lykogiannis | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Arsenal | Kepa Arrizabalaga | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Arsenal | Illan Meslier | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Arsenal | Khari Ranson | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Arsenal | Jack Porter | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Arsenal | Jack Talbot | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Arsenal | William Saliba | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Arsenal | Brayden Clarke | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Joshua Ogunnaike | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Josiah King | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Teshaun Murisa | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Abraham Owusu-Gyasi | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Patrick Stachow | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Joshua Tahou | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Hakeem Abubakar | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Elyon Mbala | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Marli Salmon | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-list-B |
| Arsenal | Joshua Sesay | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Andre Annous | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Ife Ibrahim | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-list-B |
| Arsenal | Theo Julienne | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-list-B |
| Arsenal | Louie Copley | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Brando Bailey-Joseph | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Maalik Hashi | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-list-B |
| Arsenal | Saurap Sampang | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Emerson Nwaneri | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Charlie Purdy | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Ceadach O'Neill | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Louis Zečević-John | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Marley Frohock | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Bowen Phillips | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Arsenal | Jayden Oba | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Aston Villa | James Wright | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Aston Villa | Owen Asemota | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Aston Villa | Sam Lewis | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Aston Villa | Theo Houston | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Aston Villa | Rhys Oakley | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Aston Villa | Jack Allan | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Aston Villa | Jayden Garthwaite | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Aston Villa | Taylor Harwood-Bellis | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Aston Villa | Vincely Mudame | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Travis Patterson | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Harry Pinnell | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Leon Routh | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | TJ Carroll | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Ashton McWilliams | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Teddie Bloomfield | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Clay Atkins | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Farid Addey | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | MJ Lyeli | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Kairi Ketebu | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Curtis Mitchell | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Lennon Moss | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Cole Brannigan | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Rodrigo Fortes | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Vinnie Hayward | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Keilan Quinn | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Woody Burgess | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Jahmi Kellyman | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Olly Lloyd | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Lennon Melhuish | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Jamaldeen Jimoh-Aloba | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Erin Orebowale | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Rory Wilson | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Alfie Lynskey | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Mason Cotcher | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Trai-Varn Mulley | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Max Jenner | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Tay'Veon Smithen | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Oscar Johnson | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Jack McGrath | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Markie Meade | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Daniel Adediran | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Oliver Bindley | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Josh Blake | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Aston Villa | Rio Hammond | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Juan Musso | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Atlético de Madrid | Salvador Esquivel | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Atlético de Madrid | Alvaro Moreno | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Atlético de Madrid | Daniel Rubio | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Atlético de Madrid | Miguel Olarieta | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Atlético de Madrid | Romeo Hueso | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Lituba | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Arnau Solà | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Atlético de Madrid | Miguel Gil | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Cristian Grant | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Daniel Perez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Adrian Almeida | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Pablo Pan | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Adrián Martínez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | David Arza | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Taufyk Zanzi | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Jorge Castillo | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Atlético de Madrid | Ruben Gomez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | David Fernandez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Sergio Esteban | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Miguel Llorente | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Jesus Barrios | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Abdou Kemo Badji | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Joel Sanchez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Atlético de Madrid | Gonzalo Gross | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Eder Aller | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Barcelona | Iker Rodriguez | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Barcelona | Pesquer | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Landry Farré | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Guillem Victor | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Alex Campos | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Brian Fariñas | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Barcelona | Frenkie de Jong | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Barcelona | Orian Goren | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Pedro Villar | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Barcelona | Jesse Bisiwu | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Barcelona | Shane Kluivert | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bayern München | Sven Ulreich | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Bayern München | David Poder-Stiube | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Bayern München | Hiroki Ito | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bayern München | Cassiano Kiala | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bayern München | Filip Pavić | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bayern München | Tim Binder | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bayern München | David Daiber | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bayern München | Bastian Assomo | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bayern München | Maycon Cardozo | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bodø/Glimt | Martin Lund Andersen | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Bodø/Glimt | Isak Sjong | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Bodø/Glimt | Matias Jaiteh | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bodø/Glimt | Mathias Blix Olsen | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bodø/Glimt | Assan Sanyang | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bodø/Glimt | Kasper Solhaug | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Bodø/Glimt | Levi Monsen Yeboah | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bodø/Glimt | Erling Eliassen | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bodø/Glimt | Jesper Rabben Nygård | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Bodø/Glimt | Hindrin Chooly | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Borussia Dortmund | Patrick Drewes | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Borussia Dortmund | Silas Ostrzinski | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Borussia Dortmund | Alexander Meyer | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Borussia Dortmund | Jan Luca Riedl | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Borussia Dortmund | Miguel Adje | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Borussia Dortmund | Enzo Duarte | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Borussia Dortmund | Mussa Kaba | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Borussia Dortmund | Mathis Albert | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Nordin Jackers | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Club Brugge | Axl De Corte | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Club Brugge | Argus Vanden Driessche | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Club Brugge | Thibeau Kestemont | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Club Brugge | Joel Ordóñez | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Matteo Dams | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Samba Coulibaly | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Samuel Van Hoogen | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Andre Garcia | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Alexander Vandeperre | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Wout Verlinden | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Axl Wins | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Lynnt Audoor | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Jessi Da Silva | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Lucas Delorge | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Gianluca Okon | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Mohamed Galal Elbay | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Naim Amengai | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Club Brugge | Wisdom Mike | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Andrej Vasović | No | shots, shotsOnTarget | ID coerente | pending |
| Club Brugge | Jakke Van Britsom | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Como | Lorenzo Luigi Ginelli | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Como | Riccardo Cassano | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Fenerbahçe | Mert Günok | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Fenerbahçe | Kuzey Sapaz | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Fenerbahçe | Yasir Caklı | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Fenerbahçe | Yiğit Efe Demir | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Fenerbahçe | Kojo Peprah Oppong | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Fenerbahçe | Ognjen Mimović | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Fenerbahçe | Çağan Sarıdikmen | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Fenerbahçe | Bedirhan Korkmaz | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Fenerbahçe | Gökmen Özdemir | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Fenerbahçe | Efe Fettahoğlu | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Fenerbahçe | Emin Sayar | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Fenerbahçe | Güner Ekici | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Fenerbahçe | Emirhan Ateş | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Fenerbahçe | Alaettin Ekici | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Florian Kastenmeier | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Feyenoord | Mannou Berger | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Feyenoord | Liam Bossin | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Feyenoord | Stenn de Mol | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Feyenoord | Tim Haksteeg | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Feyenoord | Bart Nieuwkoop | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Gijs Smal | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Jordan Bos | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Marleyson Cruz | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Feyenoord | Twan Schens | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Hakeem Agboluaje | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Matthew Mparaganda | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Feyenoord | Dani Slory | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Boaz Plantinga | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Feyenoord | Jakub Moder | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Nick de Koning | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Feyenoord | Nassim El Harmouz | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Kevin Khan | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Feyenoord | Zino Sneijer | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Luca Dahl Tomasson | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Feyenoord | Arman Nahany | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Izu Onunta | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Feyenoord | Kelvin Neijenhuis | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Galatasaray | Günay Güvenç | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Galatasaray | Enes Büyük | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Galatasaray | El Chadaille Bitshiabu | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Yusuf Kahraman | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Cihan Akgün | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Necati Yançel | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Eyüp Karasu | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Furkan Koçak | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Berat Luş | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Onur Kağan Yıldız | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Galatasaray | Aleksei Batrakov | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Galatasaray | Arda Tagay | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Galatasaray | Ada Yüzgeç | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Inter | Raffaele Di Gennaro | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Inter | Ivan Provedel | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Inter | Francesco Stante | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-individual-review |
| Inter | Leonardo Bovio | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Inter | Mattia Marello | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Inter | Mattia Mosconi | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| LASK | Christof Katzmayr | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| LASK | Fabian Schillinger | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| LASK | Daniel Elfadli | No | shots, shotsOnTarget | ID coerente | pending |
| LASK | Jakob Wansch | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| LASK | Ryan Rodriguez German | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| LASK | Luca Ortner | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| LASK | Armin Midzic | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| LASK | Alan Wimmer | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| LASK | Sasa Kalajdzic | No | shots, shotsOnTarget | ID coerente | pending |
| LASK | Matthias Hartl | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| LASK | Paul Krapf | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Leipzig | Ørjan Nyland | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Leipzig | Franz Hantschmann | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Leipzig | Janos Kanyai | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Leipzig | Elian Hähner | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Leipzig | Abdoul Kone | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Leipzig | Benno Kaltefleiter | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Leipzig | Viggo Gebel | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Lens | Régis Gurtner | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Lens | Mathieu Gorgelin | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Lens | Daivy Lefranc-Yeboah | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Lens | Arthur Mogo Njimfo | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Lens | Fedwan Messaoudi | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Lens | Nidal Čelik | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Lens | Djulian Fernoc | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lens | Noé Kemtchoum | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lens | Léopold Joursky | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lens | Nathanaël Gane Bernardino | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lens | Lucas Robbe | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lens | Mohamed Seddik | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lens | Mezian Mesloub Soares | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Lille | Zadig Lanssade | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Lille | Thomas Sajous | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Lille | Loun Srdanović | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Liverpool | Giorgi Mamardashvili | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Liverpool | Freddie Woodman | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Liverpool | Vítězslav Jaroš | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Liverpool | Bailey Hall | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Liverpool | Conor Bradley | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Liverpool | Giovanni Leoni | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Liverpool | Luke Chambers | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Liverpool | Isaac Mabaya | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Liverpool | Joseph Bradshaw | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Oliver O'Connor | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | DJ Esdaille | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Lucas Pitt | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Wellity Lucky | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-list-B |
| Liverpool | Joshua Abe | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | La'More Lee Forrester | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Joseph Upton | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Hadyn Murray-Holme | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Erik Farkas | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Prince Cisse | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Alvin Ayman | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Ben Trueman | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Michael Laffey | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Afolami Onanuga | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Hugo Ekitiké | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Liverpool | Jayden Danns | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-list-B |
| Liverpool | Finn Inglethorpe | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Josh Sonni-Lambie | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Liverpool | Clae Ewing | Sì | minutes, shots, shotsOnTarget | ID non risolto | accepted-list-B |
| Manchester City | Marcus Bettinelli | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Manchester City | Gerónimo Rulli | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Manchester City | Max-Edgar Chabot | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Manchester City | Rayan Aït-Nouri | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Manchester City | Nico O’Reilly | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Manchester United | Karl Darlow | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Manchester United | Tom Heaton | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Manchester United | Dermot Mee | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Manchester United | Jaydan Kamason | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Manchester United | Daniel Armer | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Manchester United | Albert Mills | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Manchester United | Manuel Ugarte | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Manchester United | Jack Fletcher | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Manchester United | Tyler Fletcher | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Manchester United | Jim Thwaites | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Manchester United | Tynan Thompson | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Napoli | Claudio Pugliese | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Napoli | Nikita Contini | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Paris Saint-Germain | Alessandro Longoni | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Paris Saint-Germain | Lucas Chevalier | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Paris Saint-Germain | Arthur Vignaud | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Paris Saint-Germain | Adam Mouak | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Paris Saint-Germain | David Boly | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Paris Saint-Germain | Quentin Ndjantou | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | Cláudio Ramos | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Porto | João Costa | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Porto | João Afonso | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Porto | Gonçalo Ribeiro | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Porto | Luis Gomes | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Porto | Martim Cunha | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Porto | Martim Chelmik | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Porto | Tiago Silva | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | Bernardo Lima | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | João Teixeira | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | Samu | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | Duarte Cunha | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | André Miranda | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Porto | Mateus Mide | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Nick Olij | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| PSV Eindhoven | Tijn Smolenaars | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| PSV Eindhoven | Stijn Kuijsten | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| PSV Eindhoven | Jim Aerts | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| PSV Eindhoven | Kane Aerts | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| PSV Eindhoven | Michael Bresser | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Wessel Kuhn | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Fabian Merién | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| PSV Eindhoven | Floris Bos | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Madi Nsosemo | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Dyran Stam | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Brent Jonkers | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Rivas Manuhutu | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Kyano Penso | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Ezechiel Siani Emaga | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Jorvimar Martina | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Sébastien Ditmer | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Shuryjano Cornecion | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| PSV Eindhoven | Boet Mulders | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Gino Verhulst | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Jaden de Guzman | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Loek Schakenraad | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Sami Ouaissa | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| PSV Eindhoven | Mikkel Bro Hansen | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Sam Lammers | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| PSV Eindhoven | Manuel Bahaty | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Jairo Beerens | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Austyn Jones | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Fabio Kluit | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Liam van Nistelrooy | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| PSV Eindhoven | Samuel Dumbili | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Diego Conde | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Real Betis | Manu González | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Real Betis | Victor Kroes | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Real Betis | Carlos De Roa | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Jorge Oreiro | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Oscar Masque | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Miguel Cuevas | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Alvaro Díez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Carlos Lara | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Curro Macías | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Fabian Embalo | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Marcos Solis | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Iker Losada | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Betis | Ismael Barea | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Rica | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Iván Corralejo | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Miguel Angel Castilla | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Kike Collantes | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Ruben Lidueña | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Marcos Mora | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Miguel Angel | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | José Antonio Morante | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Rodrigo Marina | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Kwame Sosu | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Cayetano Cordón | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Antonio Gonzalez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Fran Batán | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Betis | Juan Rodriguez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Madrid | Andriy Lunin | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Real Madrid | Sergio Mestre | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Real Madrid | Javi Navarro | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Real Madrid | Raúl Asencio | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Jesús Fortea | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Joan Martínez | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Mario Rivas | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Thiago Pitarch | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Jorge Cestero | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Diego Villalba | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Madrid | Gabriel Valero | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Real Madrid | Sergio Martínez | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Rodrygo | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Real Madrid | Daniel Yáñez | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Roma | Devis Vasquez | No | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Roma | Giorgio De Marzi | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Roma | Alessandro Di Nunzio | Sì | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Roma | Antonio Arena | No | minutes, shots, shotsOnTarget | ID coerente | accepted-individual-review |
| Sabah | Amin Ramazanov | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Sabah | Rauf Ayyubov | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Sabah | Ravan Mirzammadov | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Sabah | Tellur Mutallimov | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sabah | Erivaldo Almeida | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sabah | Aleksey Isaev | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sabah | Rauf Rustamli | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sabah | Rodrigo Fernandes | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sabah | Jafar Mukhtarov | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sabah | Shahin Ibrahimov | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Shakhtar Donetsk | Kiril Fesiun | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Shakhtar Donetsk | Rostyslav Bahlai | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Shakhtar Donetsk | Marlon Santos | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Shakhtar Donetsk | Irakli Azarov | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Shakhtar Donetsk | Alaa Ghram | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Shakhtar Donetsk | Oleksandr Karavaiev | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Shakhtar Donetsk | Viktor Tsukanov | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Shakhtar Donetsk | Gabriel Carvalho | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Shakhtar Donetsk | Denys Smetana | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Shakhtar Donetsk | Ryan Roberto | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slavia Praha | Adam Rezek | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Slavia Praha | Adam Paar | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Slavia Praha | Ondřej Suchý | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Slavia Praha | Jakub Kolísek | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slavia Praha | David Barčot | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Štěpán Chaluš | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Filip Kočvara | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Martin Kovář | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Jáchym Palivec | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Vít Skokan | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Emmanuel Ayaosi | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Eliáš Piták | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slavia Praha | Karel Belžík | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slavia Praha | Ondřej Frolík | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Aleksa Ilinčič | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Jakub Kratochvíl | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Ondřej Mašek | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Martin Palaščák | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Adonija Ouanda | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Dan Kohout | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Matěj Kotrba | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slavia Praha | Petr Potměšil | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slavia Praha | Adam Procházka | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Slovan Bratislava | Aleksandar Popović | No | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Slovan Bratislava | Daniel Gramblička | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Slovan Bratislava | Dávid Balog | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Slovan Bratislava | Matúš Macík | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Slovan Bratislava | Samuel Kozlovský | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slovan Bratislava | Matúš Tomáško | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slovan Bratislava | Robert Tománek | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slovan Bratislava | Leo Hofstädter | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slovan Bratislava | Danylo Ihnatenko | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Slovan Bratislava | Daiki Matsuoka | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Kaique Pereira | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Sporting CP | Diego Callai | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Sporting CP | William Lodmell | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Sporting CP | Miguel Gouveia | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Sporting CP | Guilherme Pires | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Sporting CP | Francisco Silva | Sì | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Sporting CP | Moncef Zekri | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Francisco Cabeçana | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | João Muniz | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Diego Coxi | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | João Rijo | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Rodrigo Dias | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Bruno Ramos | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Andre Machado | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Miguel Alves | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Daniel Costa | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Salvador Blopa | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Denilson Santos | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Daniel Ciesielski | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Atanásio | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Rafael Mota | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Afonso Lee | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Duarte Tomás | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Lucas Dominguez | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | João Simões | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Micael Sanhá | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Diego Farinha | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Rayhan Momade | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Flávio Gonçalves | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Sandro Gambôa | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Ivanildo | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Rafael Camacho | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Martim Almeida | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Eduardo Felicíssimo | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Victor Bastianele | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Leonardo Varela | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Samuel Justo | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Rafael Nel | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Nuno Santos | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Chris Grombahi | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Rodrigo Rodrigues | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Sporting CP | Mauro Couto | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Sandro Ferreira | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Gabriel Silva | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Miguel Almeida | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Sporting CP | Martim Ribeiro | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Stuttgart | Marius Funk | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Stuttgart | Tom Walz | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Stuttgart | Lucas Nagel | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Stuttgart | Ameen Al-Dakhil | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Luca Jaquez | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Maximilian Herwerth | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Alexander Groiß | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Dominik Nothnagel | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Ertugrul Yigit | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Lauri Penna | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Stuttgart | Jarzinho Malanga | Sì | minutes, shots, shotsOnTarget | ID coerente | pending |
| Viking | Erlend Jacobsen | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Viking | Martin Roseth | No | minutes, shots, shotsOnTarget | ID coerente | pending |
| Viking | Nick D'Agostino | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Rubén Gómez | No | minutes, shots, shotsOnTarget | ID coerente | goalkeeper |
| Villarreal | Yakiv Kinareikin | No | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Villarreal | Pablo Polo | Sì | minutes, shots, shotsOnTarget | ID non risolto | goalkeeper |
| Villarreal | Diatta Alassane | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Nizar El Jmili | No | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Joselillo Gaitán | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Mahamoud Barry | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | César Bonafé | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Alvaro Alcaide | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Moussa Traore | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
| Villarreal | Douga Fofana | Sì | minutes, shots, shotsOnTarget | ID non risolto | pending |
