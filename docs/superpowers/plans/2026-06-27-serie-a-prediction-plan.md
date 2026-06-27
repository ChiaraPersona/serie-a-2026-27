# Serie A 2026/27 Prediction Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Flask + SQLite web app that predicts Serie A 2026/27 match outcomes (exact score, corners, cards, shots on target, total shots) per matchday using Monte Carlo simulation, with per-player breakdowns.

**Architecture:** Flask monolith with service layer — SQLAlchemy models, service classes for business logic, Jinja2 templates for rendering, Flask CLI for seed/scrape/predict commands. Monte Carlo engine as a standalone module with deterministic seeding for reproducibility.

**Tech Stack:** Python 3.11+, Flask 3.x, SQLAlchemy 2.x, SQLite, Jinja2, pytest, BeautifulSoup4 (scraping), NumPy (simulation)

## Global Constraints

- Python >= 3.11
- All dependencies in `requirements.txt` with pinned versions
- SQLite database at `instance/serie_a.db`
- Monte Carlo default: 10,000 simulations per match
- All text in Italian
- TDD: write failing test first, then implementation
- Commit after every task

---

## File Structure Map

```
serie-a-2026-27/
├── requirements.txt                    # Task 1
├── run.py                              # Task 1
├── app/
│   ├── __init__.py                     # Task 1: app factory
│   ├── config.py                       # Task 1: configuration
│   ├── extensions.py                   # Task 2: db init
│   ├── models/
│   │   ├── __init__.py                 # Task 2: re-exports
│   │   ├── team.py                     # Task 2: Team
│   │   ├── player.py                   # Task 2: Player
│   │   ├── match.py                    # Task 2: Match, MatchResult, PlayerMatchStats
│   │   ├── prediction.py              # Task 2: Prediction, PlayerPrediction
│   │   └── head_to_head.py            # Task 2: HeadToHead
│   ├── services/
│   │   ├── __init__.py                 # Task 4
│   │   ├── team_service.py            # Task 4: team strength calc
│   │   ├── player_service.py          # Task 4: player strength calc
│   │   ├── match_service.py           # Task 4: match CRUD
│   │   ├── prediction_engine.py       # Task 5: Monte Carlo core
│   │   ├── ranking_service.py         # Task 4: ranking, mood, H2H
│   │   └── scraper.py                 # Task 7: scraping stubs
│   ├── routes/
│   │   ├── __init__.py                 # Task 6
│   │   ├── main.py                     # Task 6: /, /classifica
│   │   ├── predictions.py             # Task 6: /giornata/<n>
│   │   ├── teams.py                   # Task 6: /squadra/<id>
│   │   ├── players.py                 # Task 6: /calciatore/<id>
│   │   └── api.py                     # Task 6: API stubs
│   ├── templates/
│   │   ├── base.html                   # Task 6
│   │   ├── index.html                  # Task 6
│   │   ├── predictions.html           # Task 6
│   │   ├── team.html                   # Task 6
│   │   ├── player.html                 # Task 6
│   │   └── match.html                  # Task 6
│   ├── static/
│   │   ├── css/style.css               # Task 6
│   │   └── js/                         # (empty, future use)
│   └── cli/
│       ├── __init__.py                 # Task 3
│       ├── seed.py                     # Task 3: seed commands
│       ├── scrape.py                   # Task 7: scrape commands
│       └── predict.py                  # Task 5: predict commands
├── data/
│   ├── seed/
│   │   ├── teams.json                  # Task 3
│   │   ├── players.json                # Task 3
│   │   ├── matches.json                # Task 3
│   │   └── h2h.json                    # Task 3
│   └── scraped/                        # Task 7
└── tests/
    ├── conftest.py                     # Task 1
    ├── test_models.py                  # Task 2
    ├── test_services.py                # Task 4
    ├── test_prediction_engine.py       # Task 5
    └── test_routes.py                  # Task 6
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`, `run.py`, `app/__init__.py`, `app/config.py`, `tests/conftest.py`

**Interfaces:**
- Produces: `create_app()` factory in `app/__init__.py`, `Config` class in `app/config.py`, `app` fixture in `tests/conftest.py`

- [ ] **Step 1: Write `requirements.txt`**

```
Flask==3.1.0
Flask-SQLAlchemy==3.1.1
SQLAlchemy==2.0.36
Jinja2==3.1.4
numpy==2.2.1
beautifulsoup4==4.12.3
requests==2.32.3
pytest==8.3.4
pytest-flask==1.3.0
```

- [ ] **Step 2: Write `app/config.py`**

```python
import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, '..', 'instance', 'serie_a.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MONTE_CARLO_RUNS = int(os.environ.get("MONTE_CARLO_RUNS", 10000))
    MONTE_CARLO_SEED = int(os.environ.get("MONTE_CARLO_SEED", 42))
```

- [ ] **Step 3: Write `app/__init__.py`**

```python
from flask import Flask
from app.config import Config
from app.extensions import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)

    with app.app_context():
        from app.models import team, player, match, prediction, head_to_head  # noqa: F401
        db.create_all()

    from app.routes import main, predictions, teams, players, api
    app.register_blueprint(main.bp)
    app.register_blueprint(predictions.bp)
    app.register_blueprint(teams.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(api.bp)

    from app.cli import seed, scrape, predict
    app.cli.add_command(seed.seed_command)
    app.cli.add_command(scrape.scrape_command)
    app.cli.add_command(predict.predict_command)

    return app
```

- [ ] **Step 4: Write `run.py`**

```python
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
```

- [ ] **Step 5: Write `tests/conftest.py`**

```python
import pytest
from app import create_app
from app.config import Config
from app.extensions import db as _db


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    return _db
```

- [ ] **Step 6: Verify app starts**

```bash
python -c "from app import create_app; app = create_app(); print('OK')"
```
Expected: `OK`

- [ ] **Step 7: Run tests**

```bash
pytest tests/ -v
```
Expected: no tests collected (or 0 passed)

- [ ] **Step 8: Commit**

```bash
git add requirements.txt run.py app/__init__.py app/config.py tests/conftest.py
git commit -m "feat: project scaffolding with Flask app factory and test config"
```

---

### Task 2: Database Models

**Files:**
- Create: `app/extensions.py`, `app/models/__init__.py`, `app/models/team.py`, `app/models/player.py`, `app/models/match.py`, `app/models/prediction.py`, `app/models/head_to_head.py`
- Create: `tests/test_models.py`

**Interfaces:**
- Produces: `db` from `app/extensions.py`, all model classes: `Team`, `Player`, `Match`, `MatchResult`, `PlayerMatchStats`, `Prediction`, `PlayerPrediction`, `HeadToHead`

- [ ] **Step 1: Write `app/extensions.py`**

```python
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
```

- [ ] **Step 2: Write `app/models/team.py`**

```python
from app.extensions import db


class Team(db.Model):
    __tablename__ = "teams"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    short_name = db.Column(db.String(10), nullable=False, unique=True)
    stadium = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    ranking = db.Column(db.Integer, nullable=False, default=20)
    mood = db.Column(db.Float, nullable=False, default=0.0)
    season_objective = db.Column(db.String(50), nullable=False, default="mid_table")
    home_advantage = db.Column(db.Float, nullable=False, default=1.0)

    players = db.relationship("Player", back_populates="team", lazy="dynamic")

    def __repr__(self):
        return f"<Team {self.short_name}>"
```

- [ ] **Step 3: Write `app/models/player.py`**

```python
from app.extensions import db


class Player(db.Model):
    __tablename__ = "players"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    position = db.Column(db.String(3), nullable=False)  # POR, DIF, CEN, ATT
    age = db.Column(db.Integer, nullable=False)
    market_value = db.Column(db.Float, nullable=False, default=0.0)
    prev_goals = db.Column(db.Integer, nullable=False, default=0)
    prev_assists = db.Column(db.Integer, nullable=False, default=0)
    prev_cards = db.Column(db.Integer, nullable=False, default=0)
    prev_shots_total = db.Column(db.Integer, nullable=False, default=0)
    prev_shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    prev_corners_won = db.Column(db.Integer, nullable=False, default=0)

    team = db.relationship("Team", back_populates="players")

    def __repr__(self):
        return f"<Player {self.name}>"
```

- [ ] **Step 4: Write `app/models/match.py`**

