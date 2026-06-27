import json
import os
from datetime import date

import click
from flask import current_app
from app.extensions import db
from app.models import Team, Player, Match, HeadToHead

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed")


@click.group(name="seed")
def seed_command():
    """Populate the database with seed data."""
    pass


@seed_command.command()
def teams():
    """Seed teams from data/seed/teams.json."""
    path = os.path.join(DATA_DIR, "teams.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    for item in data:
        team = Team(
            name=item["name"], short_name=item["short_name"],
            stadium=item["stadium"], city=item["city"],
            ranking=item["ranking"], mood=item["mood"],
            season_objective=item["season_objective"],
            home_advantage=item["home_advantage"],
        )
        db.session.add(team)
    db.session.commit()
    click.echo(f"Seeded {len(data)} teams.")


@seed_command.command()
def players():
    """Seed players from data/seed/players.json."""
    path = os.path.join(DATA_DIR, "players.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    teams = {t.short_name: t for t in Team.query.all()}
    count = 0
    for item in data:
        team = teams.get(item["team_short"])
        if team is None:
            click.echo(f"Team {item['team_short']} not found, skipping {item['name']}")
            continue
        player = Player(
            name=item["name"], team_id=team.id, position=item["position"],
            age=item["age"], market_value=item["market_value"],
            prev_goals=item["prev_goals"], prev_assists=item["prev_assists"],
            prev_cards=item["prev_cards"], prev_shots_total=item["prev_shots_total"],
            prev_shots_on_target=item["prev_shots_on_target"],
            prev_corners_won=item["prev_corners_won"],
        )
        db.session.add(player)
        count += 1
    db.session.commit()
    click.echo(f"Seeded {count} players.")


@seed_command.command()
def matches():
    """Seed matches from data/seed/matches.json."""
    path = os.path.join(DATA_DIR, "matches.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    teams = {t.short_name: t for t in Team.query.all()}
    count = 0
    for item in data:
        home = teams.get(item["home_short"])
        away = teams.get(item["away_short"])
        if home is None or away is None:
            click.echo(f"Skipping match: {item['home_short']} vs {item['away_short']}")
            continue
        match_date = date.fromisoformat(item["date"]) if item.get("date") else None
        match = Match(
            matchday=item["matchday"], home_team_id=home.id,
            away_team_id=away.id, date=match_date,
        )
        db.session.add(match)
        count += 1
    db.session.commit()
    click.echo(f"Seeded {count} matches.")


@seed_command.command()
def head_to_head():
    """Seed head-to-head records from data/seed/h2h.json."""
    path = os.path.join(DATA_DIR, "h2h.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    teams = {t.short_name: t for t in Team.query.all()}
    count = 0
    for item in data:
        t1 = teams.get(item["team1_short"])
        t2 = teams.get(item["team2_short"])
        if t1 is None or t2 is None:
            continue
        h2h = HeadToHead(
            team1_id=t1.id, team2_id=t2.id,
            matches_played=item["matches_played"],
            team1_wins=item["team1_wins"], team2_wins=item["team2_wins"],
            draws=item["draws"], avg_goals_team1=item["avg_goals_team1"],
            avg_goals_team2=item["avg_goals_team2"],
        )
        db.session.add(h2h)
        count += 1
    db.session.commit()
    click.echo(f"Seeded {count} head-to-head records.")


@seed_command.command()
def all():
    """Run all seed commands."""
    ctx = click.get_current_context()
    ctx.invoke(teams)
    ctx.invoke(players)
    ctx.invoke(matches)
    ctx.invoke(head_to_head)
    click.echo("All seed data loaded.")
