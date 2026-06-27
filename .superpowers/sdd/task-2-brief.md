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
import pytest
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
