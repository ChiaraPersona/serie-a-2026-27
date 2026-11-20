"""Descriptive MD12 audit and editorial projection; never changes predictions."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/analysis/serie-a/md12-expectations-2026-11-20'
paths = ['data/normalized/matches.json', 'data/generated/serie-a-team-history.json',
         'data/sources/match-results-2026-27.json']
raw = {p: (ROOT/p).read_bytes() for p in paths}
calendar, history, actuals = [json.loads(raw[p]) for p in paths]
history = history['teams']
actuals = {m['matchId']: m for m in actuals['matches']}
spec = importlib.util.spec_from_file_location('exact', Path(__file__).with_name('preview-opta-exact-scores.py'))
exact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exact)

editorial = {
 'atalanta-inter': [
  'L’Inter arriva con maggiore continuità: ha vinto quattro delle ultime cinque gare di campionato, mentre l’Atalanta ha interrotto a Monza una serie di risultati più difficili. Il campo può aiutare i bergamaschi a rendere il confronto aperto, ma non cancella la migliore tenuta recente degli ospiti.',
  'Il dato che pesa è la vulnerabilità dell’Atalanta: nelle ultime cinque ha concesso dodici gol, pur chiudendo senza subirne nell’ultima partita. L’Inter ha mostrato di saper limitare gli avversari, ma la sconfitta nel derby ricorda che il suo controllo non è sempre stabile.',
  'Ci aspettiamo un’Inter capace di creare occasioni e un’Atalanta in grado di rispondere soprattutto in casa. Il vantaggio ospite è credibile, ma una partita con gol da entrambe è uno sviluppo da considerare più di un successo semplice e senza rischi.'
 ],
 'bologna-udinese': [
  'Il Bologna arriva da quattro vittorie consecutive e affronta un’Udinese senza successi nelle ultime cinque. Il momento sostiene i padroni di casa, ma la loro produzione interna è stata finora meno brillante di quella mostrata in alcune trasferte.',
  'L’Udinese ha concesso venticinque gol nelle prime undici giornate: il problema è soprattutto la continuità difensiva. Il recente pareggio senza reti a Parma mostra però che può anche rallentare il confronto, mentre il Bologna deve evitare di trasformare il buon momento in un’attesa automatica di goleada.',
  'Ci aspettiamo più iniziativa del Bologna e una gara nella quale il primo gol può essere importante. Il favore interno ha basi nella forma, ma le verifiche per sede invitano a considerare anche una partita più combattuta.'
 ],
 'como-cagliari': [
  'Il Como ha mostrato una tenuta particolarmente buona in casa, con un solo gol subito nelle quattro gare disponibili. Il Cagliari arriva dalla vittoria sul Frosinone, ma prima aveva perso quattro partite consecutive: la ripresa va ancora consolidata.',
  'Il 3–1 del Como sul Torino è maturato con tre gol dall’81′ in avanti, dopo essere rimasto a lungo in svantaggio. È un segnale della capacità di restare in partita, ma anche un motivo per non interpretare il punteggio finale come dominio continuo.',
  'Ci aspettiamo un Como capace di prendere l’iniziativa e concedere relativamente poco. Il Cagliari può cercare di mantenere l’equilibrio e sfruttare gli episodi; la recente vittoria non elimina le difficoltà mostrate nelle precedenti trasferte.'
 ],
 'juventus-venezia': [
  'La Juventus ha alternato risultati convincenti e frenate, ma in casa ha concesso meno che fuori. Il Venezia arriva dal successo sull’Udinese dopo tre sconfitte consecutive: ha ritrovato il gol, senza aver ancora dimostrato continuità offensiva.',
  'Il limite più evidente degli ospiti è la produzione lontano da casa: appena tre gol nelle cinque trasferte disponibili. La Juventus deve però costruire il vantaggio con pazienza; la propria discontinuità non consente di trattare la partita come già indirizzata.',
  'Ci aspettiamo più controllo della Juventus e un Venezia orientato a proteggere l’equilibrio. Un successo interno contenuto è uno sviluppo credibile; una vittoria larga richiederebbe maggiore efficacia di quella mostrata con continuità finora.'
 ],
 'lazio-lecce': [
  'La Lazio arriva da quattro vittorie e un pareggio nelle ultime cinque gare, con un attacco produttivo e una buona tenuta complessiva. Il Lecce non ha vinto nelle ultime quattro e deve soprattutto evitare che la partita si apra troppo presto.',
  'Il recente 6–2 sul Sassuolo alza la produzione della Lazio, ma non è l’unico segnale positivo: ha vinto anche contro Juventus, Parma e Cagliari. Il Lecce ha comunque già segnato fuori casa e non va considerato incapace di creare pericoli soltanto per il diverso momento.',
  'Ci aspettiamo una Lazio più spesso all’attacco e favorita nel controllo della gara. Il Lecce può restare agganciato se limita le occasioni concesse; il vantaggio interno non implica necessariamente una porta inviolata.'
 ],
 'milan-frosinone': [
  'Il Milan ha vinto quattro delle ultime cinque gare e ha segnato con continuità. Il Frosinone arriva dalla sconfitta di Cagliari, ma prima aveva mostrato un attacco capace di produrre anche contro avversari competitivi.',
  'Il Frosinone ha segnato quindici gol nelle ultime cinque, quattro dei quali nel pareggio sul campo dell’Atalanta. Questo sostiene la possibilità di un gol ospite, mentre il Milan ha già alternato successi importanti a partite in cui ha concesso troppo.',
  'Ci aspettiamo un Milan capace di creare le occasioni migliori, ma non una gara necessariamente a senso unico. La produzione del Frosinone rende credibile un confronto aperto e invita a distinguere il favore dei rossoneri dalla sicurezza sul margine.'
 ],
 'monza-fiorentina': [
  'Il Monza arriva da quattro sconfitte consecutive, mentre la Fiorentina ha raccolto una vittoria e due pareggi nelle ultime tre. Il momento sostiene una maggiore fiducia degli ospiti, ma entrambe hanno mostrato difficoltà nel proteggere la propria porta.',
  'Le due squadre hanno subito venticinque gol a testa nelle prime undici giornate. Il dato rende plausibili occasioni da entrambe le parti, ma non basta da solo a garantire tanti gol: contano anche la capacità di sfruttarle e la gestione di un eventuale vantaggio.',
  'Ci aspettiamo una partita contendibile, con possibilità per entrambe di segnare. La Fiorentina arriva con segnali recenti migliori, mentre il campo può aiutare il Monza: è più prudente attendersi equilibrio instabile che un controllo netto di una sola squadra.'
 ],
 'napoli-torino': [
  'Il Napoli ha vinto soltanto una delle ultime cinque gare, mentre il Torino non ha vinto nelle ultime tre. Il campo sostiene gli azzurri, ma il momento delle due squadre invita a non leggere il confronto come una vittoria interna già costruita.',
  'Nel 3–3 con la Roma il Napoli era avanti di due gol prima di essere raggiunto, poi ha perso anche il vantaggio ritrovato nel finale. È un episodio utile per distinguere la capacità di segnare dalla continuità nella gestione della gara. Il Torino può provare a sfruttare proprio gli spazi e i cali di controllo.',
  'Ci aspettiamo più iniziativa del Napoli, con il Torino capace di contendere fasi della partita. Un successo interno resta possibile, ma le verifiche non descrivono un divario tale da rendere inevitabile una vittoria larga.'
 ],
 'parma-roma': [
  'La Roma arriva da quattro vittorie e un pareggio nelle ultime cinque, con diciassette gol segnati. Il Parma ha invece alternato la vittoria sull’Atalanta a partite poco produttive: il favore degli ospiti trova sostegno nella continuità offensiva.',
  'Il 3–3 a Napoli racconta anche la capacità della Roma di reagire: ha recuperato due gol di svantaggio e pareggiato di nuovo nel finale. Il Parma ha però già dimostrato di poter sorprendere un avversario forte, quindi la differenza di rendimento non rende irrilevante il fattore casa.',
  'Ci aspettiamo una Roma capace di creare più occasioni e indirizzare la partita. Il Parma deve soprattutto limitare gli spazi e restare vicino nel punteggio: una vittoria ospite anche con più gol di scarto è plausibile, senza considerare garantita l’efficacia delle ultime settimane.'
 ],
 'sassuolo-genoa': [
  'Il Sassuolo arriva da cinque sconfitte consecutive, con problemi difensivi ripetuti. Il Genoa ha invece vinto tre delle ultime cinque, pur perdendo l’ultima contro il Milan: il momento favorisce gli ospiti più di quanto suggerisca il solo fattore campo.',
  'Il Sassuolo ha concesso diciannove gol nelle ultime cinque gare. Il Genoa non ha però un attacco particolarmente prolifico in trasferta: la fragilità dei padroni di casa apre una possibilità, non dimostra automaticamente che gli ospiti segneranno molto.',
  'Ci aspettiamo un confronto nel quale il Sassuolo cerchi di reagire e il Genoa possa sfruttare gli errori. Il segnale più stabile riguarda la vulnerabilità interna; sul vincitore e sul numero dei gol le verifiche restano meno concordi.'
 ]
}


def aggregate(rows):
    n = len(rows)
    return dict(matches=n, gf=sum(r['goalsFor'] for r in rows)/n,
                ga=sum(r['goalsAgainst'] for r in rows)/n,
                wins=sum(r['goalsFor'] > r['goalsAgainst'] for r in rows)) if n else dict(matches=0, gf=None, ga=None, wins=0)


def num(x):
    return f'{x:.2f}'.replace('.', ',')


records, public = [], {}
for fixture in [f for f in calendar if f['matchday'] == 12]:
    sides = []
    for team, venue in [(fixture['homeTeam'], 'Casa'), (fixture['awayTeam'], 'Trasferta')]:
        rows = sorted([r for r in history[team] if r['competition'] == 'serie-a' and r['season'] == '2026-27'
                       and r['date'] < fixture['date']], key=lambda r:r['date'])
        assert len(rows) == 11 and len({r['id'] for r in rows}) == 11
        for r in rows:
            a = actuals[r['id']]
            side = 'home' if r['venue'] == 'Casa' else 'away'
            assert (r['goalsFor'], r['goalsAgainst']) == (a['score'][side], a['score']['away' if side == 'home' else 'home'])
        sides.append(dict(teamId=team, season=aggregate(rows), venue=aggregate([r for r in rows if r['venue'] == venue]),
                          recent=aggregate(rows[-5:]), matches=[r['id'] for r in rows]))
    h, a = sides
    overall = [(h['season']['gf']+a['season']['ga'])/2, (a['season']['gf']+h['season']['ga'])/2]
    venue = [(h['venue']['gf']+a['venue']['ga'])/2, (a['venue']['gf']+h['venue']['ga'])/2]
    cells, probabilities, mass = exact.distribution(venue)
    record = dict(fixtureId=fixture['id'], date=fixture['date'], sides=sides, overallGoals=overall,
                  venueGoals=venue, venueScores=cells[:3], venue1x2=probabilities, retainedMass=mass)
    records.append(record)
    key = fixture['homeTeam']+'-'+fixture['awayTeam']
    paragraphs = editorial[key]
    comparisons = f"Le verifiche alternative restituiscono {num(overall[0])}–{num(overall[1])} gol sul campione stagionale e {num(venue[0])}–{num(venue[1])} separando casa e trasferta. In quest’ultima simulazione acquistano peso punteggi come "+', '.join(f"{c['home']}–{c['away']}" for c in cells[:2])+'. Sono confronti descrittivi, non nuove stime calibrate: non correggono la forza degli avversari e i campioni per sede sono più piccoli.'
    public[fixture['id']] = dict(date=fixture['date'], paragraphs=[paragraphs[0], paragraphs[1], comparisons, paragraphs[2]])

assert len(records) == 10
assert all((ROOT/p).read_bytes() == content for p, content in raw.items())
OUT.mkdir(parents=True, exist_ok=True)
result = dict(status='DESCRIPTIVE_NOT_PROMOTED', fixtures=records,
              inputs={p:hashlib.sha256(content).hexdigest() for p,content in raw.items()},
              limitations=['No lineup, odds or model changes', 'Means are arithmetic GF/team and GA/opponent, same league',
                           'Venue comparison does not adjust opponent strength',
                           'Milan-Bologna MD9 scorer allocation contradicts final result; no chronology inferred'])
(OUT/'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
target=ROOT/'js/pages/reading-detail/serie-a-expectation.mjs'
target.write_text('''// Editorial MD12 snapshot. No operational model inputs.
const expectations = '''+json.dumps(public,ensure_ascii=False,indent=2)+''';
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function serieAMatchExpectationMarkup(fixture){
 const entry=expectations[fixture.id];
 if(!entry||fixture.status!=='scheduled'||fixture.date!==entry.date)return '';
 return entry.paragraphs.map((text,index)=>{
  let html=escape(text);
  if(index===0||index===3)html=html.replace(/^(.+?\\.)(?= |$)/,'<strong>$1</strong>');
  if(index===2)html=html.replace(/\\d+,\\d+–\\d+,\\d+(?= gol| separando)/g,'<strong>$&</strong>');
  return `<p>${html}</p>`;
 }).join('')+'<p class="rd-footnote">Analisi sulle prime undici giornate. Lettura da aggiornare con le formazioni; simulazioni separate dai pronostici.</p>';
}
''', encoding='utf-8')
lines=['# Aspettativa Gara Serie A MD12','', 'Analisi descrittiva sulle prime undici giornate: nessuna modifica a modelli, quote o selezioni. Le due sensibilità sono medie aritmetiche tra GF squadra e GA avversaria, su stagione e sede separatamente. Non sono nuove previsioni validate.', '', '| Gara | Stagione | Sede |', '|---|---|---|']
for f in records:
    lines.append(f"| {f['fixtureId']} | {num(f['overallGoals'][0])}–{num(f['overallGoals'][1])} | {num(f['venueGoals'][0])}–{num(f['venueGoals'][1])} |")
lines+=['','## Evidenze ed episodi','', 'Totali verificati sul registro canonico dei risultati, 11 gare per squadra. Cronologie usate: Torino–Como MD9, gol Como 81′, 87′, 90+2′; Napoli–Roma MD8, Napoli avanti 2–0, pareggio Roma, nuovo vantaggio Napoli e 3–3 Roma all’89′. La sequenza marcatori Milan–Bologna MD9 contraddice il risultato finale: esclusa dalle inferenze e lasciata invariata.', '', '## Input', '']+['- `'+p+'` SHA256 `'+v+'`' for p,v in result['inputs'].items()]
(OUT/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('PASS: 10 gare, 20 squadre con 11 risultati verificati; testi e analisi isolata generati')
