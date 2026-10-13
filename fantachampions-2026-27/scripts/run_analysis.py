from __future__ import annotations

import hashlib
import json
import math
import random
import re
import statistics
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import pdfplumber


REPO = Path(__file__).resolve().parents[2]
PROJECT = REPO / "fantachampions-2026-27"
DATA_OUT = PROJECT / "data"
OUTPUT = PROJECT / "output"
RULES = json.loads((PROJECT / "config" / "rules.json").read_text(encoding="utf-8"))

LISTONE_PDF = Path(r"C:\Users\utente\Desktop\champions-26-27-listoneiniziale.pdf")
REGULATION_PDF = Path(r"C:\Users\utente\Desktop\regolamentofantachampions2026-2027.pdf")

CALENDAR_PATH = REPO / "data/normalized/champions-league-2026-27.json"
PREDICTIONS_PATH = REPO / "data/normalized/champions-1x2-2026-27.json"
MD2_PATH = REPO / "data/normalized/champions-pilot-predictions-md02-2026-27.json"
INTEGRATION_PATH = REPO / "data/normalized/champions-md02-integration-2026-27.json"
CURRENT_STATS_PATH = REPO / "data/normalized/champions-player-stats-2026-27.json"
HISTORIC_STATS_PATH = REPO / "data/normalized/champions-player-stats-2025-26.json"

SEED = 20261013
ADVANCEMENT_SIMULATIONS = 30000
ROSTER_SIMULATIONS = 12000


TEAM_ALIASES = {
    "Paris Saint-Germain": "Paris Saint-Germain",
    "Bayern Monaco": "Bayern München",
    "Borussia Dortmund": "Borussia Dortmund",
    "Lipsia": "Leipzig",
    "Stoccarda": "Stuttgart",
    "Arsenal": "Arsenal",
    "Aston Villa": "Aston Villa",
    "Liverpool": "Liverpool",
    "Manchester City": "Manchester City",
    "Manchester United": "Manchester United",
    "Atletico Madrid": "Atlético de Madrid",
    "Barcellona": "Barcelona",
    "Betis": "Real Betis",
    "Real Madrid": "Real Madrid",
    "Villarreal": "Villarreal",
    "Como": "Como",
    "Inter": "Inter",
    "Napoli": "Napoli",
    "Roma": "Roma",
    "Lilla": "Lille",
    "Lens": "Lens",
    "Psv Eindhoven": "PSV Eindhoven",
    "Feyenoord": "Feyenoord",
    "Porto": "Porto",
    "Sporting CP": "Sporting CP",
    "Galatasaray": "Galatasaray",
    "Fenerbahce": "Fenerbahçe",
    "Bruges": "Club Brugge",
    "Shakhtar Donetsk": "Shakhtar Donetsk",
    "Slavia Praga": "Slavia Praha",
    "Bodo Glimt": "Bodø/Glimt",
    "Aek Atene": "AEK Athens",
    "Viking": "Viking",
    "Lask": "LASK",
    "Slovan Bratislava": "Slovan Bratislava",
    "Sabah FK": "Sabah",
}


PENALTY_TAKERS = {
    "AEK Athens": ["marin", "jovic", "majer"],
    "Arsenal": ["saka", "gyokeres", "havertz"],
    "Aston Villa": ["buendia", "jackson", "mcginn"],
    "Atlético de Madrid": ["grimaldo", "alvarez", "lookman"],
    "Barcelona": ["raphinha", "yamal", "olmo"],
    "Bayern München": ["kane", "luis diaz", "kimmich"],
    "Borussia Dortmund": ["guirassy", "bensebaini", "nmecha"],
    "Club Brugge": ["vanaken", "tresoldi", "forbs"],
    "Como": ["da cunha", "paz", "douvikas"],
    "Fenerbahçe": ["greenwood", "muriqi", "lukaku"],
    "Feyenoord": ["steijn", "moussa", "moder"],
    "Galatasaray": ["osimhen", "yilmaz", "leao"],
    "Inter": ["calhanoglu", "lautaro martinez", "zielinski"],
    "LASK": ["adeniran", "usor", "lang"],
    "Lens": ["thauvin", "ivanovic", "edouard"],
    "Lille": ["giroud", "ueda", "haraldsson"],
    "Leipzig": ["nkunku", "raum", "guiu"],
    "Liverpool": ["szoboszlai", "isak", "wirtz"],
    "Manchester City": ["haaland", "fernandez", "cherki"],
    "Manchester United": ["bruno fernandes", "mbeumo", "tielemans"],
    "Napoli": ["de bruyne", "hojlund", "politano"],
    "Paris Saint-Germain": ["dembele", "vitinha", "kvaratskhelia"],
    "Porto": ["veiga", "andre silva", "gimenez"],
    "PSV Eindhoven": ["perisic", "pepi", "van bommel"],
    "Real Betis": ["isco", "hernandez", "ezzalzouli"],
    "Real Madrid": ["mbappe", "vinicius", "bellingham"],
    "Roma": ["malen", "dybala", "pellegrini"],
    "Sabah": ["mickels", "isaev", "puchacz"],
    "Shakhtar Donetsk": ["pedrinho", "nazaryna", "traore"],
    "Slavia Praha": ["chory", "chytil", "sadilek"],
    "Slovan Bratislava": ["barseghyan", "sporar", "cerepkai"],
    "Sporting CP": ["zalazar", "luis suarez", "araujo"],
    "Stuttgart": ["mittelstadt", "undav", "demirovic"],
    "Viking": ["tripic", "botheim", "christiansen"],
}


ROLE_ORDER = ["P", "D", "E", "C", "F", "A"]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.lower().replace("ø", "o").replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def extract_listone() -> list[dict]:
    rows = []
    with pdfplumber.open(LISTONE_PDF) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            lines: dict[float, list[dict]] = defaultdict(list)
            for word in page.extract_words():
                lines[round(float(word["top"]), 1)].append(word)
            for words in lines.values():
                columns = ["", "", "", "", ""]
                for word in sorted(words, key=lambda item: item["x0"]):
                    x = float(word["x0"])
                    column = 0 if x < 160 else 1 if x < 285 else 2 if x < 380 else 3 if x < 430 else 4
                    columns[column] = f"{columns[column]} {word['text']}".strip()
                team, name, birth_date, role, quote = columns
                if birth_date.count("/") != 2 or role not in ROLE_ORDER or not quote.isdigit():
                    continue
                rows.append(
                    {
                        "id": f"{norm(team).replace(' ', '-')}-{norm(name).replace(' ', '-')}-{birth_date[-4:]}",
                        "team": team,
                        "canonicalTeam": TEAM_ALIASES[team],
                        "name": name,
                        "birthDate": birth_date,
                        "role": role,
                        "initialQuote": int(quote),
                        "sourcePage": page_number,
                    }
                )
    return rows


