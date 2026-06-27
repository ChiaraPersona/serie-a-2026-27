from app.extensions import db


class Referee(db.Model):
    __tablename__ = "referees"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(100), nullable=False)
    debut = db.Column(db.String(20), nullable=True)
    matches_officiated = db.Column(db.Integer, nullable=False, default=0)
    yellow_cards = db.Column(db.Integer, nullable=False, default=0)
    second_yellows = db.Column(db.Integer, nullable=False, default=0)
    red_cards = db.Column(db.Integer, nullable=False, default=0)
    penalties = db.Column(db.Integer, nullable=False, default=0)
    avg_cards_per_match = db.Column(db.Float, nullable=False, default=0.0)

    def __repr__(self):
        return f"<Referee {self.name}>"
