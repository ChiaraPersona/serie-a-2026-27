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
        for i, match in enumerate(matches):
            match_seed = None if seed is None else seed + i
            pred = PredictionEngine.run_simulation(match, runs=runs, seed=match_seed)
            predictions.append(pred)
        return predictions