def player_match_score(display_name: str, canonical_name: str) -> float:
    display = norm(display_name)
    canonical = norm(canonical_name)
    if display == canonical:
        return 1.0
    if display in canonical or canonical in display:
        return 0.96
    d_tokens = display.split()
    c_tokens = canonical.split()
    long_tokens = [token for token in d_tokens if len(token) > 2]
    matched = sum(any(token == item or item.startswith(token) or token.startswith(item) for item in c_tokens) for token in long_tokens)
    token_score = matched / max(1, len(long_tokens))
    initials = [token for token in d_tokens if len(token) <= 2]
    initial_score = 0.0
    if initials and any(any(item.startswith(token) for item in c_tokens) for token in initials):
        initial_score = 0.08
    sequence = SequenceMatcher(None, display, canonical).ratio()
    reverse = SequenceMatcher(None, " ".join(reversed(d_tokens)), canonical).ratio()
    return min(0.99, max(sequence, reverse, 0.70 * token_score + initial_score + 0.18 * sequence))


def build_player_index(current_stats: dict, historic_stats: dict) -> tuple[dict, dict]:
    current_by_team = {team["team"]: team for team in current_stats["teams"]}
    historic_by_team = {team["team"]: team for team in historic_stats["teams"]}
    return current_by_team, historic_by_team


def match_listone_players(listone: list[dict], current_by_team: dict, historic_by_team: dict) -> None:
    for row in listone:
        team = row["canonicalTeam"]
        candidates = {}
        for source in (current_by_team.get(team, {}), historic_by_team.get(team, {})):
            for player in source.get("players", []):
                candidates[player["id"]] = player
        scored = sorted(
            ((player_match_score(row["name"], player["name"]), player) for player in candidates.values()),
            key=lambda item: item[0],
            reverse=True,
        )
        best_score, best = scored[0] if scored else (0.0, None)
        second_score = scored[1][0] if len(scored) > 1 else 0.0
        accepted = best is not None and best_score >= 0.62 and (best_score - second_score >= 0.025 or best_score >= 0.90)
        row["canonicalPlayerId"] = best["id"] if accepted else None
        row["canonicalName"] = best["name"] if accepted else None
        row["identityScore"] = round(best_score, 4)
        row["identityStatus"] = "matched" if accepted else "unresolved"


def team_strengths(predictions: dict) -> dict[str, float]:
    samples: dict[str, list[float]] = defaultdict(list)
    for fixture in predictions["fixtures"]:
        samples[fixture["homeTeam"]].append(float(fixture["ratings"]["home"]))
        samples[fixture["awayTeam"]].append(float(fixture["ratings"]["away"]))
    return {team: statistics.fmean(values) for team, values in samples.items()}


def pair_advance_probability(team_a: str, team_b: str, strengths: dict[str, float]) -> float:
    delta = strengths[team_a] - strengths[team_b]
    return 1.0 / (1.0 + 10.0 ** (-delta / 330.0))


def simulate_advancement(calendar: dict, predictions: dict) -> dict[str, dict]:
    rng = np.random.default_rng(SEED)
    teams = list(calendar["teams"])
    team_index = {team: index for index, team in enumerate(teams)}
    strengths = team_strengths(predictions)
    probabilities = {item["fixtureId"]: item["probabilities"] for item in predictions["fixtures"]}
    base_points = np.zeros(len(teams), dtype=np.int16)
    finished = []
    remaining = []
    for fixture in calendar["fixtures"]:
        if fixture.get("status") == "finished" and fixture.get("score"):
            finished.append(fixture)
            home = team_index[fixture["homeTeam"]]
            away = team_index[fixture["awayTeam"]]
            hs, as_ = fixture["score"]["home"], fixture["score"]["away"]
            if hs > as_:
                base_points[home] += 3
            elif hs < as_:
                base_points[away] += 3
            else:
                base_points[home] += 1
                base_points[away] += 1
        elif fixture["matchday"] >= 2:
            remaining.append(fixture)

    counters = {team: Counter() for team in teams}
    rank_sums = Counter()
    future_match_sums = Counter()
    for _ in range(ADVANCEMENT_SIMULATIONS):
        points = base_points.copy()
        for fixture in remaining:
            probs = probabilities[fixture["id"]]
            roll = rng.random()
            home = team_index[fixture["homeTeam"]]
            away = team_index[fixture["awayTeam"]]
            if roll < probs["home"]:
                points[home] += 3
            elif roll < probs["home"] + probs["draw"]:
                points[home] += 1
                points[away] += 1
            else:
                points[away] += 3

        tie_signal = np.array([strengths[team] for team in teams]) / 10000.0 + rng.normal(0, 0.01, len(teams))
        order = np.lexsort((-tie_signal, -points))
        ranking = [teams[index] for index in order]
        for rank, team in enumerate(ranking, 1):
            rank_sums[team] += rank
        top8 = ranking[:8]
        playoff_seeded = ranking[8:16]
        playoff_unseeded = ranking[16:24]
        for team in top8:
            counters[team]["directR16"] += 1
            counters[team]["reachR16"] += 1
        for team in ranking[8:24]:
            counters[team]["reachPlayoff"] += 1
            future_match_sums[team] += 2

        playoff_winners = []
        for team_a, team_b in zip(playoff_seeded, reversed(playoff_unseeded)):
            winner = team_a if rng.random() < pair_advance_probability(team_a, team_b, strengths) else team_b
            playoff_winners.append(winner)
            counters[winner]["reachR16"] += 1

        r16_seeded = sorted(top8, key=lambda team: ranking.index(team))
        r16_unseeded = sorted(playoff_winners, key=lambda team: ranking.index(team), reverse=True)
        quarterfinalists = []
        for team_a, team_b in zip(r16_seeded, r16_unseeded):
            future_match_sums[team_a] += 2
            future_match_sums[team_b] += 2
            winner = team_a if rng.random() < pair_advance_probability(team_a, team_b, strengths) else team_b
            quarterfinalists.append(winner)
            counters[winner]["reachQF"] += 1

        rng.shuffle(quarterfinalists)
        semifinalists = []
        for index in range(0, 8, 2):
            team_a, team_b = quarterfinalists[index : index + 2]
            future_match_sums[team_a] += 2
            future_match_sums[team_b] += 2
            winner = team_a if rng.random() < pair_advance_probability(team_a, team_b, strengths) else team_b
            semifinalists.append(winner)
            counters[winner]["reachSF"] += 1

        rng.shuffle(semifinalists)
        finalists = []
        for index in range(0, 4, 2):
            team_a, team_b = semifinalists[index : index + 2]
            future_match_sums[team_a] += 2
            future_match_sums[team_b] += 2
            winner = team_a if rng.random() < pair_advance_probability(team_a, team_b, strengths) else team_b
            finalists.append(winner)
            counters[winner]["reachFinal"] += 1

        team_a, team_b = finalists
        future_match_sums[team_a] += 1
        future_match_sums[team_b] += 1
        champion = team_a if rng.random() < pair_advance_probability(team_a, team_b, strengths) else team_b
        counters[champion]["champion"] += 1

    output = {}
    n = ADVANCEMENT_SIMULATIONS
    for team in teams:
        values = counters[team]
        output[team] = {
            "team": team,
            "strength": round(strengths[team], 2),
            "expectedLeagueRank": round(rank_sums[team] / n, 2),
            "directR16Pct": round(100 * values["directR16"] / n, 2),
            "playoffPct": round(100 * values["reachPlayoff"] / n, 2),
            "reachR16Pct": round(100 * values["reachR16"] / n, 2),
            "reachQFPct": round(100 * values["reachQF"] / n, 2),
            "reachSFPct": round(100 * values["reachSF"] / n, 2),
            "reachFinalPct": round(100 * values["reachFinal"] / n, 2),
            "championPct": round(100 * values["champion"] / n, 2),
            "expectedPlayedMatchesAfterMD1": round(7 + future_match_sums[team] / n, 3),
            "simulationStatus": "MODELLED_NOT_OBSERVED",
        }
    return output


