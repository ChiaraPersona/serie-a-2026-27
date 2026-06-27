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
