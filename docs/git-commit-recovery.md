# Commit e lock Git su Windows

Un `index.lock` vuoto rimasto dopo un’interruzione può impedire `git add` e `git commit`, anche quando non è più presente un processo Git. Il caso è stato riprodotto in un repository temporaneo: Git fallisce con il lock e riesce dopo il recupero.

## Comandi locali

`npm run git:repair` verifica il repository. Sposta il lock in un backup solo se è un file regolare, vuoto, vecchio di almeno due minuti, invariato durante il controllo e non sono presenti processi Git. Un lock recente, non vuoto o associato a processi attivi viene conservato. Non termina processi e non modifica lo staging.

Per usare lo stesso controllo prima di un’operazione:

```powershell
npm run git:safe -- add -- percorso/del/file
npm run git:commit -- -m "Descrizione"
```

Il commit usa soltanto i file già nello staging; non aggiunge altri file e non esegue push. Il comando non intercetta i commit avviati dal pulsante dell’app. Se quel pulsante segnala un lock, usare `npm run git:repair`, poi riprovare.

I permessi della sandbox sono un problema distinto: se Git non può scrivere `.git/config` o `.git/index`, il recupero del lock non risolve la mancanza di accesso. In Codex le operazioni Git in scrittura devono essere eseguite con i permessi previsti dall’ambiente.

Evitare operazioni Git in scrittura contemporanee nello stesso checkout. File dati grandi possono allungare lo staging; un’operazione ancora in esecuzione va lasciata terminare. La causa dell’interruzione che ha generato il lock originale non è stata determinata.

Verifica isolata: `npm run test:git-safe`. Crea un repository temporaneo e verifica recupero, commit e protezione dei lock recenti, non vuoti e con Git attivo.