def totals(player: dict | None, season_key: str) -> dict:
    if not player:
        return {}
    season = player.get(season_key) or {}
    return season.get("totals") or {}


def safe_number(value, default=0.0) -> float:
    return default if value is None else float(value)


def blended_rate(current: dict, historic: dict, field: str) -> tuple[float, float]:
    current_minutes = safe_number(current.get("minutes"))
    historic_minutes = safe_number(historic.get("minutes"))
    weight = 0.45
    minutes = current_minutes + weight * historic_minutes
    events = safe_number(current.get(field)) + weight * safe_number(historic.get(field))
    return (90.0 * events / minutes if minutes > 0 else 0.0, minutes)


def build_md2_context(integration: dict, md2_predictions: dict) -> tuple[dict, dict, dict]:
    starters = {}
    unavailable = set()
    fixtures = {}
    for fixture in integration["fixtures"]:
        fixtures[fixture["homeTeam"]] = fixture
        fixtures[fixture["awayTeam"]] = fixture
        for side in ("home", "away"):
            for player in fixture["lineups"][side]["players"]:
                if player.get("canonicalPlayerId"):
                    starters[(player["team"], player["canonicalPlayerId"])] = player
        for entry in fixture.get("availability", []):
            if entry.get("status") == "unavailable" and entry.get("canonicalPlayerId"):
                unavailable.add((entry["team"], entry["canonicalPlayerId"]))
    team_forecasts = {}
    for fixture in md2_predictions["fixtures"]:
        for side, opponent_side in (("home", "away"), ("away", "home")):
            team = fixture[f"{side}Team"]
            xg = fixture["expectedGoals"][side]
            opp_xg = fixture["expectedGoals"][opponent_side]
            result_score = fixture["probabilities"][side] / 100 + 0.5 * fixture["probabilities"]["draw"] / 100
            team_forecasts[team] = {
                "fixtureId": fixture["fixtureId"],
                "opponent": fixture[f"{opponent_side}Team"],
                "expectedGoals": xg,
                "expectedGoalsAgainst": opp_xg,
                "resultScore": result_score,
                "cleanSheetProbability": math.exp(-opp_xg),
            }
    return starters, unavailable, team_forecasts


def penalty_rank(team: str, name: str) -> int | None:
    normalized = norm(name)
    for index, token in enumerate(PENALTY_TAKERS.get(team, []), 1):
        if norm(token) in normalized or normalized in norm(token):
            return index
    return None


