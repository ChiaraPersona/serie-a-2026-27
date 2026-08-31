import json
from datetime import datetime
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


def read(relative_path):
    with open(ROOT / relative_path, "r", encoding="utf-8") as stream:
        return json.load(stream)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


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


def availability_label(player):
    current = player.get("currentAvailability") or {}
    if current.get("injuryReported"):
        return "Infortunato"
    callup = current.get("callupStatus")
    if callup == "suspended":
        return "Squalificato"
    if callup == "injured":
        return "Indisponibile"
    lineup = current.get("lineupStatus")
    probability = current.get("starterProbability")
    if lineup == "starter":
        return f"Titolare {shown(probability)}%" if finite(probability) else "Titolare"
    if lineup == "reserve":
        return f"Riserva {shown(probability)}%" if finite(probability) else "Riserva"
    if callup == "called-up":
        return "Convocato"
    return "N/D"


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


def load_rows():
    advice = read("data/generated/fantacalcio-advice.json")
    quotations = read("data/sources/fantacalcio-quotations-2026-27.json")
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
        player["customCap"] = custom_cap(player)
        player["availabilityLabel"] = availability_label(player)
        rows.append(player)
    return advice, quotations, rows


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
    headers = ["Fascia", "Calciatore", "Squadra", "Qt.", "FVM", "Stelle", "Indice", "Tetto", "Stato", "Pagato"]
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
            p(f"{shown(player.get('stars'))}/5" if finite(player.get("stars")) else "N/D", CENTER),
            p(shown(player.get("score"), 1), CENTER),
            p(f"{shown(player['customCap'])} cr", CENTER),
            p(player["availabilityLabel"], TINY),
            p("________", CENTER),
        ])
    widths = [23 * mm, 47 * mm, 28 * mm, 13 * mm, 15 * mm, 16 * mm, 17 * mm, 19 * mm, 50 * mm, 25 * mm]
    table = Table(data, colWidths=widths, repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.4),
        ("BACKGROUND", (7, 1), (7, -1), PALE_GOLD),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (6, row_index), PALE))
            commands.append(("BACKGROUND", (8, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def appendix_table(role, role_rows):
    headers = ["", "Calciatore", "Squadra", "Qt.", "+/-", "FVM", "Stelle", "Indice", "Tetto", "Stato", "Pagato", "Fanta-allenatore"]
    data = [[p(x, WHITE_HEAD) for x in headers]]
    for player in sorted(role_rows, key=lambda item: item["name"].casefold()):
        quote = player["quote"]
        difference = quote.get("quotationDifference")
        difference_text = f"{difference:+d}" if isinstance(difference, int) else "N/D"
        stars = f"{shown(player.get('stars'))}/5" if finite(player.get("stars")) else "N/D"
        cap = f"{shown(player['customCap'])} cr" if finite(player["customCap"]) else "N/D"
        data.append([
            p("[ ]", CENTER),
            p(player["name"], TINY_BOLD),
            p(player["team"], TINY),
            p(shown(quote.get("currentQuotation")), CENTER),
            p(difference_text, CENTER),
            p(shown(quote.get("fvm")), CENTER),
            p(stars, CENTER),
            p(shown(player.get("score"), 1), CENTER),
            p(cap, CENTER),
            p(player["availabilityLabel"], TINY),
            p("_______", CENTER),
            p("________________", CENTER),
        ])
    widths = [9 * mm, 45 * mm, 25 * mm, 12 * mm, 12 * mm, 14 * mm, 15 * mm, 16 * mm, 18 * mm, 38 * mm, 21 * mm, 36 * mm]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
        ("BACKGROUND", (8, 1), (8, -1), PALE_GOLD),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (7, row_index), PALE))
            commands.append(("BACKGROUND", (9, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def goalkeeper_trios(advice):
    examples = ((advice.get("goalkeeperTrios") or {}).get("examples") or [])[:3]
    data = [[p(x, WHITE_HEAD) for x in ["Soluzione", "Portieri", "Costo guida", "Copertura", "Favorevoli", "Difficili"]]]
    for index, example in enumerate(examples, 1):
        names = " + ".join(player["name"] for player in example.get("players", []))
        adjusted_cost = round((example.get("cost500") or 0) * 2 * ROLE_CONFIG["P"]["factor"])
        data.append([
            p(f"Rotazione {index}", TINY_BOLD),
            p(names, TINY),
            p(f"circa {adjusted_cost} cr", CENTER),
            p(f"{example.get('coveredDays', 'N/D')}/38", CENTER),
            p(example.get("favorableDays", "N/D"), CENTER),
            p(example.get("difficultDays", "N/D"), CENTER),
        ])
    table = Table(data, colWidths=[28 * mm, 123 * mm, 33 * mm, 27 * mm, 25 * mm, 25 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, 2), (-1, 2), PALE),
    ]))
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
        p("Una guida operativa per decidere in fretta: budget per ruolo, shortlist ordinate per tetto d'asta e listone completo con spazio per segnare acquisti e prezzi.", ParagraphStyle("Intro", parent=BODY, fontSize=11, leading=15, textColor=INK)),
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


def strategy_story(advice):
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
        p("Rotazioni portieri suggerite", H2),
        goalkeeper_trios(advice),
        Spacer(1, 4 * mm),
        p("Disciplina durante i rilanci", H2),
        p("Segna subito prezzo e proprietario nell'appendice. Dopo ogni acquisto ricalcola il residuo del ruolo. Supera il tetto solo se hai risparmiato davvero altrove e il giocatore cambia la struttura della rosa; non recuperare un obiettivo perso rilanciando sul nome successivo."),
        Spacer(1, 3 * mm),
        p("Nota: shortlist e tetti sono una guida euristica costruita sui dati disponibili, non una previsione certa di rendimento o prezzo finale.", SMALL),
    ]


