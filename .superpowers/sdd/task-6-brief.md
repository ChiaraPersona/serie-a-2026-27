### Task 6: Routes and Templates

**Files:**
- Create: `app/routes/__init__.py`, `app/routes/main.py`, `app/routes/predictions.py`, `app/routes/teams.py`, `app/routes/players.py`, `app/routes/api.py`
- Create: `app/templates/base.html`, `app/templates/index.html`, `app/templates/predictions.html`, `app/templates/team.html`, `app/templates/player.html`, `app/templates/match.html`
- Create: `app/static/css/style.css`
- Create: `tests/test_routes.py`

**Interfaces:**
- Consumes: All services and models
- Produces: Flask blueprints registered on app

- [ ] **Step 1: Write `tests/test_routes.py`**

```python
from app.models import Team, Player, Match


def test_index_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.get("/")
    assert response.status_code == 200
    assert b"Serie A" in response.data


def test_giornata_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.get("/giornata/1")
    assert response.status_code == 200
    assert b"INT" in response.data
    assert b"MIL" in response.data


def test_giornata_simula_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    p1 = Player(name="P1", team_id=t1.id, position="ATT", age=27,
                market_value=50.0, prev_goals=10, prev_assists=5,
                prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
    p2 = Player(name="P2", team_id=t2.id, position="ATT", age=26,
                market_value=50.0, prev_goals=10, prev_assists=5,
                prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
    db.session.add_all([p1, p2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.post("/giornata/1/simula", data={"runs": 100})
    assert response.status_code == 302


def test_squadra_route(client, db):
    team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add(team)
    db.session.commit()

    response = client.get(f"/squadra/{team.id}")
    assert response.status_code == 200
    assert b"Inter" in response.data


def test_calciatore_route(client, db):
    team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add(team)
    db.session.commit()

    player = Player(name="Test Player", team_id=team.id, position="ATT", age=27,
                    market_value=50.0, prev_goals=10, prev_assists=5,
                    prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
    db.session.add(player)
    db.session.commit()

    response = client.get(f"/calciatore/{player.id}")
    assert response.status_code == 200
    assert b"Test Player" in response.data


def test_partita_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.get(f"/partita/{match.id}")
    assert response.status_code == 200
    assert b"INT" in response.data


def test_classifica_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    response = client.get("/classifica")
    assert response.status_code == 200
    assert b"Inter" in response.data
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_routes.py -v
```
Expected: all fail with ImportError

- [ ] **Step 3: Write `app/routes/__init__.py`**

```python
# Blueprints registered in app factory
```

- [ ] **Step 4: Write `app/routes/main.py`**

```python
from flask import Blueprint, render_template
from app.services.match_service import MatchService
from app.services.ranking_service import RankingService

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    matchdays = MatchService.get_all_matchdays()
    next_matchday = matchdays[0] if matchdays else 1
    matches = MatchService.get_matchday(next_matchday)
    return render_template("index.html", matches=matches, matchdays=matchdays, current_matchday=next_matchday)


@bp.route("/classifica")
def classifica():
    teams = RankingService.compute_ranking()
    return render_template("team.html", teams=teams, mode="classifica")
```

- [ ] **Step 5: Write `app/routes/predictions.py`**

```python
from flask import Blueprint, render_template, request, redirect, url_for
from app.services.match_service import MatchService
from app.services.prediction_engine import PredictionEngine
from app.models import Prediction

bp = Blueprint("predictions", __name__)


@bp.route("/giornata/<int:matchday>")
def giornata(matchday):
    matches = MatchService.get_matchday(matchday)
    matchdays = MatchService.get_all_matchdays()
    predictions = {}
    for match in matches:
        pred = Prediction.query.filter_by(match_id=match.id).order_by(Prediction.created_at.desc()).first()
        predictions[match.id] = pred
    return render_template(
        "predictions.html",
        matches=matches, matchdays=matchdays,
        current_matchday=matchday, predictions=predictions,
    )


@bp.route("/giornata/<int:matchday>/simula", methods=["POST"])
def simula(matchday):
    runs = int(request.form.get("runs", 10000))
    PredictionEngine.predict_matchday(matchday, runs=runs)
    return redirect(url_for("predictions.giornata", matchday=matchday))


@bp.route("/partita/<int:match_id>")
def partita(match_id):
    match = MatchService.get_match(match_id)
    pred = Prediction.query.filter_by(match_id=match_id).order_by(Prediction.created_at.desc()).first()
    return render_template("match.html", match=match, prediction=pred)
```

- [ ] **Step 6: Write `app/routes/teams.py`**

