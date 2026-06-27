from app.extensions import db


class Team(db.Model):
    __tablename__ = "teams"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    short_name = db.Column(db.String(10), nullable=False, unique=True)
    stadium = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    ranking = db.Column(db.Integer, nullable=False, default=20)
    mood = db.Column(db.Float, nullable=False, default=0.0)
    season_objective = db.Column(db.String(50), nullable=False, default="mid_table")
    home_advantage = db.Column(db.Float, nullable=False, default=1.0)

    players = db.relationship("Player", back_populates="team", lazy="dynamic")

    def __repr__(self):
        return f"<Team {self.short_name}>"
