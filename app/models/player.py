from app.extensions import db


class Player(db.Model):
    __tablename__ = "players"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    position = db.Column(db.String(3), nullable=False)  # POR, DIF, CEN, ATT
    age = db.Column(db.Integer, nullable=False)
    market_value = db.Column(db.Float, nullable=False, default=0.0)
    prev_goals = db.Column(db.Integer, nullable=False, default=0)
    prev_assists = db.Column(db.Integer, nullable=False, default=0)
    prev_cards = db.Column(db.Integer, nullable=False, default=0)
    prev_shots_total = db.Column(db.Integer, nullable=False, default=0)
    prev_shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    prev_corners_won = db.Column(db.Integer, nullable=False, default=0)

    team = db.relationship("Team", back_populates="players")

    def __repr__(self):
        return f"<Player {self.name}>"