```python
from flask import Blueprint, render_template
from app.models import Team

bp = Blueprint("teams", __name__)


@bp.route("/squadra/<int:team_id>")
def squadra(team_id):
    team = Team.query.get_or_404(team_id)
    players = team.players.all()
    return render_template("team.html", team=team, players=players, mode="detail")
```

- [ ] **Step 7: Write `app/routes/players.py`**

```python
from flask import Blueprint, render_template
from app.models import Player
from app.services.player_service import PlayerService

bp = Blueprint("players", __name__)


@bp.route("/calciatore/<int:player_id>")
def calciatore(player_id):
    player = Player.query.get_or_404(player_id)
    strength = PlayerService.compute_strength(player)
    return render_template("player.html", player=player, strength=strength)
```

- [ ] **Step 8: Write `app/routes/api.py`**

```python
from flask import Blueprint, jsonify
from app.services.match_service import MatchService
from app.services.ranking_service import RankingService

bp = Blueprint("api", __name__, url_prefix="/api")


@bp.route("/matchday/<int:matchday>")
def api_matchday(matchday):
    matches = MatchService.get_matchday(matchday)
    return jsonify([
        {
            "id": m.id, "matchday": m.matchday,
            "home_team": m.home_team.short_name,
            "away_team": m.away_team.short_name,
            "played": m.played,
        }
        for m in matches
    ])


@bp.route("/classifica")
def api_classifica():
    teams = RankingService.compute_ranking()
    return jsonify([
        {"id": t.id, "name": t.name, "short_name": t.short_name, "ranking": t.ranking}
        for t in teams
    ])
```

- [ ] **Step 9: Write `app/templates/base.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Serie A 2026/27 - Pronostici</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
</head>
<body>
    <nav>
        <a href="{{ url_for('main.index') }}">Home</a>
        <a href="{{ url_for('main.classifica') }}">Classifica</a>
    </nav>
    <main>
        {% block content %}{% endblock %}
    </main>
</body>
</html>
```

- [ ] **Step 10: Write `app/templates/index.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1>Serie A 2026/27 - Pronostici</h1>

<h2>Giornata {{ current_matchday }}</h2>
{% if matches %}
<table>
    <thead>
        <tr><th>Casa</th><th>Trasferta</th><th>Data</th><th></th></tr>
    </thead>
    <tbody>
    {% for match in matches %}
    <tr>
        <td>{{ match.home_team.short_name }}</td>
        <td>{{ match.away_team.short_name }}</td>
        <td>{{ match.date or 'TBD' }}</td>
        <td><a href="{{ url_for('predictions.partita', match_id=match.id) }}">Dettaglio</a></td>
    </tr>
    {% endfor %}
    </tbody>
</table>
{% else %}
<p>Nessuna partita trovata per questa giornata.</p>
{% endif %}

<h3>Giornate disponibili</h3>
<ul>
{% for md in matchdays %}
    <li><a href="{{ url_for('predictions.giornata', matchday=md) }}">Giornata {{ md }}</a></li>
{% endfor %}
</ul>
{% endblock %}
```

- [ ] **Step 11: Write `app/templates/predictions.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1>Giornata {{ current_matchday }}</h1>

<form method="post" action="{{ url_for('predictions.simula', matchday=current_matchday) }}">
    <label>Simulazioni: <input type="number" name="runs" value="10000" min="100" max="100000"></label>
    <button type="submit">Esegui Simulazione Monte Carlo</button>
</form>

{% if matches %}
<table>
    <thead>
        <tr><th>Casa</th><th>Trasferta</th><th>1</th><th>X</th><th>2</th><th>Gol C</th><th>Gol T</th><th>Corner C</th><th>Corner T</th><th>Cart. C</th><th>Cart. T</th><th>Tiri Porta C</th><th>Tiri Porta T</th><th>Tiri Tot C</th><th>Tiri Tot T</th></tr>
    </thead>
    <tbody>
    {% for match in matches %}
    {% set pred = predictions.get(match.id) %}
    <tr>
        <td><a href="{{ url_for('teams.squadra', team_id=match.home_team.id) }}">{{ match.home_team.short_name }}</a></td>
        <td><a href="{{ url_for('teams.squadra', team_id=match.away_team.id) }}">{{ match.away_team.short_name }}</a></td>
        {% if pred %}
        <td>{{ "%.0f"|format(pred.prob_home_win * 100) }}%</td>
        <td>{{ "%.0f"|format(pred.prob_draw * 100) }}%</td>
        <td>{{ "%.0f"|format(pred.prob_away_win * 100) }}%</td>
        <td>{{ "%.2f"|format(pred.pred_home_score) }}</td>
        <td>{{ "%.2f"|format(pred.pred_away_score) }}</td>
        <td>{{ "%.1f"|format(pred.pred_home_corners) }}</td>
        <td>{{ "%.1f"|format(pred.pred_away_corners) }}</td>
        <td>{{ "%.1f"|format(pred.pred_home_cards) }}</td>
        <td>{{ "%.1f"|format(pred.pred_away_cards) }}</td>
        <td>{{ "%.1f"|format(pred.pred_home_sot) }}</td>
        <td>{{ "%.1f"|format(pred.pred_away_sot) }}</td>
        <td>{{ "%.1f"|format(pred.pred_home_shots) }}</td>
        <td>{{ "%.1f"|format(pred.pred_away_shots) }}</td>
        {% else %}
        <td colspan="13">Nessun pronostico. <a href="#" onclick="event.preventDefault(); this.closest('form').submit();">Esegui simulazione</a></td>
        {% endif %}
    </tr>
    {% endfor %}
    </tbody>
</table>
{% else %}
<p>Nessuna partita per questa giornata.</p>
{% endif %}

<h3>Giornate</h3>
<ul>
{% for md in matchdays %}
    <li><a href="{{ url_for('predictions.giornata', matchday=md) }}">Giornata {{ md }}</a></li>
{% endfor %}
</ul>
{% endblock %}
```

