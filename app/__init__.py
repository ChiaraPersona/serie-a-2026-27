from flask import Flask
from app.config import Config
from app.extensions import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)

    with app.app_context():
        from app.models import team, player, match, prediction, head_to_head  # noqa: F401
        db.create_all()

    from app.routes import main, predictions, teams, players, api
    app.register_blueprint(main.bp)
    app.register_blueprint(predictions.bp)
    app.register_blueprint(teams.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(api.bp)

    from app.cli import seed, scrape, predict
    app.cli.add_command(seed.seed_command)
    app.cli.add_command(scrape.scrape_command)
    app.cli.add_command(predict.predict_command)

    return app
