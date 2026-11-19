"""Isolated direct Opta -> regulation-goals experiment. No production writes."""
import sys
sys.dont_write_bytecode = True
import pathlib, json, gzip, hashlib, math, datetime
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/analysis/champions/opta-direct-goals-2026-11-19'
PAIRS = ROOT / 'data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-match-pairs.jsonl.gz'
PROTOCOL = OUT / 'protocol.json'
CALIBRATION = ROOT / 'data/analysis/champions/opta-calibration-2026-11-18/results.json'
RATINGS = ROOT / 'data/sources/champions-opta-club-ratings-2026-27.json'
SCENARIOS = ROOT / 'data/generated/champions-shared-scenarios.json'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def features(gaps):
    gaps = np.asarray(gaps, dtype=float)
    x = np.ones((len(gaps), 2, 3))
    x[:, 0, 1], x[:, 1, 1] = .5, -.5
    x[:, 0, 2], x[:, 1, 2] = gaps / 10, -gaps / 10
    return x

def rates(theta, x):
    with np.errstate(over='ignore'):
        return np.exp(x @ theta)

def objective(theta, x, y, lam):
    eta = x @ theta
    with np.errstate(over='ignore'):
        value = np.sum(np.exp(eta) - y * eta) + lam * np.dot(theta, theta) / 2
    return float(value)

def fit(x, y, lam):
    averages = np.maximum(y.mean(axis=0), .001)
    theta = np.array([np.log(averages).mean(), np.log(averages[0] / averages[1]), 0.])
    design = x.reshape(-1, 3)
    for _ in range(150):
        prediction = rates(theta, x)
        gradient = design.T @ (prediction - y).reshape(-1) + lam * theta
        hessian = design.T @ (prediction.reshape(-1, 1) * design) + lam * np.eye(3)
        active = [0, 1] if theta[2] <= 0 and gradient[2] >= 0 else [0, 1, 2]
        step = np.zeros(3)
        step[active] = np.linalg.solve(hessian[np.ix_(active, active)], gradient[active])
        old, scale = objective(theta, x, y, lam), 1.
        while scale > 1e-12:
            proposed = theta - scale * step
            proposed[2] = max(0., proposed[2])
            if objective(proposed, x, y, lam) <= old + 1e-11:
                break
            scale *= .5
        else:
            raise RuntimeError('Poisson optimizer line search failed')
        delta, theta = np.max(np.abs(proposed - theta)), proposed
        if delta < 1e-10:
            break
    else:
        raise RuntimeError('Poisson optimizer did not converge')
    gradient = design.T @ (rates(theta, x) - y).reshape(-1) + lam * theta
    assert np.max(np.abs(gradient[:2])) < 1e-6
    assert (theta[2] > 0 and abs(gradient[2]) < 1e-6) or (theta[2] == 0 and gradient[2] >= -1e-6)
    return theta

def score_losses(prediction, y):
    constants = np.array([[math.lgamma(int(v) + 1) for v in pair] for pair in y])
    return np.sum(prediction - y * np.log(prediction) + constants, axis=1)

def poisson_support(rate, tolerance=1e-13):
    assert math.isfinite(rate) and 0 < rate < 700
    probability = math.exp(-rate)
    values, mass, k = [probability], probability, 0
    while mass < 1 - tolerance:
        k += 1
        assert k < 10000
        probability *= rate / k
        values.append(probability)
        mass += probability
    return np.array(values), max(0., 1 - mass)

def outcomes(prediction):
    result = []
    for home, away in prediction:
        h, ht = poisson_support(float(home))
        a, at = poisson_support(float(away))
        matrix = h[:, None] * a[None, :]
        hg, ag = np.indices(matrix.shape)
        values = np.array([matrix[hg > ag].sum(), matrix[hg == ag].sum(), matrix[hg < ag].sum()])
        assert ht <= 1.01e-13 and at <= 1.01e-13 and abs(values.sum() - 1) <= 2.1e-13
        result.append(values / values.sum())
    return np.array(result)

def outcome_losses(p, labels):
    return -np.log(np.maximum(p[np.arange(len(labels)), labels], 1e-300))

def outcome_metrics(p, labels):
    return dict(n=len(labels), logLoss=float(outcome_losses(p, labels).mean()),
                brier=float(np.sum((p - np.eye(3)[labels]) ** 2, axis=1).mean()),
                correct=int(np.sum(p.argmax(axis=1) == labels)), accuracy=float(np.mean(p.argmax(axis=1) == labels)))