```python
from app.extensions import db


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    matchday = db.Column(db.Integer, nullable=False)
    home_team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    date = db.Column(db.Date, nullable=True)
    played = db.Column(db.Boolean, nullable=False, default=False)

    home_team = db.relationship("Team", foreign_keys=[home_team_id])
    away_team = db.relationship("Team", foreign_keys=[away_team_id])
    result = db.relationship("MatchResult", back_populates="match", uselist=False)
    predictions = db.relationship("Prediction", back_populates="match", lazy="dynamic")

    def __repr__(self):
        return f"<Match {self.id}: {self.home_team_id} vs {self.away_team_id}>"


class MatchResult(db.Model):
    __tablename__ = "match_results"

    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), primary_key=True)
    home_score = db.Column(db.Integer, nullable=False, default=0)
    away_score = db.Column(db.Integer, nullable=False, default=0)
    home_corners = db.Column(db.Integer, nullable=False, default=0)
    away_corners = db.Column(db.Integer, nullable=False, default=0)
    home_cards = db.Column(db.Integer, nullable=False, default=0)
    away_cards = db.Column(db.Integer, nullable=False, default=0)
    home_shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    away_shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    home_shots_total = db.Column(db.Integer, nullable=False, default=0)
    away_shots_total = db.Column(db.Integer, nullable=False, default=0)

    match = db.relationship("Match", back_populates="result")

    def __repr__(self):
        return f"<MatchResult {self.match_id}: {self.home_score}-{self.away_score}>"


class PlayerMatchStats(db.Model):
    __tablename__ = "player_match_stats"

    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    goals = db.Column(db.Integer, nullable=False, default=0)
    assists = db.Column(db.Integer, nullable=False, default=0)
    cards = db.Column(db.Integer, nullable=False, default=0)
    shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    shots_total = db.Column(db.Integer, nullable=False, default=0)
    corners_won = db.Column(db.Integer, nullable=False, default=0)

    player = db.relationship("Player")
    match = db.relationship("Match")

    def __repr__(self):
        return f"<PlayerMatchStats p{self.player_id} m{self.match_id}>"
```

- [ ] **Step 5: Write `app/models/prediction.py`**

```python
from datetime import datetime, timezone
from app.extensions import db


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    simulations = db.Column(db.Integer, nullable=False)
    pred_home_score = db.Column(db.Float, nullable=False)
    pred_away_score = db.Column(db.Float, nullable=False)
    prob_home_win = db.Column(db.Float, nullable=False)
    prob_draw = db.Column(db.Float, nullable=False)
    prob_away_win = db.Column(db.Float, nullable=False)
    pred_home_corners = db.Column(db.Float, nullable=False)
    pred_away_corners = db.Column(db.Float, nullable=False)
    pred_home_cards = db.Column(db.Float, nullable=False)
    pred_away_cards = db.Column(db.Float, nullable=False)
    pred_home_sot = db.Column(db.Float, nullable=False)
    pred_away_sot = db.Column(db.Float, nullable=False)
    pred_home_shots = db.Column(db.Float, nullable=False)
    pred_away_shots = db.Column(db.Float, nullable=False)

    match = db.relationship("Match", back_populates="predictions")
    player_predictions = db.relationship("PlayerPrediction", back_populates="prediction", lazy="dynamic")

    def __repr__(self):
        return f"<Prediction {self.id} match={self.match_id}>"


class PlayerPrediction(db.Model):
    __tablename__ = "player_predictions"

    id = db.Column(db.Integer, primary_key=True)
    prediction_id = db.Column(db.Integer, db.ForeignKey("predictions.id"), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    pred_goals = db.Column(db.Float, nullable=False, default=0.0)
    pred_cards = db.Column(db.Float, nullable=False, default=0.0)
    pred_shots_on_target = db.Column(db.Float, nullable=False, default=0.0)
    pred_shots_total = db.Column(db.Float, nullable=False, default=0.0)
    prob_goal = db.Column(db.Float, nullable=False, default=0.0)
    prob_card = db.Column(db.Float, nullable=False, default=0.0)

    prediction = db.relationship("Prediction", back_populates="player_predictions")
    player = db.relationship("Player")

    def __repr__(self):
        return f"<PlayerPrediction p{self.player_id} pred{self.prediction_id}>"
```

- [ ] **Step 6: Write `app/models/head_to_head.py`**

```python
from app.extensions import db


class HeadToHead(db.Model):
    __tablename__ = "head_to_head"

    id = db.Column(db.Integer, primary_key=True)
    team1_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    team2_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    matches_played = db.Column(db.Integer, nullable=False, default=0)
    team1_wins = db.Column(db.Integer, nullable=False, default=0)
    team2_wins = db.Column(db.Integer, nullable=False, default=0)
    draws = db.Column(db.Integer, nullable=False, default=0)
    avg_goals_team1 = db.Column(db.Float, nullable=False, default=0.0)
    avg_goals_team2 = db.Column(db.Float, nullable=False, default=0.0)

    team1 = db.relationship("Team", foreign_keys=[team1_id])
    team2 = db.relationship("Team", foreign_keys=[team2_id])

    def __repr__(self):
        return f"<HeadToHead {self.team1_id} vs {self.team2_id}>"
```

- [ ] **Step 7: Write `app/models/__init__.py`**

```python
from app.models.team import Team
from app.models.player import Player
from app.models.match import Match, MatchResult, PlayerMatchStats
from app.models.prediction import Prediction, PlayerPrediction
from app.models.head_to_head import HeadToHead

__all__ = [
    "Team",
    "Player",
    "Match",
    "MatchResult",
    "PlayerMatchStats",
    "Prediction",
    "PlayerPrediction",
    "HeadToHead",
]
```

- [ ] **Step 8: Write `tests/test_models.py`**

```python
from app.models import Team, Player, Match, MatchResult, PlayerMatchStats
from app.models import Prediction, PlayerPrediction, HeadToHead


def test_create_team(db):
    team = Team(name="AC Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add(team)
    db.session.commit()
    assert team.id is not None
    assert team.short_name == "MIL"
    assert team.mood == 0.0
    assert team.home_advantage == 1.0


def test_create_player(db):
    team = Team(name="AC Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add(team)
    db.session.commit()

    player = Player(
        name="Test Player", team_id=team.id, position="ATT", age=25,
        market_value=50.0, prev_goals=15, prev_assists=8, prev_cards=3,
        prev_shots_total=80, prev_shots_on_target=40, prev_corners_won=10
    )
    db.session.add(player)
    db.session.commit()
    assert player.id is not None
    assert player.team.short_name == "MIL"


def test_create_match(db):
    t1 = Team(name="AC Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    t2 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()
    assert match.id is not None
    assert match.played is False


def test_create_match_result(db):
    t1 = Team(name="AC Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    t2 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    result = MatchResult(
        match_id=match.id, home_score=2, away_score=1,
        home_corners=6, away_corners=4, home_cards=2, away_cards=3,
        home_shots_on_target=5, away_shots_on_target=3,
        home_shots_total=12, away_shots_total=8
    )
    db.session.add(result)
    db.session.commit()
    assert result.match_id == match.id
    assert result.home_score == 2


def test_create_prediction(db):
    t1 = Team(name="AC Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    t2 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    pred = Prediction(
        match_id=match.id, simulations=10000,
        pred_home_score=1.2, pred_away_score=1.5,
        prob_home_win=0.30, prob_draw=0.25, prob_away_win=0.45,
        pred_home_corners=5.0, pred_away_corners=4.5,
        pred_home_cards=2.0, pred_away_cards=2.5,
        pred_home_sot=4.0, pred_away_sot=5.0,
        pred_home_shots=10.0, pred_away_shots=12.0,
    )
    db.session.add(pred)
    db.session.commit()
    assert pred.id is not None
    assert pred.prob_home_win + pred.prob_draw + pred.prob_away_win == pytest.approx(1.0, abs=0.01)


def test_create_head_to_head(db):
    t1 = Team(name="AC Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    t2 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add_all([t1, t2])
    db.session.commit()

    h2h = HeadToHead(
        team1_id=t1.id, team2_id=t2.id, matches_played=180,
        team1_wins=55, team2_wins=70, draws=55,
        avg_goals_team1=1.2, avg_goals_team2=1.4
    )
    db.session.add(h2h)
    db.session.commit()
    assert h2h.id is not None
    assert h2h.matches_played == 180
```

- [ ] **Step 9: Run tests**

```bash
pytest tests/test_models.py -v
```
Expected: 6 passed

- [ ] **Step 10: Commit**

```bash
git add app/extensions.py app/models/ tests/test_models.py
git commit -m "feat: add all 8 database models with tests"
```

---

### Task 3: Seed Data and CLI Seed Commands

**Files:**
- Create: `app/cli/__init__.py`, `app/cli/seed.py`
- Create: `data/seed/teams.json`, `data/seed/players.json`, `data/seed/matches.json`, `data/seed/h2h.json`

**Interfaces:**
- Consumes: `Team`, `Player`, `Match`, `HeadToHead` from `app.models`
- Produces: `seed_command` Click group registered on Flask app

- [ ] **Step 1: Write `data/seed/teams.json`**

