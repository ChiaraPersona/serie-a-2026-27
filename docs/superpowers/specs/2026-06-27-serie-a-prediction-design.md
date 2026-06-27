# Serie A 2026/27 — Prediction Engine Design

## Overview

Applicazione web per pronosticare i risultati della Serie A 2026/27, giornata per giornata. Il sistema predice: risultato esatto, corner, cartellini, tiri in porta e tiri totali, sia a livello di squadra che di singolo calciatore.

**Stack**: Flask + SQLite + Jinja2 (server-rendered HTML)  
**Metodo predittivo**: Monte Carlo (10.000 simulazioni per partita)  
**Dati**: Ibrido — seed manuale (JSON) + scraping da Transfermarkt, FBref, Diretta.it  
**Fase futura**: simulazione classifica finale a fine stagione

---

## 1. Modello Dati

### `teams` — Le 20 squadre di Serie A

| Campo | Tipo | Note |
|---|---|---|
| id | INT PK | |
| name | TEXT | Nome completo |
| short_name | TEXT | Abbreviazione (MIL, INT, JUV...) |
| stadium | TEXT | Stadio di casa |
| city | TEXT | Città |
| ranking | INT | Posizione nella griglia di partenza (1-20) |
| mood | REAL | Umore squadra (-1 a +1), aggiornabile |
| season_objective | TEXT | Obiettivo stagionale (scudetto, Europa, salvezza...) |
| home_advantage | REAL | Fattore casa (default 1.0, modificabile) |

### `players` — I calciatori

| Campo | Tipo | Note |
|---|---|---|
| id | INT PK | |
| name | TEXT | |
| team_id | FK → teams | |
| position | TEXT | POR, DIF, CEN, ATT |
| age | INT | |
| market_value | REAL | In milioni € |
| prev_goals | INT | Gol stagione precedente |
| prev_assists | INT | Assist stagione precedente |
| prev_cards | INT | Cartellini stagione precedente |
| prev_shots_total | INT | Tiri totali stagione precedente |
| prev_shots_on_target | INT | Tiri in porta stagione precedente |
| prev_corners_won | INT | Corner guadagnati stagione precedente |

### `matches` — Calendario

| Campo | Tipo | Note |
|---|---|---|
| id | INT PK | |
| matchday | INT | Giornata (1-38) |
| home_team_id | FK → teams | |
| away_team_id | FK → teams | |
| date | DATE | |
| played | BOOL | Se già giocata |

### `match_results` — Risultati reali (quando disponibili)

| Campo | Tipo |
|---|---|
| match_id | FK → matches (PK) |
| home_score | INT |
| away_score | INT |
| home_corners | INT |
| away_corners | INT |
| home_cards | INT |
| away_cards | INT |
| home_shots_on_target | INT |
| away_shots_on_target | INT |
| home_shots_total | INT |
| away_shots_total | INT |

### `player_match_stats` — Statistiche reali per calciatore/partita

| Campo | Tipo |
|---|---|
| player_id | FK → players |
| match_id | FK → matches |
| goals | INT |
| assists | INT |
| cards | INT |
| shots_on_target | INT |
| shots_total | INT |
| corners_won | INT |

### `predictions` — Pronostici Monte Carlo

| Campo | Tipo | Note |
|---|---|---|
| id | INT PK | |
| match_id | FK → matches | |
| created_at | DATETIME | |
| simulations | INT | N. simulazioni eseguite |
| pred_home_score | REAL | Media gol casa |
| pred_away_score | REAL | Media gol trasferta |
| prob_home_win | REAL | % vittoria casa |
| prob_draw | REAL | % pareggio |
| prob_away_win | REAL | % vittoria trasferta |
| pred_home_corners | REAL | |
| pred_away_corners | REAL | |
| pred_home_cards | REAL | |
| pred_away_cards | REAL | |
| pred_home_sot | REAL | Tiri in porta casa |
| pred_away_sot | REAL | Tiri in porta trasferta |
| pred_home_shots | REAL | Tiri totali casa |
| pred_away_shots | REAL | Tiri totali trasferta |

