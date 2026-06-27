from flask import Blueprint, render_template
from app.services.match_service import MatchService
from app.services.ranking_service import RankingService

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    matchdays = MatchService.get_all_matchdays()
    next_matchday = matchdays[0] if matchdays else 1
    matches = MatchService.get_matchday(next_matchday)
    return render_template("index.html", matches=matches, matchdays=matchdays, current_matchday=next_matchday)


@bp.route("/classifica")
def classifica():
    teams = RankingService.compute_ranking()
    return render_template("team.html", teams=teams, mode="classifica")