def build_player_projections(
    listone: list[dict],
    current_by_team: dict,
    historic_by_team: dict,
    advancement: dict,
    starters: dict,
    unavailable: set,
    md2_team: dict,
) -> list[dict]:
    current_players = {team: {p["id"]: p for p in data.get("players", [])} for team, data in current_by_team.items()}
    historic_players = {team: {p["id"]: p for p in data.get("players", [])} for team, data in historic_by_team.items()}
    team_matches = {team: safe_number(data.get("coverage", {}).get("matches"), 0) for team, data in current_by_team.items()}
    rate_fields = ("goals", "assists", "shots", "shotsOnTarget", "yellowCards", "redCards", "goalsConceded", "saves", "penaltiesSaved")
    stat_cache = {}
    role_events = defaultdict(lambda: defaultdict(float))
    role_minutes = defaultdict(lambda: defaultdict(float))
    role_rate_samples = defaultdict(lambda: defaultdict(list))
    for row in listone:
        team = row["canonicalTeam"]
        player_id = row["canonicalPlayerId"]
        current_player = current_players.get(team, {}).get(player_id)
        historic_player = historic_players.get(team, {}).get(player_id)
        current = totals(current_player, "currentSeason")
        historic = totals(historic_player, "previousSeason")
        raw_rates = {}
        effective_minutes = safe_number(current.get("minutes")) + 0.45 * safe_number(historic.get("minutes"))
        for field in rate_fields:
            rate, _ = blended_rate(current, historic, field)
            raw_rates[field] = rate
            events = safe_number(current.get(field)) + 0.45 * safe_number(historic.get(field))
            role_events[row["role"]][field] += events
            role_minutes[row["role"]][field] += effective_minutes
            if effective_minutes >= 450:
                role_rate_samples[row["role"]][field].append(rate)
        stat_cache[row["id"]] = (current, historic, raw_rates, effective_minutes)
    role_priors = {
        role: {
            field: 90.0 * role_events[role][field] / role_minutes[role][field] if role_minutes[role][field] else 0.0
            for field in rate_fields
        }
        for role in ROLE_ORDER
    }
    role_caps = {
        role: {
            field: float(np.quantile(role_rate_samples[role][field], 0.95)) if role_rate_samples[role][field] else max(0.01, role_priors[role][field] * 2)
            for field in rate_fields
        }
        for role in ROLE_ORDER
    }
    projections = []
    for row in listone:
        team = row["canonicalTeam"]
        player_id = row["canonicalPlayerId"]
        current, historic, raw_rates, effective_minutes = stat_cache[row["id"]]
        prior_exposure = 900.0 if row["role"] != "P" else 1260.0
        rates = {
            field: min(
                role_caps[row["role"]][field],
                (raw_rates[field] * effective_minutes + role_priors[row["role"]][field] * prior_exposure)
                / max(1.0, effective_minutes + prior_exposure),
            )
            for field in rate_fields
        }

        matches = max(1.0, team_matches.get(team, 0.0))
        current_appearances = safe_number(current.get("appearances"))
        current_starts = safe_number(current.get("starts"))
        historic_appearances = safe_number(historic.get("appearances"))
        historic_starts = safe_number(historic.get("starts"))
        current_start_rate = (current_starts + 1.0) / (matches + 2.0)
        historic_start_rate = (historic_starts + 1.0) / (historic_appearances + 2.0) if historic_appearances else 0.35
        current_appearance_rate = min(1.0, (current_appearances + 1.0) / (matches + 1.5))
        historic_appearance_rate = (historic_appearances + 1.0) / (historic_appearances + 2.0) if historic_appearances else 0.45
        general_vote_probability = min(0.98, max(0.04, 0.62 * current_appearance_rate + 0.38 * historic_appearance_rate))
        general_start_probability = min(0.96, max(0.02, 0.68 * current_start_rate + 0.32 * historic_start_rate))

        starter_info = starters.get((team, player_id))
        is_unavailable = (team, player_id) in unavailable
        if is_unavailable:
            md2_vote_probability = 0.015
            expected_minutes = 0.0
            md2_status = "unavailable"
        elif starter_info:
            md2_vote_probability = 0.965 if row["role"] == "P" else 0.925
            expected_minutes = safe_number(starter_info.get("expectedMinutes"), 84.6)
            md2_status = "probable-starter"
        else:
            md2_vote_probability = min(0.78, max(0.04, general_vote_probability * (0.43 + 0.18 * general_start_probability)))
            minutes_per_appearance = safe_number(current.get("minutesPerAppearance"), safe_number(historic.get("minutesPerAppearance"), 35.0))
            expected_minutes = md2_vote_probability * min(70.0, minutes_per_appearance)
            md2_status = "not-in-probable-xi"

        forecast = md2_team[team]
        team_factor = min(1.45, max(0.65, forecast["expectedGoals"] / 1.45))
        projected_goal = rates["goals"] * expected_minutes / 90.0 * team_factor
        projected_assist = rates["assists"] * expected_minutes / 90.0 * math.sqrt(team_factor)
        projected_yellow = rates["yellowCards"] * expected_minutes / 90.0
        projected_red = rates["redCards"] * expected_minutes / 90.0
        reliability = min(1.0, effective_minutes / 1800.0)
        base_vote = 5.72
        base_vote += 0.34 * (forecast["resultScore"] - 0.5)
        base_vote += 0.10 * min(1.5, rates["shotsOnTarget"])
        base_vote += 0.07 * min(1.2, rates["assists"])
        base_vote -= 0.08 * min(0.8, rates["yellowCards"])
        base_vote += 0.08 * reliability
        base_vote = min(6.55, max(5.45, base_vote))

        if row["role"] == "P":
            projected_conceded = forecast["expectedGoalsAgainst"]
            projected_clean = forecast["cleanSheetProbability"]
            projected_penalty_saves = rates["penaltiesSaved"] / 90.0 * expected_minutes
            conditional_points = base_vote + projected_clean + 3 * projected_penalty_saves - projected_conceded
        else:
            projected_conceded = None
            projected_clean = None
            projected_penalty_saves = None
            conditional_points = base_vote + 3 * projected_goal + projected_assist - 0.5 * projected_yellow - projected_red
        conditional_points = max(2.5, conditional_points)
        md2_expected = md2_vote_probability * conditional_points

        adv = advancement[team]
        p_direct = adv["directR16Pct"] / 100.0
        p_playoff = adv["playoffPct"] / 100.0
        p_r16 = adv["reachR16Pct"] / 100.0
        p_qf = adv["reachQFPct"] / 100.0
        p_sf = adv["reachSFPct"] / 100.0
        p_final = adv["reachFinalPct"] / 100.0
        general_conditional = conditional_points / max(0.35, team_factor ** 0.35)
        league_points = 7 * general_vote_probability * general_conditional
        office_vote = RULES["playoffRestOfficialVote"]["goalkeeper" if row["role"] == "P" else "outfield"]
        playoff_points = 2 * (p_direct * office_vote + p_playoff * general_vote_probability * general_conditional)
        knockout_points = general_vote_probability * general_conditional * (2 * p_r16 + 2 * p_qf + 2 * p_sf + p_final)
        cumulative = league_points + playoff_points + knockout_points

        event_variance = 0.42 + 9 * projected_goal + 1.8 * projected_assist + (forecast["expectedGoalsAgainst"] if row["role"] == "P" else 0)
        md2_variance = md2_vote_probability * (event_variance + conditional_points**2) - md2_expected**2
        expected_turns = 7 + 2 * (p_direct + p_playoff) + 2 * p_r16 + 2 * p_qf + 2 * p_sf + p_final
        cumulative_sd = math.sqrt(max(0.1, expected_turns * max(0.4, event_variance) + cumulative * (1 - min(0.98, general_vote_probability))))
        identity_penalty = 0.0 if row["identityStatus"] == "matched" else 0.35
        risk = min(1.0, 0.50 * (1 - general_vote_probability) + 0.25 * (1 - p_r16) + identity_penalty)
        quote = row["initialQuote"]
        projections.append(
            {
                **row,
                "md2Status": md2_status,
                "probableStarterMD2": bool(starter_info),
                "unavailableMD2": is_unavailable,
                "md2VoteProbability": round(md2_vote_probability, 4),
                "generalVoteProbability": round(general_vote_probability, 4),
                "generalStartProbability": round(general_start_probability, 4),
                "expectedMinutesMD2": round(expected_minutes, 1),
                "baseVoteProjection": round(base_vote, 3),
                "baseVoteStatus": "MODELLED_PROXY_NO_COMPLETE_FANTACALCIO_VOTE_SAMPLE",
                "expectedGoalsMD2": round(projected_goal, 4),
                "expectedAssistsMD2": round(projected_assist, 4),
                "expectedYellowCardsMD2": round(projected_yellow, 4),
                "expectedPointsConditionalOnVoteMD2": round(conditional_points, 3),
                "expectedPointsMD2": round(md2_expected, 3),
                "expectedPointsMD2Low": round(max(0.0, md2_expected - 1.28 * math.sqrt(max(0.0, md2_variance))), 3),
                "expectedPointsMD2High": round(md2_expected + 1.28 * math.sqrt(max(0.0, md2_variance)), 3),
                "expectedCumulativePoints": round(cumulative, 3),
                "cumulativeSd": round(cumulative_sd, 3),
                "expectedPointsPerCredit": round(cumulative / quote, 3),
                "riskScore": round(risk, 4),
                "effectiveStatMinutes": round(effective_minutes, 1),
                "penaltyTakerRank": penalty_rank(team, row["canonicalName"] or row["name"]),
                "teamAdvancement": adv,
                "projectionStatus": "MODELLED_NOT_OBSERVED",
            }
        )
    return projections


