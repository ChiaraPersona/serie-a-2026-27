import os
import sys

basedir = os.path.abspath(os.path.dirname(__file__))

_db_path = os.path.join(basedir, "..", "instance", "serie_a.db")
if "RENDER" in os.environ or "--render" in sys.argv:
    _db_path = "/tmp/serie_a.db"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{_db_path}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MONTE_CARLO_RUNS = int(os.environ.get("MONTE_CARLO_RUNS", 10000))
    MONTE_CARLO_SEED = int(os.environ.get("MONTE_CARLO_SEED", 42))
