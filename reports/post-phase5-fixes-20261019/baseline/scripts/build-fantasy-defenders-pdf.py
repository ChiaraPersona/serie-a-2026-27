import json
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "fantacalcio-listone-consigli-difensori.pdf"


def read(relative_path):
    with open(ROOT / relative_path, "r", encoding="utf-8") as stream:
        return json.load(stream)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def first_finite(*values):
    return next((value for value in values if finite(value)), None)


def text_value(value):
    if not finite(value):
        return "N/D"
    return str(int(value) if float(value).is_integer() else value)


def register_fonts():
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("SiteSans", str(regular)))
        pdfmetrics.registerFont(TTFont("SiteSans-Bold", str(bold)))
        return "SiteSans", "SiteSans-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()
NAVY = colors.HexColor("#071D3A")
BLUE = colors.HexColor("#009FE3")
PALE_BLUE = colors.HexColor("#EAF7FD")
PALE_ROW = colors.HexColor("#F5F8FC")
TEXT = colors.HexColor("#172033")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#D8E2EE")


def build_rows():
    advice = read("data/generated/fantacalcio-advice.json")
    quotations = read("data/sources/fantacalcio-quotations-2026-27.json")
    fantasy_stats = read("data/sources/fantacalcio-stats-2025-26.json")
    external_stats = read("data/sources/fantasy-external-stats-2025-26.json")
    teams = read("data/normalized/teams.json")

    advice_by_id = {player["id"]: player for player in advice["players"]}
    fantasy_by_source = {str(player["sourceId"]): player for player in fantasy_stats["players"]}
    external_by_id = {player["playerId"]: player for player in external_stats["players"]}
    roster_by_id = {}
    for team in teams:
        for player in read(f"data/teams/{team['id']}.json").get("squad", []):
            roster_by_id[player["id"]] = player

    rows = []
    for quote in (player for player in quotations["players"] if player["role"] == "D"):
        player_id = quote.get("playerId")
        player = advice_by_id.get(player_id)
        fantasy = fantasy_by_source.get(str(quote["sourceId"]))
        external = external_by_id.get(player_id, {})
        roster = roster_by_id.get(player_id, {})
        roster_totals = roster.get("previousSeason", {}).get("totals", {})
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
            appearances = fantasy_appearances
            matching_external = next(
                (entry for entry in external_entries if entry.get("appearances") == appearances),
                {},
            )
            roster_minutes = roster_totals.get("minutes") if roster_appearances == appearances else None
            minutes = first_finite(roster_minutes, matching_external.get("minutes"))
            goals = fantasy.get("goalsFor")
            assists = fantasy.get("assists")
            yellow = fantasy.get("yellowCards")
            red = fantasy.get("redCards")
        elif finite(roster_appearances) and roster_appearances > 0:
            appearances = roster_appearances
            minutes = roster_totals.get("minutes")
            goals = roster_totals.get("goals")
            assists = roster_totals.get("assists")
            yellow = roster_totals.get("yellowCards")
            roster_reds = [roster_totals.get("straightRedCards"), roster_totals.get("secondYellowCards")]
            red = sum(value for value in roster_reds if finite(value)) if any(finite(value) for value in roster_reds) else None
        elif finite(external_appearances) and external_appearances > 0:
            appearances = external_appearances
            minutes = external_best.get("minutes")
            goals = external_best.get("goals")
            assists = external_best.get("assists")
            yellow = external_best.get("yellowCards")
            red = external_best.get("redCards")
        elif fantasy:
            appearances = fantasy_appearances
            minutes = 0 if fantasy_appearances == 0 else None
            goals = fantasy.get("goalsFor")
            assists = fantasy.get("assists")
            yellow = fantasy.get("yellowCards")
            red = fantasy.get("redCards")
        else:
            appearances = minutes = goals = assists = yellow = red = None

        market = player.get("marketValueLabel") if player else (roster.get("marketValue") or {}).get("label")
        goals_assists = f"{text_value(goals)} / {text_value(assists)}" if finite(goals) and finite(assists) else "N/D"
        cards = f"{text_value(yellow)} G / {text_value(red)} R" if finite(yellow) and finite(red) else "N/D"
        rows.append({
            "name": quote.get("currentName") or quote["name"],
            "team": quote["team"],
            "stars": player.get("stars") if player else None,
            "score": player.get("score") if player else None,
            "quotation": quote.get("currentQuotation"),
            "fvm": quote.get("fvm"),
            "market": market,
            "appearances": appearances,
            "minutes": minutes,
            "goalsAssists": goals_assists,
            "cards": cards,
        })

    rows.sort(key=lambda row: (row["score"] is None, -(row["score"] or 0), row["name"]))
    return rows


def cell(value, style, muted=False):
    shown = value if value not in (None, "") else "N/D"
    color = MUTED.hexval() if muted or shown == "N/D" else TEXT.hexval()
    return Paragraph(f'<font color="{color}">{shown}</font>', style)


