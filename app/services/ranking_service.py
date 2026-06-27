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
            return (h2h.team1_wins - h2h.team2_wins) / total * 10
        else:
            return (h2h.team2_wins - h2h.team1_wins) / total * 10
