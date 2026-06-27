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
