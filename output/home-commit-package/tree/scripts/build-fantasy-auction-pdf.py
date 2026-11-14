import json
from datetime import datetime
from itertools import combinations
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "fantacalcio-asta-classic-1000-crediti-8-partecipanti.pdf"

BUDGET = 1000
PARTICIPANTS = 8
ROLE_CONFIG = {
    "P": {"label": "Portieri", "slots": 3, "target": 85, "range": "75-90", "factor": 1.12},
    "D": {"label": "Difensori", "slots": 8, "target": 145, "range": "125-155", "factor": 0.90},
    "C": {"label": "Centrocampisti", "slots": 8, "target": 235, "range": "220-250", "factor": 1.00},
    "A": {"label": "Attaccanti", "slots": 6, "target": 535, "range": "505-580", "factor": 1.00},
}
HISTORICAL_RANK = {
    "juventus": 1, "inter": 2, "milan": 3, "roma": 4, "fiorentina": 5,
    "napoli": 6, "lazio": 7, "torino": 8, "bologna": 9, "atalanta": 11,
    "genoa": 12, "udinese": 13, "cagliari": 14, "parma": 15, "lecce": 26,
    "como": 29, "sassuolo": 30, "venezia": 43, "monza": 56, "frosinone": 61,
}


def read(relative_path):
    with open(ROOT / relative_path, "r", encoding="utf-8") as stream:
        return json.load(stream)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def first_finite(*values):
    return next((value for value in values if finite(value)), None)


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def round1(value):
    return round(value, 1)


def shown(value, decimals=0):
    if not finite(value):
        return "N/D"
    if decimals:
        return f"{value:.{decimals}f}"
    return str(int(round(value)))


def register_fonts():
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("AuctionSans", str(regular)))
        pdfmetrics.registerFont(TTFont("AuctionSans-Bold", str(bold)))
        return "AuctionSans", "AuctionSans-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()
NAVY = colors.HexColor("#102A43")
TEAL = colors.HexColor("#168AAD")
GOLD = colors.HexColor("#D6A11D")
INK = colors.HexColor("#172B3A")
MUTED = colors.HexColor("#607284")
PALE = colors.HexColor("#F4F8FA")
PALE_TEAL = colors.HexColor("#E8F5F8")
PALE_GOLD = colors.HexColor("#FFF8E5")
LINE = colors.HexColor("#CFDCE4")
RED = colors.HexColor("#B54747")
GREEN = colors.HexColor("#147D64")

BASE_STYLES = getSampleStyleSheet()
TITLE = ParagraphStyle("Title", parent=BASE_STYLES["Title"], fontName=FONT_BOLD, fontSize=24, leading=27, textColor=NAVY, alignment=TA_LEFT)
H1 = ParagraphStyle("H1", parent=BASE_STYLES["Heading1"], fontName=FONT_BOLD, fontSize=18, leading=21, textColor=NAVY, spaceAfter=4 * mm)
H2 = ParagraphStyle("H2", parent=BASE_STYLES["Heading2"], fontName=FONT_BOLD, fontSize=11, leading=14, textColor=NAVY, spaceBefore=2 * mm, spaceAfter=2 * mm)
BODY = ParagraphStyle("Body", parent=BASE_STYLES["BodyText"], fontName=FONT, fontSize=8.4, leading=11, textColor=INK)
BODY_BOLD = ParagraphStyle("BodyBold", parent=BODY, fontName=FONT_BOLD)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=7.2, leading=9, textColor=MUTED)
TINY = ParagraphStyle("Tiny", parent=BODY, fontSize=6.4, leading=7.4)
TINY_BOLD = ParagraphStyle("TinyBold", parent=TINY, fontName=FONT_BOLD)
RIGHT = ParagraphStyle("Right", parent=TINY, alignment=TA_RIGHT)
CENTER = ParagraphStyle("Center", parent=TINY, alignment=TA_CENTER)
WHITE_HEAD = ParagraphStyle("WhiteHead", parent=TINY_BOLD, textColor=colors.white, alignment=TA_CENTER)


def p(text, style=BODY):
    return Paragraph(str(text), style)


