# Restyling condiviso delle Letture — 16 ottobre 2026

## Copertura

Il layout approvato è diventato quello predefinito delle Letture esistenti. Il parametro `layout=legacy` conserva la vista precedente. Non sono state create nuove pagine, fixture o previsioni.

| Competizione | Letture presenti nell'indice, migrate e verificate | Concluse | Future |
| --- | ---: | ---: | ---: |
| Serie A, giornate 1–19 | 190 | 60 | 130 |
| Champions League, giornate 1–2 | 36 | 36 | 0 |

Nessuna Lettura presente nei due indici è stata esclusa. Il conteggio riguarda le Letture effettivamente collegate: il renderer Serie A continua a supportare anche gli ID del calendario già gestiti prima dell'intervento. Non sono stati aggiunti collegamenti a giornate o Letture mancanti.

## Componenti modificati

- `js/pages/reading-detail/view-model.mjs`: eliminazione della restrizione alle tre fixture pilota; fallback legacy e separazione delle competizioni conservati.
- `js/pages/reading-detail/shell.mjs`: sezioni e sottonavbar coerenti con i contenuti montati; stato attivo al clic; pronostici assenti per le gare concluse; conservazione dei pronostici originali quando non esiste un catalogo condiviso; nessuna sezione vuota né nuova schedina per gare prive di pronostici; rimozione dei blocchi scartati, con tutela delle attribuzioni obbligatorie.
- `js/pages/reading-detail/people.mjs`: disciplina e profilo arbitrale originali mantenuti direttamente, senza la variante semplificata e senza ricalcolo.
- `js/pages/reading-detail/evidence.mjs`: utilizzo delle formazioni Champions già presenti anche senza integrazione MD2; visualizzazione dei nomi noti e delle panchine senza richiedere proiezioni individuali. Nessuna identità ricostruita per somiglianza e nessun valore mancante trasformato in zero.
- `js/pages/reading-detail/tactics-history.mjs`: informazioni tattiche non duplicate; andamento recente delle gare precedenti disponibili, con cronologia e risultati consultabili; soli precedenti nella relativa sezione, senza il blocco Storico eliminato.
- `css/reading-detail.css`: stili condivisi del grafico recente, con palette separate e campo originale conservati; eliminato l'override del menu Champions per mantenere i colori della navigazione originale.
- `scripts/build-site.js`: opzione `--reading-pages-only`, che rigenera esclusivamente `lettura.html` e `champions-league.html` senza policy sui titolari, builder statistici, dati o altre pagine. Aggiornate le versioni di cache dei due contenitori.
- Test: `scripts/check-reading-universal.cjs`, `scripts/test-reading-detail-adapters.mjs`, `scripts/test-reading-detail-internals.mjs`.

Le due route continuano a usare `js/public-presentation.js`. Navbar e footer provengono dai template originali.

## Verifiche

- Browser: tutte le 226 Letture a 1440 px; controllo del layout condiviso, corrispondenza sezioni/sottonavbar, risultato ufficiale, palette, assenza di Pronostici nelle gare concluse, errori JavaScript, fallback involontari e overflow orizzontale.
- Responsive e interazioni: 1440, 768 e 390 px su Atalanta–Venezia MD6, Milan–Atalanta MD7, Atalanta–Sassuolo MD1, Bologna–Genoa MD19, Inter–Club Brugge MD2 e AEK–LASK MD1. Verificati navigazione di sezione, stato attivo, filtri Titolari/Panchinari, ripristino dell'elenco completo e overflow.
- Navigazione: Schedina Champions MD2 → Lettura tramite collegamento diretto; Schedina Serie A MD7 e pagina Milan → Lettura attraverso l'indice esistente.
- Fallback legacy: verifica browser Serie A e test del gate per entrambe le competizioni.
- Test Node superati: adattatori, componenti interni, contratti BetSelection, store personale/MyCombo, moduli CSS e controlli sintattici.
- `git diff --check` superato sui file dell'intervento. Eventuali modifiche concorrenti esterne non sono state corrette o annullate.

Esito finale browser: SUPERATO. 190 Letture Serie A e 36 Champions; nessun errore JavaScript, fallback involontario o overflow nei controlli eseguiti. Superate le 18 combinazioni responsive dei sei campioni e i tre percorsi di navigazione.

## Protezione dei dati

Il confronto con lo snapshot Git `6e2bafd0`, precedente alle modifiche grafiche, non rileva differenze nei dati e nei motori sotto `scripts/predictions`. Il manifest `protected-files.json` registra gli hash SHA-256 di 8.736 file: il confronto successivo non rileva file modificati.

Pronostici, quote Sisal, probabilità, EV, contratti, identificativi, snapshot, risultati, statistiche, dati normalizzati e registri degli esiti non sono stati modificati da questo intervento. Non sono stati eseguiti builder statistici o importatori. I test del contratto hanno verificato 6 schedine, 137 selezioni MyCombo e 137 prediction legs.

## Limiti dei dati e contesto

- Non sono presenti distribuzioni percentuali verificate dei tiri per zona nei dati utilizzati. Il campo relativo non viene inventato; i canali d'attacco disponibili restano esplicitamente distinti dalle coordinate dei tiri.
- Le 36 Letture Champions attualmente disponibili sono concluse. Il caso futuro Champions è verificato nell'adattatore con una copia di test della fixture, senza modificare file o previsioni; non viene presentata una partita futura inesistente.
- Nomi noti ma privi di ID canonico, numeri di maglia o statistiche mantengono i valori non disponibili.
- Durante il lavoro altri processi hanno creato commit e modifiche nello stesso checkout. Questo intervento non ha eseguito commit, push o deploy né annullato attività concorrenti.

Evidenze: `browser-audit.json`, `protected-files.json`, `interactions.json` e schermate di header/formazioni nella presente cartella.
