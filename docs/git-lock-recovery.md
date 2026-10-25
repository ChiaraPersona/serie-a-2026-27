# Commit e lock Git residui

Il repository include `scripts/git-safe.cjs`. La configurazione locale espone
anche `git safe`, utilizzabile dalle sottocartelle del repository.

Per eseguire un commit autorizzato dei file già selezionati:

```powershell
git safe commit -m "Descrizione della modifica"
```

Per selezionare file specifici:

```powershell
git safe add -- percorso/del/file
```

Se il pulsante Commit dell'app segnala un lock residuo:

```powershell
git safe repair
```

Poi riprovare il pulsante. Dalla radice sono disponibili anche
`npm run git:repair` e `npm run git:commit -- -m "Descrizione"`.

Il recupero conserva una copia del lock e interviene soltanto su file vuoti,
regolari, vecchi di almeno due minuti, senza processi Git rilevati e senza
cambiamenti del file durante il controllo. Lock recenti, non vuoti o associati
a processi Git vengono conservati. Non eseguire altre operazioni Git in parallelo
al recupero: il controllo dei processi non costituisce un lock globale.

Il pulsante dell'app usa direttamente Git e non passa da questo wrapper.
Questa configurazione offre un percorso di recupero e commit ripetibile;
non impedisce a interruzioni dell'app o del sistema di lasciare nuovi lock.
Non installare cancellazioni periodiche dei lock né disattivare il locking Git.

Verifica della protezione: `node scripts/test-git-safe.cjs`. Il test crea un
repository temporaneo e verifica recupero, commit e conservazione dei lock
recenti, non vuoti o con processi attivi. Non crea commit nel progetto.

L'alias è locale e non viene copiato dai cloni; gli script npm sono versionati.