def usage_label(minutes, current):
    if not finite(minutes):
        label = "N/D"
    elif minutes >= 2700:
        label = f"Perno - {shown(minutes)}'"
    elif minutes >= 1800:
        label = f"Titolare - {shown(minutes)}'"
    elif minutes >= 900:
        label = f"Rotazione - {shown(minutes)}'"
    elif minutes > 0:
        label = f"Marginale - {shown(minutes)}'"
    else:
        label = "0' nel 25/26"
    current = current or {}
    if current.get("injuryReported") or current.get("callupStatus") == "injured":
        return f"{label} | indisponibile ora"
    if current.get("callupStatus") == "suspended":
        return f"{label} | squalificato"
    return label


def custom_cap(player):
    base = player.get("auctionValue1000")
    if not finite(base):
        return None
    factor = ROLE_CONFIG[player["role"]]["factor"]
    return max(1, round(base * factor))


def tier_for(player):
    stars = player.get("stars")
    score = player.get("score")
    cap = custom_cap(player)
    role = player["role"]
    premium_floor = {"P": 30, "D": 35, "C": 65, "A": 110}[role]
    if finite(cap) and cap >= premium_floor:
        return "Premium"
    if finite(stars) and stars >= 4 and finite(score) and score >= 55:
        return "Affidabile"
    return "Occasione"


def historical_indexes():
    fantasy_stats = read("data/sources/fantacalcio-stats-2025-26.json")
    external_stats = read("data/sources/fantasy-external-stats-2025-26.json")
    teams = read("data/normalized/teams.json")
    roster_by_id = {}
    team_files = {}
    for team in teams:
        team_file = read(f"data/teams/{team['id']}.json")
        team_files[team["id"]] = team_file
        for player in team_file.get("squad", []):
            roster_by_id[player["id"]] = player
    return {
        "fantasy": {str(player["sourceId"]): player for player in fantasy_stats["players"]},
        "external": {player["playerId"]: player for player in external_stats["players"]},
        "roster": roster_by_id,
        "teams": teams,
        "teamFiles": team_files,
    }


def historical_record(quote, player, indexes):
    player_id = quote.get("playerId")
    fantasy = indexes["fantasy"].get(str(quote.get("sourceId")))
    external = indexes["external"].get(player_id, {})
    roster = indexes["roster"].get(player_id, {})
    roster_totals = (roster.get("previousSeason") or {}).get("totals") or {}
    external_entries = sorted(
        external.get("entries", []),
        key=lambda entry: entry.get("appearances") or 0,
        reverse=True,
    )
    external_best = external_entries[0] if external_entries else {}
    fantasy_appearances = fantasy.get("appearancesWithVote") if fantasy else None
    roster_appearances = roster_totals.get("appearances")
    external_appearances = external_best.get("appearances")

    if finite(fantasy_appearances) and fantasy_appearances > 0:
        matching_external = next(
            (entry for entry in external_entries if entry.get("appearances") == fantasy_appearances),
            {},
        )
        minutes = first_finite(
            roster_totals.get("minutes") if roster_appearances == fantasy_appearances else None,
            matching_external.get("minutes"),
        )
        goals = fantasy.get("goalsFor")
        assists = fantasy.get("assists")
        yellow = fantasy.get("yellowCards")
        red = fantasy.get("redCards")
    elif finite(roster_appearances) and roster_appearances > 0:
        minutes = roster_totals.get("minutes")
        goals = roster_totals.get("goals")
        assists = roster_totals.get("assists")
        yellow = roster_totals.get("yellowCards")
        reds = [roster_totals.get("straightRedCards"), roster_totals.get("secondYellowCards")]
        red = sum(value for value in reds if finite(value)) if any(finite(value) for value in reds) else None
    elif finite(external_appearances) and external_appearances > 0:
        minutes = external_best.get("minutes")
        goals = external_best.get("goals")
        assists = external_best.get("assists")
        yellow = external_best.get("yellowCards")
        red = external_best.get("redCards")
    elif fantasy:
        minutes = 0 if fantasy_appearances == 0 else None
        goals = fantasy.get("goalsFor")
        assists = fantasy.get("assists")
        yellow = fantasy.get("yellowCards")
        red = fantasy.get("redCards")
    else:
        minutes = goals = assists = yellow = red = None

    market = player.get("marketValueLabel") or (roster.get("marketValue") or {}).get("label")
    return {
        "minutes2526": minutes,
        "goalsAssists2526": f"{shown(goals)} / {shown(assists)}",
        "cards2526": f"{shown(yellow)} / {shown(red)}",
        "marketValue": market or "N/D",
        "usageLabel": usage_label(minutes, player.get("currentAvailability")),
    }


