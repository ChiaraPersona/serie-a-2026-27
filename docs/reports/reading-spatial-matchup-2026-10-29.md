# Zone di conclusione nella Lettura

Implementazione locale del 29 ottobre 2026. Nessun commit, push o deploy.

## Comportamento

La Lettura Serie A usa le posizioni storiche verificate di tiri e gol in due punti:

- Scenario: due commenti descrittivi incrociano l'attacco di ciascuna squadra con le zone concesse dall'avversaria.
- Analisi tattica: campo con tiri effettuati e concessi sovrapposti, selettore della squadra che attacca, filtro tiri/gol, tabella per zona e copertura esplicita.

Ogni fixture usa esclusivamente gare concluse con data strettamente precedente. Sono escluse anche altre gare dello stesso giorno: criterio conservativo in assenza di un timestamp certificato di conclusione. Non è inclusa la partita analizzata, nemmeno nelle Letture archiviate. Le proiezioni verificano che punteggi e totali dei tiri dei referti normalizzati coincidano ancora con il calendario corrente; in caso di cambiamento successivo escludono la gara fino alla nuova riconciliazione.

Il confronto principale esclude rigori e autogol. Le azioni rimanenti sono chiamate tiri senza rigore: i referti non distinguono in modo completo gioco aperto, punizioni e sviluppi di corner. Il punto rappresenta la conclusione, non il canale di costruzione dell'azione o il punto d'ingresso in porta.

I commenti richiedono almeno cinque gare per ciascuna squadra e almeno cinque tiri per ciascun lato nella zona evidenziata. Questi limiti sono una regola descrittiva esplicita, non una soglia di significatività statistica o un nuovo criterio di selezione. L'ordinamento usa la quota comune dei tiri localizzati nei due campioni. Nessuna probabilità, quota equa, EV, peso o selezione viene modificata.

## Copertura e riconciliazione

Perimetro del registro: 88 gare concluse, 274 gol.

- 2.562 tentativi senza autogol nel flusso degli eventi; otto registrazioni tecniche escluse: sette parate attribuite al portiere con zero tiri individuali espliciti e un duplicato gol privo di coordinate.
- 268/274 gol associati a identità canonica e minuto compatibile. I clock originali e il minuto canonico restano distinti; la compatibilità del recupero non riscrive i marcatori.
- Sei gol non utilizzabili: tre discordanti nel minuto, uno discordante nell'identità dell'autore dell'autogol, due senza identità canonica verificata.
- 85/88 gare utilizzabili per il confronto dei tiri. Le altre tre sono conservate integralmente ma escluse perché il totale dei tiri differisce di un'unità dal registro canonico.
- Nessun xG per singolo evento nei referti impiegati: `xg: null` nell'archivio, `N/D` nell'interfaccia. Gli xG complessivi di squadra non vengono distribuiti artificialmente sulle zone. Le mappe di un altro archivio locale coprono soltanto 24 gare e non sono state mescolate a questo campione.

### Gare escluse dal confronto

| Fixture | Totale del referto / registro |
|---|---|
| Cagliari–Inter, MD2 | Inter 30 / 31 tiri |
| Como–Parma, MD4 | Como 28 / 29 tiri |
| Sassuolo–Juventus, MD4 | Juventus 18 / 19 tiri |

### Gol conservati soltanto nell'archivio tecnico

| Fixture | Caso |
|---|---|
| Milan–Venezia, MD2 | Il referto indica autogol Halhal; il registro attribuisce l'autogol a Correia |
| Frosinone–Venezia, MD3 | Minuto Yeboah non riconciliato |
| Roma–Atalanta, MD3 | Minuto Hermoso non riconciliato |
| Lecce–Monza, MD4 | Exequiel Zeballos / Zeballos: manca un'associazione esplicita verificata |
| Frosinone–Como, MD5 | Minuto Kvernadze non riconciliato |
| Lecce–Bologna, MD6 | Jay Enem / Enem: manca un'associazione esplicita verificata |

Non si usano associazioni per solo cognome. Le identità non risolte dei tiri non in gol restano nulle: possono contribuire al campione territoriale di squadra se la posizione e i totali sono riconciliati, senza attribuzione individuale pubblica.

## Dati e aggiornamento

- `data/sources/serie-a-shot-events-manifest-2026-27.json`: URL, ID provider, snapshot, hash SHA-256 e sistema di coordinate originali.
- `data/raw/serie-a-shot-events/2026-27/`: 88 referti HTML compressi e riproducibili.
- `data/normalized/serie-a-shot-events-2026-27.json`: eventi, identità, controlli per gara, coordinate e quarantena.
- Le proiezioni Lettura includono soltanto l'incrocio della fixture, senza URL, nomi provider o metadati di provenienza nell'interfaccia.

Il sistema originale usa `x: 0–10000`, `y: 0–6000`. Gli attacchi della squadra di casa sono orientati verso x crescente e quelli ospiti verso x decrescente. La normalizzazione porta tutti gli attacchi verso destra, ruotando entrambi gli assi per gli ospiti. La verifica dei rigori presenti dà sempre la posizione normalizzata `(88, 50)`; non è una conversione certificata in metri. Le zone seguono area/non area e tre fasce trasversali; i limiti dell'area replicano il disegno del campo del renderer originale.

Comandi:

```text
npm run build:reading:spatial
npm run test:reading:spatial
npm run test:reading:spatial:browser
```

Il builder riusa prima gli snapshot canonici verificandone l'hash; per inizializzare i referti mancanti può usare le evidenze dell'audit precedente. Non effettua download impliciti. Per nuove gare occorre acquisire e verificare esplicitamente i relativi referti; in assenza, la copertura rimane parziale.

## Verifiche

- Build della pagina Lettura e di tutte le 380 proiezioni eseguito senza ricalcolo dei motori.
- Test specifico: cutoff di tutte le fixture, esclusione della stessa partita e di risultati diventati obsoleti, rigori, autogol, deduplicazione, parate, coordinate, `null` xG, provenienza interna e escaping HTML.
- Test esistenti `test-reading-browser-data.mjs`, `test-reading-detail-internals.mjs`, `test-reading-detail-adapters.mjs` superati.
- Browser Edge: nove stati Serie A a 1440, 390 e 320 pixel, interazioni attacco/gol, tabella senza sovrapposizioni, assenza di richieste dell'archivio completo e regressione Champions.
- Schermate e risultato browser in `output/reading-spatial-2026-10-29/`.
- Previsioni, Schedina MD9, catalogo mercati MD9, risultati canonici e registro dei titolari confrontati con HEAD: invariati.

Nessun aggiornamento di formazioni ufficiali effettuato in questo lavoro; il filtro titolari e le selezioni salvate mantengono i contratti esistenti. I test delle proiezioni hanno verificato la corrispondenza con i cataloghi canonici e il filtro operativo esistente.
