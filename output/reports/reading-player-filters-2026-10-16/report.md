# Filtri Giocatori

Modificati esclusivamente js/pages/reading-detail/people.mjs e evidence.mjs. Rimossi ricerca, contatore e filtri Tiri/SOT/Outsider dalla nuova interfaccia. Due pulsanti Titolari/Panchinari con selezione esclusiva e secondo clic per tornare a tutti. Le righe e le informazioni espandibili restano identiche.

Lo stato viene risolto tramite player ID nelle formazioni official/probable della fixture; panchina tramite identificativi espliciti dei sostituti o lineupStatus reserve della fonte probabile MD7. I nomi della panchina senza identita canonica non vengono abbinati per approssimazione. Stato ignoto o contraddittorio: visibile soltanto in modalita completa. Nessuna dipendenza dai minuti giocati; stato probabile mantenuto distinto dall'ufficialita per gli altri componenti.

Verifiche browser a 1440/390 px sui tre piloti: tutti -> titolari -> tutti -> panchinari -> tutti; passaggio diretto fra i filtri; dettagli espandibili e tastiera; confronto delle righe con la versione precedente, stesse statistiche, outsider e dettagli; altre sezioni identiche; due colonne; fallback legacy; nessun errore JavaScript o overflow. Test classificazione con ID titolare, ID panchinaro, ID mancante, stato reference e conflitto; test Letture interni/adattatori e diff --check superati.

Nei dati attualmente presenti nell'elenco Giocatori dei piloti tutti i record sono titolari: Atalanta-Venezia 20, Inter-Club Brugge 22, Milan-Atalanta 20. Il filtro Panchinari mostra correttamente uno stato vuoto informativo: non vengono aggiunti giocatori o inventate proiezioni. Conteggi e screenshot in results.json e PNG della cartella.

Nessuna modifica a CSS, dati, formazioni, pronostici, statistiche, motori, store o database in questo intervento. Modifiche CSS preesistenti preservate. Nessun commit/push/deploy.
