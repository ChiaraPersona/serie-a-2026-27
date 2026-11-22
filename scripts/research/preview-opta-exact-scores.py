"""Exact-score trial from frozen Opta goal rates; writes research artifacts only."""
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data/analysis/champions/opta-direct-goals-2026-11-19/results.json'
OUT = ROOT / 'data/analysis/champions/opta-exact-scores-2026-11-20'


def distribution(means):
    sides = []
    for rate in means:
        assert math.isfinite(rate) and rate > 0
        probabilities = [math.exp(-rate)]
        while 1 - math.fsum(probabilities) > 1e-13:
            probabilities.append(probabilities[-1] * rate / len(probabilities))
            assert len(probabilities) < 1000
        sides.append(probabilities)
    cells = [dict(home=h, away=a, probability=ph * pa)
             for h, ph in enumerate(sides[0]) for a, pa in enumerate(sides[1])]
    cells.sort(key=lambda c: (-c['probability'], c['home'], c['away']))
    mass = math.fsum(c['probability'] for c in cells)
    assert abs(mass - 1) < 3e-13
    for side in ['home', 'away']:
        assert abs(math.fsum(c[side] * c['probability'] for c in cells) - means[['home', 'away'].index(side)]) < 1e-10
    outcomes = [math.fsum(c['probability'] for c in cells if condition(c)) for condition in
                [lambda c: c['home'] > c['away'], lambda c: c['home'] == c['away'], lambda c: c['home'] < c['away']]]
    return cells, outcomes, mass


def main():
    original = SOURCE.read_bytes()
    source = json.loads(original)
    preview = []
    for fixture in source['preview']:
        cells, outcomes, mass = distribution(fixture['candidateGoals'])
        assert max(abs(a-b) for a, b in zip(outcomes, fixture['candidate1x2'])) < 1e-10
        preview.append({key: fixture[key] for key in ['fixtureId', 'date', 'home', 'away', 'candidateGoals']} |
                       dict(topScores=cells[:5], candidate1x2=outcomes, retainedMass=mass))
    evaluation = {}
    for label, field in [('opta', 'directGoalMeans'), ('constant', 'constantGoalMeans')]:
        hits = [0, 0, 0]
        losses = []
        for fixture in source['predictions']:
            cells, _, _ = distribution(fixture[field])
            actual = tuple(fixture['actual'])
            for i, count in enumerate([1, 3, 5]):
                hits[i] += actual in [(c['home'], c['away']) for c in cells[:count]]
            losses.append(sum(rate - goals * math.log(rate) + math.lgamma(goals + 1)
                              for rate, goals in zip(fixture[field], actual)))
        evaluation[label] = dict(matches=len(losses), top1Hits=hits[0], top3Hits=hits[1], top5Hits=hits[2], scoreNll=math.fsum(losses)/len(losses))
    assert abs(evaluation['opta']['scoreNll'] - source['test']['directGoals']['jointScoreNll']) < 1e-12
    assert SOURCE.read_bytes() == original
    result = dict(status='EXPERIMENTAL_NOT_PROMOTED', sourceSha256=hashlib.sha256(original).hexdigest(),
                  method='Frozen independent Poisson; unrounded means; no tail renormalization; regulation time',
                  evaluation=evaluation, preview=preview)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = ['# Prova risultati esatti da rating Opta', '',
             'Modello congelato della prova del 19 novembre: nessun nuovo fitting o modifica operativa.',
             'Probabilità dei punteggi sui 90 minuti, recupero incluso, supplementari esclusi. Prime cinque combinazioni ordinate per probabilità; coda non rinormalizzata.', '',
             '| Gara | Cinque risultati più probabili |', '|---|---|']
    for fixture in preview:
        scores = '; '.join(f"{c['home']}–{c['away']} ({100*c['probability']:.2f}%)" for c in fixture['topScores'])
        lines.append(f"| {fixture['home']} – {fixture['away']} | {scores} |")
    lines += ['', '## Verifica storica descrittiva', '', '| Modello | Gare | Primo risultato centrato | Nei primi 3 | Nei primi 5 | NLL punteggio ↓ |', '|---|---:|---:|---:|---:|---:|']
    for name, e in evaluation.items():
        lines.append(f"| {name} | {e['matches']} | {e['top1Hits']} | {e['top3Hits']} | {e['top5Hits']} | {e['scoreNll']:.4f} |")
    lines += ['', 'Le 37 gare sono il test già consultato nella ricerca precedente; nessun nuovo test indipendente. Il riferimento costante non è il motore operativo. I conteggi top-k sono descrittivi, con parità ordinate per gol casa e poi ospiti. Nessuna prova di superiorità sul modello attuale, nessuna quota o EV attribuita.',
              'Verificati massa totale, medie, coerenza 1X2 e riproduzione della NLL storica. Nessuna promozione, commit, push o pubblicazione.']
    (OUT / 'REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps(evaluation))
    print(json.dumps(next(p for p in preview if 'Sabah' in p['home']), ensure_ascii=False))


if __name__ == '__main__':
    main()
