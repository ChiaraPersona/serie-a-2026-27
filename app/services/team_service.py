class TeamService:
    @staticmethod
    def compute_strength(team, is_home=True):
        ranking_score = max(0, 90 - (team.ranking - 1) * 4.5)
        mood_factor = 1.0 + team.mood * 0.1
        objective_bonus = {
            "scudetto": 5, "champions": 3, "europa": 1,
            "mid_table": 0, "salvezza": -2,
        }.get(team.season_objective, 0)
        home_bonus = team.home_advantage if is_home else 1.0
        base = ranking_score * mood_factor + objective_bonus
        strength = base * home_bonus
        return max(0, min(100, strength))
