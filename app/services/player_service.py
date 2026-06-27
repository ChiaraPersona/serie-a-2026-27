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