- [ ] **Step 12: Write `app/templates/team.html`**

```html
{% extends "base.html" %}
{% block content %}
{% if mode == "classifica" %}
<h1>Classifica Serie A 2026/27</h1>
<table>
    <thead>
        <tr><th>#</th><th>Squadra</th><th>Città</th><th>Stadio</th><th>Obiettivo</th></tr>
    </thead>
    <tbody>
    {% for team in teams %}
    <tr>
        <td>{{ team.ranking }}</td>
        <td><a href="{{ url_for('teams.squadra', team_id=team.id) }}">{{ team.name }}</a></td>
        <td>{{ team.city }}</td>
        <td>{{ team.stadium }}</td>
        <td>{{ team.season_objective }}</td>
    </tr>
    {% endfor %}
    </tbody>
</table>
{% else %}
<h1>{{ team.name }}</h1>
<p>Città: {{ team.city }} | Stadio: {{ team.stadium }}</p>
<p>Ranking: {{ team.ranking }} | Obiettivo: {{ team.season_objective }}</p>
<p>Umore: {{ "%.2f"|format(team.mood) }} | Vantaggio casa: {{ "%.2f"|format(team.home_advantage) }}</p>

<h2>Rosa</h2>
<table>
    <thead>
        <tr><th>Nome</th><th>Ruolo</th><th>Età</th><th>Valore (M€)</th><th>Gol prec.</th><th>Assist prec.</th><th>Cart. prec.</th></tr>
    </thead>
    <tbody>
    {% for player in players %}
    <tr>
        <td><a href="{{ url_for('players.calciatore', player_id=player.id) }}">{{ player.name }}</a></td>
        <td>{{ player.position }}</td>
        <td>{{ player.age }}</td>
        <td>{{ "%.1f"|format(player.market_value) }}</td>
        <td>{{ player.prev_goals }}</td>
        <td>{{ player.prev_assists }}</td>
        <td>{{ player.prev_cards }}</td>
    </tr>
    {% endfor %}
    </tbody>
</table>
{% endif %}
{% endblock %}
```

- [ ] **Step 13: Write `app/templates/player.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1>{{ player.name }}</h1>
<p>Squadra: <a href="{{ url_for('teams.squadra', team_id=player.team.id) }}">{{ player.team.name }}</a></p>
<p>Ruolo: {{ player.position }} | Età: {{ player.age }}</p>
<p>Valore di mercato: {{ "%.1f"|format(player.market_value) }} M€</p>
<p>Forza calcolata: {{ "%.1f"|format(strength) }}/100</p>

<h2>Statistiche stagione precedente (2025/26)</h2>
<table>
    <tr><th>Gol</th><td>{{ player.prev_goals }}</td></tr>
    <tr><th>Assist</th><td>{{ player.prev_assists }}</td></tr>
    <tr><th>Cartellini</th><td>{{ player.prev_cards }}</td></tr>
    <tr><th>Tiri totali</th><td>{{ player.prev_shots_total }}</td></tr>
    <tr><th>Tiri in porta</th><td>{{ player.prev_shots_on_target }}</td></tr>
    <tr><th>Corner guadagnati</th><td>{{ player.prev_corners_won }}</td></tr>
</table>
{% endblock %}
```

- [ ] **Step 14: Write `app/templates/match.html`**

