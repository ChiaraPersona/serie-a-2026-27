### Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`, `run.py`, `app/__init__.py`, `app/config.py`, `tests/conftest.py`

**Interfaces:**
- Produces: `create_app()` factory in `app/__init__.py`, `Config` class in `app/config.py`, `app` fixture in `tests/conftest.py`

- [ ] **Step 1: Write `requirements.txt`**

```
Flask==3.1.0
Flask-SQLAlchemy==3.1.1
SQLAlchemy==2.0.36
Jinja2==3.1.4
numpy==2.2.1
beautifulsoup4==4.12.3
requests==2.32.3
pytest==8.3.4
pytest-flask==1.3.0
```

- [ ] **Step 2: Write `app/config.py`**

```python
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
```

- [ ] **Step 3: Write `app/__init__.py`**

```python
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
```

- [ ] **Step 4: Write `run.py`**

```python
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
```

- [ ] **Step 5: Write `tests/conftest.py`**

```python
import pytest
from app import create_app
from app.config import Config
from app.extensions import db as _db


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    return _db
```

- [ ] **Step 6: Verify app starts**

```bash
python -c "from app import create_app; app = create_app(); print('OK')"
```
Expected: `OK`

- [ ] **Step 7: Run tests**

```bash
pytest tests/ -v
```
Expected: no tests collected (or 0 passed)

- [ ] **Step 8: Commit**

```bash
git add requirements.txt run.py app/__init__.py app/config.py tests/conftest.py
git commit -m "feat: project scaffolding with Flask app factory and test config"
```