```json
[
  {"name": "Inter", "short_name": "INT", "stadium": "San Siro", "city": "Milano", "ranking": 1, "mood": 0.2, "season_objective": "scudetto", "home_advantage": 1.1},
  {"name": "AC Milan", "short_name": "MIL", "stadium": "San Siro", "city": "Milano", "ranking": 3, "mood": 0.1, "season_objective": "champions", "home_advantage": 1.1},
  {"name": "Juventus", "short_name": "JUV", "stadium": "Allianz Stadium", "city": "Torino", "ranking": 2, "mood": 0.15, "season_objective": "scudetto", "home_advantage": 1.15},
  {"name": "Atalanta", "short_name": "ATA", "stadium": "Gewiss Stadium", "city": "Bergamo", "ranking": 4, "mood": 0.1, "season_objective": "champions", "home_advantage": 1.05},
  {"name": "Napoli", "short_name": "NAP", "stadium": "Diego Armando Maradona", "city": "Napoli", "ranking": 5, "mood": 0.05, "season_objective": "champions", "home_advantage": 1.1},
  {"name": "Lazio", "short_name": "LAZ", "stadium": "Olimpico", "city": "Roma", "ranking": 6, "mood": 0.0, "season_objective": "europa", "home_advantage": 1.05},
  {"name": "Roma", "short_name": "ROM", "stadium": "Olimpico", "city": "Roma", "ranking": 7, "mood": -0.05, "season_objective": "europa", "home_advantage": 1.05},
  {"name": "Fiorentina", "short_name": "FIO", "stadium": "Artemio Franchi", "city": "Firenze", "ranking": 8, "mood": 0.0, "season_objective": "europa", "home_advantage": 1.0},
  {"name": "Bologna", "short_name": "BOL", "stadium": "Renato Dall'Ara", "city": "Bologna", "ranking": 9, "mood": 0.05, "season_objective": "europa", "home_advantage": 1.0},
  {"name": "Torino", "short_name": "TOR", "stadium": "Olimpico Grande Torino", "city": "Torino", "ranking": 10, "mood": 0.0, "season_objective": "mid_table", "home_advantage": 1.0},
  {"name": "Genoa", "short_name": "GEN", "stadium": "Luigi Ferraris", "city": "Genova", "ranking": 11, "mood": 0.0, "season_objective": "mid_table", "home_advantage": 1.0},
  {"name": "Monza", "short_name": "MON", "stadium": "Brianteo", "city": "Monza", "ranking": 12, "mood": 0.0, "season_objective": "mid_table", "home_advantage": 0.95},
  {"name": "Udinese", "short_name": "UDI", "stadium": "Friuli", "city": "Udine", "ranking": 13, "mood": 0.0, "season_objective": "mid_table", "home_advantage": 1.0},
  {"name": "Cagliari", "short_name": "CAG", "stadium": "Unipol Domus", "city": "Cagliari", "ranking": 14, "mood": 0.0, "season_objective": "salvezza", "home_advantage": 1.05},
  {"name": "Como", "short_name": "COM", "stadium": "Giuseppe Sinigaglia", "city": "Como", "ranking": 15, "mood": 0.0, "season_objective": "salvezza", "home_advantage": 0.95},
  {"name": "Parma", "short_name": "PAR", "stadium": "Ennio Tardini", "city": "Parma", "ranking": 16, "mood": 0.0, "season_objective": "salvezza", "home_advantage": 1.0},
  {"name": "Verona", "short_name": "VER", "stadium": "Marcantonio Bentegodi", "city": "Verona", "ranking": 17, "mood": -0.05, "season_objective": "salvezza", "home_advantage": 1.0},
  {"name": "Empoli", "short_name": "EMP", "stadium": "Carlo Castellani", "city": "Empoli", "ranking": 18, "mood": -0.1, "season_objective": "salvezza", "home_advantage": 0.95},
  {"name": "Lecce", "short_name": "LEC", "stadium": "Via del Mare", "city": "Lecce", "ranking": 19, "mood": -0.1, "season_objective": "salvezza", "home_advantage": 1.0},
  {"name": "Venezia", "short_name": "VEN", "stadium": "Pier Luigi Penzo", "city": "Venezia", "ranking": 20, "mood": -0.15, "season_objective": "salvezza", "home_advantage": 0.95}
]
```

- [ ] **Step 2: Write `data/seed/players.json`** (sample — 3 players per team, 60 total)