```html
{% extends "base.html" %}
{% block content %}
<h1>{{ match.home_team.name }} vs {{ match.away_team.name }}</h1>
<p>Giornata {{ match.matchday }} | Data: {{ match.date or 'TBD' }}</p>

{% if prediction %}
<h2>Pronostico Monte Carlo ({{ prediction.simulations }} simulazioni)</h2>
<table>
    <tr><th></th><th>{{ match.home_team.short_name }}</th><th>{{ match.away_team.short_name }}</th></tr>
    <tr><td>Gol attesi</td><td>{{ "%.2f"|format(prediction.pred_home_score) }}</td><td>{{ "%.2f"|format(prediction.pred_away_score) }}</td></tr>
    <tr><td>Probabilità vittoria</td><td>{{ "%.0f"|format(prediction.prob_home_win * 100) }}%</td><td>{{ "%.0f"|format(prediction.prob_away_win * 100) }}%</td></tr>
    <tr><td>Pareggio</td><td colspan="2">{{ "%.0f"|format(prediction.prob_draw * 100) }}%</td></tr>
    <tr><td>Corner</td><td>{{ "%.1f"|format(prediction.pred_home_corners) }}</td><td>{{ "%.1f"|format(prediction.pred_away_corners) }}</td></tr>
    <tr><td>Cartellini</td><td>{{ "%.1f"|format(prediction.pred_home_cards) }}</td><td>{{ "%.1f"|format(prediction.pred_away_cards) }}</td></tr>
    <tr><td>Tiri in porta</td><td>{{ "%.1f"|format(prediction.pred_home_sot) }}</td><td>{{ "%.1f"|format(prediction.pred_away_sot) }}</td></tr>
    <tr><td>Tiri totali</td><td>{{ "%.1f"|format(prediction.pred_home_shots) }}</td><td>{{ "%.1f"|format(prediction.pred_away_shots) }}</td></tr>
</table>

<h3>Pronostici calciatori</h3>
<table>
    <thead>
        <tr><th>Calciatore</th><th>Squadra</th><th>Gol attesi</th><th>Prob. gol</th><th>Cart. attesi</th><th>Prob. cart.</th><th>Tiri porta</th><th>Tiri tot</th></tr>
    </thead>
    <tbody>
    {% for pp in prediction.player_predictions %}
    <tr>
        <td><a href="{{ url_for('players.calciatore', player_id=pp.player.id) }}">{{ pp.player.name }}</a></td>
        <td>{{ pp.player.team.short_name }}</td>
        <td>{{ "%.2f"|format(pp.pred_goals) }}</td>
        <td>{{ "%.0f"|format(pp.prob_goal * 100) }}%</td>
        <td>{{ "%.2f"|format(pp.pred_cards) }}</td>
        <td>{{ "%.0f"|format(pp.prob_card * 100) }}%</td>
        <td>{{ "%.1f"|format(pp.pred_shots_on_target) }}</td>
        <td>{{ "%.1f"|format(pp.pred_shots_total) }}</td>
    </tr>
    {% endfor %}
    </tbody>
</table>
{% else %}
<p>Nessun pronostico disponibile. <a href="{{ url_for('predictions.giornata', matchday=match.matchday) }}">Vai alla giornata {{ match.matchday }}</a> per eseguire la simulazione.</p>
{% endif %}
{% endblock %}
```

- [ ] **Step 15: Write `app/static/css/style.css`**

```css
body {
    font-family: Arial, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background: #f5f5f5;
    color: #333;
}

nav {
    background: #1a1a2e;
    padding: 10px 20px;
    margin-bottom: 20px;
    border-radius: 4px;
}

nav a {
    color: #e0e0e0;
    text-decoration: none;
    margin-right: 20px;
    font-weight: bold;
}

nav a:hover {
    color: #fff;
}

h1 { color: #1a1a2e; }
h2 { color: #16213e; margin-top: 30px; }
h3 { color: #0f3460; }

table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background: #1a1a2e;
    color: #fff;
}

tr:hover { background: #f0f0f0; }

form {
    background: #fff;
    padding: 15px;
    margin: 15px 0;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

form label { margin-right: 10px; }

form input[type="number"] {
    width: 80px;
    padding: 5px;
}

form button {
    padding: 8px 16px;
    background: #1a1a2e;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

form button:hover { background: #16213e; }

ul { list-style: none; padding: 0; }

ul li {
    display: inline-block;
    margin: 5px;
}

ul li a {
    display: inline-block;
    padding: 5px 10px;
    background: #1a1a2e;
    color: #fff;
    text-decoration: none;
    border-radius: 3px;
}

ul li a:hover { background: #16213e; }
```

- [ ] **Step 16: Run tests**

```bash
pytest tests/test_routes.py -v
```
Expected: 7 passed

- [ ] **Step 17: Commit**

```bash
git add app/routes/ app/templates/ app/static/ tests/test_routes.py
git commit -m "feat: add routes, templates, and static CSS"
```
