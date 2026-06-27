from flask import Blueprint, render_template, request, redirect, url_for
from app.services.match_service import MatchService
from app.services.prediction_engine import PredictionEngine
from app.models import Prediction

bp = Blueprint("predictions", __name__)


@bp.route("/giornata/<int:matchday>")
def giornata(matchday):
    matches = MatchService.get_matchday(matchday)
    matchdays = MatchService.get_all_matchdays()
    predictions = {}
    for match in matches:
        pred = Prediction.query.filter_by(match_id=match.id).order_by(Prediction.created_at.desc()).first()
        predictions[match.id] = pred
    return render_template(
        "predictions.html",
        matches=matches, matchdays=matchdays,
        current_matchday=matchday, predictions=predictions,
    )


@bp.route("/giornata/<int:matchday>/simula", methods=["POST"])
def simula(matchday):
    runs = int(request.form.get("runs", 10000))
    PredictionEngine.predict_matchday(matchday, runs=runs)
    return redirect(url_for("predictions.giornata", matchday=matchday))


@bp.route("/partita/<int:match_id>")
def partita(match_id):
    match = MatchService.get_match(match_id)
    pred = Prediction.query.filter_by(match_id=match_id).order_by(Prediction.created_at.desc()).first()
    return render_template("match.html", match=match, prediction=pred)
