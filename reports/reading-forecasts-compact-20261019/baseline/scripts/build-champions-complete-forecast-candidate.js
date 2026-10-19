"use strict";

const fs = require("fs");
const path = require("path");
const { buildCandidate, sha256File } = require("./champions/complete-forecast-snapshots");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-13";
const generatedAtArgument = process.argv.find(argument => argument.startsWith("--generated-at="));
const generatedAt = generatedAtArgument ? generatedAtArgument.slice("--generated-at=".length) : new Date().toISOString();
if (!Number.isFinite(new Date(generatedAt).getTime())) throw new Error(`Invalid --generated-at: ${generatedAt}`);

const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const verification = {
  provider: "UEFA",
  source: {
    url: "https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-a/",
    title: "2026/27 Champions League: All the league phase fixtures and results",
    lastUpdated: "2026-10-09"
  },
  verifiedAt: "2026-10-13T09:40:00.000Z",
  matchdays: [1, 2, 3],
  timezone: "Europe/Rome",
  statedTimeBasis: "UEFA page lists all times as CET; repository calendar stores the corresponding Europe/Rome local kickoffs.",
  calendarSha256: sha256File(calendarPath)
};

const candidate = buildCandidate({ root, generatedAt, kickoffVerification: verification });
const outputPath = path.join(root, `data/analysis/champions/complete-forecast-candidate-${auditDate}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(candidate, null, 2)}\n`);

const percentage = (value, total) => total ? `${(value / total * 100).toFixed(1).replace(".", ",")}%` : "N/D";
const report = `# Champions League 2026/27 — Fase 10 complete pre-match forecast snapshots

Data audit: **${auditDate}**  
Gate finale: **PARTIAL**

## 1. Squadre e identità

- Squadre supportate: **${candidate.summary.supportedTeams}**.
- Giocatori registrati presenti nel dataset completo: **${candidate.summary.registrationEligiblePlayers}**.
- Identità verificate Fase 9 integrate tramite overlay: **${candidate.identityOverlay.resolved.length}** (37 exact-name-only + Mika Mármol Medina).
- Discrepanze List A temporalmente ambigue conservate come non-errori automatici: **${candidate.identityOverlay.ambiguousListA.length}**.
- Registri protetti riscritti: **0**.

## 2. Forecast completo

| misura | valore |
|---|---:|
| giocatori registrati serializzati | ${candidate.summary.registrationEligiblePlayers} |
| giocatori forecast-eligible secondo il modello esistente | ${candidate.summary.forecastEligiblePlayers} |
| righe con tiri + SOT originali prodotti dalla formula esistente | ${candidate.summary.completeForecastRows} |
| copertura sui registrati | ${percentage(candidate.summary.completeForecastRows, candidate.summary.registrationEligiblePlayers)} |
| potenziali subentranti serializzati | ${candidate.summary.potentialSubstitutes} |
| potenziali subentranti con forecast | ${candidate.summary.potentialSubstitutesWithForecast} |
| probabilità evento originali prodotte | ${candidate.summary.eventProbabilitiesProduced} |

La vista top-5 esistente resta separata e invariata. Il dataset completo rende espliciti i minuti impliciti già usati dalla formula (84,6 per gli outfield titolari; 90 per il portiere), senza stimare minuti per panchinari o riserve. Per questi ultimi tiri, SOT e probabilità restano null.

## 3. Cronologia e salvataggio

- Fonte kickoff: UEFA, aggiornata il 9 ottobre 2026 e verificata il 13 ottobre 2026.
- Candidati prepartita validi in questa esecuzione: **${candidate.summary.prematchCandidates}**.
- Ricalcoli post-kickoff: **${candidate.summary.postKickoffRecalculations}**.
- Snapshot storici modificati: **0**.

Il freezer usa creazione esclusiva e rifiuta: timestamp non precedente al kickoff, kickoff non verificato e copertura incompleta dei giocatori registrati. Un secondo tentativo identico è idempotente; contenuto diverso sullo stesso percorso genera conflitto e non sovrascrive il file.

## 4. Valutazione futura

Il processo di associazione actual/snapshot calcola MAE, RMSE e bias separatamente per le finestre \`calibration\`, \`test\` e \`unassigned\`. Il Brier viene calcolato soltanto quando nello snapshot esiste una probabilità evento originale. Nessuna calibrazione viene eseguita.

## 5. Blocchi residui

1. Il modello corrente non produce expected minutes per potenziali subentranti o riserve.
2. Senza expected minutes originali, non è lecito estendere tiri/SOT ai subentranti usando una nuova formula.
3. Il payload attuale riguarda MD1; essendo stato rigenerato dopo il kickoff, è classificato solo come ricalcolo e non può essere congelato come originale.
4. Nessuna probabilità evento individuale originale è serializzata dal modello player-volume corrente.
5. Servono input prepartita completi per MD3 prima di poter creare il primo snapshot realmente completo e cronologicamente valido.

## 6. Gate

**PARTIAL**

Formato completo, overlay identità, verifica cronologica, congelamento immutabile e valutatore futuro sono implementati. Il gate non è READY perché la copertura quantitativa dei potenziali subentranti è ancora bloccata a monte dall'assenza di expected minutes originali; il freezer impedisce di chiamare “completo” uno snapshot parziale.
`;
fs.writeFileSync(path.join(root, `output/reports/champions-complete-forecast-snapshots-${auditDate}.md`), report);

console.log(`Champions complete forecast candidate: ${candidate.summary.supportedTeams} squadre · ${candidate.summary.registrationEligiblePlayers} registrati · ${candidate.summary.completeForecastRows} forecast · ${candidate.summary.potentialSubstitutesWithForecast}/${candidate.summary.potentialSubstitutes} subentranti.`);
