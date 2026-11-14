"""Internal report; runs focused read-only tests, never prediction builders."""
import collections
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/champions/md3-readiness-2026-10-19'
def read(name):return json.loads((BASE/name).read_text(encoding='utf-8'))
tests=['test-champions-current-season-data.js','test-champions-md3-readiness.js','test-champions-context-adjusted-baseline.js','test-champions-substitute-forecasts.js']
results=[]
if '--reuse-test-results' in sys.argv:
    results=read('test-results.json')
else:
    for test in tests:
        p=subprocess.run(['node',str(ROOT/'scripts'/test)],cwd=ROOT,capture_output=True,encoding='utf-8',errors='replace')
        results.append({'test':test,'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
    diff=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,encoding='utf-8',errors='replace')
    results.append({'test':'git diff --check','exitCode':diff.returncode,'stdout':diff.stdout,'stderr':diff.stderr})
(BASE/'test-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
teams=read('team-coverage.json');manifest=read('md3-preparation-manifest.json');fixtures=manifest['fixtures'];pack=read('package2-summary.json');protection=read('protected-verification.json')
individual=[t for t in teams if t['individualForecastsAllowed']]
flags=collections.Counter(flag for t in individual for p in t['problems'] for flag in p['flags'])
lines=['# Champions MD3 — chiusura Pacchetto 2 e preparazione','',
'## Implementato','',
'Nessuna importazione dal Pacchetto 2. Conservati byte per byte dataset corrente, ledger, raw e report del Pacchetto 1: 817 prestazioni, 519 giocatori, 31 squadre. Corretto il solo test current-season; aggiunti audit offline, manifest per le 18 fixture e gate interno testato per la generazione individuale. Nessun motore o builder di previsione modificato.','',
'| Pacchetto 2 | Esito sul database locale aggiornato |','|---|---:|','| Candidate domestiche | 34 |','| Duplicati già presenti | 6, quattro PSV e due Galatasaray |','| Quarantena mantenuta | 28 |','| Nuove approvate / importate | 0 / 0 |','',
'Il confronto dei duplicati verifica atleta provider, squadra provider, competizione, ID e data incontro nelle entry correnti. Non si basa sul vecchio export. Le altre 28 righe non risultano nuove prestazioni autorizzate: conservano le esclusioni dei pacchetti; 20 segnalano statistiche di tiro di squadra inutilizzabili, 8 conflitto squadra/rosa, tutte e 28 minuti mancanti. Il conflitto squadra/rosa è inoltre verificato con gli ID squadra canonici locali. Nessuna nuova acquisizione o seconda certificazione delle statistiche in quarantena è stata eseguita; i relativi flag statistici provengono dai documenti forniti e non sono stati trasformati in autorizzazioni.','',
'## Copertura individuale delle 32 squadre','',
f"La rosa locale delle 32 squadre contiene {sum(t['rosterPlayers'] for t in individual)} giocatori: {sum(t['currentUsable'] for t in individual)} con minuti positivi e tiri/SOT disponibili nel campione corrente; {sum(t['historyUsable'] for t in individual)} nello storico; {sum(t['bothUsable'] for t in individual)} in entrambi. Sono disponibilità statistiche, non approvazioni automatiche di proiezioni o mercati.",'',
'Non sono disponibili XI probabili né panchine MD3. Non è quindi possibile indicare quali lacune riguardino i veri titolari probabili o i principali subentranti senza inventarne il ruolo nella partita. Il triage è sulla rosa registrata e verrà incrociato con gli XI/panchine quando forniti. Non sono state riutilizzate come MD3 le formazioni di giornate precedenti.','',
'| Squadra | Rosa | Corrente con minuti+tiri+SOT | Storico con minuti+tiri+SOT | Entrambi | Solo corrente | Solo storico |','|---|---:|---:|---:|---:|---:|---:|']
for t in individual:
    lines.append(f"| {t['team']} | {t['rosterPlayers']} | {t['currentUsable']} | {t['historyUsable']} | {t['bothUsable']} | {len(t['currentOnly'])} | {len(t['historyOnly'])} |")
lines+=['','Problemi che possono incidere su MD3:','',
f"- {flags['CURRENT_SHOTS_SOT_OR_MINUTES_UNAVAILABLE']} giocatori senza copertura corrente completa di minuti+tiri+SOT; {flags['HISTORICAL_SHOTS_SOT_OR_MINUTES_UNAVAILABLE']} senza la corrispondente copertura storica. Non assegnati a un ipotetico undici.",
f"- {flags['LIMITED_HISTORY_UNDER_EXISTING_700_MIN_LABEL']} con storico inferiore ai 700 minuti: è l'etichetta limited-history già prevista dal motore, non una nuova soglia inventata.",
f"- {flags['PROVIDER_ID_MISSING']} senza ESPN ID nel dataset corrente; questo non significa necessariamente identità UEFA sconosciuta. Gli overlay di identità UEFA non forniscono automaticamente un ID ESPN.",
f"- {flags['REGISTRY_CANONICAL_ID_ALIAS_REQUIRES_EXACT_PROVIDER_JOIN']} alias di player ID fra registro e dataset corrente, riconciliabili per ID provider esatto. Altri {flags['REGISTRY_NAME_ONLY_PROVIDER_UNRESOLVED']} record hanno nome esatto nel registro ma slug diverso e provider ID assente: Yasir Caklı, Çağan Sarıdikmen, Çağrı Fedai e Onur Kağan Yıldız. Nessuno è stato dichiarato fuori rosa a causa dello slug.",
'- ID squadra Bodø/Glimt: `bodo-glimt` nel campione corrente/config, `bod-glimt` in storico/registro. L’audit usa il nome squadra identico e univoco per riconoscere il caso; serve un mapping canonico esplicito prima del collegamento operativo. Nessuna ricerca approssimativa sui nomi.',
f"- Giocatori realmente assenti dalla rosa locale dopo i join esatti: {flags['NOT_IN_REGISTERED_SQUAD']}. Conflitti provider tra registri: {flags['REGISTRY_PROVIDER_ID_DISAGREEMENT']}. SOT superiori ai tiri nei campioni controllati: {flags['CURRENT_SOT_EXCEEDS_SHOTS']+flags['HISTORICAL_SOT_EXCEEDS_SHOTS']}.",
'- I minuti Package 1 restano stimati; gli aggregati correnti non distinguono sempre esposizioni omogenee per metrica. La semplice presenza di un per90 non certifica la validità del rate per una previsione. Non si inferisce la frequenza di subentro dalle sole presenze in campo.',
'','I problemi nominativi, minuti, disponibilità per stagione e ID sono in `team-coverage.json`; non viene prodotto un elenco pubblico delle fonti. Nessuna ulteriore ricerca individuale è stata svolta.','',
'## Quattro squadre solo collettive','',
'Il gate di volumi dettagliati riprende il contratto del builder esistente: almeno 6 gare complete, almeno 2 in casa e 2 fuori, medie finite per gol, tiri, SOT, corner, falli e gialli su entrambi i lati. I conteggi includono storico e stagione corrente del dataset di squadra già disponibile. Nessun nuovo coefficiente.','',
'| Squadra | Gare complete | Casa / fuori | Gare correnti complete | Ultima completa | Volumi dettagliati supportati |','|---|---:|---|---:|---|---|']
for t in teams:
    if t['individualForecastsAllowed']:continue
    c=t['collective'];lines.append(f"| {t['team']} | {c['completeMatches']} | {c['homeMatches']} / {c['awayMatches']} | {c['currentSeasonMatches']} | {c['lastCompleteDate']} | {'Sì, campione esistente' if c['usableForDetailedVolumes'] else 'No: campione insufficiente'} |")
lines+=['',
'Per Sabah restano utilizzabili solo gli output collettivi supportati dal percorso esistente risultato/gol; non si producono tiri/SOT dettagliati inventati. Per tutte e quattro le squadre, pronostici individuali esclusi per richiesta dell’utente anche quando esiste uno storico individuale. Nessun dato storico cancellato.','',
'## Problemi effettivi delle 18 fixture','',
f"Presenti 18 partite e 36 squadre; Sisal contiene {sum(f['odds']['markets'] for f in fixtures):,} mercati e {sum(f['odds']['selections'] for f in fixtures):,} selezioni, di cui {sum(f['odds']['openQuotedSelections'] for f in fixtures):,} aperte con quota >1 e {sum(f['odds']['suspendedSelections'] for f in fixtures):,} sospese. Le sospese non sono quote operative e non vengono trattate come errori né come dati utilizzabili.",'',
'ID evento/mercato/selezione e date canoniche verificati in locale per fixture. Nessun ID mancante o duplicato di selezione dentro gli eventi; nessuna selezione aperta priva di quota valida. Nessuna nuova verifica online della disponibilità commerciale: sono snapshot già raccolti. La presenza di mercati individuali non implica identità giocatore confermata, titolarità o previsione approvata.','',
'Per tutte le gare: XI e panchine mancanti; collegamento del campione corrente al motore non attivo; nessuna lettura definitiva MD3 generata. Il gate resta chiuso.','',
'| Fixture | Partita | Mercati / selezioni | Mercati tiri / SOT giocatore | Limitazione specifica |','|---|---|---:|---:|---|']
for f in fixtures:
    only=[s['team'] for s in f['sides'] if s['mode']=='collective-only']
    limited=[s['team'] for s in f['sides'] if not s['collectiveDetailedReady']]
    msg=('Solo collettivo: '+', '.join(only)) if only else 'Blocco comune XI/panchine e collegamento motore'
    if limited:msg+='; volumi dettagliati non supportati: '+', '.join(limited)
    o=f['odds'];lines.append(f"| {f['fixtureId']} | {f['home']} – {f['away']} | {o['markets']} / {o['selections']} | {o['playerShotsMarkets']} / {o['playerSOTMarkets']} | {msg} |")
lines+=['',
'## Proposta, non implementazione','',
'Il documento `ENGINE-LINK-PROPOSAL.md` descrive formule attuali, differenza tra minuti storici/correnti/previsti, blending candidato già presente nel pilota AEK, rischi di sovrapposizione e piano di regressione/walk-forward. Il candidato mantiene il valore dello storico e considera canali corrente domestico e Champions separati; le altre competizioni non entrano automaticamente nel canale Champions.','',
'I pesi 900/0.35 provengono dal pilota, non sono introdotti come nuovi pesi approvati. Nessun rate corrente è stato attivato: estendere il pilota alle 32 squadre e cambiare le probabilità sarebbe una modifica sostanziale. Occorre autorizzazione per un candidato offline e una successiva decisione di attivazione. Le soglie dei subentranti esistono già ma richiedono panchine documentate, non ricostruite dalle sole 817 presenze.','',
'## Test e contratto temporale','',
'Il test current-season ora verifica separatamente:','',
'1. Cutoff dell’input collettivo: 9 ottobre, sorgente di squadra preservata.',
'2. Cutoff dell’aggiornamento individuale: 19 ottobre, ricavato dal manifest dell’import e dal ledger.',
'3. Acquisizione raw: confronto puntuale con retrievedAt, eventDate, eventId e asOf dei gzip; non viene confusa con la data delle partite o il vecchio cutoff di squadra.',
'4. Snapshot AEK congelato al 3 ottobre: verificato sul backup precedente all’integrazione con il suo hash originale, senza imporre che il nuovo campione live rimanga congelato.',
'5. Confronto statistico sull’esatto insieme di match ID delle entry AEK, evitando di confrontare un vecchio aggregato con tutti i raw recuperati successivamente; conservati controlli null/zero e future leakage.','',
'Non sono state modificate statistiche o date nei dataset per fare passare il test.','']
for t in results:lines.append(f"- {'PASS' if t['exitCode']==0 else 'FAIL'} `{t['test']}`.")
lines+=['',
'Output completi in `test-results.json`. Il test del pilota AEK fallisce prima delle verifiche numeriche: il controllo congelato richiede hash builder 135788a773b8607db7f1386a1c9d6b5d2fb8560fdab914d652318bfe95691be5, mentre quello presente è 33f125092367f1d518d67bece8a55cc6b253e34cb9f114cb4233c80e79341cd7. Quest’ultimo coincide con l’hash rilevato all’inizio della sessione: il disallineamento è preesistente. Il controllo non è stato aggiornato per nascondere il problema. Va riconciliata la compatibilità del pilota con il builder prima di un’estensione. Il test subentranti passa, ma non dimostra la validazione del blending su tutte le squadre. Il nuovo test del gate include casi negativi per XI incompleto, panchina mancante, identità incerta, dati insufficienti, approvazione assente e contratto provider mancante. Le quattro squadre restano escluse anche con tutti gli altri input presenti.','',
'Non ripetuti raccolta dati, audit Package 1, test grafici o build sito già conclusi: nessun componente pubblico è stato modificato. I risultati browser della sessione precedente restano documentati nel report Package 1; non sono presentati come nuove letture MD3 validate.','',
'## File modificati e preservati','',
'Unico file esistente modificato: `scripts/test-champions-current-season-data.js`.','',
'Nuovi script:','',
'- `scripts/champions/md3-readiness.js`: gate interno, non collegato ai builder di produzione.',
'- `scripts/audit-champions-md3-readiness.py`: audit locale e manifest, senza import o fetch.',
'- `scripts/test-champions-md3-readiness.js`: regressioni del gate e dei contratti MD3.',
'- `scripts/report-champions-md3-readiness.py`: report e risultati test mirati.','',
'Nuovi artefatti interni sotto `data/analysis/champions/md3-readiness-2026-10-19/`: i due pacchetti estratti, snapshot hash, audit delle 34 righe, riepilogo Pacchetto 2, copertura delle squadre, manifest delle fixture, verifica di integrità, risultati test, proposta e questo report. Elenco puntuale in `files-manifest.json`.','',
f"Verificati {protection['existingFilesChecked']} file preesistenti: nessuna modifica ai dati o ai file Package 1. Quote Sisal, contratti, selezioni, motori Serie A/Champions ed esiti invariati. Nessun accesso o modifica alle schedine personali. Durante la sessione sono comparse modifiche concorrenti a js/pages/champions.js e css/champions.css, oltre a un commit esterno rilevato come 9ecdfd4b verifiche panchinari. Non ho eseguito quel commit né modificato quei due file, e non li ho ripristinati. La verifica hash li registra separatamente; non si afferma che l’intero workspace UI sia rimasto immutato.",'',
'## Attività ancora necessarie','',
'1. Fornire o acquisire in un intervento autorizzato gli XI probabili e le panchine MD3, con mapping canonici; rieseguire poi il triage solo sui giocatori effettivamente candidati.',
'2. Approvare il candidato offline per tiri/SOT e la politica per i minuti stimati; verificare per metrica campioni, contesto e deduplicazione, senza pesi manuali.',
'3. Rendere espliciti i join squadra/giocatore e collegare il gate delle quattro squadre al futuro percorso MD3 prima di generare output individuali. Il modulo interno da solo non modifica il builder pubblico.',
'4. Predisporre output MD3 separati nei builder che non sono ancora parametrizzati: il builder di mercati legge calendario/predizioni generiche e scrive `champions-player-markets-md01-2026-27.json`; non va eseguito alla cieca per MD3. Il builder collettivo supporta già `--matchday 3`, ma non è stato eseguito.',
'5. Conservare N/D per i volumi dettagliati non supportati di Sabah; applicare analisi esclusivamente collettiva alle quattro squadre.',
'6. Solo dopo autorizzazione e controlli, generare preview MD3 isolate, validare desktop/mobile e successivamente decidere la generazione definitiva. Nessuna quota viene aggiornata da questa preparazione.','',
'Nessun commit, push, deploy, importazione in quarantena, modifica alle 817 prestazioni o ricalcolo definitivo.']
(BASE/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
newScripts=['scripts/champions/md3-readiness.js','scripts/audit-champions-md3-readiness.py','scripts/test-champions-md3-readiness.js','scripts/report-champions-md3-readiness.py']
files={'modifiedExisting':['scripts/test-champions-current-season-data.js'],'newScripts':newScripts,'internalArtifacts':[p.relative_to(ROOT).as_posix() for p in BASE.rglob('*') if p.is_file()]}
(BASE/'files-manifest.json').write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':sum(t['exitCode']==0 for t in results),'failed':sum(t['exitCode']!=0 for t in results),'report':str(BASE/'REPORT.md')}))
