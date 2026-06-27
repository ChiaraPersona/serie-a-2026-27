import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, '..', 'instance', 'serie_a.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MONTE_CARLO_RUNS = int(os.environ.get("MONTE_CARLO_RUNS", 10000))
    MONTE_CARLO_SEED = int(os.environ.get("MONTE_CARLO_SEED", 42))