```json
[
  {"name": "Lautaro Martinez", "team_short": "INT", "position": "ATT", "age": 28, "market_value": 100.0, "prev_goals": 22, "prev_assists": 6, "prev_cards": 4, "prev_shots_total": 95, "prev_shots_on_target": 48, "prev_corners_won": 0},
  {"name": "Nicolo Barella", "team_short": "INT", "position": "CEN", "age": 28, "market_value": 75.0, "prev_goals": 5, "prev_assists": 8, "prev_cards": 6, "prev_shots_total": 45, "prev_shots_on_target": 15, "prev_corners_won": 0},
  {"name": "Yann Sommer", "team_short": "INT", "position": "POR", "age": 36, "market_value": 5.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 1, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Rafael Leao", "team_short": "MIL", "position": "ATT", "age": 26, "market_value": 85.0, "prev_goals": 14, "prev_assists": 10, "prev_cards": 3, "prev_shots_total": 78, "prev_shots_on_target": 35, "prev_corners_won": 0},
  {"name": "Theo Hernandez", "team_short": "MIL", "position": "DIF", "age": 27, "market_value": 60.0, "prev_goals": 5, "prev_assists": 7, "prev_cards": 8, "prev_shots_total": 40, "prev_shots_on_target": 12, "prev_corners_won": 0},
  {"name": "Mike Maignan", "team_short": "MIL", "position": "POR", "age": 30, "market_value": 35.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 1, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Dusan Vlahovic", "team_short": "JUV", "position": "ATT", "age": 26, "market_value": 70.0, "prev_goals": 18, "prev_assists": 4, "prev_cards": 5, "prev_shots_total": 85, "prev_shots_on_target": 42, "prev_corners_won": 0},
  {"name": "Kenan Yildiz", "team_short": "JUV", "position": "ATT", "age": 21, "market_value": 50.0, "prev_goals": 8, "prev_assists": 6, "prev_cards": 2, "prev_shots_total": 50, "prev_shots_on_target": 20, "prev_corners_won": 0},
  {"name": "Gleison Bremer", "team_short": "JUV", "position": "DIF", "age": 28, "market_value": 55.0, "prev_goals": 2, "prev_assists": 1, "prev_cards": 7, "prev_shots_total": 15, "prev_shots_on_target": 5, "prev_corners_won": 0},
  {"name": "Ademola Lookman", "team_short": "ATA", "position": "ATT", "age": 27, "market_value": 60.0, "prev_goals": 16, "prev_assists": 9, "prev_cards": 3, "prev_shots_total": 70, "prev_shots_on_target": 32, "prev_corners_won": 0},
  {"name": "Charles De Ketelaere", "team_short": "ATA", "position": "ATT", "age": 25, "market_value": 45.0, "prev_goals": 12, "prev_assists": 11, "prev_cards": 2, "prev_shots_total": 55, "prev_shots_on_target": 25, "prev_corners_won": 0},
  {"name": "Ederson", "team_short": "ATA", "position": "CEN", "age": 26, "market_value": 40.0, "prev_goals": 4, "prev_assists": 5, "prev_cards": 8, "prev_shots_total": 35, "prev_shots_on_target": 10, "prev_corners_won": 0},
  {"name": "Khvicha Kvaratskhelia", "team_short": "NAP", "position": "ATT", "age": 25, "market_value": 80.0, "prev_goals": 12, "prev_assists": 8, "prev_cards": 2, "prev_shots_total": 65, "prev_shots_on_target": 30, "prev_corners_won": 0},
  {"name": "Romelu Lukaku", "team_short": "NAP", "position": "ATT", "age": 32, "market_value": 25.0, "prev_goals": 15, "prev_assists": 5, "prev_cards": 4, "prev_shots_total": 60, "prev_shots_on_target": 28, "prev_corners_won": 0},
  {"name": "Alex Meret", "team_short": "NAP", "position": "POR", "age": 28, "market_value": 15.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 0, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Mattia Zaccagni", "team_short": "LAZ", "position": "ATT", "age": 29, "market_value": 30.0, "prev_goals": 10, "prev_assists": 7, "prev_cards": 5, "prev_shots_total": 55, "prev_shots_on_target": 22, "prev_corners_won": 0},
  {"name": "Nuno Tavares", "team_short": "LAZ", "position": "DIF", "age": 26, "market_value": 25.0, "prev_goals": 2, "prev_assists": 9, "prev_cards": 6, "prev_shots_total": 20, "prev_shots_on_target": 5, "prev_corners_won": 0},
  {"name": "Ivan Provedel", "team_short": "LAZ", "position": "POR", "age": 31, "market_value": 12.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 1, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Paulo Dybala", "team_short": "ROM", "position": "ATT", "age": 31, "market_value": 20.0, "prev_goals": 13, "prev_assists": 9, "prev_cards": 2, "prev_shots_total": 60, "prev_shots_on_target": 28, "prev_corners_won": 0},
  {"name": "Artem Dovbyk", "team_short": "ROM", "position": "ATT", "age": 28, "market_value": 35.0, "prev_goals": 14, "prev_assists": 4, "prev_cards": 3, "prev_shots_total": 58, "prev_shots_on_target": 26, "prev_corners_won": 0},
  {"name": "Gianluca Mancini", "team_short": "ROM", "position": "DIF", "age": 29, "market_value": 20.0, "prev_goals": 3, "prev_assists": 2, "prev_cards": 10, "prev_shots_total": 20, "prev_shots_on_target": 6, "prev_corners_won": 0},
  {"name": "Moise Kean", "team_short": "FIO", "position": "ATT", "age": 26, "market_value": 30.0, "prev_goals": 16, "prev_assists": 3, "prev_cards": 4, "prev_shots_total": 62, "prev_shots_on_target": 30, "prev_corners_won": 0},
  {"name": "Albert Gudmundsson", "team_short": "FIO", "position": "ATT", "age": 28, "market_value": 25.0, "prev_goals": 10, "prev_assists": 6, "prev_cards": 2, "prev_shots_total": 48, "prev_shots_on_target": 20, "prev_corners_won": 0},
  {"name": "David De Gea", "team_short": "FIO", "position": "POR", "age": 34, "market_value": 8.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 0, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Riccardo Orsolini", "team_short": "BOL", "position": "ATT", "age": 28, "market_value": 20.0, "prev_goals": 11, "prev_assists": 5, "prev_cards": 4, "prev_shots_total": 50, "prev_shots_on_target": 22, "prev_corners_won": 0},
  {"name": "Dan Ndoye", "team_short": "BOL", "position": "ATT", "age": 24, "market_value": 25.0, "prev_goals": 8, "prev_assists": 6, "prev_cards": 3, "prev_shots_total": 42, "prev_shots_on_target": 18, "prev_corners_won": 0},
  {"name": "Lewis Ferguson", "team_short": "BOL", "position": "CEN", "age": 26, "market_value": 22.0, "prev_goals": 6, "prev_assists": 4, "prev_cards": 7, "prev_shots_total": 30, "prev_shots_on_target": 10, "prev_corners_won": 0},
  {"name": "Duvan Zapata", "team_short": "TOR", "position": "ATT", "age": 34, "market_value": 8.0, "prev_goals": 9, "prev_assists": 3, "prev_cards": 3, "prev_shots_total": 40, "prev_shots_on_target": 18, "prev_corners_won": 0},
  {"name": "Samuele Ricci", "team_short": "TOR", "position": "CEN", "age": 24, "market_value": 30.0, "prev_goals": 2, "prev_assists": 4, "prev_cards": 6, "prev_shots_total": 25, "prev_shots_on_target": 6, "prev_corners_won": 0},
  {"name": "Vanja Milinkovic-Savic", "team_short": "TOR", "position": "POR", "age": 28, "market_value": 10.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 2, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Mateo Retegui", "team_short": "GEN", "position": "ATT", "age": 26, "market_value": 25.0, "prev_goals": 10, "prev_assists": 3, "prev_cards": 3, "prev_shots_total": 45, "prev_shots_on_target": 20, "prev_corners_won": 0},
  {"name": "Morten Frendrup", "team_short": "GEN", "position": "CEN", "age": 24, "market_value": 18.0, "prev_goals": 2, "prev_assists": 3, "prev_cards": 8, "prev_shots_total": 20, "prev_shots_on_target": 5, "prev_corners_won": 0},
  {"name": "Koni De Winter", "team_short": "GEN", "position": "DIF", "age": 23, "market_value": 15.0, "prev_goals": 1, "prev_assists": 1, "prev_cards": 6, "prev_shots_total": 10, "prev_shots_on_target": 3, "prev_corners_won": 0},
  {"name": "Andrea Colpani", "team_short": "MON", "position": "CEN", "age": 26, "market_value": 15.0, "prev_goals": 6, "prev_assists": 5, "prev_cards": 2, "prev_shots_total": 35, "prev_shots_on_target": 12, "prev_corners_won": 0},
  {"name": "Dany Mota", "team_short": "MON", "position": "ATT", "age": 27, "market_value": 10.0, "prev_goals": 7, "prev_assists": 3, "prev_cards": 4, "prev_shots_total": 30, "prev_shots_on_target": 12, "prev_corners_won": 0},
  {"name": "Pablo Mari", "team_short": "MON", "position": "DIF", "age": 31, "market_value": 5.0, "prev_goals": 1, "prev_assists": 0, "prev_cards": 5, "prev_shots_total": 8, "prev_shots_on_target": 2, "prev_corners_won": 0},
  {"name": "Lorenzo Lucca", "team_short": "UDI", "position": "ATT", "age": 24, "market_value": 18.0, "prev_goals": 10, "prev_assists": 2, "prev_cards": 5, "prev_shots_total": 42, "prev_shots_on_target": 18, "prev_corners_won": 0},
  {"name": "Florian Thauvin", "team_short": "UDI", "position": "ATT", "age": 32, "market_value": 5.0, "prev_goals": 8, "prev_assists": 6, "prev_cards": 2, "prev_shots_total": 38, "prev_shots_on_target": 15, "prev_corners_won": 0},
  {"name": "Jaka Bijol", "team_short": "UDI", "position": "DIF", "age": 26, "market_value": 15.0, "prev_goals": 2, "prev_assists": 1, "prev_cards": 6, "prev_shots_total": 12, "prev_shots_on_target": 4, "prev_corners_won": 0},
  {"name": "Roberto Piccoli", "team_short": "CAG", "position": "ATT", "age": 25, "market_value": 8.0, "prev_goals": 8, "prev_assists": 2, "prev_cards": 3, "prev_shots_total": 35, "prev_shots_on_target": 14, "prev_corners_won": 0},
  {"name": "Nicolas Viola", "team_short": "CAG", "position": "CEN", "age": 35, "market_value": 2.0, "prev_goals": 4, "prev_assists": 5, "prev_cards": 4, "prev_shots_total": 25, "prev_shots_on_target": 8, "prev_corners_won": 0},
  {"name": "Yerry Mina", "team_short": "CAG", "position": "DIF", "age": 30, "market_value": 5.0, "prev_goals": 2, "prev_assists": 0, "prev_cards": 7, "prev_shots_total": 10, "prev_shots_on_target": 3, "prev_corners_won": 0},
  {"name": "Patrick Cutrone", "team_short": "COM", "position": "ATT", "age": 28, "market_value": 6.0, "prev_goals": 7, "prev_assists": 2, "prev_cards": 3, "prev_shots_total": 30, "prev_shots_on_target": 12, "prev_corners_won": 0},
  {"name": "Nico Paz", "team_short": "COM", "position": "CEN", "age": 21, "market_value": 20.0, "prev_goals": 4, "prev_assists": 5, "prev_cards": 2, "prev_shots_total": 28, "prev_shots_on_target": 10, "prev_corners_won": 0},
  {"name": "Marc-Oliver Kempf", "team_short": "COM", "position": "DIF", "age": 30, "market_value": 4.0, "prev_goals": 1, "prev_assists": 0, "prev_cards": 6, "prev_shots_total": 8, "prev_shots_on_target": 2, "prev_corners_won": 0},
  {"name": "Ange-Yoan Bonny", "team_short": "PAR", "position": "ATT", "age": 22, "market_value": 15.0, "prev_goals": 6, "prev_assists": 3, "prev_cards": 2, "prev_shots_total": 28, "prev_shots_on_target": 12, "prev_corners_won": 0},
  {"name": "Adrian Bernabe", "team_short": "PAR", "position": "CEN", "age": 24, "market_value": 12.0, "prev_goals": 3, "prev_assists": 4, "prev_cards": 5, "prev_shots_total": 22, "prev_shots_on_target": 7, "prev_corners_won": 0},
  {"name": "Zion Suzuki", "team_short": "PAR", "position": "POR", "age": 22, "market_value": 8.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 1, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Casper Tengstedt", "team_short": "VER", "position": "ATT", "age": 25, "market_value": 8.0, "prev_goals": 7, "prev_assists": 2, "prev_cards": 2, "prev_shots_total": 30, "prev_shots_on_target": 12, "prev_corners_won": 0},
  {"name": "Ondrej Duda", "team_short": "VER", "position": "CEN", "age": 30, "market_value": 4.0, "prev_goals": 3, "prev_assists": 4, "prev_cards": 6, "prev_shots_total": 20, "prev_shots_on_target": 6, "prev_corners_won": 0},
  {"name": "Diego Coppola", "team_short": "VER", "position": "DIF", "age": 22, "market_value": 8.0, "prev_goals": 1, "prev_assists": 0, "prev_cards": 5, "prev_shots_total": 8, "prev_shots_on_target": 2, "prev_corners_won": 0},
  {"name": "Sebastiano Esposito", "team_short": "EMP", "position": "ATT", "age": 23, "market_value": 10.0, "prev_goals": 6, "prev_assists": 2, "prev_cards": 3, "prev_shots_total": 28, "prev_shots_on_target": 10, "prev_corners_won": 0},
  {"name": "Alberto Grassi", "team_short": "EMP", "position": "CEN", "age": 30, "market_value": 3.0, "prev_goals": 1, "prev_assists": 2, "prev_cards": 8, "prev_shots_total": 15, "prev_shots_on_target": 3, "prev_corners_won": 0},
  {"name": "Devis Vasquez", "team_short": "EMP", "position": "POR", "age": 27, "market_value": 3.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 1, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0},
  {"name": "Nikola Krstovic", "team_short": "LEC", "position": "ATT", "age": 25, "market_value": 10.0, "prev_goals": 9, "prev_assists": 2, "prev_cards": 4, "prev_shots_total": 40, "prev_shots_on_target": 16, "prev_corners_won": 0},
  {"name": "Ylber Ramadani", "team_short": "LEC", "position": "CEN", "age": 29, "market_value": 5.0, "prev_goals": 2, "prev_assists": 2, "prev_cards": 7, "prev_shots_total": 18, "prev_shots_on_target": 4, "prev_corners_won": 0},
  {"name": "Federico Baschirotto", "team_short": "LEC", "position": "DIF", "age": 28, "market_value": 6.0, "prev_goals": 1, "prev_assists": 1, "prev_cards": 9, "prev_shots_total": 10, "prev_shots_on_target": 3, "prev_corners_won": 0},
  {"name": "Joel Pohjanpalo", "team_short": "VEN", "position": "ATT", "age": 31, "market_value": 5.0, "prev_goals": 8, "prev_assists": 2, "prev_cards": 2, "prev_shots_total": 32, "prev_shots_on_target": 14, "prev_corners_won": 0},
  {"name": "Gaetano Oristanio", "team_short": "VEN", "position": "CEN", "age": 22, "market_value": 8.0, "prev_goals": 3, "prev_assists": 4, "prev_cards": 3, "prev_shots_total": 22, "prev_shots_on_target": 8, "prev_corners_won": 0},
  {"name": "Jesse Joronen", "team_short": "VEN", "position": "POR", "age": 32, "market_value": 2.0, "prev_goals": 0, "prev_assists": 0, "prev_cards": 1, "prev_shots_total": 0, "prev_shots_on_target": 0, "prev_corners_won": 0}
]
```

