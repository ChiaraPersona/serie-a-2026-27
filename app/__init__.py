from flask import Flask
from app.config import Config
from app.extensions import db


def _seed_if_empty():
    from app.models import Team
    if Team.query.first() is None:
        import json
        import os
        from datetime import date
        from app.models import Player, Match, HeadToHead, Referee

        data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "seed")

        with open(os.path.join(data_dir, "teams.json"), encoding="utf-8") as f:
            for item in json.load(f):
                db.session.add(Team(**item))

        with open(os.path.join(data_dir, "players.json"), encoding="utf-8") as f:
            teams = {t.short_name: t for t in Team.query.all()}
            for item in json.load(f):
                team = teams.get(item.pop("team_short"))
                if team:
                    db.session.add(Player(team_id=team.id, **item))

        with open(os.path.join(data_dir, "matches.json"), encoding="utf-8") as f:
            teams = {t.short_name: t for t in Team.query.all()}
            for item in json.load(f):
                home = teams.get(item.pop("home_short"))
                away = teams.get(item.pop("away_short"))
                if home and away:
                    d = item.get("date")
                    db.session.add(Match(home_team_id=home.id, away_team_id=away.id, matchday=item["matchday"], date=date.fromisoformat(d) if d else None))

        with open(os.path.join(data_dir, "h2h.json"), encoding="utf-8") as f:
            teams = {t.short_name: t for t in Team.query.all()}
            for item in json.load(f):
                t1 = teams.get(item.pop("team1_short"))
                t2 = teams.get(item.pop("team2_short"))
                if t1 and t2:
                    db.session.add(HeadToHead(team1_id=t1.id, team2_id=t2.id, **item))

        with open(os.path.join(data_dir, "referees.json"), encoding="utf-8") as f:
            for item in json.load(f):
                total_cards = item["yellow_cards"] + item["second_yellows"] + item["red_cards"]
                avg = total_cards / item["matches_officiated"] if item["matches_officiated"] > 0 else 0.0
                db.session.add(Referee(
                    name=item["name"], section=item["section"],
                    debut=item.get("debut"), matches_officiated=item["matches_officiated"],
                    yellow_cards=item["yellow_cards"], second_yellows=item["second_yellows"],
                    red_cards=item["red_cards"], penalties=item["penalties"],
                    avg_cards_per_match=round(avg, 2),
                ))

        db.session.commit()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)

    with app.app_context():
        from app.models import team, player, match, prediction, head_to_head  # noqa: F401
        db.create_all()
        if not app.config.get("TESTING") and ":memory:" not in app.config["SQLALCHEMY_DATABASE_URI"]:
            _seed_if_empty()

    from app.routes import main, predictions, teams, players, api
    app.register_blueprint(main.bp)
    app.register_blueprint(predictions.bp)
    app.register_blueprint(teams.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(api.bp)

    from app.cli import seed, predict, scrape
    app.cli.add_command(seed.seed_command)
    app.cli.add_command(predict.predict_command)
    app.cli.add_command(scrape.scrape_command)

    return app