def metrics(prediction, y):
    labels = np.where(y[:, 0] > y[:, 1], 0, np.where(y[:, 0] == y[:, 1], 1, 2))
    return dict(n=len(y), jointScoreNll=float(score_losses(prediction, y).mean()),
                goalMae=float(np.abs(prediction - y).mean()), goalRmse=float(np.sqrt(np.mean((prediction - y) ** 2))),
                totalGoalMae=float(np.abs(prediction.sum(axis=1) - y.sum(axis=1)).mean()),
                meanPredicted=prediction.mean(axis=0).tolist(), meanObserved=y.mean(axis=0).tolist(),
                outcomes=outcome_metrics(outcomes(prediction), labels))

def bootstrap(delta, dates):
    groups = [np.where(dates == day)[0] for day in sorted(set(dates))]
    random = np.random.default_rng(20261119)
    samples = []
    for _ in range(2000):
        indices = np.concatenate([groups[int(i)] for i in random.integers(0, len(groups), size=len(groups))])
        samples.append(float(delta[indices].mean()))
    return dict(meanDelta=float(delta.mean()), dateClusters=len(groups), matches=len(delta),
                descriptive95PercentileInterval=np.quantile(samples, [.025, .975]).tolist(), seed=20261119)

def run():
    protocol = json.loads(PROTOCOL.read_text(encoding='utf-8'))
    assert protocol['writtenBeforeFit'] and protocol['productionPromotion'] is False
    protected = [ROOT / p for p in [
        'data/generated/champions-shared-scenarios.json', 'data/sources/champions-european-result-policy.json',
        'data/normalized/champions-opta-result-model.json', 'data/sources/champions-opta-club-ratings-2026-27.json',
        'data/generated/champions-booking-hypotheses.json', 'data/normalized/official-starter-registry.json',
        'data/normalized/schedina-champions-md03.json', 'data/normalized/schedina-champions-md04.json',
        'data/normalized/predictions.json', 'data/sources/champions-pilot-match-stats-2025-27.json',
        'data/normalized/odds/sisal/champions-league.json']]
    inputs = [PAIRS, PROTOCOL, CALIBRATION, RATINGS, SCENARIOS, pathlib.Path(__file__).resolve()]
    before = {str(p.relative_to(ROOT)): sha(p) for p in set(protected + inputs)}
    rows = [json.loads(line) for line in gzip.open(PAIRS, 'rt', encoding='utf-8')]
    rows.sort(key=lambda r: (r['date'], str(r['fixtureId'])))
    assert len(rows) == 136 and len({str(r['fixtureId']) for r in rows}) == len(rows)
    for r in rows:
        assert all(r[s + 'Rating']['date'] < r['date'] for s in ['home', 'away'])
        assert all(2 <= (datetime.date.fromisoformat(r['date']) - datetime.date.fromisoformat(r[s + 'Rating']['date'])).days <= 7 for s in ['home', 'away'])
        assert all(str(r[s + 'Team']['id']) == str(r[s + 'Rating']['uefaTeamId']) for s in ['home', 'away'])
        assert all(isinstance(r['score90'][s], int) and r['score90'][s] >= 0 for s in ['home', 'away'])
    dates = np.array([r['date'] for r in rows])
    gaps = np.array([r['homeRating']['rating'] - r['awayRating']['rating'] for r in rows])
    y = np.array([[r['score90']['home'], r['score90']['away']] for r in rows])
    x = features(gaps)
    train, validation, test = dates < '2025-01-01', (dates >= '2025-01-01') & (dates < '2025-07-01'), dates >= '2025-07-01'
    assert (int(train.sum()), int(validation.sum()), int(test.sum())) == (57, 42, 37)
    selections = []
    for lam in [.1, 1., 10.]:
        theta = fit(x[train], y[train], lam)
        selections.append(dict(regularization=lam, parameters=theta.tolist(), validation=metrics(rates(theta, x[validation]), y[validation])))
    chosen = min(selections, key=lambda r: r['validation']['jointScoreNll'])
    frozen = fit(x[~test], y[~test], chosen['regularization'])
    predicted, observed = rates(frozen, x[test]), y[test]
    constant_means = y[~test].mean(axis=0)
    constant = np.tile(constant_means, (int(test.sum()), 1))
    labels = np.where(observed[:, 0] > observed[:, 1], 0, np.where(observed[:, 0] == observed[:, 1], 1, 2))
    previous = json.loads(CALIBRATION.read_text(encoding='utf-8'))
    reference = {str(r['fixtureId']): r for r in previous['predictions']}
    tested = [r for r, mask in zip(rows, test) if mask]
    opta_result = np.array([reference[str(r['fixtureId'])]['candidate'] for r in tested])
    assert all(reference[str(r['fixtureId'])]['actual'] == int(label) for r, label in zip(tested, labels))
    candidate_outcomes = outcomes(predicted)
    snapshot = json.loads(RATINGS.read_text(encoding='utf-8'))
    clubs = {r['team']: r for r in snapshot['clubs']}
    operational = json.loads(SCENARIOS.read_text(encoding='utf-8'))
    preview = []
    for fixture in operational['fixtures']:
        if fixture['matchday'] != 5:
            continue
        home, away = clubs[fixture['homeTeam']], clubs[fixture['awayTeam']]
        gap = home['rating'] - away['rating']
        means = rates(frozen, features([gap]))[0]
        p = outcomes([means])[0]
        preview.append(dict(fixtureId=fixture['fixtureId'], date=fixture['date'], home=fixture['homeTeam'], away=fixture['awayTeam'],
                            ratingGap=gap, ratings=[home['rating'], away['rating']], candidateGoals=means.tolist(),
                            candidate1x2=p.tolist(), currentGoals=[fixture['expectedGoals']['home'], fixture['expectedGoals']['away']],
                            current1x2=[fixture['probabilities'][k] / 100 for k in ['home', 'draw', 'away']],
                            numericGapWithinFitRange=bool(gaps[~test].min() <= gap <= gaps[~test].max()),
                            teamUnseenInFit=[name not in {r[s+'Rating']['team'] for r, mask in zip(rows, ~test) if mask for s in ['home','away']} for name in [fixture['homeTeam'],fixture['awayTeam']]]))
    assert len(preview) == 18
    prediction_rows = [dict(fixtureId=r['fixtureId'], date=r['date'], home=r['homeTeam']['name'], away=r['awayTeam']['name'],
                            actual=observed[i].tolist(), directGoalMeans=predicted[i].tolist(), candidate1x2=candidate_outcomes[i].tolist(),
                            constantGoalMeans=constant[i].tolist(), frozenOpta1x2=opta_result[i].tolist()) for i, r in enumerate(tested)]
    protected_status = {str(p.relative_to(ROOT)): sha(p) == before[str(p.relative_to(ROOT))] for p in protected}
    assert all(protected_status.values()), 'Experiment changed a protected operational artifact'
    assert sha(PROTOCOL) == before[str(PROTOCOL.relative_to(ROOT))], 'Protocol changed during fitting'
    result = dict(status='EXPERIMENTAL_NOT_PROMOTED', protocolSha256=before[str(PROTOCOL.relative_to(ROOT))], inputs=before,
                  split=dict(train=int(train.sum()), validation=int(validation.sum()), test=int(test.sum()), testFrom=str(min(dates[test])), testThrough=str(max(dates[test])), testAlreadyInspectedForPrevious1x2=True),
                  selection=selections, frozenModel=dict(type='independent-poisson-opta-gap', mu=float(frozen[0]), homeAdvantage=float(frozen[1]), ratingGapSlope=float(frozen[2]), gapScale=10, regularization=chosen['regularization'], trainingMatches=99, trainedThrough=str(max(dates[~test])), extraLeagueBonus=False),
                  test=dict(directGoals=metrics(predicted, observed), constantGoals=metrics(constant, observed), frozenOpta1x2=outcome_metrics(opta_result, labels)),
                  paired=dict(scoreNllVsConstant=bootstrap(score_losses(predicted, observed) - score_losses(constant, observed), dates[test]),
                              outcomeLogLossVsFrozenOpta=bootstrap(outcome_losses(candidate_outcomes, labels) - outcome_losses(opta_result, labels), dates[test])),
                  fitSupport=dict(minGap=float(gaps[~test].min()), maxGap=float(gaps[~test].max()), matchesWithAbsGapAtLeastTen=int(np.sum(np.abs(gaps[~test]) >= 10)), matches=99),
                  predictions=prediction_rows, preview=preview, protectedUnchanged=protected_status, limitations=protocol['limitations'])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write_report(result)
    print(json.dumps({k: result[k] for k in ['split', 'frozenModel', 'test', 'paired', 'fitSupport']}, ensure_ascii=False, indent=2))
    print('Sabah-Barcelona:', json.dumps(next(p for p in preview if p['fixtureId']=='ucl-2026-27-md05-10'), ensure_ascii=False))
    return result

