# Consegna Letture pilota D–H

Implementazione limitata ad Atalanta–Venezia MD6, Inter–Club Brugge MD2 e Milan–Atalanta MD7. D/E conservati e verificati; F/G/H completati. Nessun commit, push, deploy o rigenerazione dati.

## File applicativi

Modificati: `css/reading-detail.css`, `js/pages/readings.js`, `js/pages/champions.js`, `js/pages/reading-detail/{shell,scenario,forecasts}.mjs`.

Creati: `js/pages/reading-detail/{evidence,people,tactics-history,verification}.mjs`, `scripts/test-reading-detail-internals.mjs`.

La specifica, i motori, i dati, i contratti, lo store e gli snapshot restano invariati. Il precedente file di interruzione non è stato toccato. Gli artefatti di questa sessione sono esclusivamente nella presente directory: baseline e integrità JSON, script di verifica/server locale, risultati dei test/browser, screenshot PNG e questo documento. `browser-partial.json` e `browser-failure.png` documentano il problema iniziale del reset dei filtri, poi corretto; il risultato definitivo è `final-browser-results.json`.

## Implementazione

- KPI e confronti, risultato previsto e alternative, qualità e fonti.
- Pronostici espandibili, filtri combinabili, quote/probabilità/EV distinti, dialog schedina desktop/mobile sullo store esistente, reset filtri corretto.
- Campo unico con entrambe le formazioni, numeri verificati, stato ufficiale/probabile, distinta completa e panchine; giocatori ricercabili, Tiri/SOT/Outsider e mini-dashboard.
- Disciplina in Squadre/Arbitro/Ammoniti, mercati originali collegati, evidenze disponibili e limiti espliciti.
- Sintesi tattica visibile, Casa/Ospite/Duelli, direzioni e canali d'attacco distinti dalle zone tiro; forma e storico con cronologia coerente.
- Tabellino, statistiche finali ed esiti mediante le regole esistenti. Snapshot Atalanta verificato con SHA-256, identità e anteriorità; confronto disattivato se non verificabile.
- Componenti condivisi e temi distinti, nove sezioni, layout massimo 1050px, fallback esplicito e automatico con ripristino del DOM originale.

## Verifiche

Otto suite mirate superate: interni Letture, adattatori, schedina personale, sincronizzazione pronostici, Lettura V2, pagina Champions, policy titolari ufficiali, mercati Champions MD2. Dettagli in `tests.json`.

Browser Edge headless: tre fixture a 1440/1024/768/390px; filtri e ricerca, selezione/rimozione e persistenza MD7, quote assenti e totale —, apertura/chiusura e tastiera dialog, tab accessibili, navigazione sticky, identità dei mercati rispetto a legacy, nessun errore console o overflow. Sei controlli fuori perimetro e tre fallback automatici. Dettagli in `final-browser-results.json`. Screenshot desktop/mobile nella presente directory.

## Limiti dei dati

Non sono stati aggiunti dati: zone tiro e duelli spaziali restano informativi dove manca una fonte verificata; andamento individuale e storico mostrano soltanto il campione disponibile. Inter non dispone di uno snapshot originario validato per il confronto; Milan conserva lo stato prepartita e le formazioni probabili. Riepilogo economico per fixture N/D in assenza di report e stake coerenti. Nessuna liquidazione provider dedotta da una conferma statistica.

## Integrità

HEAD iniziale `63e9469fcd9bc995c494d9afd328f9f01e9138d0`. Due letture iniziali stabili. Il manifest `baseline.json` registra 566 file; `integrity.json` confronta lo stato finale, ammettendo soltanto i sei file UI elencati e segnalando qualsiasi altra variazione. Nessun aggiornamento di snapshot o valori attesi dei test. L'attivazione generale e i blocchi successivi restano esclusi.