def strategy_utility(player: dict, strategy: str) -> float:
    mean = player["expectedCumulativePoints"]
    md2 = player["expectedPointsMD2"]
    vote = player["generalVoteProbability"]
    risk = player["riskScore"]
    sd = player["cumulativeSd"]
    coverage = 1.0 if player["identityStatus"] == "matched" else 0.55
    if strategy == "balanced":
        return coverage * (0.72 * mean + 1.35 * md2 + 5.5 * vote - 3.0 * risk)
    if strategy == "upside":
        return coverage * (0.62 * mean + 1.15 * md2 + 0.70 * sd + 5.0 * player["expectedGoalsMD2"] - 1.4 * risk)
    return coverage * (0.86 * mean + 8.5 * vote - 5.2 * risk + 0.14 * player["teamAdvancement"]["reachQFPct"])


def role_counts(players: list[dict]) -> Counter:
    return Counter(player["role"] for player in players)


def valid_roster(players: list[dict]) -> bool:
    if len(players) != RULES["squadSize"]:
        return False
    if sum(player["initialQuote"] for player in players) > RULES["budget"]:
        return False
    counts = role_counts(players)
    if any(counts[role] < minimum for role, minimum in RULES["minimumRoles"].items()):
        return False
    return any(all(counts[role] >= needed for role, needed in formation.items()) for formation in RULES["formations"].values())


def initial_roster(players: list[dict], strategy: str, budget_shadow: float) -> list[dict]:
    remaining = list(players)
    selected = []
    effective_minimums = dict(RULES["minimumRoles"])
    effective_minimums["F"] = max(2, effective_minimums["F"])
    for role, minimum in effective_minimums.items():
        candidates = sorted(
            (player for player in remaining if player["role"] == role),
            key=lambda player: strategy_utility(player, strategy) - budget_shadow * player["initialQuote"],
            reverse=True,
        )
        chosen = candidates[:minimum]
        selected.extend(chosen)
        chosen_ids = {player["id"] for player in chosen}
        remaining = [player for player in remaining if player["id"] not in chosen_ids]
    remaining.sort(key=lambda player: strategy_utility(player, strategy) - budget_shadow * player["initialQuote"], reverse=True)
    selected.extend(remaining[: RULES["squadSize"] - len(selected)])
    return selected


def improve_roster(roster: list[dict], all_players: list[dict], strategy: str) -> list[dict]:
    selected = {player["id"]: player for player in roster}
    budget = sum(player["initialQuote"] for player in roster)
    universe = sorted(all_players, key=lambda player: strategy_utility(player, strategy), reverse=True)
    for _ in range(10):
        improved = False
        counts = role_counts(list(selected.values()))
        outside = [player for player in universe if player["id"] not in selected][:220]
        inside = sorted(selected.values(), key=lambda player: strategy_utility(player, strategy))
        for old in inside:
            for new in outside:
                if old["role"] != new["role"]:
                    continue
                new_budget = budget - old["initialQuote"] + new["initialQuote"]
                gain = strategy_utility(new, strategy) - strategy_utility(old, strategy)
                if new_budget <= RULES["budget"] and gain > 1e-9:
                    del selected[old["id"]]
                    selected[new["id"]] = new
                    budget = new_budget
                    improved = True
                    break
            if improved:
                break
        if not improved:
            break
    result = list(selected.values())
    if not valid_roster(result):
        raise RuntimeError(f"Optimizer produced an invalid {strategy} roster")
    return result


def optimize_roster(players: list[dict], strategy: str) -> list[dict]:
    best = None
    best_value = -math.inf
    for budget_shadow in np.linspace(0.0, 8.0, 2401):
        roster = initial_roster(players, strategy, float(budget_shadow))
        if not valid_roster(roster):
            continue
        value = sum(strategy_utility(player, strategy) for player in roster)
        if value > best_value:
            best = roster
            best_value = value
    if best is None:
        raise RuntimeError(f"No feasible roster for strategy {strategy}")
    return improve_roster(best, players, strategy)


def best_lineup(roster: list[dict], value_field: str = "expectedPointsMD2") -> tuple[str, list[dict], float]:
    best = None
    for formation_name, requirements in RULES["formations"].items():
        lineup = []
        valid = True
        for role, count in requirements.items():
            candidates = sorted((player for player in roster if player["role"] == role), key=lambda player: player[value_field], reverse=True)
            if len(candidates) < count:
                valid = False
                break
            lineup.extend(candidates[:count])
        if not valid:
            continue
        module_bonus = RULES["bonuses"]["backThree"] if formation_name == "3-4-2-1" else 0.0
        value = sum(player[value_field] for player in lineup) + module_bonus
        if best is None or value > best[2]:
            best = (formation_name, lineup, value)
    if best is None:
        raise RuntimeError("No valid formation")
    return best


def order_bench(roster: list[dict], starters: list[dict]) -> tuple[list[dict], list[dict]]:
    starter_ids = {player["id"] for player in starters}
    available = [player for player in roster if player["id"] not in starter_ids]
    goalkeepers = sorted((player for player in available if player["role"] == "P"), key=lambda player: player["expectedPointsMD2"], reverse=True)
    bench = goalkeepers[:1]
    used = {player["id"] for player in bench}
    role_scarcity = {"D": 1.10, "E": 1.12, "C": 1.05, "F": 1.10, "A": 1.04, "P": 0.65}
    movement = sorted(
        (player for player in available if player["id"] not in used),
        key=lambda player: player["expectedPointsMD2"] * role_scarcity[player["role"]] + 0.8 * player["md2VoteProbability"],
        reverse=True,
    )
    bench.extend(movement[: 12 - len(bench)])
    bench_ids = {player["id"] for player in bench}
    excluded = sorted((player for player in available if player["id"] not in bench_ids), key=lambda player: player["expectedPointsMD2"], reverse=True)
    return bench, excluded


