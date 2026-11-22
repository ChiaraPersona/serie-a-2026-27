"""Fixture-level descriptive audit; no operational forecasts are changed."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/analysis/champions/md5-expectations-2026-11-20'
FILES = dict(calendar='data/normalized/champions-league-2026-27.json',
             domestic='data/sources/champions-pilot-match-stats-2025-27.json',
             scenarios='data/generated/champions-shared-scenarios.json',
             trial='data/analysis/champions/opta-direct-goals-2026-11-19/results.json',
             ratings='data/sources/champions-opta-club-ratings-2026-27.json')
spec = importlib.util.spec_from_file_location('exact', Path(__file__).with_name('preview-opta-exact-scores.py'))
exact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exact)


def summary(rows):
    n = len(rows)
    return dict(matches=n, goalsFor=sum(r['gf'] for r in rows), goalsAgainst=sum(r['ga'] for r in rows),
                gf=sum(r['gf'] for r in rows)/n if n else None,
                ga=sum(r['ga'] for r in rows)/n if n else None)


def main():
    raw = {k: (ROOT / p).read_bytes() for k, p in FILES.items()}
    data = {k: json.loads(v) for k, v in raw.items()}
    teams = {t['name']: t for t in data['domestic']['teams']}
    ratings = {t['team']: t['rating'] for t in data['ratings']['clubs']}
    fixtures = data['calendar']['fixtures']
    targets = [f for f in fixtures if f['matchday'] == 5 and f['status'] == 'scheduled']
    scenarios = {f['fixtureId']: f for f in data['scenarios']['fixtures']}
    trials = {f['fixtureId']: f for f in data['trial']['preview']}
    results = []
    for fixture in targets:
        sides = []
        for name, venue in [(fixture['homeTeam'], 'home'), (fixture['awayTeam'], 'away')]:
            team = teams[name]
            europe = []
            for match in fixtures:
                if match['status'] != 'finished' or match['date'] >= fixture['date'] or match['matchday'] >= 5:
                    continue
                side = 'home' if match['homeTeam'] == name else 'away' if match['awayTeam'] == name else None
                if side:
                    other = 'away' if side == 'home' else 'home'
                    europe.append(dict(id=match['id'], date=match['date'], venue=side,
                                       opponent=match[other+'Team'], opponentRating=ratings.get(match[other+'Team']),
                                       gf=match['score'][side], ga=match['score'][other]))
            domestic = {}
            duplicates = 0
            if team['league'] != 'uefa.champions':
                for match in data['domestic']['matches']:
                    if match['league'] != team['league'] or match['season'] != '2026-27' or match['date'] > '2026-11-08':
                        continue
                    pid = str(team.get('statisticsProviderIds', {}).get(match.get('source', {}).get('provider'), team['espnTeamId']))
                    side = next((v for v in ['home', 'away'] if str(match[v].get('providerTeamId')) == pid), None)
                    if not side:
                        continue
                    other = 'away' if side == 'home' else 'home'
                    row = dict(id=match['eventId'], date=match['date'], venue=side,
                               gf=match[side]['score'], ga=match[other]['score'])
                    key = (row['date'], side)
                    if key in domestic:
                        assert (row['gf'], row['ga']) == (domestic[key]['gf'], domestic[key]['ga']), (name, key, 'conflicting scores')
                        duplicates += 1
                    else:
                        domestic[key] = row
            rows = sorted(domestic.values(), key=lambda r: r['date'])
            assert len(europe) == 4, name
            sides.append(dict(name=name, teamId=team['id'], league=team['leagueName'], venue=venue,
                              domestic=summary(rows), domesticVenue=summary([r for r in rows if r['venue'] == venue]),
                              domesticRecent=summary(rows[-5:]), domesticRows=rows, duplicateRowsRemoved=duplicates,
                              europe=summary(europe), europeVenue=summary([r for r in europe if r['venue'] == venue]),
                              europeanRows=europe,
                              meanCurrentOpponentRating=sum(r['opponentRating'] for r in europe)/4
                              if all(r['opponentRating'] is not None for r in europe) else None))
        home, away = sides
        benchmark = [(home['europe']['gf'] + away['europe']['ga'])/2,
                     (away['europe']['gf'] + home['europe']['ga'])/2]
        cells, outcomes, mass = exact.distribution(benchmark)
        scenario, trial = scenarios[fixture['id']], trials[fixture['id']]
        assert [trial['home'], trial['away']] == [fixture['homeTeam'], fixture['awayTeam']]
        trial_cells, _, _ = exact.distribution(trial['candidateGoals'])
        results.append(dict(fixtureId=fixture['id'], date=fixture['date'], sides=sides,
                            currentGoals=[scenario['expectedGoals']['home'], scenario['expectedGoals']['away']],
                            currentScores=scenario['scoreForecast']['display'], trialGoals=trial['candidateGoals'],
                            trialTopScores=trial_cells[:3], descriptiveGoals=benchmark,
                            descriptiveTopScores=cells[:3], descriptive1x2=outcomes, retainedMass=mass))
    assert len(results) == 18
    for key, value in raw.items():
        assert (ROOT / FILES[key]).read_bytes() == value, 'Input changed during analysis'
    output = dict(status='DESCRIPTIVE_NOT_CALIBRATED_NOT_PROMOTED', cutoff='2026-11-08',
                  method='Arithmetic mean of European GF/team and GA/opponent, all four matches, independent Poisson sensitivity only',
                  limitations=['Not an opponent-adjusted or league-strength-calibrated model',
                               'Venue splits are shown separately, not fitted from two matches',
                               'Domestic samples can be incomplete; do not mix league and European goal rates',
                               'Opponent ratings are CURRENT descriptive strength, not prematch historical ratings',
                               'No lineups, odds, EV or operational forecasts changed'],
                  inputs={FILES[k]: hashlib.sha256(v).hexdigest() for k, v in raw.items()}, fixtures=results)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'results.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    lines = ['# Analisi delle aspettative CL5', '', output['method'], '',
             'Sensibilità descrittiva non calibrata. Nessuna promozione o modifica ai motori. Medie per sede e forza attuale degli avversari sono confronti separati, non correttivi inventati.', '']
    for f in results:
        lines += [f"## {f['sides'][0]['name']} – {f['sides'][1]['name']}", '',
                  '| Squadra | Campionato: n / GF / GA per gara | Sede domestica: n / GF / GA | Champions: n / GF / GA | Sede Champions: n / GF / GA | Rating attuale medio avversari europei |',
                  '|---|---|---|---|---|---|']
        for side in f['sides']:
            def fmt(s):
                return f"{s['matches']} / {s['gf']:.2f} / {s['ga']:.2f}" if s['matches'] else 'N/D'
            rank = side['meanCurrentOpponentRating']
            lines.append('| '+side['name']+' | '+' | '.join(fmt(side[k]) for k in ['domestic','domesticVenue','europe','europeVenue'])+f" | {rank:.2f} |")
            lines.append('')
        for label, key in [('Operativo', 'currentGoals'), ('Prova rating congelata', 'trialGoals'), ('Sensibilità europea descrittiva', 'descriptiveGoals')]:
            lines.append(f"- {label}: {f[key][0]:.2f}–{f[key][1]:.2f} gol.")
        lines.append('- Punteggi sensibilità: '+', '.join(f"{c['home']}–{c['away']} ({100*c['probability']:.2f}%)" for c in f['descriptiveTopScores']))
        lines += ['- Partite europee: '+ '; '.join(side['name']+': '+', '.join(f"{r['venue']} {r['gf']}–{r['ga']} {r['opponent']}" for r in side['europeanRows']) for side in f['sides']), '']
    lines += ['## Limiti', '']+['- '+s for s in output['limitations']]+['', '## Input e impronte', '']+['- `'+p+'`: `'+v+'`' for p,v in output['inputs'].items()]
    (OUT / 'REPORT.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
    print('PASS: 18 fixture, quattro gare europee per squadra, duplicati domestici riconciliati, input invariati')
    for f in results:
        print(f['fixtureId'][-2:], f['sides'][0]['name'], '/', f['sides'][1]['name'], 'current', f['currentGoals'], 'rating', [round(x,2) for x in f['trialGoals']], 'descriptive', f['descriptiveGoals'])


if __name__ == '__main__':
    main()