- [ ] **Step 3: Write `data/seed/matches.json`** (sample — first 2 matchdays, 20 matches)

```json
[
  {"matchday": 1, "home_short": "INT", "away_short": "MON", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "MIL", "away_short": "TOR", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "JUV", "away_short": "COM", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "ATA", "away_short": "LEC", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "NAP", "away_short": "EMP", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "LAZ", "away_short": "VEN", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "ROM", "away_short": "CAG", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "FIO", "away_short": "PAR", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "BOL", "away_short": "VER", "date": "2026-08-23"},
  {"matchday": 1, "home_short": "GEN", "away_short": "UDI", "date": "2026-08-23"},
  {"matchday": 2, "home_short": "MON", "away_short": "JUV", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "TOR", "away_short": "ATA", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "COM", "away_short": "NAP", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "LEC", "away_short": "MIL", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "EMP", "away_short": "LAZ", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "VEN", "away_short": "ROM", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "CAG", "away_short": "FIO", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "PAR", "away_short": "BOL", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "VER", "away_short": "GEN", "date": "2026-08-30"},
  {"matchday": 2, "home_short": "UDI", "away_short": "INT", "date": "2026-08-30"}
]
```

- [ ] **Step 4: Write `data/seed/h2h.json`** (sample — 5 rivalries)

```json
[
  {"team1_short": "INT", "team2_short": "MIL", "matches_played": 180, "team1_wins": 70, "team2_wins": 55, "draws": 55, "avg_goals_team1": 1.4, "avg_goals_team2": 1.2},
  {"team1_short": "JUV", "team2_short": "INT", "matches_played": 180, "team1_wins": 85, "team2_wins": 50, "draws": 45, "avg_goals_team1": 1.3, "avg_goals_team2": 1.0},
  {"team1_short": "ROM", "team2_short": "LAZ", "matches_played": 160, "team1_wins": 60, "team2_wins": 45, "draws": 55, "avg_goals_team1": 1.2, "avg_goals_team2": 1.0},
  {"team1_short": "JUV", "team2_short": "NAP", "matches_played": 150, "team1_wins": 70, "team2_wins": 40, "draws": 40, "avg_goals_team1": 1.4, "avg_goals_team2": 1.1},
  {"team1_short": "ATA", "team2_short": "MIL", "matches_played": 120, "team1_wins": 25, "team2_wins": 55, "draws": 40, "avg_goals_team1": 1.0, "avg_goals_team2": 1.5}
]
```

- [ ] **Step 5: Write `app/cli/__init__.py`**

```python
# CLI commands registered in app factory
```

- [ ] **Step 6: Write `app/cli/seed.py`**

```python
import json
import os
from datetime import date

import click
from flask import current_app
from app.extensions import db
from app.models import Team, Player, Match, HeadToHead

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed")


@click.group(name="seed")
def seed_command():
    """Populate the database with seed data."""
    pass


@seed_command.command()
def teams():
    """Seed teams from data/seed/teams.json."""
    path = os.path.join(DATA_DIR, "teams.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        team = Team(
            name=item["name"], short_name=item["short_name"],
            stadium=item["stadium"], city=item["city"],
            ranking=item["ranking"], mood=item["mood"],
            season_objective=item["season_objective"],
            home_advantage=item["home_advantage"],
        )
        db.session.add(team)
    db.session.commit()
    click.echo(f"Seeded {len(data)} teams.")


@seed_command.command()
def players():
    """Seed players from data/seed/players.json."""
    path = os.path.join(DATA_DIR, "players.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    teams = {t.short_name: t for t in Team.query.all()}
    count = 0
    for item in data:
        team = teams.get(item["team_short"])
        if team is None:
            click.echo(f"Team {item['team_short']} not found, skipping {item['name']}")
            continue
        player = Player(
            name=item["name"], team_id=team.id, position=item["position"],
            age=item["age"], market_value=item["market_value"],
            prev_goals=item["prev_goals"], prev_assists=item["prev_assists"],
            prev_cards=item["prev_cards"], prev_shots_total=item["prev_shots_total"],
            prev_shots_on_target=item["prev_shots_on_target"],
            prev_corners_won=item["prev_corners_won"],
        )
        db.session.add(player)
        count += 1
    db.session.commit()
    click.echo(f"Seeded {count} players.")


@seed_command.command()
def matches():
    """Seed matches from data/seed/matches.json."""
    path = os.path.join(DATA_DIR, "matches.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    teams = {t.short_name: t for t in Team.query.all()}
    count = 0
    for item in data:
        home = teams.get(item["home_short"])
        away = teams.get(item["away_short"])
        if home is None or away is None:
            click.echo(f"Skipping match: {item['home_short']} vs {item['away_short']}")
            continue
        match_date = date.fromisoformat(item["date"]) if item.get("date") else None
        match = Match(
            matchday=item["matchday"], home_team_id=home.id,
            away_team_id=away.id, date=match_date,
        )
        db.session.add(match)
        count += 1
    db.session.commit()
    click.echo(f"Seeded {count} matches.")


@seed_command.command()
def head_to_head():
    """Seed head-to-head records from data/seed/h2h.json."""
    path = os.path.join(DATA_DIR, "h2h.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    teams = {t.short_name: t for t in Team.query.all()}
    count = 0
    for item in data:
        t1 = teams.get(item["team1_short"])
        t2 = teams.get(item["team2_short"])
        if t1 is None or t2 is None:
            continue
        h2h = HeadToHead(
            team1_id=t1.id, team2_id=t2.id,
            matches_played=item["matches_played"],
            team1_wins=item["team1_wins"], team2_wins=item["team2_wins"],
            draws=item["draws"], avg_goals_team1=item["avg_goals_team1"],
            avg_goals_team2=item["avg_goals_team2"],
        )
        db.session.add(h2h)
        count += 1
    db.session.commit()
    click.echo(f"Seeded {count} head-to-head records.")


@seed_command.command()
def all():
    """Run all seed commands."""
    ctx = click.get_current_context()
    ctx.invoke(teams)
    ctx.invoke(players)
    ctx.invoke(matches)
    ctx.invoke(head_to_head)
    click.echo("All seed data loaded.")
```

- [ ] **Step 7: Verify seed works**

```bash
flask seed all
```
Expected: "Seeded 20 teams.", "Seeded 60 players.", "Seeded 20 matches.", "Seeded 5 head-to-head records.", "All seed data loaded."

- [ ] **Step 8: Commit**

```bash
git add app/cli/ data/seed/
git commit -m "feat: add seed data and CLI seed commands"
```

---

### Task 4: Service Layer

**Files:**
- Create: `app/services/__init__.py`, `app/services/team_service.py`, `app/services/player_service.py`, `app/services/match_service.py`, `app/services/ranking_service.py`
- Create: `tests/test_services.py`

**Interfaces:**
- Consumes: `Team`, `Player`, `Match`, `MatchResult`, `HeadToHead` from `app.models`
- Produces: `TeamService.compute_strength(team, is_home)`, `PlayerService.compute_strength(player)`, `MatchService.get_matchday(matchday)`, `RankingService.compute_ranking()`, `RankingService.get_h2h_factor(team1_id, team2_id)`

- [ ] **Step 1: Write `tests/test_services.py`**

