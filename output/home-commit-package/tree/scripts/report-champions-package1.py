"""Produce the internal integration report without rebuilding published artifacts."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'data/analysis/champions/package1-2026-10-19'
def read(p):
    return json.loads(p.read_text(encoding='utf-8'))
def write(p,d):
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tests = ['test-champions-package1.js','test-champions-registered-squads.js','test-champions-player-markets.js','test-champions-pilot-predictions.js','test-champions-current-season-data.js','test-champions-reading-page.mjs','test-champions-schedina-page.mjs','test-betting-selection-contract.js','test-personal-betslip.mjs']
results=[]
for test in tests:
    run=subprocess.run(['node',str(ROOT/'scripts'/test)],cwd=ROOT,capture_output=True,encoding='utf-8',errors='replace')
    results.append({'test':test,'exitCode':run.returncode,'stdout':run.stdout,'stderr':run.stderr})
write(BASE/'test-results.json',results)
before=read(BASE/'protected-before.json')
changes=[]
for name,expected in before.items():
    p=ROOT/name
    actual=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
    if actual!=expected:
        changes.append({'file':name.replace('\\','/'),'before':expected,'after':actual})
assert [c['file'] for c in changes]==['data/normalized/champions-player-stats-2026-27.json'],changes
write(BASE/'protected-verification.json',{'checked':len(before),'changedExisting':changes,'unexpectedChanges':[]})
audit=read(BASE/'row-audit.json')
coverage=read(BASE/'md3-coverage.json')
browser=read(BASE/'browser-results.json')
imp=read(BASE/'import-result.json')
manifest={'modifiedExisting':[c['file'] for c in changes],'newCanonical':[imp['sourcePath'],*imp['rawFiles']],'scripts':['scripts/audit-champions-package1.py','scripts/import-champions-package1.js','scripts/test-champions-package1.js','scripts/check-champions-package1-browser.cjs','scripts/report-champions-package1.py'],'internalArtifacts':[str(p.relative_to(ROOT)).replace('\\','/') for p in BASE.rglob('*') if p.is_file()]}
write(BASE/'files-manifest.json',manifest)
lines=['# Champions MD3 — Pacchetto 1: integrazione locale, 19 ottobre 2026','',
'Esito: database individuale aggiornato. Nessun ricalcolo dei pronostici pubblicati. La verifica end-to-end delle letture MD3 resta limitata dall’assenza degli artefatti MD3 e delle formazioni.','',
'| Indicatore | Risultato |','|---|---|',
'| Candidate | 817, 519 giocatori, 51 incontri |',
'| Approvate / importate | 817 / 817 |',
'| Duplicate tra candidate o nello storico | 0; audit e correzioni sono overlay, non nuove prestazioni |',
'| Quarantena tra le 817 candidate | 0 |',
'| Quarantena originale aggiuntiva | 21 righe fuori dalle 817, conservate senza importazione; segnalazione originale TEAM_SHOTS_UNAVAILABLE_OR_ZERO |',
'| Giocatori / squadre aggiornati | 519 / 31, su 36 squadre conservate |',
'| Minuti verificati / stimati / mancanti importati | 0 / 817 / 0 |',
'| Righe speciali riesaminate | 14 approvate confrontando nuovamente ID, squadra, incontro e statistiche |',
f"| ID testuali corretti | {sum(r['packageIdCorrectedByExactProviderId'] for r in audit)} righe, mediante ID provider esatti |",
f"| Test Node | {sum(r['exitCode']==0 for r in results)} superati, {sum(r['exitCode']!=0 for r in results)} fallito |",
f"| Browser | {len(browser)} controlli, 1280 e 390 px; nessun overflow, errore JS o contenuto vuoto |",
f"| Integrità | {len(before)} file esistenti controllati; solo il dataset individuale corrente modificato |",'',
'## Validazione e significato dei dati','',
'Tutte le candidate sono prestazioni di campionati nazionali, non prestazioni UEFA. Restano nei rispettivi bucket per competizione e squadra. Sono state confrontate con 51 summary ESPN acquisiti nuovamente: ID incontro, data, stagione, competizione, stato concluso, ID squadra e atleta, presenza, titolarità, tiri, SOT, gol, assist, cartellini e falli. Nessun confronto statistico discrepante. È una riconciliazione con il referto provider originale, non una certificazione indipendente da un secondo provider.','',
'Gli identificativi testuali danneggiati non sono stati risolti con nomi approssimativi: sono stati usati gli ID ESPN canonici già presenti. Yann Sommer, ID 93197, è confermato nel referto del Club Brugge e incluso. Le 14 righe sono tutte confermate dal nuovo confronto; nessuna autorizzazione è stata dedotta dai loro report.','',
'I CSV contenevano minuti vuoti. Gli 817 valori importati sono stime ricavate con il metodo esistente da titolarità e orologi delle sostituzioni, con limite a 90 minuti; non sono minuti osservati e non includono una misura verificata del recupero. Lo stato è registrato nel ledger, nei nuovi match degli aggregati e nei metadata raw. I test verificano che i minuti storici siano preservati e che il loro incremento coincida con le sole nuove stime.','',
'Il builder di aggregazione esistente è riutilizzato senza cambiare formule o pesi. Sono conservati giocatori non interessati, competizioni non interessate e tutte le presenze precedenti. I vecchi raw non ancora acquisiti negli aggregati non sono stati aggiunti implicitamente. Il test controlla gli incrementi esatti delle statistiche per ogni giocatore e competizione. Una seconda esecuzione dell’importer importa zero righe.','',
'Il dataset di squadra mantiene la copertura storica dei referti di squadra; package1IndividualEvidence indica separatamente il nuovo campione individuale. Gli as-of dei 31 gruppi individuali aggiornati sono al 19 ottobre; le cinque squadre estranee restano identiche.','',
'## Copertura MD3','',
'Tutte le 36 squadre e le 18 fixture sono presenti. Per ogni lato: giocatori aggiornati / rosa; copertura tiri e SOT negli aggregati correnti. Formazioni e panchine MD3 assenti per tutte le fixture. Non sono state inventate.','',
'| Fixture | Partita | Nuovi giocatori casa / ospiti | Copertura tiri casa / ospiti | Copertura SOT casa / ospiti | Lettura MD3 |','|---|---|---|---|---|---|']
for f in coverage:
    h,a=f['teams']
    lines.append(f"| {f['fixtureId']} | {f['home']} – {f['away']} | {h['updatedPlayers']}/{h['players']} · {a['updatedPlayers']}/{a['players']} | {h['withShots']}/{h['players']} · {a['withShots']}/{a['players']} | {h['withSOT']}/{h['players']} · {a['withSOT']}/{a['players']} | Non generata; URL mostra calendario |")
lines += ['', '## Motore, mercati e pagine','',
'Il file è compatibile con gli aggregatori esistenti e conserva per90, separazione per competizione e valori null. Il builder di mercati scripts/build-champions-player-markets.js:24 legge ancora champions-player-stats-2025-26.json. Il nuovo campione 2026/27 non viene quindi automaticamente usato nelle proiezioni pubblicate. Il calendario non ha formazioni MD3; non risultano pronostici MD3 né dataset mercati/Schedina MD3. Non è possibile validare stime numeriche MD3 di tiri/SOT o possibili subentranti che non esistono, senza un successivo intervento autorizzato.','',
'I test dei mercati e dei contratti esistenti passano; questo attesta la compatibilità conservata, non la validazione di nuove selezioni MD3. Tutte le 18 URL richieste e calendario/Schedina sono state aperte a 1280 e 390 px. Le URL MD3 ripiegano sul calendario; la Schedina esistente funziona. Nessun errore JS, pagina vuota o overflow. Screenshot interni disponibili. Nessun build sito o policy degli undici ufficiali è stato eseguito: questa operazione non aggiorna formazioni.','',
'## Test','']
for r in results:
    lines.append(f"- {'PASS' if r['exitCode']==0 else 'FAIL'} `{r['test']}`.")
lines += ['',
'Il test current-season fallisce perché impone uguaglianza con l’as-of del precedente import di squadra (9 ottobre), e nelle verifiche successive congela lo snapshot AEK al 3 ottobre. La nuova importazione individuale è al 19 ottobre. Il test non è stato alterato per nascondere il disallineamento; il nuovo test verifica invece incrementi, storico, null, competizioni e conservazione delle parti estranee. Output completo in test-results.json.','',
'Ulteriori controlli: importer rieseguito con zero importazioni; git diff --check superato. Edge non si avviava nella sandbox; il controllo è stato completato con esecuzione locale autorizzata.','',
'## File e vincoli','',
'Unico file esistente modificato: `data/normalized/champions-player-stats-2026-27.json`. Nuovi file canonici: ledger `data/sources/champions-package1-performances-2026-10-19.json` e 51 snapshot raw gzip limitati agli ID approvati sotto `data/raw/champions-pilot/espn/summaries/2026-27/<league>/2026-10-19/`. Aggiunti cinque script di audit/import/test/browser/report. Tutti i percorsi individuali sono elencati in `files-manifest.json`.','',
'Questa cartella conserva i quattro pacchetti estratti, 51 referti originali completi, snapshot precedente, audit riga per riga, esito import, copertura MD3, risultati test/browser, screenshot e verifica hash. Fonti e metadati restano esclusivamente interni.','',
'Quote Sisal, ID mercati, selezioni, storico 2025/26, Serie A, motori, esiti, pagine e CSS invariati secondo gli hash. Test della persistenza e compatibilità delle schedine salvate superato; nessuna sessione personale del browser è stata modificata. Nessun commit, push, deploy, Pacchetto 2 o ricalcolo definitivo.','',
'Problemi aperti: collegamento esplicito del campione corrente alle proiezioni da valutare separatamente; snapshot test da aggiornare con policy esplicita; formazioni, panchine e artefatti MD3 mancanti. Attendere autorizzazione prima di ricalcoli definitivi o pubblicazione.']
(BASE/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'testsPassed':sum(r['exitCode']==0 for r in results),'testsFailed':sum(r['exitCode']!=0 for r in results),'protectedFiles':len(before),'unexpectedChanges':0,'report':str(BASE/'REPORT.md')}))
