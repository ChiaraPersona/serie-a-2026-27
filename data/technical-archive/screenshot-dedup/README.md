# Screenshot storici condivisi su NTFS

`manifest-2026-11-15.json` registra i 216 gruppi deduplicati: una copia fisica
per gruppo, 735 percorsi originali e SHA-256 invariati. I PNG sono di sola
lettura per proteggere il contenuto comune. Le immagini dei test attivi sono
escluse dalla selezione.

Per tornare a copie separate e scrivibili, con i permessi registrati:

```powershell
node scripts/deduplicate-archived-screenshots.cjs --restore data/technical-archive/screenshot-dedup/manifest-2026-11-15.json
```

Il ripristino ricrea copie indipendenti del contenuto; non ripristina le vecchie
date o identità NTFS. Conservare questo manifest insieme agli screenshot.
Questa ottimizzazione è locale: Git non registra la condivisione tramite hardlink.