```python
import pytest
from app.models import Team, Player, Match, HeadToHead
from app.services.team_service import TeamService
from app.services.player_service import PlayerService
from app.services.match_service import MatchService
from app.services.ranking_service import RankingService


class TestTeamService:
    def test_compute_strength_basic(self, db):
        team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano",
                    ranking=1, mood=0.2, season_objective="scudetto", home_advantage=1.1)
        db.session.add(team)
        db.session.commit()

        strength = TeamService.compute_strength(team, is_home=True)
        assert 0 <= strength <= 100
        assert strength > 50  # top team should be strong

    def test_compute_strength_away_penalty(self, db):
        team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano",
                    ranking=1, mood=0.2, season_objective="scudetto", home_advantage=1.1)
        db.session.add(team)
        db.session.commit()

        home_strength = TeamService.compute_strength(team, is_home=True)
        away_strength = TeamService.compute_strength(team, is_home=False)
        assert home_strength > away_strength

    def test_compute_strength_weak_team(self, db):
        team = Team(name="Venezia", short_name="VEN", stadium="Penzo", city="Venezia",
                    ranking=20, mood=-0.15, season_objective="salvezza", home_advantage=0.95)
        db.session.add(team)
        db.session.commit()

        strength = TeamService.compute_strength(team, is_home=True)
        assert 0 <= strength <= 100
        assert strength < 50  # bottom team should be weak


class TestPlayerService:
    def test_compute_strength_attacker(self, db):
        team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        db.session.add(team)
        db.session.commit()

        player = Player(name="Test", team_id=team.id, position="ATT", age=27,
                        market_value=100.0, prev_goals=22, prev_assists=6,
                        prev_cards=4, prev_shots_total=95, prev_shots_on_target=48)
        db.session.add(player)
        db.session.commit()

        strength = PlayerService.compute_strength(player)
        assert 0 <= strength <= 100
        assert strength > 50

    def test_compute_strength_goalkeeper(self, db):
        team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        db.session.add(team)
        db.session.commit()

        player = Player(name="Test GK", team_id=team.id, position="POR", age=36,
                        market_value=5.0, prev_goals=0, prev_assists=0,
                        prev_cards=1, prev_shots_total=0, prev_shots_on_target=0)
        db.session.add(player)
        db.session.commit()

        strength = PlayerService.compute_strength(player)
        assert 0 <= strength <= 100

    def test_age_curve_peak(self, db):
        team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        db.session.add(team)
        db.session.commit()

        young = Player(name="Young", team_id=team.id, position="ATT", age=21,
                       market_value=50.0, prev_goals=10, prev_assists=5,
                       prev_cards=2, prev_shots_total=50, prev_shots_on_target=20)
        peak = Player(name="Peak", team_id=team.id, position="ATT", age=27,
                      market_value=50.0, prev_goals=10, prev_assists=5,
                      prev_cards=2, prev_shots_total=50, prev_shots_on_target=20)
        old = Player(name="Old", team_id=team.id, position="ATT", age=34,
                     market_value=50.0, prev_goals=10, prev_assists=5,
                     prev_cards=2, prev_shots_total=50, prev_shots_on_target=20)
        db.session.add_all([young, peak, old])
        db.session.commit()

        peak_str = PlayerService.compute_strength(peak)
        young_str = PlayerService.compute_strength(young)
        old_str = PlayerService.compute_strength(old)
        assert peak_str > old_str
        assert peak_str >= young_str


class TestMatchService:
    def test_get_matchday(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
        db.session.add_all([t1, t2])
        db.session.commit()

        m1 = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
        m2 = Match(matchday=2, home_team_id=t2.id, away_team_id=t1.id)
        db.session.add_all([m1, m2])
        db.session.commit()

        day1 = MatchService.get_matchday(1)
        assert len(day1) == 1
        assert day1[0].matchday == 1

    def test_get_matchday_empty(self, db):
        matches = MatchService.get_matchday(99)
        assert matches == []


class TestRankingService:
    def test_compute_ranking(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
        db.session.add_all([t1, t2])
        db.session.commit()

        ranking = RankingService.compute_ranking()
        assert len(ranking) == 2
        assert ranking[0].short_name == "INT"

    def test_get_h2h_factor_found(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
        db.session.add_all([t1, t2])
        db.session.commit()

        h2h = HeadToHead(team1_id=t1.id, team2_id=t2.id, matches_played=180,
                         team1_wins=70, team2_wins=55, draws=55,
                         avg_goals_team1=1.4, avg_goals_team2=1.2)
        db.session.add(h2h)
        db.session.commit()

        factor = RankingService.get_h2h_factor(t1.id, t2.id)
        assert factor > 0

    def test_get_h2h_factor_not_found(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
        t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
        db.session.add_all([t1, t2])
        db.session.commit()

        factor = RankingService.get_h2h_factor(t1.id, t2.id)
        assert factor == 0.0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_services.py -v
```
Expected: all fail with ImportError or AttributeError

- [ ] **Step 3: Write `app/services/__init__.py`**

```python
from app.services.team_service import TeamService
from app.services.player_service import PlayerService
from app.services.match_service import MatchService
from app.services.ranking_service import RankingService

__all__ = ["TeamService", "PlayerService", "MatchService", "RankingService"]
```

- [ ] **Step 4: Write `app/services/team_service.py`**

```python
class TeamService:
    @staticmethod
    def compute_strength(team, is_home=True):
        ranking_score = max(0, 100 - (team.ranking - 1) * 4.5)
        mood_factor = 1.0 + team.mood * 0.1
        objective_bonus = {
            "scudetto": 5, "champions": 3, "europa": 1,
            "mid_table": 0, "salvezza": -2,
        }.get(team.season_objective, 0)
        home_bonus = team.home_advantage if is_home else 1.0
        base = ranking_score * mood_factor + objective_bonus
        strength = base * home_bonus
        return max(0, min(100, strength))
```

- [ ] **Step 5: Write `app/services/player_service.py`**

```python
class PlayerService:
    @staticmethod
    def compute_strength(player):
        max_goals = 25
        max_assists = 15
        max_shots = 100
        max_sot = 50
        max_value = 120

        perf_score = 0
        perf_score += (min(player.prev_goals, max_goals) / max_goals) * 30
        perf_score += (min(player.prev_assists, max_assists) / max_assists) * 15
        perf_score += (min(player.prev_shots_total, max_shots) / max_shots) * 10
        perf_score += (min(player.prev_shots_on_target, max_sot) / max_sot) * 10
        perf_score = perf_score / 65 * 45

        value_score = min(player.market_value, max_value) / max_value * 35

        if player.age <= 23:
            age_factor = 0.85 + (player.age - 17) * 0.025
        elif player.age <= 27:
            age_factor = 1.0
        elif player.age <= 32:
            age_factor = 1.0 - (player.age - 27) * 0.04
        else:
            age_factor = max(0.5, 0.8 - (player.age - 32) * 0.05)
        age_score = age_factor * 20

        return max(0, min(100, perf_score + value_score + age_score))
```

- [ ] **Step 6: Write `app/services/match_service.py`**

```python
from app.models import Match


class MatchService:
    @staticmethod
    def get_matchday(matchday):
        return Match.query.filter_by(matchday=matchday).all()

    @staticmethod
    def get_match(match_id):
        return Match.query.get(match_id)

    @staticmethod
    def get_all_matchdays():
        result = Match.query.with_entities(Match.matchday).distinct().order_by(Match.matchday).all()
        return [r[0] for r in result]
```

- [ ] **Step 7: Write `app/services/ranking_service.py`**

```python
from app.models import Team, HeadToHead


class RankingService:
    @staticmethod
    def compute_ranking():
        return Team.query.order_by(Team.ranking).all()

    @staticmethod
    def get_h2h_factor(team1_id, team2_id):
        h2h = HeadToHead.query.filter(
            ((HeadToHead.team1_id == team1_id) & (HeadToHead.team2_id == team2_id))
            | ((HeadToHead.team1_id == team2_id) & (HeadToHead.team2_id == team1_id))
        ).first()
        if h2h is None:
            return 0.0
        total = h2h.matches_played or 1
        if h2h.team1_id == team1_id:
            win_rate = h2h.team1_wins / total
        else:
            win_rate = h2h.team2_wins / total
        return (win_rate - 0.5) * 10
```

- [ ] **Step 8: Run tests**

```bash
pytest tests/test_services.py -v
```
Expected: 10 passed

- [ ] **Step 9: Commit**

```bash
git add app/services/ tests/test_services.py
git commit -m "feat: add service layer with team/player strength and ranking"
```

---

### Task 5: Monte Carlo Prediction Engine

**Files:**
- Create: `app/services/prediction_engine.py`, `app/cli/predict.py`
- Create: `tests/test_prediction_engine.py`

**Interfaces:**
- Consumes: `TeamService.compute_strength`, `PlayerService.compute_strength`, `RankingService.get_h2h_factor`, `MatchService.get_matchday`, `Prediction`, `PlayerPrediction`, `Player`, `Match` models
- Produces: `PredictionEngine.run_simulation(match, runs)`, `PredictionEngine.predict_matchday(matchday, runs)`

- [ ] **Step 1: Write `tests/test_prediction_engine.py`**