def md2_simulation(roster: list[dict], rng: np.random.Generator) -> dict:
    formation, starters, central = best_lineup(roster)
    bench, excluded = order_bench(roster, starters)
    all_active = starters + bench
    index = {player["id"]: idx for idx, player in enumerate(all_active)}
    scores = []
    full_eleven = 0
    for _ in range(ROSTER_SIMULATIONS):
        valid = {}
        realized = {}
        for player in all_active:
            is_valid = rng.random() < player["md2VoteProbability"]
            valid[player["id"]] = is_valid
            if not is_valid:
                realized[player["id"]] = 0.0
                continue
            base = rng.normal(player["baseVoteProjection"], 0.50)
            goals = rng.poisson(player["expectedGoalsMD2"] / max(0.08, player["md2VoteProbability"])) if player["role"] != "P" else 0
            assists = rng.poisson(player["expectedAssistsMD2"] / max(0.08, player["md2VoteProbability"])) if player["role"] != "P" else 0
            yellow = rng.random() < min(0.85, player["expectedYellowCardsMD2"] / max(0.08, player["md2VoteProbability"]))
            score = base + 3 * goals + assists - 0.5 * yellow
            if player["role"] == "P":
                team = player["canonicalTeam"]
                forecast = player["teamAdvancement"]
                expected_cond = player["expectedPointsConditionalOnVoteMD2"]
                score = rng.normal(expected_cond, 1.25)
            realized[player["id"]] = max(1.0, score)

        original_valid = [player for player in starters if valid[player["id"]]]
        missing = len(starters) - len(original_valid)
        if missing == 0:
            chosen = starters
        else:
            usable = original_valid + [player for player in bench if valid[player["id"]]]
            best_candidate = None
            for formation_name, requirements in RULES["formations"].items():
                candidate = []
                for role, count in requirements.items():
                    role_players = sorted((player for player in usable if player["role"] == role), key=lambda player: (player in starters, -index[player["id"]]), reverse=True)
                    candidate.extend(role_players[:count])
                if len(candidate) != 11 or len({player["id"] for player in candidate}) != 11:
                    continue
                substitutions = sum(player["id"] not in {starter["id"] for starter in starters} for player in candidate)
                if substitutions > RULES["automaticSubstitutions"]:
                    continue
                candidate_value = sum(realized[player["id"]] for player in candidate)
                if formation_name == "3-4-2-1":
                    candidate_value += RULES["bonuses"]["backThree"]
                if best_candidate is None or candidate_value > best_candidate[0]:
                    best_candidate = (candidate_value, candidate)
            chosen = best_candidate[1] if best_candidate else original_valid
        if len(chosen) == 11:
            full_eleven += 1
        total = sum(realized[player["id"]] for player in chosen)
        if len(chosen) < 11:
            missing_slots = 11 - len(chosen)
            total += missing_slots * RULES["officialReserve"]["outfield"]
        if role_counts(chosen)["D"] == 3 and len(chosen) == 11:
            total += RULES["bonuses"]["backThree"]
        scores.append(total)
    values = np.array(scores)
    return {
        "formation": formation,
        "centralExpectedPoints": round(central, 2),
        "simulatedMean": round(float(values.mean()), 2),
        "p10": round(float(np.quantile(values, 0.10)), 2),
        "p50": round(float(np.quantile(values, 0.50)), 2),
        "p90": round(float(np.quantile(values, 0.90)), 2),
        "fullElevenProbabilityPct": round(100 * full_eleven / ROSTER_SIMULATIONS, 2),
        "starters": [player["id"] for player in starters],
        "bench": [player["id"] for player in bench],
        "excluded": [player["id"] for player in excluded],
    }


def cumulative_lineup_projection(roster: list[dict]) -> dict:
    phase_fields = [
        ("league", 7, lambda player: player["generalVoteProbability"] * player["expectedPointsConditionalOnVoteMD2"]),
        (
            "playoff",
            2,
            lambda player: (
                player["teamAdvancement"]["directR16Pct"] / 100
                * RULES["playoffRestOfficialVote"]["goalkeeper" if player["role"] == "P" else "outfield"]
                + player["teamAdvancement"]["playoffPct"] / 100
                * player["generalVoteProbability"]
                * player["expectedPointsConditionalOnVoteMD2"]
            ),
        ),
        ("roundOf16", 2, lambda player: player["teamAdvancement"]["reachR16Pct"] / 100 * player["generalVoteProbability"] * player["expectedPointsConditionalOnVoteMD2"]),
        ("quarterfinal", 2, lambda player: player["teamAdvancement"]["reachQFPct"] / 100 * player["generalVoteProbability"] * player["expectedPointsConditionalOnVoteMD2"]),
        ("semifinal", 2, lambda player: player["teamAdvancement"]["reachSFPct"] / 100 * player["generalVoteProbability"] * player["expectedPointsConditionalOnVoteMD2"]),
        ("final", 1, lambda player: player["teamAdvancement"]["reachFinalPct"] / 100 * player["generalVoteProbability"] * player["expectedPointsConditionalOnVoteMD2"]),
    ]
    total = 0.0
    phase_output = []
    selected_ids = Counter()
    for phase, turns, calculator in phase_fields:
        copied = []
        for player in roster:
            clone = dict(player)
            clone["phaseValue"] = calculator(player)
            copied.append(clone)
        formation, lineup, value = best_lineup(copied, "phaseValue")
        total += turns * value
        selected_ids.update(player["id"] for player in lineup)
        phase_output.append({"phase": phase, "turns": turns, "formation": formation, "expectedPerTurn": round(value, 2), "lineup": [player["id"] for player in lineup]})
    average_risk = statistics.fmean(player["riskScore"] for player in roster)
    sigma = max(28.0, total * (0.055 + 0.055 * average_risk))
    thresholds = [1056, 1100, 1150]
    probabilities = {}
    for threshold in thresholds:
        z = (threshold - total) / sigma
        probabilities[str(threshold)] = round(100 * 0.5 * math.erfc(z / math.sqrt(2)), 2)
    return {
        "expected": round(total, 2),
        "sd": round(sigma, 2),
        "p10": round(total - 1.2816 * sigma, 2),
        "p90": round(total + 1.2816 * sigma, 2),
        "thresholdProbabilitiesPct": probabilities,
        "phases": phase_output,
        "selectionFrequency": dict(selected_ids),
        "distributionStatus": "NORMAL_APPROXIMATION_WITH_MODELLED_ADVANCEMENT",
    }


def serialize_player(player: dict) -> dict:
    keys = [
        "id", "name", "canonicalName", "team", "canonicalTeam", "role", "initialQuote", "identityStatus",
        "md2Status", "probableStarterMD2", "unavailableMD2", "md2VoteProbability", "generalVoteProbability",
        "expectedPointsMD2", "expectedCumulativePoints", "expectedPointsPerCredit", "riskScore", "penaltyTakerRank",
    ]
    return {key: player.get(key) for key in keys}


def strategy_output(name: str, roster: list[dict], rng: np.random.Generator) -> dict:
    simulation = md2_simulation(roster, rng)
    by_id = {player["id"]: player for player in roster}
    cumulative = cumulative_lineup_projection(roster)
    budget = sum(player["initialQuote"] for player in roster)
    counts = role_counts(roster)
    return {
        "strategy": name,
        "status": ["PROVVISORIA_PREZZI", "PROVVISORIA_VOTI"],
        "budgetUsed": budget,
        "budgetRemaining": RULES["budget"] - budget,
        "roleCounts": dict(counts),
        "roster": [serialize_player(player) for player in sorted(roster, key=lambda player: (ROLE_ORDER.index(player["role"]), -player["expectedCumulativePoints"]))],
        "md2": {
            **{key: value for key, value in simulation.items() if key not in {"starters", "bench", "excluded"}},
            "starters": [serialize_player(by_id[player_id]) for player_id in simulation["starters"]],
            "bench": [serialize_player(by_id[player_id]) for player_id in simulation["bench"]],
            "excluded": [serialize_player(by_id[player_id]) for player_id in simulation["excluded"]],
        },
        "cumulative": cumulative,
        "validation": {
            "squadSize": len(roster) == RULES["squadSize"],
            "budget": budget <= RULES["budget"],
            "minimumRoles": all(counts[role] >= minimum for role, minimum in RULES["minimumRoles"].items()),
            "validFormation": simulation["formation"] in RULES["formations"],
            "benchSize": len(simulation["bench"]) == RULES["bench"],
            "excludedSize": len(simulation["excluded"]) == RULES["excluded"],
            "allInListone": len({player["id"] for player in roster}) == RULES["squadSize"],
            "noKnownUnavailableStarter": not any(by_id[player_id]["unavailableMD2"] for player_id in simulation["starters"]),
        },
    }


