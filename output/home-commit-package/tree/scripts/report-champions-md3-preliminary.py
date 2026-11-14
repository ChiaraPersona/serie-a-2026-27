"""Internal report for frozen-input preliminary readings and the unpublished draft."""
import collections
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/champions/md3-preliminary-2026-10-19'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
catalog=read('data/normalized/champions-md03-preliminary-2026-27.json')
preview=read(catalog['forecastInput']['path'])
before=read('data/analysis/champions/md3-preliminary-2026-10-19/protected-before.json')
changed=[]
for file,expected in before.items():
    p=ROOT/file
    if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:changed.append(file)
allowed={'js/pages/betting.js','js/pages/champions-market-ui.mjs','js/pages/champions.js','css/reading-detail.css','scripts/build-site.js'}
assert set(changed)==allowed,changed
assert hashlib.sha256((ROOT/catalog['forecastInput']['path']).read_bytes()).hexdigest()==catalog['forecastInput']['sha256']
assert hashlib.sha256((ROOT/catalog['oddsInput']['path']).read_bytes()).hexdigest()==catalog['oddsInput']['sha256']
assert all(f['forecast']==next(p['collective'] for p in preview['fixtures'] if p['fixtureId']==f['fixtureId']) for f in catalog['fixtures'])
browser=read('data/analysis/champions/md3-preliminary-2026-10-19/browser-results.json')
assert len(browser['pages'])==57 and browser['sharedCatalog']
assert browser['persistence']['n']==2
families=collections.Counter(m['family'] for f in catalog['fixtures'] for m in f['oddsEvent']['playerMarkets'])
selections=[(f,m,s) for f in catalog['fixtures'] for m in f['oddsEvent']['playerMarkets'] for s in m['selections']]
proposals=[x for x in selections if x[2]['preliminaryProposal']]
positive=[x for x in proposals if x[2]['expectedValue']>0]
def fmt(v,d=2):return 'N/D' if v is None else f'{v:.{d}f}'.replace('.',',')
lines=['# Champions League MD3 — Letture preliminari e preparazione Schedina','',
'## Esito','',
'Generate localmente tutte le 18 Letture preliminari e la pagina di preparazione Schedina MD3. Input esclusivo per le previsioni: preview-md03.json della fase offline, protetto da SHA-256. Nessun motore o builder di previsione ricalcolato; nessuna formula o coefficiente modificato.','',
'Le pagine mantengono testata e profilo arbitrale già integrati, aggiungendo probabilità 1X2, punteggio principale, gol attesi del modello, confronti per squadra e totali tiri/SOT/corner/gialli, quando disponibili. Nessun valore medio è trasformato in un pronostico su una soglia. I gol del modello non sono chiamati xG.','',
'La bozza è raggiungibile da ogni Lettura e tramite `schedina.html?competizione=champions&giornata=3`. Non è stata aggiunta una card di Schedina definitiva all’archivio. Il file draft mantiene slips=[] e publishedSelections=[]: nessuna multipla definitiva o lista approvata è stata pubblicata.','',
'## Le 18 Letture e i mercati','',
'| Fixture | Partita | URL | Mercati | Selezioni aperte | Volumi dettagliati |','|---|---|---|---:|---:|---|']
for f in catalog['fixtures']:
    markets=f['oddsEvent']['playerMarkets'];n=sum(len(m['selections']) for m in markets)
    lines.append(f"| {f['fixtureId']} | {f['homeTeam']} – {f['awayTeam']} | `{f['readingUrl']}` | {len(markets)} | {n} | {'Disponibili' if f['forecast']['dataQuality']['detailedVolumesAvailable'] else 'N/D'} |")
