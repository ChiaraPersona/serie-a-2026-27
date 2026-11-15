# Copie storiche del workspace

`home-commit-package-2026-11-15.zip` conserva i 1.546 file della precedente
cartella `output/home-commit-package/`. Ogni entry è stata verificata con lo
SHA-256 registrato nel manifest adiacente prima di rimuovere la directory.

Ripristino, con destinazione non ancora esistente:

```powershell
Expand-Archive -LiteralPath data/technical-archive/workspace-copies/home-commit-package-2026-11-15.zip -DestinationPath output/home-commit-package
```

L'archivio è escluso dal pacchetto pubblico. Non è un input dei calcoli sportivi.