def change_plan(strategy: dict) -> list[dict]:
    roster = strategy["roster"]
    weakest = sorted(roster, key=lambda player: (player["expectedCumulativePoints"], -player["riskScore"]))
    return [
        {"window": "MD3-MD4", "action": "Use at most two ordinary transfers only for confirmed loss of role or injury.", "watch": [player["name"] for player in weakest[:2]]},
        {"window": "MD5-MD6", "action": "Re-run advancement simulation; move one or two slots from teams drifting below 24th to top-16 probabilities."},
        {"window": "MD7-MD8", "action": "Protect flexibility and retain cash/value; eliminated-player replacements do not consume the ordinary limit once removed from the game list."},
        {"window": "Play-off", "action": "For direct-R16 players compare the guaranteed 6/5 office vote with a temporary equal-or-cheaper starter; avoid a temporary goalkeeper unless the replacement exceeds the 5-point office baseline."},
        {"window": "Knockout", "action": "Concentrate transfers on confirmed starters from teams with the highest conditional reach-QF/SF probability; never spend both ordinary changes before lineups and availability are refreshed."},
    ]


def build_report(strategies: list[dict], advancement: dict, coverage: dict, source_manifest: dict) -> str:
    labels = {"balanced": "A - Equilibrata", "upside": "B - Alto potenziale", "long": "C - Lungo periodo"}
    lines = [
        "# FantaChampions 2026/27 - ottimizzazione classifica generale",
        "",
        "**Stato: PROVVISORIO.** Le rose rispettano i vincoli del PDF e usano il listone iniziale, ma devono essere ricontrollate nell'app per quotazioni correnti e indisponibilità last-minute. Il repository non contiene una base completa di voti Fantacalcio per tutti i 36 club: ogni voto base indicato è una proiezione, non un dato osservato.",
        "",
        "## Correzioni regolamentari decisive",
        "",
        "- Il limite ordinario è **2 cambi di mercato per turno**, non 5. Il numero 5 riguarda le sostituzioni automatiche dalla panchina.",
        "- I moduli sono 3-4-2-1, 4-3-2-1 e 4-2-3-1. Il 3-4-2-1 vale +0,5 solo se, dopo le sostituzioni, restano tre D a voto.",
        "- Panchina: 12 calciatori, con almeno un portiere; altri 5 restano fuori formazione.",
        "- Le prime 8 possono usare nei due turni play-off il voto d'ufficio 6 (5 per i portieri) oppure sostituzioni temporanee di valore pari o inferiore, annullate automaticamente a fine play-off.",
        "- I trasferimenti di giocatori eliminati o usciti dalla competizione non consumano i due cambi ordinari solo dopo la loro rimozione dalle liste di gioco.",
        "",
        "## Copertura dati",
        "",
        f"- Listone estratto: {coverage['listonePlayers']} giocatori, {coverage['teams']} squadre, duplicati {coverage['duplicates']}.",
        f"- Identità collegate agli archivi Champions: {coverage['matchedPlayers']} ({coverage['matchedPct']}%).",
        f"- Probabili titolari MD2 collegati: {coverage['probableStarters']}.",
        f"- Simulazioni avanzamento: {ADVANCEMENT_SIMULATIONS:,}; simulazioni rosa MD2: {ROSTER_SIMULATIONS:,} per strategia.",
        "",
        "## Confronto quantitativo",
        "",
        "| Strategia | Budget | Modulo MD2 | xFP MD2 | P10 MD2 | P90 MD2 | xFP cumulativi | P10 cumul. | P90 cumul. | P(>=1056) |",
        "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for strategy in strategies:
        md2 = strategy["md2"]
        cum = strategy["cumulative"]
        lines.append(
            f"| {labels[strategy['strategy']]} | {strategy['budgetUsed']} | {md2['formation']} | {md2['simulatedMean']:.2f} | {md2['p10']:.2f} | {md2['p90']:.2f} | {cum['expected']:.2f} | {cum['p10']:.2f} | {cum['p90']:.2f} | {cum['thresholdProbabilitiesPct']['1056']:.2f}% |"
        )
    lines += [
        "",
        "La soglia 1056 non è una stima di vittoria: equivale a 66 punti medi per 16 turni, lo stesso valore usato dal regolamento come bonus per ogni turno saltato da un'iscrizione tardiva. Le probabilità non modellano il campo degli altri partecipanti.",
        "",
    ]
    for strategy in strategies:
        lines += [f"## {labels[strategy['strategy']]}", "", f"Budget {strategy['budgetUsed']}/280; residuo {strategy['budgetRemaining']}. Modulo MD2: **{strategy['md2']['formation']}**.", "", "### Rosa completa", "", "| # | R | Calciatore | Squadra | Cr | P(voto) MD2 | xFP MD2 | xFP cumul. | xFP/cr | Rischio |", "|---:|:--:|---|---|---:|---:|---:|---:|---:|---:|"]
        for index, player in enumerate(strategy["roster"], 1):
            lines.append(f"| {index} | {player['role']} | {player['name']} | {player['team']} | {player['initialQuote']} | {100*player['md2VoteProbability']:.1f}% | {player['expectedPointsMD2']:.2f} | {player['expectedCumulativePoints']:.2f} | {player['expectedPointsPerCredit']:.2f} | {player['riskScore']:.2f} |")
        lines += ["", "### Formazione MD2", ""]
        for player in strategy["md2"]["starters"]:
            lines.append(f"- {player['role']} - {player['name']} ({player['team']}), {player['initialQuote']} cr; xFP {player['expectedPointsMD2']:.2f}, P(voto) {100*player['md2VoteProbability']:.1f}%")
        lines += ["", "### Panchina ordinata", ""]
        for index, player in enumerate(strategy["md2"]["bench"], 1):
            lines.append(f"{index}. {player['role']} - {player['name']} ({player['team']})")
        lines += ["", "### Fuori formazione", ""]
        for player in strategy["md2"]["excluded"]:
            lines.append(f"- {player['role']} - {player['name']} ({player['team']})")
        undervalued = sorted(strategy["roster"], key=lambda player: player["expectedPointsPerCredit"], reverse=True)[:5]
        risks = sorted(strategy["roster"], key=lambda player: player["riskScore"], reverse=True)[:5]
        lines += ["", "### Valore e rischi", "", "Miglior rendimento atteso per credito: " + ", ".join(f"{p['name']} ({p['expectedPointsPerCredit']:.2f})" for p in undervalued) + ".", "", "Rischi principali: " + ", ".join(f"{p['name']} ({p['riskScore']:.2f})" for p in risks) + ".", "", "### Piano cambi", ""]
        for item in strategy["changePlan"]:
            lines.append(f"- **{item['window']}**: {item['action']}" + (f" Sorvegliati iniziali: {', '.join(item.get('watch', []))}." if item.get("watch") else ""))
        lines.append("")
    best = max(strategies, key=lambda item: item["cumulative"]["expected"] - 0.25 * item["cumulative"]["sd"])
    lines += [
        "## Raccomandazione",
        "",
        f"Sceglierei **{labels[best['strategy']]}**: massimizza il criterio prudente xFP - 0,25 sigma tra le tre soluzioni, senza interpretare la dispersione come probabilità di vincere il concorso.",
        "",
        "## Limiti e gate prima dell'acquisto",
        "",
        "1. Confrontare nell'app tutte le 28 quotazioni: il PDF contiene quotazioni iniziali, non un feed corrente verificato.",
        "2. Aggiornare indisponibilità e formazioni fino al termine regolamentare; nessun acquisto è stato effettuato.",
        "3. Sostituire il proxy di voto base con voti Fantacalcio osservati appena disponibili per un campione sufficiente.",
        "4. Rilanciare il modello dopo ogni giornata e prima di ogni finestra di mercato.",
        "",
        "## Fonti e tracciabilità",
        "",
        f"- Listone SHA-256: `{source_manifest['listone']['sha256']}`.",
        f"- Regolamento SHA-256: `{source_manifest['regulation']['sha256']}`.",
        "- Archivi locali: calendario, 1X2, integrazione MD2, statistiche giocatori 2025/26 e 2026/27.",
        "- Specialisti sui piazzati: articolo Fantacalcio.it del 12 ottobre 2026; segnale informativo, non bonus numerico inventato.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    random.seed(SEED)
    np.random.seed(SEED)
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for path in (LISTONE_PDF, REGULATION_PDF, CALENDAR_PATH, PREDICTIONS_PATH, MD2_PATH, INTEGRATION_PATH, CURRENT_STATS_PATH, HISTORIC_STATS_PATH):
        if not path.exists():
            raise FileNotFoundError(path)

    listone = extract_listone()
    current_stats = read_json(CURRENT_STATS_PATH)
    historic_stats = read_json(HISTORIC_STATS_PATH)
    current_by_team, historic_by_team = build_player_index(current_stats, historic_stats)
    match_listone_players(listone, current_by_team, historic_by_team)
    calendar = read_json(CALENDAR_PATH)
    predictions = read_json(PREDICTIONS_PATH)
    md2_predictions = read_json(MD2_PATH)
    integration = read_json(INTEGRATION_PATH)
    advancement = simulate_advancement(calendar, predictions)
    starters, unavailable, md2_team = build_md2_context(integration, md2_predictions)
    player_projections = build_player_projections(listone, current_by_team, historic_by_team, advancement, starters, unavailable, md2_team)

    rng = np.random.default_rng(SEED + 1)
    strategies = []
    for strategy_name in ("balanced", "upside", "long"):
        roster = optimize_roster(player_projections, strategy_name)
        result = strategy_output(strategy_name, roster, rng)
        result["changePlan"] = change_plan(result)
        strategies.append(result)

    source_manifest = {
        "listone": {"path": str(LISTONE_PDF), "sha256": sha256(LISTONE_PDF), "pages": 12, "quoteStatus": "INITIAL_PDF_NOT_CURRENT_APP_VERIFIED"},
        "regulation": {"path": str(REGULATION_PDF), "sha256": sha256(REGULATION_PDF), "pages": 10},
        "localData": {path.name: {"path": str(path.relative_to(REPO)), "sha256": sha256(path)} for path in (CALENDAR_PATH, PREDICTIONS_PATH, MD2_PATH, INTEGRATION_PATH, CURRENT_STATS_PATH, HISTORIC_STATS_PATH)},
        "externalResearch": [
            {"url": "https://www.fantacalcio.it/regolamenti/classic-plus", "use": "three Classic Plus formations"},
            {"url": "https://www.fantacalcio.it/fantachampions/12_10_2026/fantachampions-tiratori-rigoristi-499072", "use": "set-piece taker context only"},
        ],
    }
    duplicates = len(listone) - len({(row["team"], row["name"], row["birthDate"]) for row in listone})
    matched = sum(row["identityStatus"] == "matched" for row in listone)
    coverage = {
        "listonePlayers": len(listone),
        "teams": len({row["team"] for row in listone}),
        "duplicates": duplicates,
        "matchedPlayers": matched,
        "matchedPct": round(100 * matched / len(listone), 2),
        "probableStarters": len(starters),
        "unavailableMD2": len(unavailable),
    }
    validation = {
        "status": "PROVISIONAL",
        "coverage": coverage,
        "rules": RULES,
        "strategyChecks": {item["strategy"]: item["validation"] for item in strategies},
        "allStrategiesValid": all(all(checks.values()) for checks in (item["validation"] for item in strategies)),
        "blockingGates": [
            "Current in-app quotes not publicly verified",
            "Complete Fantacalcio vote history unavailable for all 36 teams",
        ],
    }

    write_json(DATA_OUT / "source-manifest.json", source_manifest)
    write_json(DATA_OUT / "listone.json", {"schemaVersion": 1, "source": source_manifest["listone"], "summary": coverage, "players": listone})
    write_json(DATA_OUT / "team-advancement.json", {"schemaVersion": 1, "simulations": ADVANCEMENT_SIMULATIONS, "seed": SEED, "method": "league schedule Monte Carlo plus strength-based knockout approximation", "teams": advancement})
    write_json(DATA_OUT / "player-projections.json", {"schemaVersion": 1, "asOf": "2026-10-13", "status": "MODELLED_NOT_OBSERVED", "players": player_projections})
    write_json(OUTPUT / "strategies.json", {"schemaVersion": 1, "asOf": "2026-10-13", "strategies": strategies})
    write_json(OUTPUT / "validation.json", validation)
    (OUTPUT / "report.md").write_text(build_report(strategies, advancement, coverage, source_manifest), encoding="utf-8")
    print(json.dumps({"coverage": coverage, "validation": validation["allStrategiesValid"], "strategies": [{"name": item["strategy"], "budget": item["budgetUsed"], "md2": item["md2"]["simulatedMean"], "cumulative": item["cumulative"]["expected"]} for item in strategies]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
