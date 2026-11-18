# Archivio storico acquisito e verificato

Acquisizione del 18 novembre 2026. Questo documento aggiorna l'esito della prima ricerca: il CSV e stato ora scaricato e ispezionato, senza alterare i risultati delle verifiche precedenti.

## Integrita e contenuto

- File originale: `data/raw/opta-history/2026-11-18/opta-club-rankings.csv`.
- SHA-256 calcolato identico al digest dell'asset GitHub: `93610d3a9b0712435c21434544e29aafa6e513305fc24fce1c4a6d35e0c97905`.
- 1.956.000 record validi, 650 date fra 20 febbraio 2024 e 14 gennaio 2026. L'intervallo comprende 695 giorni: la raccolta non e continua tutti i giorni.
- Una riga non valida contiene una risposta XML `NoSuchKey`: preservata nel raw, esclusa dall'estratto.
- Il raw ha alcuni nomi con caratteri gia degradati: non si correggono identita con somiglianze testuali.

## Identita e selezione

Gli ID Opta scelti sono confrontati con paese e ID nella crosswalk dell'autore, poi collegati esplicitamente ai nomi e ID UEFA canonici interni. Non si applicano lookup approssimativi. Questa e una corroborazione della raccolta indipendente, non una certificazione della mappa da parte di Opta.

- 35 delle 36 squadre corroborate; 22.820 osservazioni nell'estratto.
- Sabah esclusa: il raw contiene due ID omonimi e la crosswalk acquisita non risolve il club azero.
- Arsenal, Liverpool, Barcelona e Aston Villa hanno omonimie nel raw; vengono scelti soltanto gli ID corroborati dal paese.
- Nell'estratto: zero duplicati identici e zero conflitti per ID/data/timestamp.

## Campione storico predisposto

Incrocio esatto con `data/normalized/uefa-europe-history-2023-26.json`, usando ID UEFA e punteggio nei tempi regolamentari:

| Stagione | Partite appaiate |
|---|---:|
| 2023-24 | 21 |
| 2024-25 | 78 |
| 2025-26 | 37 |
| Totale | 136 |

Gare dal 22 febbraio 2024 al 21 gennaio 2026. Se la raccolta ha piu righe per la stessa data si sceglie la prima. Il rating deve precedere la gara di almeno due giorni, per non presumere il fuso orario non documentato del timestamp, e di non piu di sette giorni. Questi limiti definiscono il campione diagnostico e non sono parametri stimati sugli esiti. Una gara del 21 gennaio puo quindi usare il rating del 14 gennaio, senza usare un rating successivo alla partita.

Esclusioni sullo storico UEFA completo: 1.259 gare hanno almeno una squadra fuori dalle 35 identita risolte; 74 non hanno rating sufficientemente recente e precedente. La coorte e selezionata sulle partecipanti Champions attuali e non rappresenta tutte le squadre europee; una calibrazione richiedera separazione cronologica e valutazione fuori campione.

## Cosa e verificato e cosa rimane aperto

Verificati integrita del file, formato dei record, timestamp dichiarati, copertura, ID/paese della crosswalk e precedenza delle date rispetto alle gare. Il fuso orario del raccoglitore e la versione originale pubblicata dal provider per ciascun giorno non sono certificati. Un hash corretto non certifica la correttezza dei rating originali e non esclude revisioni storiche del raccoglitore.

Lo storico acquisito non contiene le date settembre-novembre 2026 richieste per le 72 gare recenti: quel confronto predittivo rimane non disponibile. Non si sostituiscono i rating di gennaio o novembre a quelli mancanti.

Nessuna calibrazione ancora eseguita. Nessuna probabilita nuova, Lettura, quota, selezione, DUO o rendimento modificato. Il prossimo passo eseguibile e la calibrazione sperimentale cronologica sul campione storico tracciabile, mantenendo esplicito il livello di evidenza temporale.

## Artefatti e riproduzione

- `archive-content-audit.json`: conteggi, anomalie, crosswalk, ambiguita e copertura per data.
- `historical-club-ratings.jsonl.gz`: righe delle 35 squadre, ID, rating e riferimento alla riga originale.
- `historical-match-pairs.jsonl.gz`: 136 partite con rating precedenti e risultati canonici.
- `historical-pair-coverage.json`: copertura, esclusioni e criteri temporali.
- `scripts/research/audit-opta-history.py`: ricalcola l'audit dal raw, senza rete e senza scritture operative.
- `scripts/research/prepare-opta-historical-pairs.py`: costruisce soltanto il campione di ricerca dai file locali.

## Fonti interne

[Archivio originale](https://github.com/tonyelhabr/club-rankings/releases/download/club-rankings/opta-club-rankings.csv), [metadati release](https://api.github.com/repos/tonyelhabr/club-rankings/releases/tags/club-rankings), [crosswalk dell'autore](https://github.com/tonyelhabr/club-rankings/blob/main/team-mapping.csv), [definizione dei timestamp del raccoglitore](https://github.com/tonyelhabr/club-rankings#dictionary).
