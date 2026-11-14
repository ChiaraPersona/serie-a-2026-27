"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildStatisticalModelArtifact } = require("./md06-statistical-models");

const root = path.resolve(__dirname, "..");
const artifact = buildStatisticalModelArtifact();
const jsonPath = path.join(root, "data/analysis/serie-a-md06-statistical-models-2026-10-10.json");
const reportPath = path.join(root, "output/reports/serie-a-md06-statistical-models-2026-10-10.md");
fs.writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);

const rows = Object.entries(artifact.validation.subfamilies).map(([family, row]) => `| ${family} | ${row.matchClusters} | ${row.brier.toFixed(4)} | ${row.baselineBrier.toFixed(4)} | ${row.deltaBrier >= 0 ? "+" : ""}${row.deltaBrier.toFixed(4)} | ${row.ece.toFixed(4)} | ${row.meanBias.toFixed(3)} | ${row.gate} |`);
const pass = Object.entries(artifact.validation.subfamilies).filter(([, row]) => row.gate === "PASS").map(([family]) => family);
const markdown = `# Serie A 2026/27 - modelli statistici Schedina MD6

Generato: ${artifact.generatedAt}

## Esito

- Storico ricostruito e riconciliato: **${artifact.dataCoverage.historicalMatches} partite / ${artifact.dataCoverage.historicalTeamPerformances} prestazioni squadra**.
- Holdout temporale: **${artifact.validation.holdoutMatches} partite** (MD20-MD38), con aggiornamento walk-forward soltanto dopo ogni giornata conclusa.
- Famiglie validate: **${pass.length ? pass.join(", ") : "nessuna"}**.
- Valutazioni MD6 disponibili: **${Object.keys(artifact.evaluations).length}**.

## Validazione

| Sottofamiglia | Cluster | Brier | Baseline | Delta | ECE | Bias | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows.join("\n")}

Gate prespecificato: almeno 180 cluster, Delta Brier <= +0,005, ECE <= 0,08 e bias assoluto entro il limite della famiglia. Le probabilita prudenti sottraggono 2-5 punti percentuali in funzione dell'ECE del holdout.

## Contratti e limiti

- Tiri/SOT squadra e partita: tempi regolamentari; definizioni Sisal riconciliate con i conteggi storici.
- Corner: solo corner effettivamente battuti nei tempi regolamentari; somme e 1X2 sono calcolati dalla distribuzione discreta congiunta.
- Cartellini: **non promossi**. La regola Sisal e nota, ma gli aggregati storici non consentono di escludere con certezza panchina, staff, post-partita e giocatori gia sostituiti.
- Mercati giocatore: **non promossi**. I totali quotati sono DUO; i mercati standard rimasti sono per entrambi i tempi e non coincidono con il target V2 full-match.
`;
fs.writeFileSync(reportPath, markdown);
console.log(`OK modelli statistici MD6: ${pass.length} sottofamiglie PASS, ${Object.keys(artifact.evaluations).length} valutazioni quotate`);