lines+=['',
f"Catalogo condiviso: **{catalog['summary']['markets']} mercati, {catalog['summary']['selections']} selezioni aperte**. Famiglie: 1X2 {families['result']}, doppia chance {families['double-chance']}, gol U/O {families['goals']}, corner U/O {families['corners']}, tiri totali U/O {families['shots']}.",'',
'I contratti ammessi sono un’allowlist verificabile: codice 3 / 1X2 ESITO FINALE / ESITO FINALE 1X2; 28319 / DOPPIA CHANCE / DOPPIA CHANCE MULTIESITI; 7989 / UNDER/OVER / U/O <soglia>; 975 / U/O CORNER / U/O <soglia> CORNER; 15859 / U/O TIRI TOTALI / U/O <soglia> TIRI TOTALI. Solo scope match, periodo completo, ID evento/mercato/selezione presenti, soglia identica a quella della variante, mercato e selezione open, quota >1 e nessun player ID. Periodi espliciti diversi dal full-match sono esclusi. Le varianti di primo tempo, giocatore, sostituto/DUO o soglia non verificata non entrano nel catalogo.','',
'Quote, oddsRaw, status, codici, soglie, varianti e identificativi sono copiati dal listino già raccolto senza riscriverlo. Le selezioni sospese non compaiono. Il confronto automatico verifica ogni riga contro il record originale. Non è stata svolta una nuova verifica online della disponibilità commerciale.','',
'Le probabilità 1X2, del verdetto e delle linee gol 1.5/2.5/3.5 provengono letteralmente dalla preview. Per le altre linee gol, corner e tiri totali privi di probabilità sul contratto esatto, probabilità/EV restano N/D: sono contratti disponibili per scelta manuale, non pronostici del motore. Nessun contratto di SOT o cartellini/punti cartellini è stato forzato sulla sola base della rispettiva media.','',
'Per Sabah–Borussia Dortmund restano N/D tiri, SOT, corner e disciplina; dal suo catalogo sono esclusi anche corner e tiri totali perché manca il supporto statistico. Restano esito, doppia chance e gol.','',
'## Verdetti preliminari e revisione economica','',
f"Le {len(proposals)} corrispondenze qui sotto riprendono soltanto il verdetto esplicito della preview, senza deduzioni dai valori medi. {len(positive)} hanno EV matematico positivo alla quota dello snapshot e possono essere esaminate separatamente; le altre {len(proposals)-len(positive)} non vengono presentate come occasioni di valore. Non sono state create Schedine definitive o nuove soglie di approvazione.",'',
'EV = probabilità congelata × quota esistente − 1; è un calcolo economico del contratto, non un ricalcolo della probabilità né una garanzia di calibrazione o di combinabilità bookmaker.','',
'| Fixture | Selezione del verdetto | Probabilità preview | Quota originale | EV matematico | Revisione |','|---|---|---:|---:|---|']
for f,m,s in proposals:
    lines.append(f"| {f['fixtureId']} | {s['name']} | {fmt(s['modelProbabilityPct'])}% | {fmt(s['odds'])} | {fmt(s['expectedValue']*100)}% | {'Candidata da esaminare, non approvata' if s['expectedValue']>0 else 'Verdetto statistico, EV non positivo'} |")
