# Semplificazione Letture pilota

Modifiche applicative limitate a `js/pages/reading-detail/shell.mjs` e a una regola di spaziatura finale in `css/reading-detail.css`. Il precedente restyling Giocatori è preservato integralmente.

- Atalanta–Venezia MD6 e Inter–Club Brugge MD2: rimossi dal rendering Pronostici, Tabellino e risultati, Fonti e metodo; sei sezioni e link discreto agli esiti nella Schedina esatta per competizione/giornata. I riferimenti ai mercati nelle schede rimaste portano alla stessa Schedina.
- Milan–Atalanta MD7: rimossi soltanto Tabellino e risultati e Fonti e metodo; sette sezioni, Pronostici completi, filtri, quote e schedina personale conservati.
- Solo lo stato esplicito `finished` rimuove i Pronostici; orario passato, risultato parziale e stati live non bastano.
- Numerazione sequenziale e navigazione limitata alle sezioni montate; spazio finale aggiuntivo riservato soltanto alle pagine con pulsante flottante.
- Nessuna modifica ai renderer legacy, alle procedure degli esiti, ai dati, motori, mercati, quote, contratti, store o snapshot. Nessuna rigenerazione.

## Altezze complete delle pagine

Edge headless, viewport alto 1000px, font caricati, dettagli chiusi e schede iniziali. Misura `document.documentElement.scrollHeight`, inclusi header e footer; confronto nelle medesime condizioni.

| Fixture | Larghezza | Prima | Dopo | Riduzione |
|---|---:|---:|---:|---:|
| Atalanta–Venezia | 1440 | 12200 px | 5774 px | 52,7% |
| Atalanta–Venezia | 768 | 12480 px | 5927 px | 52,5% |
| Atalanta–Venezia | 390 | 15110 px | 6914 px | 54,2% |
| Inter–Club Brugge | 1440 | 9289 px | 5796 px | 37,6% |
| Inter–Club Brugge | 768 | 9526 px | 5926 px | 37,8% |
| Inter–Club Brugge | 390 | 11274 px | 6676 px | 40,8% |
| Milan–Atalanta | 1440 | 10805 px | 10357 px | 4,1% |
| Milan–Atalanta | 768 | 11068 px | 10600 px | 4,2% |
| Milan–Atalanta | 390 | 13712 px | 13234 px | 3,5% |

La riduzione più contenuta su Milan è prevista: i Pronostici rimangono interamente presenti.

## Test e integrità

- Nove casi browser: tre fixture × 1440/768/390. Sezioni, numerazione, navigazione verso ogni sezione, assenza degli elementi rimossi, destinazioni Schedina con pannelli esiti della fixture esatta consultabili; filtri e dialog schedina MD7. Nessun errore console o overflow.
- Confronto integrale del DOM delle sezioni rimaste (esclusa soltanto la numerazione): invariato, incluso Giocatori.
- Nove fallback espliciti `layout=legacy` e tre fallback automatici: DOM originale ripristinato integralmente.
- Sei controlli fuori perimetro (indici Letture/Champions, squadra Champions, Coppa, Schedina MD7, altra fixture): DOM invariato.
- Test di stato finale/destinazioni mancanti o non supportate, interni Letture, adattatori, schedina personale e `git diff --check` superati. I due primi tentativi browser hanno richiesto di correggere il selettore del test per i pannelli Schedina chiusi e il confronto dei report appena tracciati dal commit esterno; non sono stati cambiati dati o snapshot per far passare i controlli.
- Hash confrontati su 13603 file della baseline: soltanto le due modifiche UI previste; nessuna variazione inattesa. Dettagli in `integrity.json`.

Durante la verifica due commit esterni hanno registrato modifiche già presenti, incluso il restyling Giocatori e questa semplificazione. HEAD iniziale `5d35e1bd59d7e6a9822823438f27bd948f0a9f55`, finale `e21a9d3f8a841f2ffffbba7ba164ec04337c62f0`. Nessun commit, push, deploy o ripristino eseguito dall'agente; nessuna variazione concorrente inattesa dei contenuti applicativi.

Artefatti di questa attività soltanto nella presente directory: `check.cjs`, `test.mjs`, `fallback.cjs`, `before.json`, `after.json`, `integrity.json`, questo documento e sei screenshot `{atalanta,inter,milan}-{1440,390}.png`.
