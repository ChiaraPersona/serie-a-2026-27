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
