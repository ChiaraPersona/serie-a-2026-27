from flask import Blueprint, render_template
from app.models import Player
from app.services.player_service import PlayerService

bp = Blueprint("players", __name__)


@bp.route("/calciatore/<int:player_id>")
def calciatore(player_id):
    player = Player.query.get_or_404(player_id)
    strength = PlayerService.compute_strength(player)
    return render_template("player.html", player=player, strength=strength)