def page_footer(canvas, document):
    canvas.saveState()
    width, _ = landscape(A4)
    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 10 * mm, width - 16 * mm, 10 * mm)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(16 * mm, 5.8 * mm, "Serie A 2026/27 - Fantacalcio | Dati storici 2025/26")
    canvas.drawRightString(width - 16 * mm, 5.8 * mm, f"Pagina {document.page}")
    canvas.restoreState()


def build_pdf():
    rows = build_rows()
    covered = sum(row["goalsAssists"] != "N/D" for row in rows)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A4),
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=13 * mm,
        bottomMargin=15 * mm,
        title="Fantacalcio - Listone e consigli difensori",
        author="Serie A 2026/27",
        subject="Listone difensori con statistiche 2025/26",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleCustom", parent=styles["Title"], fontName=FONT_BOLD, fontSize=21, leading=23, textColor=NAVY, alignment=TA_LEFT, spaceAfter=2 * mm)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontName=FONT, fontSize=9, leading=12, textColor=MUTED, spaceAfter=4 * mm)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontName=FONT, fontSize=8, leading=9.5, textColor=TEXT)
    body_bold = ParagraphStyle("BodyBold", parent=body_style, fontName=FONT_BOLD)
    right_style = ParagraphStyle("Right", parent=body_style, alignment=TA_RIGHT)
    note_style = ParagraphStyle("Note", parent=body_style, fontSize=7.5, leading=10, textColor=MUTED, spaceBefore=3 * mm)

    logo_path = ROOT / "assets" / "images" / "serie-a-logo-mark.png"
    heading = [
        Image(str(logo_path), width=17 * mm, height=17 * mm) if logo_path.exists() else "",
        [Paragraph("LISTONE E CONSIGLI", ParagraphStyle("Kicker", parent=body_bold, fontSize=8, textColor=BLUE, leading=10)), Paragraph("Difensori", title_style)],
        Paragraph(f"{len(rows)} profili<br/><font size=8 color='{MUTED.hexval()}'>{covered} con G/A disponibili</font>", ParagraphStyle("Summary", parent=body_bold, fontSize=13, leading=15, textColor=NAVY, alignment=TA_RIGHT)),
    ]
    header_table = Table([heading], colWidths=[21 * mm, 187 * mm, 52 * mm])
    header_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story = [
        header_table,
        Paragraph("Quotazioni e indicatori del listone 2026/27; presenze, minuti, gol, assist e cartellini si riferiscono ai campionati nazionali 2025/26.", subtitle_style),
    ]

    headers = ["#", "Stelle", "Difensore", "Squadra", "Indice", "Qt.", "FVM", "Val. mercato", "Pres.", "Minuti", "G / A", "Cartellini"]
    table_data = [[Paragraph(header, ParagraphStyle(f"Head{index}", parent=body_bold, fontSize=7.3, leading=8, textColor=colors.white, alignment=TA_RIGHT if index >= 4 and index not in (7, 11) else TA_LEFT)) for index, header in enumerate(headers)]]
    for index, row in enumerate(rows, 1):
        table_data.append([
            cell(str(index), right_style),
            cell(f"{row['stars']}/5" if finite(row["stars"]) else "N/D", right_style, row["stars"] is None),
            cell(row["name"], body_bold),
            cell(row["team"], body_style),
            cell(text_value(row["score"]), right_style, row["score"] is None),
            cell(text_value(row["quotation"]), right_style),
            cell(text_value(row["fvm"]), right_style),
            cell(row["market"] or "N/D", body_style, not row["market"]),
            cell(text_value(row["appearances"]), right_style, row["appearances"] is None),
            cell(text_value(row["minutes"]), right_style, row["minutes"] is None),
            cell(row["goalsAssists"], right_style, row["goalsAssists"] == "N/D"),
            cell(row["cards"], body_style, row["cards"] == "N/D"),
        ])

    widths = [8 * mm, 14 * mm, 53 * mm, 33 * mm, 15 * mm, 12 * mm, 13 * mm, 34 * mm, 13 * mm, 18 * mm, 20 * mm, 32 * mm]
    table = Table(table_data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.2),
        ("BACKGROUND", (10, 1), (10, -1), PALE_BLUE),
    ]
    for row_index in range(1, len(table_data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (9, row_index), PALE_ROW))
            commands.append(("BACKGROUND", (11, row_index), (11, row_index), PALE_ROW))
    commands.extend([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("LINEBELOW", (0, 0), (-1, 0), 1.1, BLUE),
    ])
    table.setStyle(TableStyle(commands))
    story.append(table)
    story.append(Paragraph(
        "Fonti: listone e statistiche Fantacalcio, statistiche squadra ed ESPN Core. Priorita per G/A: Fantacalcio, dato squadra del calciatore, ESPN Core. I valori non verificabili restano N/D; nessuno zero e stato stimato.",
        note_style,
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(f"PDF generato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')}", note_style))
    document.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(f"Creato {OUTPUT} ({len(rows)} difensori, {covered} con G/A disponibili).")


if __name__ == "__main__":
    build_pdf()
