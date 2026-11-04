# Confronto interno forza Champions

Cutoff esclusivo: 2026-11-04. Solo ricerca, nessuna attivazione operativa.

36 squadre; 63 risultati Champions archiviati. Altre coppe non aggiornate.

## Confronto cronologico

Ogni partita è prevista prima dell'aggiornamento; le gare dello stesso giorno usano lo stesso stato iniziale. Replay retrospettivo, non validazione prospettica. Log-loss e Brier più bassi sono migliori.

Congelato: {"logLoss":0.80021,"brier":0.45598}. Aggiornato: {"logLoss":0.80759,"brier":0.46169}.

## Squadre

Forma = punti/gara domestici nelle ultime otto osservazioni archiviate. Residuo completo N/D se manca anche un solo avversario con rating diretto; sottoinsiemi nel JSON. Tiri e forma non entrano nell'Elo.

| Squadra | Elo storico | Elo aggiornato | Gare CL | Gare domestiche | Punti/gara | Avversari con Elo | Residuo completo |
|---|---:|---:|---:|---:|---:|---:|---:|
| Paris Saint-Germain | 1759.8 | 1801.70732 | 4 | 8 | 2.375 | 5 | N/D |
| Arsenal | 1777.32 | 1795.83928 | 3 | 7 | 2.57143 | 3 | N/D |
| Bayern München | 1758.69 | 1774.58204 | 4 | 8 | 2.25 | 4 | N/D |
| Aston Villa | 1735.64 | 1746.34939 | 4 | 8 | 1.5 | 5 | N/D |
| Barcelona | 1684.55 | 1712.53876 | 4 | 8 | 2.625 | 2 | N/D |
| Real Madrid | 1669.17 | 1709.69903 | 3 | 8 | 2.25 | 5 | N/D |
| Liverpool | 1644.46 | 1679.38185 | 3 | 7 | 1.71429 | 3 | N/D |
| Atlético de Madrid | 1637.92 | 1617.91034 | 4 | 8 | 2.625 | 2 | N/D |
| Real Betis | 1559.47 | 1606.48699 | 3 | 8 | 2 | 3 | N/D |
| Borussia Dortmund | 1594.25 | 1605.0857 | 3 | 7 | 2.14286 | 2 | N/D |
| Manchester United | 1609.43 | 1600.32473 | 4 | 8 | 0.875 | 3 | N/D |
| Sporting CP | 1577.22 | 1598.37024 | 4 | 8 | 2.125 | 1 | N/D |
| Inter | 1605.1 | 1596.60576 | 4 | 8 | 2.375 | 4 | N/D |
| Manchester City | 1575.58 | 1596.21299 | 3 | 8 | 2.625 | 4 | N/D |
| Roma | 1610.5 | 1580.83203 | 4 | 8 | 2.25 | 3 | N/D |
| Club Brugge | 1550.73 | 1575.24771 | 3 | 8 | 2.625 | 1 | N/D |
| Bodø/Glimt | 1565.15 | 1545.3906 | 4 | 8 | 2.25 | 1 | N/D |
| Fenerbahçe | 1553.57 | 1533.31005 | 3 | 8 | 2 | 2 | N/D |
| Galatasaray | 1501.91 | 1516.23216 | 4 | 8 | 2.625 | 1 | N/D |
| PSV Eindhoven | 1514.53 | 1514.91896 | 3 | 8 | 2 | 3 | N/D |
| Como | N/D | 1514.08019 | 3 | 7 | 2 | 0 | N/D |
| Porto | 1571.27 | 1507.37963 | 3 | 8 | 3 | 1 | N/D |
| AEK Athens | 1520.34 | 1500.35559 | 3 | 6 | 2.33333 | 0 | N/D |
| Stuttgart | 1477.9 | 1497.01457 | 4 | 8 | 1.125 | 3 | N/D |
| Lens | 1500.8 | 1485.8841 | 3 | 8 | 1.25 | 4 | N/D |
| Viking | N/D | 1484.93816 | 3 | 8 | 2 | 0 | N/D |
| Shakhtar Donetsk | 1496.11 | 1483.8433 | 4 | 8 | 2.375 | 0 | N/D |
| Lille | 1527.66 | 1481.47162 | 4 | 8 | 1.875 | 4 | N/D |
| Sabah | N/D | 1480.3553 | 3 | 0 | N/D | N/D | N/D |
| Napoli | 1468.46 | 1462.61257 | 3 | 8 | 1.375 | 4 | N/D |
| Leipzig | 1426.96 | 1427.9423 | 3 | 6 | 1.5 | 3 | N/D |
| Villarreal | 1428.16 | 1420.8893 | 4 | 8 | 1.25 | 2 | N/D |
| LASK | 1395.42 | 1418.12828 | 4 | 8 | 1.5 | 2 | N/D |
| Feyenoord | 1428.73 | 1415.38655 | 4 | 8 | 2.25 | 3 | N/D |
| Slavia Praha | 1401.12 | 1380.90228 | 3 | 0 | N/D | N/D | N/D |
| Slovan Bratislava | 1346.78 | 1306.49034 | 4 | 8 | 1.875 | 0 | N/D |

