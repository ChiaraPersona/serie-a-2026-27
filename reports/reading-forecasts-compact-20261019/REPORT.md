# Letture Serie A — Pronostici completi e compatti

Intervento concluso. Nessun commit, push, deploy o builder di dati/previsioni eseguito.

## Risultato

La sezione mostra tutti i mercati pubblicati dal catalogo condiviso, con gli stessi ID e criteri di pubblicazione della Schedina. Eliminata la restrizione alle sole previsioni canoniche. Nessuna seconda copia dei dati o nuovo calcolo.

Ogni riga contiene esclusivamente **Nome pronostico | Probabilità | Quota | +**. Nessuna categoria, descrizione, badge o metadato secondario. Filtri e relativi handler rimossi, senza contenitori vuoti. Conservato l'ordine del catalogo, con deduplicazione per ID che mantiene la prima occorrenza, come Schedina. Nessun raggruppamento aggiuntivo.

Tabella a larghezza fluida, cifre tabulari e separatori sottili; righe desktop di 53px, incluso pulsante di 36px. Su mobile il nome va a capo senza troncamenti: le denominazioni contrattuali particolarmente lunghe possono occupare più di due righe a 320px. Numeri e pulsante restano nelle proprie colonne. Scorrimento verticale della pagina, nessuno scroll orizzontale introdotto.

Il pulsante diventa «−» quando selezionato, con aria-pressed e nome accessibile Aggiungi/Rimuovi. Contratti quotati verificati e previsioni canoniche senza quota usano lo stesso store. I mercati in sola consultazione hanno pulsante disabilitato. Nessuna quota, probabilità DUO o totale assente ricostruito: «—» resta «—».

## Mercati prima/dopo nelle partite verificate nel browser

| Partita | Giornata | Stato nel dataset | Prima | Dopo | Non pubblicati/ammissibili esclusi |
|---|---|---|---:|---:|---:|
| Frosinone Sassuolo | MD7 | Conclusa | 0 | 22 | 144 |
| Venezia Napoli | MD7 | Conclusa | 0 | 19 | 154 |
| Bologna Inter | MD7 | Conclusa | 0 | 20 | 147 |
| Roma Genoa | MD7 | Conclusa | 0 | 16 | 151 |
| Udinese Lecce | MD7 | Programmata | 0 | 17 | 151 |
| Fiorentina Como | MD7 | Programmata | 4 | 21 | 153 |
| Milan Atalanta | MD7 | Programmata | 4 | 26 | 146 |
| Juventus Lazio | MD7 | Programmata | 4 | 30 | 151 |
| Monza Cagliari | MD7 | Programmata | 4 | 25 | 148 |
| Parma Torino | MD7 | Programmata | 4 | 21 | 148 |
| Atalanta Venezia | MD6 | Conclusa | 0 | 15 | 126 |

I conteggi Prima sono ricostruiti dal renderer precedente e dallo stesso catalogo filtrato sulle canoniche; Fiorentina–Como e Udinese–Lecce hanno anche confronto DOM e screenshot della baseline diretta nelle due viste a 1440/390. I conteggi Dopo sono verificati nel browser per tutte le undici partite, nelle viste universale e legacy, a cinque larghezze.

MD7: 217 mercati pubblicati su 1.710 voci tecniche; 20 previsioni canoniche senza quota comprese nel totale. Il catalogo tecnico contiene anche mercati non pubblicati, che non diventano selezioni operative. MD6: 169 pubblicati su 1.537 voci; verificato nel browser il caso concluso Atalanta–Venezia (15), gli altri conteggi MD6 sono solo controlli di catalogo.

## Esclusioni e corrispondenza con Schedina

Applicato sharedForecastsForMatch senza modificarlo: controlli di pubblicazione, ritiro, contratto/quote e titolari invariati. Nei cataloghi MD6/MD7 risultano esclusi 2.858 mercati non pubblicati e 3 non titolari, per 2.861 voci escluse complessive. Il motivo riportato è il primo motivo verificato: una voce può fallire più criteri.

Esclusioni per non titolarità preservate:

- Frosinone–Sassuolo: bet:sisal:frosinone-sassuolo-2026-27-md-07:5384988684.
- Venezia–Napoli: forecast:v2:venezia-napoli-2026-27-md-07:matteo-politano:sot:1.
- Venezia–Napoli: forecast:v2:venezia-napoli-2026-27-md-07:matteo-politano:shots:2.

**Differenze di elenco rispetto al catalogo pubblicato: nessuna** nelle undici partite/browser verificate. Gli ID delle Letture coincidono esattamente con gli ID pubblicati, nell'ordine previsto, su tutte le 110 viste. Confronto diretto con gli ID DOM di Schedina per le gare operative MD7; per quelle concluse il DOM Schedina non espone l'ID per riga: verificati numero, etichette e ordine contro il medesimo catalogo canonico, senza attribuire al DOM identificativi che non possiede. Evidenze: catalog.json e functional.json.

## Test e risultati

