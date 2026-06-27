from datetime import datetime, timezone
from app.extensions import db


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    simulations = db.Column(db.Integer, nullable=False)
    pred_home_score = db.Column(db.Float, nullable=False)
    pred_away_score = db.Column(db.Float, nullable=False)
    prob_home_win = db.Column(db.Float, nullable=False)
    prob_draw = db.Column(db.Float, nullable=False)
    prob_away_win = db.Column(db.Float, nullable=False)
    pred_home_corners = db.Column(db.Float, nullable=False)
    pred_away_corners = db.Column(db.Float, nullable=False)
    pred_home_cards = db.Column(db.Float, nullable=False)
    pred_away_cards = db.Column(db.Float, nullable=False)
    pred_home_sot = db.Column(db.Float, nullable=False)
    pred_away_sot = db.Column(db.Float, nullable=False)
    pred_home_shots = db.Column(db.Float, nullable=False)
    pred_away_shots = db.Column(db.Float, nullable=False)

    match = db.relationship("Match", back_populates="predictions")
    player_predictions = db.relationship("PlayerPrediction", back_populates="prediction", lazy="dynamic")

    def __repr__(self):
        return f"<Prediction {self.id} match={self.match_id}>"


class PlayerPrediction(db.Model):
    __tablename__ = "player_predictions"

    id = db.Column(db.Integer, primary_key=True)
    prediction_id = db.Column(db.Integer, db.ForeignKey("predictions.id"), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    pred_goals = db.Column(db.Float, nullable=False, default=0.0)
    pred_cards = db.Column(db.Float, nullable=False, default=0.0)
    pred_shots_on_target = db.Column(db.Float, nullable=False, default=0.0)
    pred_shots_total = db.Column(db.Float, nullable=False, default=0.0)
    prob_goal = db.Column(db.Float, nullable=False, default=0.0)
    prob_card = db.Column(db.Float, nullable=False, default=0.0)

    prediction = db.relationship("Prediction", back_populates="player_predictions")
    player = db.relationship("Player")

    def __repr__(self):
        return f"<PlayerPrediction p{self.player_id} pred{self.prediction_id}>"
