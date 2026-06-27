from flask import Blueprint, jsonify
from app.services.match_service import MatchService
from app.services.ranking_service import RankingService

bp = Blueprint("api", __name__, url_prefix="/api")


@bp.route("/matchday/<int:matchday>")
def api_matchday(matchday):
    matches = MatchService.get_matchday(matchday)
    return jsonify([
        {
            "id": m.id, "matchday": m.matchday,
            "home_team": m.home_team.short_name,
            "away_team": m.away_team.short_name,
            "played": m.played,
        }
        for m in matches
    ])


@bp.route("/classifica")
def api_classifica():
    teams = RankingService.compute_ranking()
    return jsonify([
        {"id": t.id, "name": t.name, "short_name": t.short_name, "ranking": t.ranking}
        for t in teams
    ])