| Test | Risultato |
|---|---|
| 11 partite × 2 layout × 5 viewport (1440/1050/768/390/320) | **PASS**, 110 viste, zero overflow e zero errori JS |
| ID visualizzati uguali al catalogo pubblicato | **PASS**, nessuna differenza |
| Righe con sole quattro celle, nessun metadato e nessun filtro | **PASS**, tutti i controlli DOM |
| Gare concluse MD7 e Atalanta–Venezia MD6 | **PASS**, pulsanti tutti disabilitati |
| Aggiunta mercato quotato + canonica senza quota, 2 layout × 5 viewport | **PASS**, 10 percorsi end-to-end |
| Tastiera, focus visibile e controllo di almeno 36px | **PASS** |
| Reload, deduplicazione DUPLICATE, Schedina → Lettura → rimozione | **PASS** |
| Totale non calcolabile con canonica senza quota | **PASS**, «—» |
| Tutti i 140 mercati MD7 di gare non concluse sottoposti allo store isolato | **PASS**, nessun rifiuto inatteso |
| check-schedina-md07-browser.cjs | **PASS**, 10 fixture a 1440/390 |
| test-reading-detail-internals.mjs | **PASS**, provider/canoniche, finished, markup compatto |
| test-personal-betslip.mjs | **PASS** |
| test-betting-selection-contract.js | **PASS**, 6 Schedina + 137 MyCombo + 137 prediction legs |
| test-css-modules.js | **PASS**, entry 994 byte |
| Hash CSS della shell lettura.html | **PASS**, 18 link verificati |

Test esterni di interazione in functional.cjs; screenshot/audit in audit.cjs. Nessun dato è stato cambiato per superare i controlli. Prima dell'ultima verifica degli hash è stata rilevata la variazione concorrente del CSS Champions; aggiornati i riferimenti nella sola shell Lettura e ripetuto il controllo, PASS.

## Protezioni e regressioni

Confrontati 9.680 file della baseline, inclusi **9.114 file dati tutti invariati**. Contratto condiviso, store personale, motori, Schedina e MyCombo invariati.

Renderer readingIndex e CSS readings-index.css identici alla baseline: Home Letture e quadratini delle giornate non modificati. Confronto del contenuto DOM delle altre sezioni nelle otto viste comuni prima/dopo: **nessuna differenza** in Scenario, Formazioni, Giocatori, Disciplina, Analisi tattica e Precedenti. Nessuna nuova fotografia, fonte pubblica o badge Preferiti introdotto.

Rilevate e preservate modifiche concorrenti in css/champions.css e js/pages/champions.js: **non sono interventi effettuati per questa richiesta** e non sono state sovrascritte. Registrate separatamente in integrity.json.

Nessuna regressione rilevata nei controlli eseguiti. Non è stato rieseguito l'audit dell'intero sito o di tutte le Letture delle altre giornate; la copertura di questa modifica è quella indicata sopra. La verifica accessibilità copre markup tabellare, nomi accessibili, focus, tastiera e dimensioni dei controlli; non costituisce una certificazione completa.

## File modificati da questo intervento

- css/reading-detail.css
- js/pages/reading-detail/forecasts.mjs
- js/pages/reading-detail/serie-a-adapter.mjs
- js/pages/reading-detail/shell.mjs
- js/pages/readings.js
- scripts/check-reading-universal.cjs
- scripts/check-schedina-md07-browser.cjs
- scripts/test-reading-detail-internals.mjs
- lettura.html

- forecasts.mjs: catalogo completo, deduplicazione, righe compatte, ammissibilità e pulsanti.
- serie-a-adapter.mjs e shell.mjs: trasporto/montaggio dei mercati pubblicati senza sezioni vuote.
- readings.js: sezione legacy riutilizzante il medesimo componente e store; indice invariato.
- reading-detail.css: regole locali della tabella, cifre, pulsanti e responsive.
- lettura.html: aggiornamento delle sole risorse di presentazione e versioni cache.
- Tre script di test: aggiornate le aspettative dalla restrizione canonica al catalogo pubblicato.

Artefatti della verifica in questa cartella (baseline, JSON, script e screenshot). Il test MD7 aggiorna anche i consueti artefatti output/reports/serie-a-md07-1440.png, serie-a-md07-390.png e serie-a-md07-browser-audit.json.

## Screenshot prima/dopo

[Galleria comparativa](comparisons.html).

- Fiorentina–Como desktop: [prima](before-fiorentina-como-2026-27-md-07-universal-1440.png) / [dopo](after-fiorentina-como-2026-27-md-07-universal-1440.png).
- Fiorentina–Como mobile: [prima](before-fiorentina-como-2026-27-md-07-universal-390.png) / [dopo](after-fiorentina-como-2026-27-md-07-universal-390.png).
- Udinese–Lecce mobile: [prima, sezione assente](before-udinese-lecce-2026-27-md-07-universal-390.png) / [dopo, 17 mercati](after-udinese-lecce-2026-27-md-07-universal-390.png).
- Legacy mobile: [prima](before-fiorentina-como-2026-27-md-07-legacy-390.png) / [dopo](after-fiorentina-como-2026-27-md-07-legacy-390.png).

Intervento terminato, senza avviare altre modifiche.
