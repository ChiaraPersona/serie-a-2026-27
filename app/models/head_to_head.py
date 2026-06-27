from app.extensions import db


class HeadToHead(db.Model):
    __tablename__ = "head_to_head"

    id = db.Column(db.Integer, primary_key=True)
    team1_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    team2_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    matches_played = db.Column(db.Integer, nullable=False, default=0)
    team1_wins = db.Column(db.Integer, nullable=False, default=0)
    team2_wins = db.Column(db.Integer, nullable=False, default=0)
    draws = db.Column(db.Integer, nullable=False, default=0)
    avg_goals_team1 = db.Column(db.Float, nullable=False, default=0.0)
    avg_goals_team2 = db.Column(db.Float, nullable=False, default=0.0)

    team1 = db.relationship("Team", foreign_keys=[team1_id])
    team2 = db.relationship("Team", foreign_keys=[team2_id])

    def __repr__(self):
        return f"<HeadToHead {self.team1_id} vs {self.team2_id}>"