## Limiti e riproduzione

- Existing frozen Elo parameters and probability/update formulas; batches by date; current day excluded. Current-season update covers archived Champions results only, not Europa/Conference.
- Last eight archived current-season domestic games. Points minus frozen-Elo expected points; only exact provider-ID or explicit canonicalTeamId to canonical UEFA-ID matches. ESPN IDs never reused for other providers. Full adjustment N/D unless all opponents covered; subset explicitly separate. No league-to-probability conversion.
- Raw domestic shot difference only; not opponent-adjusted, not used in rating. xG unavailable.
- Retrospective chronological replay of archived results, not a prospectively frozen forecast. Original result acquisition timestamps were not enforced. No domestic/shot composite fitted or validated.
- Sample counts and historical-rating availability only; no calibrated confidence score.
- Frozen European-qualifier association median, not whole domestic league strength.

Non promuovere il confronto a pronostico: nessuna prova di miglioramento del contributo domestico o dei tiri. Nessuna probabilità DUO o modifica di quote/selezioni.

Comando: node scripts/build-champions-strength-comparison.cjs --as-of 2026-11-04

Evidenza completa e hash input: [JSON](../../data/analysis/champions/strength-comparison-2026-11-04-opponent-map.json).

Fonti canoniche interne:
- `data/normalized/uefa-1x2-model-2026-27.json` (SHA-256 nel JSON).
- `data/normalized/champions-league-2026-27.json` (SHA-256 nel JSON).
- `data/sources/champions-team-history-map-2026-27.json` (SHA-256 nel JSON).
- `data/sources/champions-pilot-match-stats-2025-27.json` (SHA-256 nel JSON).
- `data/normalized/champions-team-strength-2026-27.json` (SHA-256 nel JSON).
- `data/normalized/uefa-europe-history-2023-26.json` (SHA-256 nel JSON).
- `data/sources/champions-opponent-identity-map-2026-27.json` (SHA-256 nel JSON).
- `data/sources/champions-results-md01-2026-27.json` (SHA-256 nel JSON).
- `data/sources/champions-results-md02-2026-27.json` (SHA-256 nel JSON).
- `data/sources/champions-results-md03-2026-27.json` (SHA-256 nel JSON).
- `data/sources/champions-results-md04-2026-27.json` (SHA-256 nel JSON).

Esito: No improvement on both metrics in this archived sample; do not activate. Significatività statistica non stabilita.

Copertura avversari domestici con rating diretto: 83/264 osservazioni nelle finestre. Mapping limitato alle identità canoniche disponibili, senza inferenze sui nomi. Forma domestica assente: Sabah, Slavia Praha.

Variante con overlay identità: aggiungere --with-opponent-map al comando. L'overlay disponibile oggi non prova la conoscenza delle identità prima delle gare passate; la base originale è conservata nel report senza suffisso.