### `player_predictions` — Pronostici per calciatore

| Campo | Tipo |
|---|---|
| prediction_id | FK → predictions |
| player_id | FK → players |
| pred_goals | REAL |
| pred_cards | REAL |
| pred_shots_on_target | REAL |
| pred_shots_total | REAL |
| prob_goal | REAL | % probabilità di segnare |
| prob_card | REAL | % probabilità cartellino |

### `head_to_head` — Storico scontri diretti

| Campo | Tipo |
|---|---|
| team1_id | FK → teams |
| team2_id | FK → teams |
| matches_played | INT |
| team1_wins | INT |
| team2_wins | INT |
| draws | INT |
| avg_goals_team1 | REAL |
| avg_goals_team2 | REAL |

---

## 2. Motore di Predizione Monte Carlo

### 2.1 Calcolo forza squadra (`team_strength`)

Punteggio composito scala 0-100:

| Fattore | Peso | Descrizione |
|---|---|---|
| Rendimento precedente | 30% | Punti, gol fatti/subiti, posizione in classifica 2025/26 |
| Rosa | 35% | Media valore mercato + età media + profondità rosa (somma valori top 18 giocatori) |
| Umore | 10% | Fattore -1 a +1, moltiplicatore sulla forza base |
| Obiettivo stagionale | 5% | Bonus/malus in base alla motivazione |
| Casa/Trasferta | 20% | Varia in base al match: bonus dal fattore `home_advantage` |

### 2.2 Calcolo forza calciatore (`player_strength`)

| Fattore | Peso | Descrizione |
|---|---|---|
| Rendimento precedente | 45% | Gol, assist, tiri, corner 2025/26 normalizzati per ruolo |
| Valore di mercato | 35% | Normalizzato su scala 0-100 rispetto al massimo della lega |
| Età | 20% | Curva a campana: picco a 27 anni, decadimento dopo i 32, bonus sotto i 23 |

### 2.3 Simulazione della partita (per ogni run)

1. **Forza effettiva** = `team_strength` + rumore gaussiano (σ = 5%)
2. **xG** = funzione della differenza di forza, con fattore casa applicato
3. **Gol effettivi** = campionamento da Poisson(λ = xG)
4. **Corner** = funzione lineare di tiri totali attesi + differenza forza + casa. Rumore gaussiano (σ = 15%)
5. **Cartellini** = funzione di differenza forza + storico cartellini squadra. Rumore gaussiano (σ = 20%)
6. **Tiri in porta** = proporzionali ai gol (ratio ~3 tiri in porta per gol). Rumore gaussiano (σ = 10%)
7. **Tiri totali** = tiri in porta * fattore (1.5-2.5) in base allo stile di gioco

### 2.4 Distribuzione ai calciatori

- **Gol**: distribuiti per `player_strength` pesato (ATT > CEN > DIF)
- **Cartellini**: distribuiti per storico cartellini + ruolo (DIF > CEN > ATT)
- **Tiri**: distribuiti per `player_strength` e storico tiri
- **Corner**: assegnati solo ai battitori designati (basato su storico corner guadagnati)

### 2.5 Aggregazione finale (dopo N simulazioni)

- Media per ogni metrica
- Probabilità esito: % vittoria casa / pareggio / vittoria trasferta
- Intervallo di confidenza 90%
- Probabilità marcatore: % simulazioni con almeno 1 gol
- Probabilità cartellino: % simulazioni con almeno 1 cartellino

---

## 3. Architettura Flask

### 3.1 Struttura del progetto

