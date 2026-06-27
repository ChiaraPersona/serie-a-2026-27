from app.models import Team, Player, Match


def test_index_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.get("/")
    assert response.status_code == 200
    assert b"Serie A" in response.data


def test_giornata_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.get("/giornata/1")
    assert response.status_code == 200
    assert b"INT" in response.data
    assert b"MIL" in response.data


def test_giornata_simula_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    p1 = Player(name="P1", team_id=t1.id, position="ATT", age=27,
                market_value=50.0, prev_goals=10, prev_assists=5,
                prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
    p2 = Player(name="P2", team_id=t2.id, position="ATT", age=26,
                market_value=50.0, prev_goals=10, prev_assists=5,
                prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
    db.session.add_all([p1, p2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.post("/giornata/1/simula", data={"runs": 100})
    assert response.status_code == 302


def test_squadra_route(client, db):
    team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add(team)
    db.session.commit()

    response = client.get(f"/squadra/{team.id}")
    assert response.status_code == 200
    assert b"Inter" in response.data


def test_calciatore_route(client, db):
    team = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    db.session.add(team)
    db.session.commit()

    player = Player(name="Test Player", team_id=team.id, position="ATT", age=27,
                    market_value=50.0, prev_goals=10, prev_assists=5,
                    prev_cards=3, prev_shots_total=50, prev_shots_on_target=20)
    db.session.add(player)
    db.session.commit()

    response = client.get(f"/calciatore/{player.id}")
    assert response.status_code == 200
    assert b"Test Player" in response.data


def test_partita_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    match = Match(matchday=1, home_team_id=t1.id, away_team_id=t2.id)
    db.session.add(match)
    db.session.commit()

    response = client.get(f"/partita/{match.id}")
    assert response.status_code == 200
    assert b"INT" in response.data


def test_classifica_route(client, db):
    t1 = Team(name="Inter", short_name="INT", stadium="San Siro", city="Milano", ranking=1)
    t2 = Team(name="Milan", short_name="MIL", stadium="San Siro", city="Milano", ranking=3)
    db.session.add_all([t1, t2])
    db.session.commit()

    response = client.get("/classifica")
    assert response.status_code == 200
    assert b"Inter" in response.data
