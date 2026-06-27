from app.extensions import db


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    matchday = db.Column(db.Integer, nullable=False)
    home_team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False)
    date = db.Column(db.Date, nullable=True)
    played = db.Column(db.Boolean, nullable=False, default=False)

    home_team = db.relationship("Team", foreign_keys=[home_team_id])
    away_team = db.relationship("Team", foreign_keys=[away_team_id])
    result = db.relationship("MatchResult", back_populates="match", uselist=False)
    predictions = db.relationship("Prediction", back_populates="match", lazy="dynamic")

    def __repr__(self):
        return f"<Match {self.id}: {self.home_team_id} vs {self.away_team_id}>"


class MatchResult(db.Model):
    __tablename__ = "match_results"

    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), primary_key=True)
    home_score = db.Column(db.Integer, nullable=False, default=0)
    away_score = db.Column(db.Integer, nullable=False, default=0)
    home_corners = db.Column(db.Integer, nullable=False, default=0)
    away_corners = db.Column(db.Integer, nullable=False, default=0)
    home_cards = db.Column(db.Integer, nullable=False, default=0)
    away_cards = db.Column(db.Integer, nullable=False, default=0)
    home_shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    away_shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    home_shots_total = db.Column(db.Integer, nullable=False, default=0)
    away_shots_total = db.Column(db.Integer, nullable=False, default=0)

    match = db.relationship("Match", back_populates="result")

    def __repr__(self):
        return f"<MatchResult {self.match_id}: {self.home_score}-{self.away_score}>"


class PlayerMatchStats(db.Model):
    __tablename__ = "player_match_stats"

    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    goals = db.Column(db.Integer, nullable=False, default=0)
    assists = db.Column(db.Integer, nullable=False, default=0)
    cards = db.Column(db.Integer, nullable=False, default=0)
    shots_on_target = db.Column(db.Integer, nullable=False, default=0)
    shots_total = db.Column(db.Integer, nullable=False, default=0)
    corners_won = db.Column(db.Integer, nullable=False, default=0)

    player = db.relationship("Player")
    match = db.relationship("Match")

    def __repr__(self):
        return f"<PlayerMatchStats p{self.player_id} m{self.match_id}>"
