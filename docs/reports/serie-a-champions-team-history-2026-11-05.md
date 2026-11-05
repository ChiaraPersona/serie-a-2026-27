# Storico recente Serie A + Champions

Le pagine squadra e la sezione Precedenti delle Letture Serie A mostrano uno storico recente unico delle ultime dieci gare concluse disponibili. Ogni riga indica data, competizione, avversario, casa/trasferta, risultato dalla prospettiva della squadra e statistiche disponibili (tiri, SOT, corner, falli, gialli, rossi, possesso e xG). I dati mancanti restano null/N/D, senza inferenze.

La proiezione `data/generated/serie-a-team-history.json` viene costruita da `scripts/build-serie-a-team-history.cjs` usando `data/normalized/matches.json` e `data/normalized/champions-league-2026-27.json`. Il collegamento tra competizioni usa esclusivamente gli slug canonici del branding Champions presenti nel registro delle squadre Serie A. Attualmente Como, Inter, Napoli e Roma hanno quattro gare Champions ciascuna (16 righe squadra complessive); le altre squadre mantengono la propria copertura di campionato.

La vista condivisa è `js/components/team-match-history.mjs`. Le Letture incorporano solo le righe pertinenti alle due squadre, con cutoff esclusivo della data della fixture; le gare senza data usano lo storico disponibile, senza inventare una data. I precedenti diretti restano distinti dallo storico recente di ciascun club. Statistiche aggregate, motori, pronostici, quote, criteri di selezione e archivi canonici non sono modificati. Fonti e metadati restano interni; la nuova interfaccia non contiene provenienza o link ai provider e usa la policy pubblica già condivisa dalle pagine.

Verifiche: `scripts/test-serie-a-team-history.cjs` controlla ordine, duplicati, copertura, risultato/statistiche rispetto agli originali, cutoff, valori mancanti e proiezioni. Superati anche i test dati Letture MD11 e contratti/salvataggi Schedina MD11. Build completo di presentazione eseguito con acquisizione prospettica disabilitata. Verificate Inter, Atalanta, Lettura Inter–Como MD11 e Lettura storica Inter–Parma MD6 a 1440 e 390 pixel: nessun errore JavaScript o overflow pagina; tabella scorribile. Evidenze in `output/team-unified-history/`.

Nessun commit, push o deploy.