```
serie-a-2026-27/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Configurazioni (DB, Monte Carlo params)
│   ├── extensions.py            # SQLAlchemy, Migrate init
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── team.py              # Team model
│   │   ├── player.py            # Player model
│   │   ├── match.py             # Match, MatchResult, PlayerMatchStats
│   │   ├── prediction.py        # Prediction, PlayerPrediction
│   │   └── head_to_head.py      # HeadToHead
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── team_service.py      # CRUD + calcolo team_strength
│   │   ├── player_service.py    # CRUD + calcolo player_strength
│   │   ├── match_service.py     # CRUD match + risultati reali
│   │   ├── prediction_engine.py # Motore Monte Carlo (core)
│   │   ├── scraper.py           # Scraping Transfermarkt/FBref/Diretta
│   │   └── ranking_service.py   # Calcolo ranking, umore, H2H
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── main.py              # Home, dashboard
│   │   ├── predictions.py       # Pagina pronostici per giornata
│   │   ├── teams.py             # Pagine squadre
│   │   ├── players.py           # Pagine calciatori
│   │   └── api.py               # API REST (future-proof)
│   │
│   ├── templates/
│   │   ├── base.html            # Layout base
│   │   ├── index.html           # Dashboard
│   │   ├── predictions.html     # Pronostici giornata
│   │   ├── team.html            # Dettaglio squadra
│   │   ├── player.html          # Dettaglio calciatore
│   │   └── match.html           # Dettaglio partita
│   │
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   │
│   └── cli/
│       ├── __init__.py
│       ├── seed.py              # Popola DB da JSON/CSV
│       ├── scrape.py            # Esegue scraping
│       └── predict.py           # Lancia simulazioni da CLI
│
├── data/
│   ├── seed/
│   │   ├── teams.json           # Dati iniziali squadre
│   │   ├── players.json         # Dati iniziali calciatori
│   │   ├── matches.json         # Calendario 2026/27
│   │   └── h2h.json             # Storico scontri diretti
│   └── scraped/                 # Dati raccolti via scraping
│
├── tests/
│   ├── conftest.py
│   ├── test_models.py
│   ├── test_services.py
│   ├── test_prediction_engine.py
│   └── test_routes.py
│
├── requirements.txt
├── run.py                       # Entry point
└── README.md
```

### 3.2 Route principali

| Route | Metodo | Descrizione |
|---|---|---|
| `/` | GET | Dashboard: prossima giornata, ultimi risultati |
| `/giornata/<n>` | GET | Pronostici per la giornata N |
| `/giornata/<n>/simula` | POST | Lancia simulazione Monte Carlo per la giornata |
| `/squadra/<id>` | GET | Dettaglio squadra: rosa, statistiche, forza |
| `/calciatore/<id>` | GET | Dettaglio calciatore: stats, valore, età |
| `/partita/<id>` | GET | Dettaglio partita: pronostico vs risultato reale |
| `/classifica` | GET | Classifica attuale |

### 3.3 CLI Commands

```
flask seed all              # Popola tutto il DB dai JSON
flask seed teams            # Solo squadre
flask seed players          # Solo calciatori
flask seed matches          # Solo calendario
flask scrape transfermarkt  # Scraping valori mercato
flask scrape fbref          # Scraping statistiche
flask scrape diretta        # Scraping risultati
flask predict 5             # Simula giornata 5 (10k run)
flask predict 5 --runs 50000  # Simula con 50k run
```

---

## 4. Testing Strategy

- **Unit test**: modelli SQLAlchemy, funzioni di calcolo forza, distribuzione calciatori
- **Integration test**: simulazione Monte Carlo end-to-end con dati noti, verifica output deterministico con seed fissato
- **Route test**: Flask test client, verifica template rendering e codici HTTP
- **Edge case**: squadre con forza identica, partite senza storico H2H, calciatori senza storico precedente

---

## 5. Scraping (fase ibrida)

- **Transfermarkt**: valori di mercato, età, rose aggiornate
- **FBref**: statistiche avanzate (xG, tiri, possesso, disciplina)
- **Diretta.it**: risultati partite, formazioni, statistiche match
- I dati scrapati vengono salvati in `data/scraped/` e importati nel DB tramite CLI
- I seed data in `data/seed/` forniscono i valori iniziali pre-stagione

---

## 6. Futuri sviluppi

- Simulazione classifica finale (intera stagione in una run)
- API REST per consumo da frontend JavaScript
- APScheduler per scraping automatico periodico
- Dashboard interattiva con grafici (Chart.js)
- Confronto pronostici vs risultati reali (accuracy tracking)
