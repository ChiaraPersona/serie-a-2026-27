# Esportazioni storiche autonome

`champions-md3-database-export-2026-10-19.tar.xz` sostituisce lo ZIP storico
conservato precedentemente in `output/exports/`. Contiene tutti i 7.060 file
originali, compreso `EXPORT-MANIFEST.md`, più un indice tecnico con SHA-256 e
metadati ZIP. Non richiede Git, dati correnti, download o builder per ripristinarli.

Verifica con Python 3 e la sola libreria standard:

```powershell
python scripts/repack-historical-export.py verify data/technical-archive/exports/champions-md3-database-export-2026-10-19.tar.xz
```

Ricostruzione dello ZIP nella posizione originaria, che deve essere libera:

```powershell
python scripts/repack-historical-export.py restore data/technical-archive/exports/champions-md3-database-export-2026-10-19.tar.xz --output output/exports/champions-md3-database-export-2026-10-19.zip
```

Il contenuto di ogni file, i nomi, l'ordine, le date ZIP, gli attributi, i campi
extra e i commenti vengono conservati. Il contenitore ZIP viene ricompresso:
il suo hash complessivo può essere diverso da quello dello ZIP originale.

L'archivio resta locale e ignorato da Git, come il precedente ZIP. Il riepilogo
adiacente registra hash e misure della migrazione. Non eliminare l'archivio se
si vuole conservare questa fotografia del 19 ottobre; i dati correnti possono
essere diversi. Questi file non fanno parte del sito pubblico.
