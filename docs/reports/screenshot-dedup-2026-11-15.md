# Screenshot storici deduplicati — 15 novembre 2026

Intervento locale sui PNG storici di almeno 256.000 byte in `output/` e
`reports/`. Nessuna ricodifica, riduzione di risoluzione o perdita di pixel.
Tutti i percorsi originali restano leggibili.

## Spazio misurato

| Misura | Risultato |
|---|---:|
| Gruppi di immagini identiche | 216 |
| Percorsi conservati | 735 |
| Copie fisiche aggiuntive eliminate | 519 |
| Occupazione precedente | 587.567.104 byte |
| Occupazione finale dei dati unici | 171.909.120 byte |
| Risparmio sui file trattati | **415.657.984 byte**, circa **415,7 MB** |

La misura usa l'allocazione effettiva dei file su NTFS e conta ogni inode
condiviso una sola volta. Le piccole dimensioni di script, manifest ed evidenze
riducono lievemente il beneficio netto: il recupero arrotondato è circa 415 MB.
Non è una riduzione del pacchetto pubblico né della cronologia Git.

## Protezione dei riferimenti attivi

Sono state escluse 110 cartelle/gruppi di evidenze richiamati dai sorgenti e
dalle configurazioni correnti, con modifiche di lavoro o screenshot recenti.
La selezione viene ripetuta immediatamente prima dell'applicazione: se cambia
l'idoneità di un file, l'operazione si ferma.

Sono esclusi collegamenti simbolici/junction, immagini già condivise tramite
hardlink e file precedentemente di sola lettura. Il perimetro non comprende
gli asset pubblici, i dati sportivi o le directory Git.

## Come sono conservate le immagini

All'interno di ciascun gruppo i percorsi diventano hardlink NTFS dello stesso
file. Si mantiene una copia fisica, senza cambiare alcun byte PNG. I percorsi
nei report e nelle verifiche continuano a funzionare.

Le immagini storiche condivise vengono rese **di sola lettura** per impedire
che una scrittura ordinaria su una copia modifichi anche le altre. Gli attributi
e le date del filesystem sono comuni al file fisico condiviso. Gli originali
di contenuto, la corrispondenza dei percorsi, gli hash e i permessi precedenti
sono registrati nel manifest; il ripristino garantisce contenuto e permessi,
non le precedenti identità o date NTFS delle singole copie.

Prima di riutilizzare come destinazioni scrivibili questi vecchi screenshot,
ripristinare le copie indipendenti:

```powershell
node scripts/deduplicate-archived-screenshots.cjs --restore data/technical-archive/screenshot-dedup/manifest-2026-11-15.json
```

Il comando ripristina tutti i gruppi del manifest e rioccupa lo spazio delle
copie separate. Rifiuta il ripristino se il contenuto non corrisponde agli hash.
La creazione di hardlink richiede l'esecuzione fuori dalla sandbox di questa
sessione Windows; il comportamento è stato verificato su copie temporanee.

## Verifiche completate

- Prima di ogni sostituzione: percorso risolto nel perimetro, SHA-256 corretto
  e assenza di hardlink preesistenti.
- Dopo: 735 percorsi verificati con SHA-256, identità del file condiviso e
  attributo di sola lettura. **Zero differenze di contenuto.**
- Nessun percorso delle cartelle protette compare fra i file deduplicati.
- Prova su copie temporanee: scrittura ordinaria bloccata, ripristino a file
  indipendenti e scrivibili, nessuna propagazione delle scritture dopo il ripristino.
- Manifest progressivo salvato prima e durante l'applicazione, per rendere
  verificabile anche un'eventuale interruzione.

Manifest permanente:
`data/technical-archive/screenshot-dedup/manifest-2026-11-15.json`.
Misure ed evidenze locali:
`output/screenshot-dedup-2026-11-15/plan.json`, `allocation-before.json` e
`summary.json`. La cartella di lavoro è ignorata da Git.

Test locale: `npm run test:screenshots:dedup`. Nessun commit, push o deploy.