def load_rows():
    advice = read("data/generated/fantacalcio-advice.json")
    quotations = read("data/sources/fantacalcio-quotations-2026-27.json")
    indexes = historical_indexes()
    advice_by_id = {player["id"]: player for player in advice["players"]}
    rows = []
    for quote in quotations["players"]:
        if quote.get("status") not in (None, "active"):
            continue
        linked = advice_by_id.get(quote.get("playerId"))
        player = dict(linked) if linked else {
            "id": quote.get("playerId"),
            "name": quote.get("currentName") or quote.get("name"),
            "team": quote.get("team"),
            "role": quote.get("role"),
            "score": None,
            "stars": None,
            "auctionValue1000": None,
            "currentAvailability": None,
        }
        player["quote"] = quote
        player["teamId"] = player.get("teamId") or quote.get("teamId")
        player["customCap"] = custom_cap(player)
        player.update(historical_record(quote, player, indexes))
        rows.append(player)
    return advice, quotations, rows, indexes


def page_footer(canvas, document):
    canvas.saveState()
    width, height = landscape(A4)
    canvas.setStrokeColor(LINE)
    canvas.line(14 * mm, 10 * mm, width - 14 * mm, 10 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7)
    canvas.drawString(14 * mm, 5.7 * mm, "Fantacalcio 2026/27 - Asta Classic 1000 crediti - 8 partecipanti")
    canvas.drawRightString(width - 14 * mm, 5.7 * mm, f"Pagina {document.page}")
    canvas.restoreState()


