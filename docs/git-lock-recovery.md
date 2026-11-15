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

## Comandi npm e limiti del recupero

Gli script npm sono versionati e disponibili anche nei nuovi cloni:

```powershell
npm run git:repair
npm run git:safe -- add -- percorso/del/file
npm run git:commit -- -m "Descrizione della modifica"
```

Il commit usa solo i file già nello staging, non aggiunge altri file e non esegue
push. Il recupero non termina processi e non modifica lo staging. Si può eseguire
la verifica isolata anche con `npm run test:git-safe`.

I permessi della sandbox sono un problema distinto: recuperare il lock non
risolve la mancanza di accesso a `.git/config` o `.git/index`. Le scritture Git
richiedono i permessi previsti dall'ambiente.

File dati grandi possono allungare lo staging: lasciare terminare le operazioni
ancora in corso. La causa dell'interruzione che ha generato il lock originale
non è stata determinata.