```python
import pytest
from app.models import Team, Player, Match
from app.services.prediction_engine import PredictionEngine


class TestPredictionEngine:
    def test_run_simulation_returns_prediction(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano",
                  ranking=1, mood=0.2, season_objective="scudetto", home_advantage=1.1)
        t2 = Team(name="Venezia", short_name="VEN", stadium="Penzo", city="Venezia",
                  ranking=20, mood=-0.15, season_objective="salvezza", home_advantage=0.95)
        db.session.add_all([t1, t2])
        db.session.commit()

        p1 = Player(name="Attaccante", team_id=t1.id, position="ATT", age=27,
                    market_value=100.0, prev_goals=22, prev_assists=6,
                    prev_cards=4, prev_shots_total=95, prev_shots_on_target=48)
        p2 = Player(name="Difensore", team_id=t2.id, position="DIF", age=28,
                    market_value=5.0, prev_goals=1, prev_assists=0,
                    prev_cards=7, prev_shots_total=10, prev_shots_on_target=3)
        db.session.add_all([p1, p2])
        db.session.commit()

        match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
        db.session.add(match)
        db.session.commit()

        pred = PredictionEngine.run_simulation(match, runs=1000)
        assert pred is not None
        assert pred.simulations == 1000
        assert pred.pred_home_score > pred.pred_away_score
        assert pred.prob_home_win > pred.prob_away_win
        assert pred.pred_home_corners > 0
        assert pred.pred_away_corners > 0
        assert pred.pred_home_cards >= 0
        assert pred.pred_away_cards >= 0
        assert pred.pred_home_sot > 0
        assert pred.pred_away_sot > 0
        assert pred.pred_home_shots > 0
        assert pred.pred_away_shots > 0

    def test_simulation_reproducible_with_seed(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano",
                  ranking=1, mood=0.2, season_objective="scudetto", home_advantage=1.1)
        t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano",
                  ranking=3, mood=0.1, season_objective="champions", home_advantage=1.1)
        db.session.add_all([t1, t2])
        db.session.commit()

        p1 = Player(name="A1", team_id=t1.id, position="ATT", age=27,
                    market_value=100.0, prev_goals=22, prev_assists=6,
                    prev_cards=4, prev_shots_total=95, prev_shots_on_target=48)
        p2 = Player(name="A2", team_id=t2.id, position="ATT", age=26,
                    market_value=85.0, prev_goals=14, prev_assists=10,
                    prev_cards=3, prev_shots_total=78, prev_shots_on_target=35)
        db.session.add_all([p1, p2])
        db.session.commit()

        match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
        db.session.add(match)
        db.session.commit()

        pred1 = PredictionEngine.run_simulation(match, runs=500, seed=42)
        pred2 = PredictionEngine.run_simulation(match, runs=500, seed=42)
        assert pred1.pred_home_score == pred2.pred_home_score
        assert pred1.pred_away_score == pred2.pred_away_score

    def test_predict_matchday(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano",
                  ranking=1, mood=0.2, season_objective="scudetto", home_advantage=1.1)
        t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano",
                  ranking=3, mood=0.1, season_objective="champions", home_advantage=1.1)
        t3 = Team(name="Juventus", short_name="JUV", stadium="Allianz", city="Torino",
                  ranking=2, mood=0.15, season_objective="scudetto", home_advantage=1.15)
        t4 = Team(name="Venezia", short_name="VEN", stadium="Penzo", city="Venezia",
                  ranking=20, mood=-0.15, season_objective="salvezza", home_advantage=0.95)
        db.session.add_all([t1, t2, t3, t4])
        db.session.commit()

        for team in [t1, t2, t3, t4]:
            p = Player(name=f"P-{team.short_name}", team_id=team.id, position="ATT",
                       age=27, market_value=50.0, prev_goals=10, prev_assists=5,
                       prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
            db.session.add(p)
        db.session.commit()

        m1 = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
        m2 = Match(matchday=1, home_team_id=t3.id, away_team_id=t4.id)
        db.session.add_all([m1, m2])
        db.session.commit()

        predictions = PredictionEngine.predict_matchday(1, runs=200)
        assert len(predictions) == 2
        for pred in predictions:
            assert pred.simulations == 200
            assert pred.prob_home_win + pred.prob_draw + pred.prob_away_win == pytest.approx(1.0, abs=0.02)

    def test_player_predictions_created(self, db):
        t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano",
                  ranking=1, mood=0.2, season_objective="scudetto", home_advantage=1.1)
        t2 = Team(name="Venezia", short_name="VEN", stadium="Penzo", city="Venezia",
                  ranking=20, mood=-0.15, season_objective="salvezza", home_advantage=0.95)
        db.session.add_all([t1, t2])
        db.session.commit()

        p1 = Player(name="Attaccante", team_id=t1.id, position="ATT", age=27,
                    market_value=100.0, prev_goals=22, prev_assists=6,
                    prev_cards=4, prev_shots_total=95, prev_shots_on_target=48)
        p2 = Player(name="Difensore", team_id=t2.id, position="DIF", age=28,
                    market_value=5.0, prev_goals=1, prev_assists=0,
                    prev_cards=7, prev_shots_total=10, prev_shots_on_target=3)
        db.session.add_all([p1, p2])
        db.session.commit()

        match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
        db.session.add(match)
        db.session.commit()

        pred = PredictionEngine.run_simulation(match, runs=200)
        player_preds = pred.player_predictions.all()
        assert len(player_preds) > 0
        for pp in player_preds:
            assert pp.pred_goals >= 0
            assert pp.pred_cards >= 0
            assert 0 <= pp.prob_goal <= 1
            assert 0 <= pp.prob_card <= 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_prediction_engine.py -v
```
Expected: all fail with ImportError

- [ ] **Step 3: Write `app/services/prediction_engine.py`**

```python
import numpy as np
from app.extensions import db
from app.models import Match, Player, Prediction, PlayerPrediction
from app.services.team_service import TeamService
from app.services.player_service import PlayerService
from app.services.ranking_service import RankingService


class PredictionEngine:
    @staticmethod
    def _simulate_one_match(home_team, away_team, home_players, away_players, rng):
        home_strength = TeamService.compute_strength(home_team, is_home=True)
        away_strength = TeamService.compute_strength(away_team, is_home=False)

        home_strength += rng.normal(0, 5)
        away_strength += rng.normal(0, 5)

        h2h = RankingService.get_h2h_factor(home_team.id, away_team.id)
        home_strength += h2h

        strength_diff = home_strength - away_strength
        home_xg = max(0.3, 1.3 + strength_diff * 0.025)
        away_xg = max(0.3, 1.3 - strength_diff * 0.025)

        home_goals = rng.poisson(home_xg)
        away_goals = rng.poisson(away_xg)

        home_corners = max(1, int(rng.normal(4.5 + strength_diff * 0.03, 1.5)))
        away_corners = max(1, int(rng.normal(4.5 - strength_diff * 0.03, 1.5)))

        home_cards = max(0, int(rng.normal(2.0 - strength_diff * 0.01, 1.0)))
        away_cards = max(0, int(rng.normal(2.0 + strength_diff * 0.01, 1.0)))

        home_sot = max(0, int(rng.normal(home_goals * 3.0 + 1, 1.5)))
        away_sot = max(0, int(rng.normal(away_goals * 3.0 + 1, 1.5)))

        home_shots = max(home_sot, int(home_sot * rng.uniform(1.5, 2.5)))
        away_shots = max(away_sot, int(away_sot * rng.uniform(1.5, 2.5)))

        home_player_goals = PredictionEngine._distribute_goals(home_players, home_goals, rng)
        away_player_goals = PredictionEngine._distribute_goals(away_players, away_goals, rng)
        home_player_cards = PredictionEngine._distribute_cards(home_players, home_cards, rng)
        away_player_cards = PredictionEngine._distribute_cards(away_players, away_cards, rng)
        home_player_sot = PredictionEngine._distribute_shots(home_players, home_sot, rng)
        away_player_sot = PredictionEngine._distribute_shots(away_players, away_sot, rng)
        home_player_shots = PredictionEngine._distribute_shots(home_players, home_shots, rng)
        away_player_shots = PredictionEngine._distribute_shots(away_players, away_shots, rng)

        return {
            "home_goals": home_goals, "away_goals": away_goals,
            "home_corners": home_corners, "away_corners": away_corners,
            "home_cards": home_cards, "away_cards": away_cards,
            "home_sot": home_sot, "away_sot": away_sot,
            "home_shots": home_shots, "away_shots": away_shots,
            "home_player_goals": home_player_goals,
            "away_player_goals": away_player_goals,
            "home_player_cards": home_player_cards,
            "away_player_cards": away_player_cards,
            "home_player_sot": home_player_sot,
            "away_player_sot": away_player_sot,
            "home_player_shots": home_player_shots,
            "away_player_shots": away_player_shots,
        }

    @staticmethod
    def _distribute_goals(players, total_goals, rng):
        if total_goals == 0 or not players:
            return {p.id: 0 for p in players}
        weights = []
        for p in players:
            w = PlayerService.compute_strength(p)
            if p.position == "ATT":
                w *= 2.0
            elif p.position == "CEN":
                w *= 1.0
            elif p.position == "DIF":
                w *= 0.3
            else:
                w *= 0.01
            weights.append(max(0.01, w))
        total_w = sum(weights)
        probs = [w / total_w for w in weights]
        result = {p.id: 0 for p in players}
        for _ in range(total_goals):
            idx = rng.choice(len(players), p=probs)
            result[players[idx].id] += 1
        return result

    @staticmethod
    def _distribute_cards(players, total_cards, rng):
        if total_cards == 0 or not players:
            return {p.id: 0 for p in players}
        weights = []
        for p in players:
            w = p.prev_cards + 1
            if p.position == "DIF":
                w *= 1.5
            elif p.position == "CEN":
                w *= 1.2
            elif p.position == "ATT":
                w *= 0.6
            else:
                w *= 0.1
            weights.append(max(0.01, w))
        total_w = sum(weights)
        probs = [w / total_w for w in weights]
        result = {p.id: 0 for p in players}
        for _ in range(total_cards):
            idx = rng.choice(len(players), p=probs)
            result[players[idx].id] += 1
        return result

    @staticmethod
    def _distribute_shots(players, total_shots, rng):
        if total_shots == 0 or not players:
            return {p.id: 0 for p in players}
        weights = []
        for p in players:
            w = p.prev_shots_total + 1
            if p.position == "ATT":
                w *= 1.5
            elif p.position == "CEN":
                w *= 1.0
            elif p.position == "DIF":
                w *= 0.4
            else:
                w *= 0.01
            weights.append(max(0.01, w))
        total_w = sum(weights)
        probs = [w / total_w for w in weights]
        result = {p.id: 0 for p in players}
        for _ in range(total_shots):
            idx = rng.choice(len(players), p=probs)
            result[players[idx].id] += 1
        return result

    @staticmethod
    def run_simulation(match, runs=10000, seed=None):
        home_team = match.home_team
        away_team = match.away_team
        home_players = Player.query.filter_by(team_id=home_team.id).all()
        away_players = Player.query.filter_by(team_id=away_team.id).all()

        rng = np.random.default_rng(seed)

        totals = {
            "home_goals": [], "away_goals": [],
            "home_corners": [], "away_corners": [],
            "home_cards": [], "away_cards": [],
            "home_sot": [], "away_sot": [],
            "home_shots": [], "away_shots": [],
        }
        player_totals = {}
        all_players = home_players + away_players
        for p in all_players:
            player_totals[p.id] = {
                "goals": [], "cards": [], "sot": [], "shots": [],
            }

        for _ in range(runs):
            sim = PredictionEngine._simulate_one_match(
                home_team, away_team, home_players, away_players, rng
            )
            totals["home_goals"].append(sim["home_goals"])
            totals["away_goals"].append(sim["away_goals"])
            totals["home_corners"].append(sim["home_corners"])
            totals["away_corners"].append(sim["away_corners"])
            totals["home_cards"].append(sim["home_cards"])
            totals["away_cards"].append(sim["away_cards"])
            totals["home_sot"].append(sim["home_sot"])
            totals["away_sot"].append(sim["away_sot"])
            totals["home_shots"].append(sim["home_shots"])
            totals["away_shots"].append(sim["away_shots"])

            for p_id, g in sim["home_player_goals"].items():
                player_totals[p_id]["goals"].append(g)
            for p_id, g in sim["away_player_goals"].items():
                player_totals[p_id]["goals"].append(g)
            for p_id, c in sim["home_player_cards"].items():
                player_totals[p_id]["cards"].append(c)
            for p_id, c in sim["away_player_cards"].items():
                player_totals[p_id]["cards"].append(c)
            for p_id, s in sim["home_player_sot"].items():
                player_totals[p_id]["sot"].append(s)
            for p_id, s in sim["away_player_sot"].items():
                player_totals[p_id]["sot"].append(s)
            for p_id, s in sim["home_player_shots"].items():
                player_totals[p_id]["shots"].append(s)
            for p_id, s in sim["away_player_shots"].items():
                player_totals[p_id]["shots"].append(s)

        home_wins = sum(1 for h, a in zip(totals["home_goals"], totals["away_goals"]) if h > a)
        draws = sum(1 for h, a in zip(totals["home_goals"], totals["away_goals"]) if h == a)
        away_wins = runs - home_wins - draws

        pred = Prediction(
            match_id=match.id, simulations=runs,
            pred_home_score=np.mean(totals["home_goals"]),
            pred_away_score=np.mean(totals["away_goals"]),
            prob_home_win=home_wins / runs,
            prob_draw=draws / runs,
            prob_away_win=away_wins / runs,
            pred_home_corners=np.mean(totals["home_corners"]),
            pred_away_corners=np.mean(totals["away_corners"]),
            pred_home_cards=np.mean(totals["home_cards"]),
            pred_away_cards=np.mean(totals["away_cards"]),
            pred_home_sot=np.mean(totals["home_sot"]),
            pred_away_sot=np.mean(totals["away_sot"]),
            pred_home_shots=np.mean(totals["home_shots"]),
            pred_away_shots=np.mean(totals["away_shots"]),
        )
        db.session.add(pred)
        db.session.flush()

        for p in all_players:
            pt = player_totals[p.id]
            pp = PlayerPrediction(
                prediction_id=pred.id, player_id=p.id,
                pred_goals=np.mean(pt["goals"]),
                pred_cards=np.mean(pt["cards"]),
                pred_shots_on_target=np.mean(pt["sot"]),
                pred_shots_total=np.mean(pt["shots"]),
                prob_goal=sum(1 for g in pt["goals"] if g > 0) / runs,
                prob_card=sum(1 for c in pt["cards"] if c > 0) / runs,
            )
            db.session.add(pp)

        db.session.commit()
        return pred

    @staticmethod
    def predict_matchday(matchday, runs=10000, seed=None):
        from app.services.match_service import MatchService
        matches = MatchService.get_matchday(matchday)
        predictions = []
        for match in matches:
            pred = PredictionEngine.run_simulation(match, runs=runs, seed=seed)
            predictions.append(pred)
        return predictions
```

