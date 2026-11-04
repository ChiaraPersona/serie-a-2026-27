# Statistiche arbitrali nelle Letture Champions MD4

Le 18 designazioni avevano `statistics: null`; il ramo MD4 della pagina non caricava i profili storici già disponibili. Aggiunto un dataset descrittivo per fixture, collegato alla pagina senza modificare calendario, designazioni, pronostici, quote o liquidazioni.

14 profili recuperati dagli snapshot interni del 13 e 20 ottobre, verificati tramite SHA256 dei raw. Quattro acquisizioni del 3 novembre: João Pedro Silva Pinheiro (FootyMetrics 25), Jesús Gil Manzano (129), Maurizio Mariani (134), Sander van der Eijk (86). URL, timestamp, hash e snapshot compressi sono conservati internamente. Le equivalenze João Pinheiro/João Pedro Silva Pinheiro e van der Eijk/Sander van der Eijk sono esplicite; nessun ID canonico nuovo è stato inventato. L'associazione pubblica verifica fixture, ID se presente e nome esatto della designazione.

I campioni storici comprendono più competizioni. La pagina mostra gialli, rossi, falli e rigori per gara, numero di gare e data dello snapshot. Non sono medie stagionali Champions: il pannello condiviso le conserva nel campione storico separato; campioni stagionali e ultime cinque rimangono N/D quando mancanti. Cutoff dell'aggregato non certificato; rossi diretti e seconde ammonizioni non separabili. Nessuna attivazione nel motore previsionale.

Rigenerazione: `node scripts/build-champions-md04-referees.cjs`, poi `node scripts/build-site.js --presentation-only --champions-page-only`. Il primo comando riusa gli snapshot esistenti e può acquisire da rete i quattro raw mancanti.

Verifica: `node scripts/check-champions-md04-referees-browser.cjs`, 36 casi (18 fixture, 1440 e 390 px), quattro valori esatti per gara, campione e limiti, nessun provider/link di provenienza visibile, nessun errore JavaScript o overflow. Evidenze in `output/champions-md04-referee-statistics/verification.json`; screenshot del pannello alle due larghezze. Verificate anche le identità discordanti: il raccordo le rifiuta. Nessun commit, push o deploy.
