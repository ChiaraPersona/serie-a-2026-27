from flask import Blueprint, render_template
from app.models import Team

bp = Blueprint("teams", __name__)


@bp.route("/squadra/<int:team_id>")
def squadra(team_id):
    team = Team.query.get_or_404(team_id)
    players = team.players.all()
    return render_template("team.html", team=team, players=players, mode="detail")
