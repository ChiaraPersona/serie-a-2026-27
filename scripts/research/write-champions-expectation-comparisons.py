"""Publish explanatory copy from the isolated audit, never forecast numbers."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
analysis = json.loads((ROOT / 'data/analysis/champions/md5-expectations-2026-11-20/results.json').read_text(encoding='utf-8'))


def number(value):
    return f'{value:.2f}'.replace('.', ',')


def scores(cells):
    return ', '.join(f"{c['home']}–{c['away']} ({number(100*c['probability'])}%)" for c in cells)


copy = {}
for fixture in analysis['fixtures']:
    home, away = fixture['sides']
    domestic = []
    europe = []
    for side in [home, away]:
        name, d, v, e, ev = side['name'], side['domestic'], side['domesticVenue'], side['europe'], side['europeVenue']
        venue = 'in casa' if side['venue'] == 'home' else 'in trasferta'
        if d['matches']:
            domestic.append(f"{name}: nel campione di {d['matches']} gare di {side['league']}, {number(d['gf'])} gol fatti e {number(d['ga'])} subiti a partita; {venue}, {number(v['gf'])} fatti e {number(v['ga'])} subiti in {v['matches']} gare.")
        else:
            domestic.append(f"{name}: confronto domestico N/D, perché manca un campione omogeneo del campionato.")
        europe.append(f"{name} ha segnato {e['goalsFor']} gol e ne ha subiti {e['goalsAgainst']} nelle quattro europee; {venue}, {ev['goalsFor']} fatti e {ev['goalsAgainst']} subiti in {ev['matches']} gare.")
    comparisons = f"La prova basata sui rating restituisce {number(fixture['trialGoals'][0])}–{number(fixture['trialGoals'][1])} gol. I primi tre punteggi della prova sono {scores(fixture['trialTopScores'])}. Si tratta di una simulazione sperimentale, non di un aggiornamento dei pronostici."
    sensitivity = f"Per verificare quanto pesa il rendimento europeo, abbiamo incrociato la media dei gol segnati da ciascuna squadra con quella dei gol concessi dall’avversaria: il confronto descrittivo dà {number(fixture['descriptiveGoals'][0])}–{number(fixture['descriptiveGoals'][1])} gol e questi tre punteggi: {scores(fixture['descriptiveTopScores'])}. Non corregge la forza degli avversari e non è una previsione calibrata."
    hs, aws = home['meanCurrentOpponentRating'], away['meanCurrentOpponentRating']
    if abs(hs-aws) >= 2:
        tougher = home['name'] if hs > aws else away['name']
        context = f"I rating attuali indicano un gruppo di avversari europei mediamente più forte per {tougher}: è un elemento descrittivo da considerare prima di confrontare le medie, non una correzione statistica già applicata."
    else:
        context = 'La forza media attuale degli avversari europei non mostra un divario marcato tra i due percorsi, ma quattro gare e i piccoli campioni per sede non bastano a rendere equivalenti i calendari.'
    short_scores = ', '.join(f"{c['home']}–{c['away']}" for c in fixture['descriptiveTopScores'][:2])
    compact = f"Le verifiche alternative restituiscono {number(fixture['trialGoals'][0])}–{number(fixture['trialGoals'][1])} gol nella prova sui rating e {number(fixture['descriptiveGoals'][0])}–{number(fixture['descriptiveGoals'][1])} nel confronto tra produzione e concessioni europee. In quest’ultimo acquistano peso punteggi come {short_scores}. Sono simulazioni sperimentali e descrittive, non nuove stime calibrate: il confronto europeo non corregge la forza degli avversari."
    copy[fixture['fixtureId']] = compact

target = ROOT / 'js/pages/reading-detail/champions-expectation-comparisons.mjs'
target.write_text('// Explanatory snapshot from isolated CL5 audit, through 8 November 2026. No model inputs.\nexport const expectationComparisons = '+json.dumps(copy, ensure_ascii=False, indent=2)+';\n', encoding='utf-8')
print('Written explanatory comparisons for', len(copy), 'fixtures')
