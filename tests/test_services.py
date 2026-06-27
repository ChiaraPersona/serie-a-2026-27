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
