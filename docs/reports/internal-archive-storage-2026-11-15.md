# Spazio degli archivi interni — 15 novembre 2026

Compressione trasparente NTFS locale dei file di testo storici in `output/` e
`reports/`. Nessuna eliminazione, rinomina, conversione del formato o modifica
dei contenuti. Gli strumenti possono continuare ad aprire gli stessi percorsi.

## Risultato misurato sul disco

| Cartella | File trattati | Occupazione precedente | Occupazione finale | Recuperato |
|---|---:|---:|---:|---:|
| `output/` | 1.335 | 4,154 GB | 1,627 GB | 2,527 GB |
| `reports/` | 178 | 0,237 GB | 0,087 GB | 0,150 GB |
| Totale | 1.513 | 4,390 GB | 1,713 GB | **2,677 GB** |

Risparmio circa **61% sui file trattati**, equivalente a circa **2,49 GiB**.
Sono byte allocati sul disco NTFS, con cluster da 4.096 byte; la lunghezza logica
dei file resta invariata. In Esplora file cambia «Dimensioni su disco».
Le piccole evidenze dell'intervento occupano a loro volta spazio: il beneficio
netto arrotondato rimane circa 2,68 GB.

## Perimetro e verifiche

- File di testo di almeno 64 KiB, non modificati negli ultimi dieci minuti.
- Inclusi JSON, HTML, script, CSS e copie storiche testuali; esclusi collegamenti
  simbolici/junction, immagini, ZIP, GZIP e file recenti.
- Nessuna modifica alle directory `data/`, `.git/` o ai file attivi del sito.
- Compressione standard NTFS dei soli file selezionati: le directory non sono
  state impostate per comprimere automaticamente i nuovi file.
- SHA-256 verificato prima e dopo su tutti i 1.513 file: **zero differenze**.
- Hash invariati per calendario Serie A, calendario Champions, previsioni
  canoniche e registro dei titolari ufficiali.
- Tutti i 1.513 file risultano compressi. Una prova preliminare su un archivio
  Sisal da 92,61 MB ne ha verificato lettura e identità prima del trattamento.

Questa operazione recupera spazio locale. Non cambia il peso del pacchetto
pubblico né la dimensione della cronologia Git. Non richiede modifiche ai
lettori JSON e non applica nuovi calcoli alle partite.

La compressione è reversibile con `compact /U` sui percorsi interessati. Il
manifest conserva quali file erano già compressi prima dell'intervento, così
un ripristino può limitarsi a quelli modificati in questa operazione.

Evidenze locali, escluse da Git:
`output/internal-archive-cleanup-2026-11-15/summary.json`,
`manifest-before.json`, `manifest-after.json`, `trial.json` e `compact.log`.
Lo script eseguito è `compress.ps1` nella medesima cartella. Non è un'attività
automatica e non è stato eseguito alcun commit, push o deploy.
