# Ripristino footer e colori navbar

Versione recuperata: `614977ee551acc2d05a042eb7aa0472f4c9b4caf`, precedente al primo restyling delle Letture (`4c96459c`). Il footer condiviso e i colori di navbar Serie A e Champions in quella versione sono ancora presenti negli attuali `css/layout.css` e nelle regole originali di `css/champions.css`; markup e responsive del footer risultano invariati.

Intervento: rimosse le sovrascritture locali introdotte dalle nuove Letture e dal successivo restyling Champions (`5c6160b1`). Non sono stati ripristinati interi file. Le pagine Champions squadra usano lo stesso componente e le stesse regole condivise della overview.

File applicativi modificati:
- css/reading-detail.css
- css/champions.css

Nel menu mobile Champions il fondino chiaro originale richiede testo scuro per le voci non attive: riutilizzato il colore originale `#283a3b`; voce attiva e logo bianco preservati.

Verifiche: 14 casi a 1440/390 px sulle tre Letture pilota, overview Champions, squadra Inter Champions, homepage Serie A e squadra Atalanta. Confronto browser con la versione originale per colori e stili navbar/footer, font, padding, griglie e dimensioni. Colore ereditato del solo contenitore header escluso dal confronto, poiche il contenitore non contiene testo diretto: il colore effettivo del brand e stato confrontato. Markup di navbar/footer, collegamenti, geometria navbar e DOM principale identici alla baseline. Menu mobile apertura/chiusura, assenza overflow ed errori JavaScript verificati. Test Letture interni e adattatori superati; git diff --check superato. Controllo aggiuntivo del contrasto menu Champions a 390 px.

Screenshot e risultati dettagliati nella stessa cartella. Nessun dato, motore, previsione, grafico o formazione modificato; nessun build, commit, push o deploy eseguito.