def header_block(kicker, title, summary=None):
    logo_path = ROOT / "assets" / "images" / "serie-a-logo-mark.png"
    left = Image(str(logo_path), width=16 * mm, height=16 * mm) if logo_path.exists() else ""
    middle = [p(kicker.upper(), ParagraphStyle("Kicker", parent=SMALL, fontName=FONT_BOLD, textColor=TEAL)), p(title, H1)]
    right = p(summary or "", ParagraphStyle("Summary", parent=SMALL, fontName=FONT_BOLD, alignment=TA_RIGHT, textColor=NAVY))
    table = Table([[left, middle, right]], colWidths=[20 * mm, 175 * mm, 66 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def info_card(title, value, note, color=TEAL):
    content = [p(title.upper(), ParagraphStyle("CardK", parent=SMALL, fontName=FONT_BOLD, fontSize=6.6, textColor=MUTED)), p(value, ParagraphStyle("CardV", parent=BODY_BOLD, fontSize=16, leading=18, textColor=color)), p(note, SMALL)]
    table = Table([[content]], colWidths=[61 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def budget_table():
    headers = ["Ruolo", "Posti", "Budget guida", "Intervallo", "Indicazione"]
    data = [[p(x, WHITE_HEAD) for x in headers]]
    notes = {
        "P": "+1 porta inviolata: qualità e copertura valgono più del minimo.",
        "D": "Senza modificatore: priorità a minuti, bonus e costo sostenibile.",
        "C": "Almeno 2 profili da bonus, poi titolari e rotazioni.",
        "A": "Proteggi il budget per 2 punte forti; non inseguire il terzo nome.",
    }
    for role, cfg in ROLE_CONFIG.items():
        data.append([
            p(cfg["label"], TINY_BOLD),
            p(cfg["slots"], CENTER),
            p(f"{cfg['target']} cr", CENTER),
            p(f"{cfg['range']} cr", CENTER),
            p(notes[role], TINY),
        ])
    widths = [35 * mm, 18 * mm, 30 * mm, 30 * mm, 148 * mm]
    table = Table(data, colWidths=widths, repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for row_index in range(1, len(data)):
        commands.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE if row_index % 2 == 0 else colors.white))
    table.setStyle(TableStyle(commands))
    return table


def shortlist_table(role, role_rows):
    headers = ["Fascia", "Calciatore", "Squadra", "Qt.", "FVM", "Tetto", "G / A", "CG / CR", "Val. mercato", "Stato da minuti 25/26"]
    data = [[p(x, WHITE_HEAD) for x in headers]]
    for player in role_rows:
        quote = player["quote"]
        tier = tier_for(player)
        data.append([
            p(tier, TINY_BOLD),
            p(player["name"], TINY_BOLD),
            p(player["team"], TINY),
            p(shown(quote.get("currentQuotation")), CENTER),
            p(shown(quote.get("fvm")), CENTER),
            p(f"{shown(player['customCap'])} cr", CENTER),
            p(player["goalsAssists2526"], CENTER),
            p(player["cards2526"], CENTER),
            p(player["marketValue"], TINY),
            p(player["usageLabel"], TINY),
        ])
    widths = [20 * mm, 42 * mm, 24 * mm, 11 * mm, 13 * mm, 17 * mm, 15 * mm, 16 * mm, 25 * mm, 78 * mm]
    table = Table(data, colWidths=widths, repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.4),
        ("BACKGROUND", (5, 1), (5, -1), PALE_GOLD),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (4, row_index), PALE))
            commands.append(("BACKGROUND", (6, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def rest_sort_key(player):
    cap = player.get("customCap")
    fvm = player["quote"].get("fvm")
    if finite(cap):
        return (0, -cap, player["team"].casefold(), player["name"].casefold())
    return (1, -(fvm if finite(fvm) else -1), player["team"].casefold(), player["name"].casefold())


def appendix_table(role, role_rows):
    headers = ["Calciatore", "Squadra", "Qt.", "+/-", "FVM", "Tetto", "G / A", "CG / CR", "Val. mercato", "Stato da minuti 25/26"]
    data = [[p(x, WHITE_HEAD) for x in headers]]
    for player in sorted(role_rows, key=rest_sort_key):
        quote = player["quote"]
        difference = quote.get("quotationDifference")
        difference_text = f"{difference:+d}" if isinstance(difference, int) else "N/D"
        cap = f"{shown(player['customCap'])} cr" if finite(player["customCap"]) else "N/D"
        data.append([
            p(player["name"], TINY_BOLD),
            p(player["team"], TINY),
            p(shown(quote.get("currentQuotation")), CENTER),
            p(difference_text, CENTER),
            p(shown(quote.get("fvm")), CENTER),
            p(cap, CENTER),
            p(player["goalsAssists2526"], CENTER),
            p(player["cards2526"], CENTER),
            p(player["marketValue"], TINY),
            p(player["usageLabel"], TINY),
        ])
    widths = [42 * mm, 25 * mm, 11 * mm, 11 * mm, 13 * mm, 17 * mm, 15 * mm, 16 * mm, 26 * mm, 84 * mm]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
        ("BACKGROUND", (5, 1), (5, -1), PALE_GOLD),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (4, row_index), PALE))
            commands.append(("BACKGROUND", (6, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def team_calendars(indexes):
    matches = [
        match for match in read("data/normalized/matches.json")
        if match.get("competition") == "serie-a" and match.get("season") == "2026-27"
    ]
    strengths = {}
    for team in indexes["teams"]:
        team_file = indexes["teamFiles"][team["id"]]
        previous = team_file.get("previousSeason") or {}
        position = previous.get("position") or 3
        played_serie_a = previous.get("competition") == "Serie A" and previous.get("position")
        recent = clamp(104.5 - position * 4.5, 15, 100) if played_serie_a else clamp(38 - position * 3, 22, 35)
        history = clamp(102 - HISTORICAL_RANK.get(team["id"], 61) * 1.55, 8, 100)
        strengths[team["id"]] = round1(recent * 0.82 + history * 0.18)

    calendars = {}
    for team in indexes["teams"]:
        team_id = team["id"]
        fixtures = sorted(
            (match for match in matches if match.get("homeTeam") == team_id or match.get("awayTeam") == team_id),
            key=lambda match: match.get("matchday") or 0,
        )
        calendars[team_id] = []
        for match in fixtures:
            home = match.get("homeTeam") == team_id
            opponent = match.get("awayTeam") if home else match.get("homeTeam")
            ease = round1(clamp(100 - strengths[opponent] + (7 if home else -7), 8, 92))
            calendars[team_id].append({"ease": ease, "opponent": opponent})
    return calendars


def goalkeeper_rotation_rows(rows, indexes):
    hierarchy = read("data/sources/fantasy-goalkeeper-hierarchy-2026-27.json")
    row_by_id = {row.get("id"): row for row in rows if row.get("id")}
    team_names = {team["id"]: team["name"] for team in indexes["teams"]}
    calendars = team_calendars(indexes)
    safe_partners = []
    for entry in hierarchy["teams"]:
        if not entry.get("trioEligible") or len(entry.get("primaryIds", [])) != 1:
            continue
        player = row_by_id.get(entry["primaryIds"][0])
        if player:
            safe_partners.append(player)

    output = []
    for entry in sorted(hierarchy["teams"], key=lambda item: team_names[item["teamId"]].casefold()):
        primary_rows = [row_by_id[player_id] for player_id in entry.get("primaryIds", []) if player_id in row_by_id]
        hierarchy_label = entry["label"]
        if not primary_rows:
            team_goalkeepers = [
                row for row in rows
                if row.get("role") == "P" and row.get("teamId") == entry["teamId"]
            ]
            if not team_goalkeepers:
                continue
            primary_rows = [sorted(
                team_goalkeepers,
                key=lambda row: (-(row["quote"].get("fvm") or 0), -(row.get("customCap") or 0), row["name"]),
            )[0]]
            hierarchy_label = "Riferimento dal listone aggiornato; gerarchia da verificare"
        anchor = sorted(
            primary_rows,
            key=lambda row: (-(row.get("customCap") or 0), -(row.get("score") or 0), row["name"]),
        )[0]
        options = []
        partner_pool = [player for player in safe_partners if player["teamId"] != entry["teamId"]]
        for first, second in combinations(partner_pool, 2):
            if first["teamId"] == second["teamId"]:
                continue
            trio = [anchor, first, second]
            weekly_ease = [
                max(calendars[player["teamId"]][index]["ease"] for player in trio)
                for index in range(38)
            ]
            rotation_index = round1(sum(weekly_ease) / 38)
            favorable = sum(value >= 65 for value in weekly_ease)
            covered = sum(value >= 48 for value in weekly_ease)
            difficult = 38 - covered
            quality = round1(sum(player.get("score") or 0 for player in trio) / 3)
            cost_values = [player.get("customCap") for player in trio]
            cost = sum(cost_values) if all(finite(value) for value in cost_values) else None
            options.append({
                "partners": [first, second],
                "score": round1(rotation_index * 0.62 + quality * 0.38),
                "cost": cost,
                "covered": covered,
                "favorable": favorable,
                "difficult": difficult,
            })
        affordable = [option for option in options if finite(option["cost"]) and option["cost"] <= 95]
        ranked = affordable or options
        best = sorted(
            ranked,
            key=lambda option: (-option["score"], -option["covered"], option["cost"] if finite(option["cost"]) else 9999),
        )[0]
        output.append({
            "team": team_names[entry["teamId"]],
            "primary": " / ".join(row["name"] for row in primary_rows),
            "partners": " + ".join(player["name"] for player in best["partners"]),
            "cost": best["cost"],
            "covered": best["covered"],
            "favorable": best["favorable"],
            "difficult": best["difficult"],
            "hierarchy": hierarchy_label,
        })
    return output


def goalkeeper_rotation_table(rotations):
    headers = ["Squadra", "Portiere/i di riferimento", "Coppia per la rotazione", "Tetto gruppo", "Copertura", "Fav.", "Diff.", "Gerarchia"]
    data = [[p(value, WHITE_HEAD) for value in headers]]
    for rotation in rotations:
        data.append([
            p(rotation["team"], TINY_BOLD),
            p(rotation["primary"], TINY_BOLD),
            p(rotation["partners"], TINY),
            p(f"{shown(rotation['cost'])} cr" if finite(rotation["cost"]) else "N/D", CENTER),
            p(f"{rotation['covered']}/38", CENTER),
            p(rotation["favorable"], CENTER),
            p(rotation["difficult"], CENTER),
            p(rotation["hierarchy"], TINY),
        ])
    table = Table(data, colWidths=[26 * mm, 45 * mm, 58 * mm, 25 * mm, 22 * mm, 15 * mm, 15 * mm, 55 * mm], repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def cover_story(advice, quotations, rows):
    active_count = len(rows)
    analysed_count = sum(finite(row.get("score")) for row in rows)
    generated = advice.get("generatedAt", "N/D")
    imported = quotations.get("importedAt", "N/D")
    cards = Table([[
        info_card("Budget", "1000", "crediti iniziali"),
        info_card("Lega", "8", "partecipanti"),
        info_card("Rosa", "3-8-8-6", "25 giocatori"),
        info_card("Regola", "+1", "porta inviolata", GOLD),
    ]], colWidths=[65 * mm] * 4)
    cards.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    return [
        Spacer(1, 5 * mm),
        header_block("Guida personalizzata", "Asta Fantacalcio Classic", f"{active_count} nomi nel listone<br/>{analysed_count} profili analizzati"),
        Spacer(1, 6 * mm),
        p("Una guida operativa da consultare a PC: budget per ruolo, shortlist ordinate per tetto, rotazioni per ogni gerarchia dei portieri e dati storici 2025/26.", ParagraphStyle("Intro", parent=BODY, fontSize=11, leading=15, textColor=INK)),
        Spacer(1, 7 * mm),
        cards,
        Spacer(1, 8 * mm),
        p("PIANO BUDGET", ParagraphStyle("SectionK", parent=SMALL, fontName=FONT_BOLD, textColor=TEAL)),
        Spacer(1, 2 * mm),
        budget_table(),
        Spacer(1, 5 * mm),
        p("Come leggere il tetto", H2),
        p("Il tetto e un punto di arresto, non un prezzo da raggiungere. Parte dal massimo d'asta del modello per 1000 crediti e 8 partecipanti; applica +12% ai portieri per il bonus porta inviolata e -10% ai difensori per l'assenza del modificatore. Centrocampisti e attaccanti restano invariati. Se la sala spende molto in un ruolo, proteggi sempre il budget dei ruoli successivi."),
        Spacer(1, 3 * mm),
        p(f"Dati generati: {generated} - listone importato: {imported}. I campi non verificabili restano N/D. Il +1 porta inviolata e considerato riferito al portiere.", SMALL),
    ]


def strategy_story(rotations):
    rules = [
        [p("1", ParagraphStyle("RuleN1", parent=BODY_BOLD, fontSize=15, textColor=TEAL, alignment=TA_CENTER)), p("Portieri: scegli una strada", BODY_BOLD), p("Top affidabile con riserve coerenti oppure rotazione da 3 squadre. Con il +1 clean sheet evita tre scommesse senza gerarchia.", BODY)],
        [p("2", ParagraphStyle("RuleN2", parent=BODY_BOLD, fontSize=15, textColor=TEAL, alignment=TA_CENTER)), p("Difesa: niente sovrapprezzo da modificatore", BODY_BOLD), p("Compra titolarita e bonus. Un solo premium se il prezzo resta sotto tetto; completa a costo controllato.", BODY)],
        [p("3", ParagraphStyle("RuleN3", parent=BODY_BOLD, fontSize=15, textColor=TEAL, alignment=TA_CENTER)), p("Centrocampo: due fonti di bonus", BODY_BOLD), p("Assicurati almeno due profili offensivi, poi minuti sicuri e una scommessa. Non riempire presto tutti gli slot.", BODY)],
        [p("4", ParagraphStyle("RuleN4", parent=BODY_BOLD, fontSize=15, textColor=TEAL, alignment=TA_CENTER)), p("Attacco: conserva elasticita", BODY_BOLD), p("Punta a due attaccanti forti e una fascia media. Tieni almeno 35-50 crediti per gli ultimi tre slot e i rilanci finali.", BODY)],
    ]
    rule_table = Table(rules, colWidths=[13 * mm, 70 * mm, 178 * mm])
    rule_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BACKGROUND", (0, 1), (-1, 1), PALE),
        ("BACKGROUND", (0, 3), (-1, 3), PALE),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [
        header_block("Piano operativo", "Come affrontare l'asta", "Classic - 1000 crediti<br/>8 partecipanti"),
        Spacer(1, 4 * mm),
        rule_table,
        Spacer(1, 5 * mm),
        p("Disciplina durante i rilanci", H2),
        p("Dopo ogni acquisto ricalcola il residuo del ruolo. Supera il tetto solo se hai risparmiato davvero altrove e il giocatore cambia la struttura della rosa; non recuperare un obiettivo perso rilanciando sul nome successivo."),
        Spacer(1, 3 * mm),
        p("Nota: shortlist e tetti sono una guida euristica costruita sui dati disponibili, non una previsione certa di rendimento o prezzo finale.", SMALL),
        PageBreak(),
        header_block("Portieri", "Una rotazione per ogni gerarchia", f"{len(rotations)} squadre<br/>calendario su 38 giornate"),
        Spacer(1, 3 * mm),
        p("Per ogni squadra la coppia proposta completa il portiere di riferimento. Nei ballottaggi sono mantenuti tutti i candidati indicati dalla fonte: non vengono trasformati in titolari certi."),
        Spacer(1, 3 * mm),
        goalkeeper_rotation_table(rotations),
        Spacer(1, 3 * mm),
        p("Tetto gruppo = somma dei tetti dei tre portieri; Copertura = giornate in cui almeno uno ha un incrocio non difficile. Le coppie di supporto usano gerarchie chiare e squadre diverse.", SMALL),
    ]


def build_pdf():
    advice, quotations, rows, indexes = load_rows()
    by_role = {role: [row for row in rows if row["role"] == role] for role in ROLE_CONFIG}
    rotations = goalkeeper_rotation_rows(rows, indexes)
    shortlists = {}
    for role in ROLE_CONFIG:
        candidates = [row for row in by_role[role] if finite(row["customCap"])]
        candidates.sort(key=lambda row: (-row["customCap"], row["team"].casefold(), row["name"].casefold()))
        shortlists[role] = candidates[:20]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A4),
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=15 * mm,
        title="Fantacalcio - Guida asta Classic 1000 crediti",
        author="Serie A 2026/27",
        subject="Listone aggiornato e tetti d'asta per 8 partecipanti",
    )
    story = []
    story.extend(cover_story(advice, quotations, rows))
    story.append(PageBreak())
    story.extend(strategy_story(rotations))

    for role, cfg in ROLE_CONFIG.items():
        shortlist = shortlists[role]
        story.append(PageBreak())
        story.append(header_block("Shortlist", cfg["label"], f"Budget guida {cfg['target']} crediti<br/>Intervallo {cfg['range']}"))
        story.append(Spacer(1, 3 * mm))
        story.append(shortlist_table(role, shortlist))
        story.append(Spacer(1, 3 * mm))
        story.append(p("Ordine per tetto personalizzato; a parita di tetto viene prima la squadra in ordine alfabetico. Stato e minuti si riferiscono al 2025/26 e non alle sole prime due giornate attuali.", SMALL))

    story.append(PageBreak())
    shortlist_ids = {role: {row["quote"]["sourceId"] for row in role_rows} for role, role_rows in shortlists.items()}
    other_by_role = {
        role: [row for row in by_role[role] if row["quote"]["sourceId"] not in shortlist_ids[role]]
        for role in ROLE_CONFIG
    }
    other_count = sum(len(role_rows) for role_rows in other_by_role.values())

    for index, (role, cfg) in enumerate(ROLE_CONFIG.items()):
        if index:
            story.append(PageBreak())
        story.append(p(f"Altri {cfg['label'].lower()} - {len(other_by_role[role])} nomi fuori shortlist", H1))
        if index == 0:
            story.append(p(f"Appendice complessiva: {other_count} calciatori. Prima i profili con tetto disponibile, in ordine decrescente; a parita di tetto decide la squadra. I tetti N/D seguono per FVM. G/A e CG/CR sono del 2025/26.", SMALL))
            story.append(Spacer(1, 1 * mm))
        story.append(appendix_table(role, other_by_role[role]))
        story.append(Spacer(1, 2 * mm))
        story.append(p("Qt. = quotazione Classic; +/- = variazione dalla quotazione iniziale; FVM = valore Fantacalcio; G/A = gol/assist 25/26; CG/CR = gialli/rossi 25/26; Stato = fascia d'impiego ricavata dai minuti 25/26.", SMALL))

    document.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(json.dumps({
        "output": str(OUTPUT),
        "players": len(rows),
        "analysed": sum(finite(row.get("score")) for row in rows),
        "roles": {role: len(items) for role, items in by_role.items()},
        "rotations": len(rotations),
        "otherPlayers": other_count,
    }, ensure_ascii=False))


if __name__ == "__main__":
    build_pdf()
