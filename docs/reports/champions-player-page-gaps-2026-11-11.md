# Lacune statistiche delle schede Champions — 11 novembre 2026

Ambito: solo collegamento dei dati esistenti, nessuna acquisizione o ricalcolo. Rose: 1.288 giocatori. Vista predefinita 2026/27; storico 2025/26 selezionabile. Associazione entro la squadra canonica mediante ID ESPN esatto, oppure ID canonico esatto quando manca ID ESPN; associazioni ambigue escluse. Nessun recupero per nome.

I totali correnti conservano il loro ambito originale (campionato domestico o campione europeo), senza sommare competizioni. Le date di aggiornamento sono eterogenee; il collegamento non rende i dati aggiornati alla quarta giornata. N/D non significa automaticamente zero presenze.

## Campi mancanti nelle rose attuali

| Campo | Giocatori con N/D |
|---|---:|
| appearances | 523 / 1288 |
| minutes | 523 / 1288 |
| goals | 523 / 1288 |
| assists | 523 / 1288 |
| shots | 526 / 1288 |
| shotsOnTarget | 526 / 1288 |
| foulsCommitted | 523 / 1288 |
| foulsWon | 523 / 1288 |
| yellowCards | 523 / 1288 |

## Copertura per squadra

| Squadra | Registrati | Minuti N/D | Tiri N/D |
|---|---:|---:|---:|
| AEK Athens | 22 | 3 | 3 |
| Arsenal | 52 | 31 | 31 |
| Aston Villa | 66 | 44 | 44 |
| Atlético de Madrid | 47 | 25 | 25 |
| Barcelona | 35 | 12 | 12 |
| Bayern München | 30 | 9 | 9 |
| Bodø/Glimt | 32 | 10 | 10 |
| Borussia Dortmund | 29 | 8 | 8 |
| Club Brugge | 40 | 20 | 21 |
| Como | 23 | 3 | 3 |
| Fenerbahçe | 34 | 14 | 14 |
| Feyenoord | 46 | 23 | 23 |
| Galatasaray | 33 | 13 | 13 |
| Inter | 28 | 6 | 6 |
| LASK | 32 | 9 | 11 |
| Leipzig | 29 | 7 | 7 |
| Lens | 35 | 13 | 13 |
| Lille | 26 | 4 | 4 |
| Liverpool | 48 | 28 | 28 |
| Manchester City | 27 | 5 | 5 |
| Manchester United | 35 | 11 | 11 |
| Napoli | 24 | 2 | 2 |
| Paris Saint-Germain | 27 | 6 | 6 |
| Porto | 35 | 14 | 14 |
| PSV Eindhoven | 52 | 31 | 31 |
| Real Betis | 51 | 28 | 28 |
| Real Madrid | 35 | 14 | 14 |
| Roma | 25 | 6 | 6 |
| Sabah | 27 | 10 | 10 |
| Shakhtar Donetsk | 29 | 10 | 10 |
| Slavia Praha | 45 | 23 | 23 |
| Slovan Bratislava | 29 | 10 | 10 |
| Sporting CP | 65 | 46 | 46 |
| Stuttgart | 32 | 11 | 11 |
| Viking | 30 | 3 | 3 |
| Villarreal | 33 | 11 | 11 |

## Lacune escluse da questo intervento

- Aggiornamento delle acquisizioni individuali e dello storico per partita.
- Statistiche avanzate individuali e disponibilità/convocati.
- Aggiornamento dei profili statistici squadra.

## Evidenze interne

- `data/normalized/champions-registered-squads-2026-27.json`
- `data/normalized/champions-player-stats-2026-27.json`
- `data/normalized/champions-md03-player-database-2026-27.json`

## Verifica

- Test delle 36 schede superato: confronto dei valori mostrati di minuti, tiri e SOT con gli archivi correnti e preservazione N/D.
- Test browser superato su Bayern, AEK, Fenerbahçe e Sabah a 1280, 768 e 390 px: cambio stagione e ritorno, filtri, ordinamenti, ranking e assenza di overflow pagina.