- [ ] **Step 4: Write `app/cli/predict.py`**

```python
import click
from flask import current_app
from app.services.prediction_engine import PredictionEngine


@click.group(name="predict")
def predict_command():
    """Run Monte Carlo predictions."""
    pass


@predict_command.command()
@click.argument("matchday", type=int)
@click.option("--runs", default=None, type=int, help="Number of simulations")
def matchday(matchday, runs):
    """Run predictions for a specific matchday."""
    if runs is None:
        runs = current_app.config["MONTE_CARLO_RUNS"]
    predictions = PredictionEngine.predict_matchday(matchday, runs=runs)
    for pred in predictions:
        click.echo(
            f"Match {pred.match_id}: "
            f"{pred.pred_home_score:.2f} - {pred.pred_away_score:.2f} "
            f"(H:{pred.prob_home_win:.0%} D:{pred.prob_draw:.0%} A:{pred.prob_away_win:.0%})"
        )
    click.echo(f"Predicted {len(predictions)} matches with {runs} simulations each.")
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_prediction_engine.py -v
```
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add app/services/prediction_engine.py app/cli/predict.py tests/test_prediction_engine.py
git commit -m "feat: add Monte Carlo prediction engine with tests"
```

---

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

---

### Task 7: Scraper Service and CLI

**Files:**
- Create: `app/services/scraper.py`, `app/cli/scrape.py`

**Interfaces:**
- Consumes: `Team`, `Player` models
- Produces: `scrape_command` Click group, `ScraperService` with stub methods

- [ ] **Step 1: Write `app/services/scraper.py`**

```python
import json
import os
import requests
from bs4 import BeautifulSoup

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "scraped")


class ScraperService:
    @staticmethod
    def scrape_transfermarkt():
        """Scrape player market values from Transfermarkt.
        This is a stub - real implementation requires handling anti-bot measures.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        output_path = os.path.join(DATA_DIR, "transfermarkt_values.json")
        data = {"source": "transfermarkt", "status": "stub", "players": []}
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return output_path

    @staticmethod
    def scrape_fbref():
        """Scrape player statistics from FBref.
        This is a stub - real implementation requires parsing FBref tables.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        output_path = os.path.join(DATA_DIR, "fbref_stats.json")
        data = {"source": "fbref", "status": "stub", "players": []}
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return output_path

    @staticmethod
    def scrape_diretta():
        """Scrape match results from Diretta.it.
        This is a stub - real implementation requires parsing match pages.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        output_path = os.path.join(DATA_DIR, "diretta_results.json")
        data = {"source": "diretta", "status": "stub", "matches": []}
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return output_path
```

- [ ] **Step 2: Write `app/cli/scrape.py`**

```python
import click
from app.services.scraper import ScraperService


@click.group(name="scrape")
def scrape_command():
    """Scrape data from external sources."""
    pass


@scrape_command.command()
def transfermarkt():
    """Scrape player market values from Transfermarkt."""
    path = ScraperService.scrape_transfermarkt()
    click.echo(f"Transfermarkt data saved to {path}")


@scrape_command.command()
def fbref():
    """Scrape player statistics from FBref."""
    path = ScraperService.scrape_fbref()
    click.echo(f"FBref data saved to {path}")


@scrape_command.command()
def diretta():
    """Scrape match results from Diretta.it."""
    path = ScraperService.scrape_diretta()
    click.echo(f"Diretta data saved to {path}")
```

- [ ] **Step 3: Verify CLI commands register**

```bash
flask scrape --help
```
Expected: shows transfermarkt, fbref, diretta subcommands

- [ ] **Step 4: Commit**

```bash
git add app/services/scraper.py app/cli/scrape.py
git commit -m "feat: add scraper service stubs and CLI commands"
```

---

### Task 8: Integration and Final Verification

**Files:**
- Modify: `app/__init__.py` (ensure all pieces wire together)

**Interfaces:**
- Consumes: Everything from Tasks 1-7

- [ ] **Step 1: Verify full app startup**

```bash
python -c "from app import create_app; app = create_app(); print('App created successfully')"
```
Expected: `App created successfully`

- [ ] **Step 2: Run all tests**

```bash
pytest tests/ -v
```
Expected: all tests pass (6 model + 10 service + 4 engine + 7 route = 27 tests)

- [ ] **Step 3: Seed database and run prediction end-to-end**

```bash
flask seed all
flask predict matchday 1 --runs 100
```
Expected: 10 match predictions with probabilities

- [ ] **Step 4: Verify web interface**

```bash
flask run &
```
Visit `http://localhost:5000` — verify dashboard, navigate to Giornata 1, run simulation, check match detail with player predictions.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final integration and verification"
```
