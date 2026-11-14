"""Report the imported, display-only referee samples and production integrity."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/champions/md3-referees-2026-10-19'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
data=read('data/normalized/champions-league-2026-27.json')
profiles=read('data/normalized/champions-referee-profiles-md03-2026-27.json')
fixtures=[f for f in data['fixtures'] if f['matchday']==3]
before=read('data/analysis/champions/md3-referees-2026-10-19/protected-before.json')
changes=[]
for file,expected in before.items():
    p=ROOT/file
    if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:changes.append(file)
allowed={'data/normalized/champions-league-2026-27.json','js/pages/champions.js','js/pages/reading-detail/shell.mjs','js/pages/reading-detail/referee-dashboard.mjs','scripts/build-champions-league.js','scripts/build-site.js'}
assert set(changes)<=allowed,changes
assert [p for p in changes if p.startswith('data/')]==['data/normalized/champions-league-2026-27.json']
browser=read('data/analysis/champions/md3-referees-2026-10-19/browser-results.json')
assert len(browser)==54 and all(not r['overflow'] and not r['errors'] for r in browser)
(BASE/'protected-verification.json').write_text(json.dumps({'filesChecked':len(before),'modifiedExisting':changes,'unexpectedChanges':[],'predictionsOddsSchedinaAndPlayerDataUnchanged':True,'nonTargetFixturesUnchanged':126},indent=2)+'\n',encoding='utf-8')
def fmt(v):return '—' if v is None else f'{v:.2f}'.replace('.',',')
lines=['# Champions League MD3 — designazioni e profili arbitrali','',
'Integrazione locale delle 18 designazioni consegnate nel pacchetto del 19 ottobre 2026. I CSV e JSON sono stati confrontati campo per campo; ogni riga è associata a una sola fixture mediante uguaglianza esatta di data, squadra di casa e ospite, quindi salvata con il fixture ID canonico. Nessuna nuova ricerca generale. La conferma UEFA è quella documentata nel pacchetto fornito, senza affermare una nuova verifica online.','',
'## Associazioni e statistiche mostrate','',
'Le medie nazionali sono campioni misti 2025/26–2026/27: il campionato specifico non è indicato nel pacchetto e non è stato dedotto dalla nazionalità dell’arbitro. Le medie Champions sono storiche, con periodo iniziale/finale e cutoff non certificati. Nessuna media è chiamata stagione corrente o ultime dieci.','',
'| Fixture | Partita | Arbitro | Campione | n | Gialli/gara | Cartellini/gara | Falli/gara |','|---|---|---|---|---:|---:|---:|---:|']
for f in fixtures:
    p=next(p for p in profiles['referees'] if p['refereeId']==f['refereeAssignment']['refereeId'])
    m=p['metrics'];s=p['sample']
    label='Champions storico' if s['scope']=='historical_UCL_provider_cards' else 'Nazionale misto 2025/26–2026/27' if s['scope'] else 'Non disponibile'
    lines.append(f"| {f['id']} | {f['homeTeam']} – {f['awayTeam']} | {p['name']} | {label} | {s['matches'] if s['matches'] is not None else '—'} | {fmt(m['yellowCardsPerMatch'])} | {fmt(m['providerCardsPerMatch'])} | {fmt(m['foulsPerMatch'])} |")
lines+=['',
'## Omissioni e semantica','',
'- 12 profili mostrano esclusivamente la media cartellini del campione storico Champions; 3 mostrano medie gialli e falli di un campione nazionale misto.',
'- Rade Obrenovič, Sebastian Gishamer e Nicholas Walsh: arbitro mostrato, tutte le medie e il campione numerico restano —.',
'- Rossi/gara assente in tutti i 18 profili: mostrato —, senza derivarlo da cartellini meno gialli. Assistenti, IV ufficiale, VAR, AVAR e nazionalità non sono inclusi nel pacchetto e sono omessi.',
'- Il campo cartellini mantiene la semantica aggregata del dato consegnato: non è rietichettato come gialli, non è sommato ai gialli e non gli si attribuisce una formula gialli+rossi non certificata.',
'- Nessuna serie delle ultime 5 o 10 partite, media della stagione corrente, frequenza Over, percentuale o correzione dei pronostici è stata ricostruita dai valori aggregati.',
'- I campioni di soli 2 incontri restano esplicitamente n=2; non sono promossi a campioni robusti.',
'- Le metriche mancanti restano null nei dati e — nella UI; le barre prive di valore non rappresentano uno zero osservato.',
'- Ogni profilo conserva competizione/categoria, stagioni quando disponibili, numerosità, metrica, definizione, URL, note e stato di affidabilità nei metadati interni. Tutti hanno predictionEligible=false, cutoffCertified=false e recentTenVerified=false.','',
'## Implementazione','',
'Designazioni canoniche in `data/sources/champions-referee-assignments-md03-2026-27.json`, separate dai profili in `data/sources/champions-referee-profiles-md03-2026-27.json`. Il builder esistente integra le designazioni nella fixture; il nuovo builder dei profili produce il dataset normalizzato usato solo dal renderer. Nessun motore di previsione importa questi profili.','',
'Le URL `champions-league.html?match=ucl-2026-27-md03-XX` prima ricadevano sul calendario perché non esistono pronostici MD3. Ora aprono la testata della lettura e la sola sezione «Disciplina e profilo arbitrale». Non vengono inventate le sezioni mancanti, generati pronostici o modificati gli archivi.','',
'Il renderer riutilizza la testata condivisa, l’icona arbitrale e le classi del dashboard approvato, senza nuove regole CSS o blocchi recenti non supportati. Le due esportazioni condivise (testata e icona) non modificano il comportamento dei renderer precedenti. Il file champions.js, già modificato localmente prima della richiesta, è stato preservato e ampliato con la sola diramazione MD3.','',
'Il build sito è stato limitato alla shell Champions (`--champions-page-only --presentation-only`): aggiorna il cache version senza rigenerare dati, schedine, panchine o altre pagine. La policy pubblica `js/public-presentation.js` resta attiva; nessun URL o testo dedicato alle fonti è generato nel profilo.','',
'## Verifiche','',
'- PASS `test-champions-md3-referees.mjs`: 18 nomi esatti, metriche uguali al pacchetto, campioni separati, null/—, nessun uso modello e altre 126 fixture invariate.',
'- PASS `test-champions-reading-page.mjs`.',
'- PASS `test-reading-referee-history.mjs`.',
'- PASS `test-champions-referee-readings-md02-page.mjs`: regressione delle 18 pagine MD2.',
'- PASS `test-reading-detail-adapters.mjs` e `test-reading-detail-internals.mjs`.',
'- PASS browser Edge: tutte le 18 pagine a 1440, 390 e 320 px, 54 controlli. Nomi e ogni valore visualizzato confrontati con il dataset; nessun overflow, errore JavaScript, testo fonti o campione impropriamente stagionale/recente.',
'- Screenshot desktop/mobile ispezionati per campione nazionale, storico Champions e profilo senza statistiche.',
'- PASS `git diff --check` (soli avvisi di conversione LF/CRLF).','',
f"Confrontati {len(before)} file preesistenti con gli hash acquisiti all’inizio dell’intervento. Tra i dati esistenti cambia solo il calendario Champions: esclusivamente refereeAssignment delle 18 fixture MD3; gli altri campi di quelle fixture e le altre 126 fixture sono identici. Pronostici, Schedina, quote Sisal, identificativi dei mercati, risultati, statistiche individuali e dati Serie A sono rimasti identici. Nessuna modifica alle schedine salvate.",'',
'## File','',
'File esistenti modificati in questo intervento:','']
lines += ['- `'+p+'`.' for p in changes]
lines += ['- `champions-league.html` (sola shell e cache version).','',
'Nuovi file: due fonti canoniche MD3, un dataset normalizzato dei profili, renderer MD3, importer offline, builder dei profili, test mirato, controllo browser e script report. Pacchetto estratto, mapping, snapshot precedenti, verifica hash, risultati browser e screenshot restano nella cartella interna di questo report. L’elenco completo è in `files-manifest.json`.','',
'Limiti aperti: data limite e periodo dei campioni non certificati, nazionali specifici non indicati, tre arbitri senza statistiche. L’importazione è informativa e non risolve né aggira questi limiti. Nessun commit, push, deploy o ricalcolo definitivo eseguito.']
(BASE/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
new=['data/sources/champions-referee-assignments-md03-2026-27.json','data/sources/champions-referee-profiles-md03-2026-27.json','data/normalized/champions-referee-profiles-md03-2026-27.json','js/pages/reading-detail/champions-md3-referees.mjs','scripts/import-champions-md3-referees.py','scripts/build-champions-md3-referees.js','scripts/test-champions-md3-referees.mjs','scripts/check-champions-md3-referees-browser.cjs','scripts/report-champions-md3-referees.py']
(BASE/'files-manifest.json').write_text(json.dumps({'modifiedExisting':changes+['champions-league.html'],'newFiles':new,'internalArtifacts':[p.relative_to(ROOT).as_posix() for p in BASE.rglob('*') if p.is_file()]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Report ready: 18 assignments, 54 browser checks, protected data verified.')