def write_report(result):
    m, tests = result['frozenModel'], result['test']
    lines = ['# Prova isolata: gol direttamente dai rating Opta', '',
             'Esperimento esplorativo del 19 novembre 2026. Nessuna modifica alle Letture operative.', '',
             '## Protocollo e modello', '',
             'Protocollo scritto prima del fit in `protocol.json`. Split cronologico 57 / 42 / 37; refit finale sulle prime 99 gare. Nessun rating corrente usato per predire risultati passati. Il test è già stato consultato per la precedente calibrazione 1X2 e non è un nuovo holdout vergine.', '',
             '`log(lambda_H) = mu + homeAdvantage/2 + ratingGapSlope*(rating_H-rating_A)/10`', '',
             '`log(lambda_A) = mu - homeAdvantage/2 - ratingGapSlope*(rating_H-rating_A)/10`', '',
             'Poisson indipendenti. Le medie sono gol previsti dal modello, non xG/xGOT osservati. Nessun bonus lega, prior Elo o correzione xGOT. Supporto adattivo con coda omessa non superiore a 1e-13 per squadra; medie analitiche.', '',
             'Parametri congelati: `' + json.dumps(m) + '`.', '', '## Test cronologico', '',
             '| Modello | NLL punteggio ↓ | MAE gol/squadra ↓ | MAE gol totali ↓ | Log loss 1X2 ↓ | Corretti 1X2 |',
             '|---|---:|---:|---:|---:|---:|']
    for label, key in [('Gol diretti Opta', 'directGoals'), ('Medie casa/trasferta costanti', 'constantGoals')]:
        v = tests[key]
        lines.append(f"| {label} | {v['jointScoreNll']:.4f} | {v['goalMae']:.4f} | {v['totalGoalMae']:.4f} | {v['outcomes']['logLoss']:.4f} | {v['outcomes']['correct']}/37 |")
    ref = tests['frozenOpta1x2']
    lines.append(f"| Calibrazione Opta 1X2 congelata, senza xGOT | N/D | N/D | N/D | {ref['logLoss']:.4f} | {ref['correct']}/37 |")
    lines += ['', 'Il riferimento a medie costanti è stimato sulle stesse prime 99 gare. La calibrazione 1X2 non fornisce una distribuzione dei punteggi: NLL punteggio e MAE gol restano N/D. Non è disponibile un confronto storico equo con tutta la Lettura corrente.', '', '## Incertezza appaiata', '']
    for name, v in result['paired'].items():
        interval = v['descriptive95PercentileInterval']
        lines.append(f"- {name}: delta {v['meanDelta']:.4f}; intervallo descrittivo 95% [{interval[0]:.4f}, {interval[1]:.4f}], {v['dateClusters']} date, 37 gare. Delta negativo favorisce il candidato.")
    lines += ['', '## Anteprima prossima giornata', '',
              'I confronti sotto sono descrittivi tra due previsioni, non misure di precisione. La probabilità 1X2 candidata deriva dalla stessa Poisson dei suoi gol; non è miscelata con quella operativa.', '',
              '| Gara | Gol attuali | Gol diretti Opta | 1/X/2 candidato |', '|---|---:|---:|---:|']
    for p in result['preview']:
        fmt = lambda values: '–'.join(f'{v:.2f}' for v in values)
        lines.append(f"| {p['home']} – {p['away']} | {fmt(p['currentGoals'])} | {fmt(p['candidateGoals'])} | {' / '.join(f'{v*100:.1f}%' for v in p['candidate1x2'])} |")
    lines += ['', '## Limiti e stato', ''] + ['- ' + s for s in result['limitations']]
    lines += ['', 'La specifica impone `lambda_H*lambda_A=exp(2*mu)`: il divario di forza modifica simmetricamente i gol e fa crescere il totale. Solo sette delle 99 gare di fit hanno |gap| >= 10. Sabah non è nel fit: anche se il gap numerico è nel range, il trasferimento al club resta da validare.', '',
              '## Evidenze interne', '',
              '- Dati storici con ID e date: `data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-match-pairs.jsonl.gz`.',
              '- Disponibilità e identità: `data/analysis/champions/opta-historical-feasibility-2026-11-18/archive-content-audit.json`.',
              '- Confronto 1X2 congelato: `data/analysis/champions/opta-calibration-2026-11-18/results.json`.',
              '- Snapshot primario corrente: `data/sources/champions-opta-club-ratings-2026-27.json`.',
              '- Calcolo riproducibile: `scripts/research/calibrate-opta-goals.py`; input e hash in `results.json`.', '',
              'Tutti gli hash protetti risultano invariati. Stato `EXPERIMENTAL_NOT_PROMOTED`: nessun builder operativo, commit, push o deploy.']
    (OUT / 'REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

if __name__ == '__main__':
    run()
