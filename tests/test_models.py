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
