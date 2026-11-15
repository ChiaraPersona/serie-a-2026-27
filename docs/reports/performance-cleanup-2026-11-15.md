# Ottimizzazione delle prestazioni — 15 novembre 2026

Interventi locali su caricamento, calcoli Champions e pacchetto pubblico.
Nessuna modifica a formule, pesi, soglie, quote, probabilità o criteri operativi.

## Calcoli Champions

`scripts/champions/shared-scenario.cjs` riutilizza le medie di campionato per
campionato, cutoff, campo e metrica nella singola esecuzione. Conserva ordine
delle riduzioni, finestre temporali e trattamento dei valori mancanti. La cache
non persiste fra esecuzioni e non contiene pronostici da riutilizzare.

Confronto dell'intero output con la copia del modulo precedente, a input fissi,
su Node 24.22.1. Mediane di tre coppie di esecuzioni dopo il primo passaggio:

| Caso | Prima | Dopo | Riduzione del tempo |
|---|---:|---:|---:|
| 72 gare future, cutoff 15 novembre | 4,57 s | 1,42 s | circa 69% |
| 18 gare MD4, calendario al cutoff storico | 0,66 s | 0,09 s | circa 86% |

Tutti gli output confrontati coincidono integralmente. Sono tempi del modulo
in questo ambiente, non dell'intera catena di importazione e aggiornamento.

## Caricamento delle pagine

Il servizio dati avvia in parallelo registro ufficiale e payload. Restituisce i
dati soltanto dopo il caricamento del registro e l'applicazione del filtro.
Restano `no-store`, deduplicazione per vista, aggiornamento al nuovo render e
possibilità di ripetere una richiesta fallita.

Le Letture MD6/MD8 includono un piccolo indicatore della presenza di selezioni
nell'archivio risultati, derivato dalla Schedina canonica. Il renderer evita così
di scaricare l'intera giornata per decidere se mostrare il collegamento ai
risultati. Gli archivi delle selezioni restano completi e invariati.

Nel caso Atalanta–Frosinone MD8 i JSON richiesti passano da circa 13,80 MB a
3,03 MB non compressi, circa il 78% in meno. Il contenuto visibile è identico
nel confronto desktop/mobile. Questo dato non misura byte compressi di rete
né garantisce lo stesso risparmio per tutte le Letture.

La rigenerazione delle proiezioni aveva aggiornato anche metadati descrittivi
non necessari all'intervento. Per la modifica locale sono stati conservati i
contenuti precedenti, aggiungendo soltanto l'indicatore a 20 dettagli MD6/MD8.
Il builder produce lo stesso indicatore nei successivi aggiornamenti ordinari.

## Pacchetto pubblico

Dieci input tecnici senza consumatori nel browser sono esclusi da
`scripts/package-pages.cjs`. Restano integralmente disponibili nel repository.
Il pacchetto passa da circa 509,15 MB a 502,40 MB, circa 6,75 MB in meno;
la compattazione JSON del deploy conserva tutti i valori.

Gli archivi in `output/` e `reports/` erano già esclusi dalla pubblicazione:
eliminarli non avrebbe accelerato il sito. Non sono stati cancellati. Le nuove
evidenze temporanee sono nella cartella specifica ignorata da Git
`output/performance-cleanup-2026-11-15/`.

## Verifiche e limiti

- Confronto completo prima/dopo degli scenari Champions e test condiviso:
  20 pronostici Serie A invariati, cutoff, acquisizioni tardive, N/D e quote.
- Test del servizio dati: richieste parallele, attesa del registro, errore del
  registro, deduplicazione, retry e filtro degli archivi.
- Test di disponibilità risultati: 20 fixture, destinazioni identiche al
  percorso canonico e nessuna richiesta dell'intero archivio.
- Test del pacchetto: dipendenze HTML e dinamiche conservate, archivi esclusi.
- Rendering iniziale: 29 pagine, versioni degli asset e generazione idempotente.
  Il test ora usa il foglio effettivo per pagine con fallback (download) e
  verifica separatamente lo stile autonomo della pagina offline.
- Browser: Schedina Champions MD3 a 1440/390 px, indice e MD2; DOM e screenshot
  identici fra servizio dati precedente e attuale, senza richieste duplicate.
- Browser Letture: indice, ID inesistente e tre dettagli a 1440/390 px;
  contenuto prima/dopo identico, navigazione verificata e nessun overflow.
- La verifica interattiva dei salvataggi MD7 non arriva all'azione: il caso
  precedente non espone più una selezione giocabile. Non è una verifica passata.
- La suite generale delle proiezioni Lettura segnala una divergenza di
  contratti per Fiorentina–Como MD7. Il medesimo errore si riproduce usando il
  servizio dati precedente; MD7 non è stata rigenerata da questo intervento.
  La divergenza resta da analizzare senza cambiare contratti durante la pulizia.

Le evidenze locali includono `scenario-comparison.json`, `browser/audit.json`,
`readings/current.json`, `readings/after.json` e
`projection-baseline-check.json` nella cartella di audit sopra indicata.