def build_pdf():
    advice, quotations, rows = load_rows()
    by_role = {role: [row for row in rows if row["role"] == role] for role in ROLE_CONFIG}
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
    story.extend(strategy_story(advice))

    for role, cfg in ROLE_CONFIG.items():
        candidates = [row for row in by_role[role] if finite(row["customCap"])]
        candidates.sort(key=lambda row: (-row["customCap"], -(row.get("score") or 0), row["name"]))
        shortlist = candidates[:20]
        story.append(PageBreak())
        story.append(header_block("Shortlist", cfg["label"], f"Budget guida {cfg['target']} crediti<br/>Intervallo {cfg['range']}"))
        story.append(Spacer(1, 3 * mm))
        story.append(shortlist_table(role, shortlist))
        story.append(Spacer(1, 3 * mm))
        story.append(p("Ordine per tetto personalizzato, poi indice del modello. La fascia descrive il profilo di spesa, non garantisce titolarita o rendimento.", SMALL))

    story.append(PageBreak())
    story.append(p(f"Appendice - Listone completo ({len(rows)} calciatori)", H1))
    story.append(p("Ordine alfabetico per ruolo. Usa [ ] per i giocatori chiamati, Pagato per il prezzo finale e Fanta-allenatore per il proprietario. N/D indica dati insufficienti: il valore non viene inventato.", SMALL))
    story.append(Spacer(1, 2 * mm))

    for index, (role, cfg) in enumerate(ROLE_CONFIG.items()):
        if index:
            story.append(PageBreak())
        story.append(p(f"{cfg['label']} - {len(by_role[role])} nomi", H1))
        story.append(appendix_table(role, by_role[role]))
        story.append(Spacer(1, 2 * mm))
        story.append(p("Qt. = quotazione Classic; +/- = variazione dalla quotazione iniziale; FVM = valore Fantacalcio; Tetto = arresto personalizzato per questa asta.", SMALL))

    document.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(json.dumps({
        "output": str(OUTPUT),
        "players": len(rows),
        "analysed": sum(finite(row.get("score")) for row in rows),
        "roles": {role: len(items) for role, items in by_role.items()},
    }, ensure_ascii=False))


if __name__ == "__main__":
    build_pdf()