lines+=['',
'## Sezioni incomplete','',
'- XI probabili, panchine, disponibilità e minuti previsti non documentati: N/D; nessuna formazione ricostruita da rose o vecchi undici.',
'- Nessuna previsione individuale pubblicata: minuti, tiri, SOT e probabilità evento restano —. I per90 diagnostici non sono importati nel catalogo.',
'- Sabah, Slavia Praha, Shakhtar Donetsk e Slovan Bratislava continuano senza proiezioni individuali. Il catalogo non contiene mercati di giocatori per nessuna delle 36 squadre.',
'- Non aggiunte analisi narrative, precedenti o sezioni non presenti nella preview. Il confronto squadre usa esclusivamente le proiezioni già congelate.',
'- Le medie arbitrali restano descrittive, con campioni storici/nazionali separati e dati mancanti —; nessun impatto sulle probabilità.',
'- Nessuna nuova MyCombo consigliata è generata o congelata. Rimangono la combinazione manuale, il prodotto delle quote e i controlli di compatibilità dello store esistente; la combinabilità commerciale non è dedotta dal prodotto matematico.','',
'## Test','',
'- PASS `test-champions-md3-preliminary.mjs`: tutti i 18 forecast identici alla preview, 426 mercati e 657 selezioni verificati contro Sisal, nessun individuale/sospeso, store MD3, quote combinate, salvataggio e separazione da MD2.',
'- PASS `test-personal-betslip.mjs`: persistenza, deduplicazione, compatibilità, quote e contesti.',
'- PASS `test-betting-selection-contract.js`: 6 Schedine, 137 MyCombo e 137 prediction legs esistenti.',
'- PASS `test-champions-reading-page.mjs` e `test-champions-schedina-page.mjs`.',
'- PASS `test-champions-referee-readings-md02-page.mjs`: regressione sulle 18 pagine MD2.',
'- PASS browser Edge: tutte le 18 Letture più Schedina a 1440, 390 e 320 px (57 pagine). Ogni probabilità, punteggio, valore per squadra e totale confrontato con la preview; arbitri e cataloghi verificati, nessun errore JavaScript o overflow.',
'- PASS browser: selezione dalla Lettura, apertura Schedina, seconda selezione da altra fixture, totale delle quote corretto e mantenimento dopo reload, usando esclusivamente il profilo di test isolato.',
'- PASS `git diff --check` (soli avvisi LF/CRLF).','',
'Nel primo controllo a 320 px la larghezza minima delle tre percentuali 1X2 superava quella della griglia. Correzione limitata al font dei nuovi campi MD3 sotto 380 px; valori e grafica delle giornate precedenti non modificati. Le verifiche complete sono passate dopo la correzione. Screenshot viewport effettivi ispezionati anche dopo scroll sul profilo arbitrale; screenshot full-page e diagnostica iniziale conservati come evidenza interna.','',
'## Integrità e file','',
f"Confrontati {len(before)} file preesistenti. Nessuna modifica a preview, quote/ID Sisal, pronostici o Schedine precedenti, esiti, dati individuali, motori, designazioni o profili arbitrali. La preview e il file quote sono inoltre verificati tramite SHA-256 nel catalogo. I nuovi dati normalizzati sono solo il catalogo preliminare e il draft MD3.",'',
'File esistenti modificati:','']
lines += ['- `'+p+'`.' for p in changed]
lines += ['- `champions-league.html` e `schedina.html`: shell/cache version, senza modifica ai dati delle altre giornate.','',
'Nuovi file: `scripts/build-champions-md3-preliminary.js`, `js/pages/champions-md3-ui.mjs`, `data/normalized/champions-md03-preliminary-2026-27.json`, `data/normalized/schedina-champions-md03-draft.json`, test mirato, controllo browser e generatore di questo report. I percorsi completi sono in files-manifest.json.','',
'Il build sito usa --md3-pages-only --presentation-only: non avvia il motore, la policy degli XI, builder delle panchine o rigenerazioni estranee. Il renderer di mercato ora accetta il matchday e uno store condiviso: il comportamento preesistente mantiene il default MD2. I 18 cataloghi della bozza usano un solo store MD3 e i contratti dei medesimi fixture ID.','',
'La policy pubblica sulle fonti resta attiva e nessuna sezione di provenienza è stata aggiunta. L’intervento non accede alle schedine personali reali dell’utente; i test di persistenza usano memoria/profilo browser isolati.','',
'Nessun commit, push, deploy o pubblicazione di Schedine definitive. Il passaggio alle definitive resta in attesa dell’approvazione dell’utente.']
(BASE/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
(BASE/'protected-verification.json').write_text(json.dumps({'checked':len(before),'changedExisting':changed,'existingDataChanged':False,'previewAndOddsUnchanged':True,'refereesUnchanged':True,'publicIndividualForecasts':0,'draftOnly':True},indent=2)+'\n',encoding='utf-8')
new=['scripts/build-champions-md3-preliminary.js','scripts/test-champions-md3-preliminary.mjs','scripts/check-champions-md3-preliminary-browser.cjs','scripts/report-champions-md3-preliminary.py','js/pages/champions-md3-ui.mjs','data/normalized/champions-md03-preliminary-2026-27.json','data/normalized/schedina-champions-md03-draft.json']
(BASE/'files-manifest.json').write_text(json.dumps({'modifiedExisting':changed+['champions-league.html','schedina.html'],'newFiles':new,'internalArtifacts':[p.relative_to(ROOT).as_posix() for p in BASE.rglob('*') if p.is_file()]},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'readings':18,'markets':426,'selections':657,'previewVerdicts':18,'positiveEVReviewCandidates':len(positive),'browserPages':len(browser['pages']),'protectedFiles':len(before),'draftOnly':True}))
