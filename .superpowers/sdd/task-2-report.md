# Task 2 Report: Database Models

## Status: DONE

## Commits Created
- `afa6513` - feat: add all 8 database models with tests

## Test Summary
6 passed in 0.21s — all model creation tests pass (Team, Player, Match, MatchResult, Prediction, HeadToHead).

## Files Created
- `app/extensions.py` — SQLAlchemy db instance
- `app/models/__init__.py` — model re-exports
- `app/models/team.py` — Team model
- `app/models/player.py` — Player model
- `app/models/match.py` — Match, MatchResult, PlayerMatchStats models
- `app/models/prediction.py` — Prediction, PlayerPrediction models
- `app/models/head_to_head.py` — HeadToHead model
- `tests/test_models.py` — 6 model creation tests

## Files Modified
- `app/__init__.py` — wrapped routes/CLI imports in try/except ImportError so the app factory works before those modules exist (future tasks)

## Concerns
- The commit accidentally included `__pycache__` files. A `.gitignore` should be added in a future task to prevent this.
- The `app/__init__.py` try/except workaround for missing routes/CLI modules is temporary — it should be removed once those modules are created in later tasks.

---

## Review Fixes (2026-06-27)

### Status: DONE

### Commit Created
- `cf89b6b` - fix: remove pycache, add gitignore, fix app factory imports

### Changes Made
1. **Removed `__pycache__` from git tracking** — Deleted all `.pyc` files from `app/models/__pycache__/` and removed the directories from disk. The `.gitignore` now prevents them from being re-added.
2. **Created `.gitignore`** — Added patterns: `__pycache__/`, `*.pyc`, `*.pyo`, `instance/`, `.env`.
3. **Fixed `app/__init__.py`** — Replaced the bare `try/except ImportError: pass` blocks with commented-out imports and a note: `# Will be uncommented when modules are created in later tasks`.

### Test Results
```
6 passed in 0.17s — all model creation tests pass
```
