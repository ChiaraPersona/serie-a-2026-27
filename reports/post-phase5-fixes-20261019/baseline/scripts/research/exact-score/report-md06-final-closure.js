"use strict";

const fs = require("fs");
const {
  root,
  snapshotRelative,
  manifestRelative,
  evaluationRelative,
  validationRelative,
  reportJsonRelative,
  reportMarkdownRelative,
  modelOrder,
  read,
  write,
  fileHash,
  hashManifest,
  captureProtectedHashes,
  compareHashes,
  validateProspectiveSnapshot,
} = require("./prospective-md06");

const forensicRelative = "output/reports/sisal-md06-1x2-ev-forensic-audit-2026-10-09.json";
const researchEvaluationRelative = "data/analysis/exact-score-research/exact-score-evaluation.json";
const multiseasonRelative = "data/generated/prediction-backtest-multiseason.json";
const percent = (value, digits = 1) => Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : "N/D";
const number = (value, digits = 3) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const pp = value => Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp` : "N/D";
const table = (headers, rows) => [
  `| ${headers.join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`),
].join("\n");

function favoriteSummary(diagnostics) {
  const rows = diagnostics || [];
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const favorite = [], outsider = [], maximum = [];
  for (const row of rows) {
    const home = row.outcomeProbabilities.home, away = row.outcomeProbabilities.away;
    const favoriteHome = home >= away;
    favorite.push({ p: Math.max(home, away), y: Number(row.actualOutcomeIndex === (favoriteHome ? 0 : 2)) });
    outsider.push({ p: Math.min(home, away), y: Number(row.actualOutcomeIndex === (favoriteHome ? 2 : 0)) });
    maximum.push(Math.max(home, row.outcomeProbabilities.draw, away));
  }
  return {
    n: rows.length,
    favorite: { predicted: mean(favorite.map(row => row.p)), observed: mean(favorite.map(row => row.y)) },
    outsider: { predicted: mean(outsider.map(row => row.p)), observed: mean(outsider.map(row => row.y)) },
    maximumProbability: { mean: mean(maximum), maximum: maximum.length ? Math.max(...maximum) : null, atLeast80Pct: maximum.filter(value => value >= 0.8).length },
  };
}

function main() {
  const before = captureProtectedHashes();
  const snapshot = read(snapshotRelative);
  const manifest = read(manifestRelative);
  const evaluation = read(evaluationRelative);
  const validation = read(validationRelative);
  const forensic = read(forensicRelative);
  const retrospective = read(researchEvaluationRelative);
  const multiseason = read(multiseasonRelative);
  const snapshotFailures = validateProspectiveSnapshot(snapshot);
  if (snapshotFailures.length) throw new Error(snapshotFailures.join("; "));
  if (validation.status !== "PASS" || snapshot.productionIntegrity.status !== "PASS") throw new Error("Focused validation or production integrity did not pass");
  if (evaluation.status !== "PENDING" || evaluation.commonSample.n !== 0) throw new Error("Expected pre-result PENDING evaluation");
  const byMatch = new Map(snapshot.matches.map(row => [row.matchId, row]));
  const forensicByMatch = new Map(forensic.fixtures.map(row => [row.matchId, row]));
  const modelComparison = snapshot.matches.map(match => ({
    matchId: match.matchId,
    label: forensicByMatch.get(match.matchId)?.label || `${match.homeTeam} – ${match.awayTeam}`,
    kickoffUtc: match.kickoff.utc,
    models: Object.fromEntries(modelOrder.map(label => {
      const prediction = match.predictions.find(row => row.modelLabel === label);
      return [label, {
        lambdaHome: prediction.lambdaHome,
        lambdaAway: prediction.lambdaAway,
        oneXTwo: prediction.probabilities.oneXTwo,
        bttsYes: prediction.probabilities.btts.yes,
        over25: prediction.probabilities.overUnder2_5.over,
        top3: prediction.top3ExactScores,
      }];
    })),
  }));
  const anomalyDefinitions = [
    {
      matchId: "inter-parma-2026-27-md-06",
      diagnosis: "La divergenza è reale e nasce meccanicamente da una separazione favorita-outsider meno estrema del mercato: Engine assegna 73,1% all'Inter contro 84,6% no-vig. M1 è il più vicino; M0 e M2 sono molto più piatti.",
      evidence: "EVIDENCE",
      cause: "MODEL_MARKET_RELATIVE_STRENGTH_DIVERGENCE",
      rootCause: "CAUSE NOT ESTABLISHED",
      reason: "Mapping, normalizzazione e lambda non sono invertiti; gli artefatti disponibili non contengono un'ablation isolata dei componenti Engine sufficiente ad attribuire la differenza a un singolo fattore.",
    },
    {
      matchId: "napoli-frosinone-2026-27-md-06",
      diagnosis: "Tutti e quattro i modelli sono meno estremi del mercato sulla favorita. Engine usa lambda 1,59/1,07, non dispone del blend xG comparabile e registra fallback-goals; M1/M2 dichiarano fallback di lega per il prior Serie A mancante del Frosinone.",
      evidence: "EVIDENCE",
      cause: "PROMOTED_TEAM_PRIOR_AND_EARLY_SAMPLE_UNCERTAINTY",
      rootCause: "CAUSE NOT ESTABLISHED",
      reason: "Sono verificati fallback e campione corrente di cinque gare, ma non è disponibile una decomposizione controfattuale che quantifichi quanto ciascun componente causi i 16,0 punti percentuali di differenza sulla vittoria Napoli.",
    },
    {
      matchId: "como-roma-2026-27-md-06",
      diagnosis: "Engine rende il Como favorito (46,2% contro 36,5% no-vig), mentre M1 è quasi equilibrato e M2 favorisce la Roma. Il segnale è quindi specifico della stima di forza relativa dell'Engine, non della matrice o del mapping.",
      evidence: "EVIDENCE",
      cause: "ENGINE_SPECIFIC_RELATIVE_STRENGTH_DIRECTION",
      rootCause: "CAUSE NOT ESTABLISHED",
      reason: "I componenti Engine mostrano xG attivo e differenze di attacco/difesa, ma senza ablation predefinita non si può isolare quale interazione capovolga l'ordine rispetto a M2 e al mercato.",
    },
  ];
  const anomalies = anomalyDefinitions.map(definition => {
    const match = byMatch.get(definition.matchId), market = forensicByMatch.get(definition.matchId);
    const engine = match.predictions.find(row => row.modelLabel === "ENGINE_4.13.0");
    return {
      ...definition,
      label: market.label,
      engine: { lambdaHome: engine.lambdaHome, lambdaAway: engine.lambdaAway, oneXTwo: engine.probabilities.oneXTwo },
      marketNoVig: market.provider.noVigProbabilities,
      engineMinusMarket: Object.fromEntries(["1", "X", "2"].map(outcome => [outcome, engine.probabilities.oneXTwo[outcome] - market.provider.noVigProbabilities[outcome]])),
      models: Object.fromEntries(modelOrder.slice(1).map(label => {
        const prediction = match.predictions.find(row => row.modelLabel === label);
        return [label, { lambdaHome: prediction.lambdaHome, lambdaAway: prediction.lambdaAway, oneXTwo: prediction.probabilities.oneXTwo, fallback: prediction.fallback, maturity: prediction.maturity }];
      })),
    };
  });
  const calibration = Object.fromEntries(["M0", "M1", "M2"].map(label => [label, {
    sample: retrospective[label].sample,
    scoreLogLoss: retrospective[label].scoreLogLoss,
    oneXTwoRPS: retrospective[label].oneXtwo.rps,
    draw: retrospective.biasDiagnostics[label].draw,
    lambdaBiasActualMinusPredicted: {
      home: retrospective.biasDiagnostics[label].homeGoalsActualMinusLambda,
      away: retrospective.biasDiagnostics[label].awayGoalsActualMinusLambda,
      total: retrospective.biasDiagnostics[label].totalGoalsActualMinusLambda,
    },
    favoriteOutsider: favoriteSummary(retrospective[label].matchDiagnostics),
    extremeLambdaMatches: retrospective.extremeLambda[label].matches.length,
  }]));
  const calibrationEvidence = [
    { signal: "Sovrastima pareggi", classification: "WEAK INDICATION", evidence: `M0/M1/M2 prevedono in media ${percent(calibration.M0.draw.predicted)}, ${percent(calibration.M1.draw.predicted)}, ${percent(calibration.M2.draw.predicted)} contro ${percent(calibration.M0.draw.observed)} osservato su 50 gare; campione retrospettivo breve.` },
    { signal: "Sovrastima outsider", classification: "NOT ESTABLISHED", evidence: `M1 outsider ${percent(calibration.M1.favoriteOutsider.outsider.predicted)} previsto vs ${percent(calibration.M1.favoriteOutsider.outsider.observed)} osservato; M2 ${percent(calibration.M2.favoriteOutsider.outsider.predicted)} vs ${percent(calibration.M2.favoriteOutsider.outsider.observed)}. Non emerge un eccesso comune.` },
    { signal: "Sottostima favorite", classification: "WEAK INDICATION", evidence: `M1 ${percent(calibration.M1.favoriteOutsider.favorite.predicted)} previsto vs ${percent(calibration.M1.favoriteOutsider.favorite.observed)} osservato; M2 ${percent(calibration.M2.favoriteOutsider.favorite.predicted)} vs ${percent(calibration.M2.favoriteOutsider.favorite.observed)}. Indicazione non uniforme.` },
    { signal: "Lambda casa/trasferta mal calibrati", classification: "WEAK INDICATION", evidence: `Bias totale actual-minus-lambda: M0 ${number(calibration.M0.lambdaBiasActualMinusPredicted.total)}, M1 ${number(calibration.M1.lambdaBiasActualMinusPredicted.total)}, M2 ${number(calibration.M2.lambdaBiasActualMinusPredicted.total)}. M1 appare più bassa, senza prova prospettica.` },
    { signal: "Eccessiva dispersione", classification: "NOT ESTABLISHED", evidence: `Rapporto varianza/media osservato complessivo: casa ${number(retrospective.overdispersion.home.varianceMeanRatio)}, trasferta ${number(retrospective.overdispersion.away.varianceMeanRatio)}; il diagnostico esistente non prova overdispersione persistente.` },
    { signal: "Probabilità estreme", classification: "NOT ESTABLISHED", evidence: `M1 non supera 80% in alcuna delle 50 gare; M2 lo fa in ${calibration.M2.favoriteOutsider.maximumProbability.atLeast80Pct}. Nessuna anomalia diffusa stabilita.` },
  ];
  const closure = {
    title: "Exact-score MD6 final research closure",
    generatedAt: new Date().toISOString(),
    mode: "RESEARCH_CLOSURE",
    diagnostic: { status: "COMPLETE", anomalies },
    modelComparison,
    calibration: {
      source: researchEvaluationRelative,
      sourceHash: fileHash(researchEvaluationRelative),
      commonRetrospectiveSample: retrospective.commonSample.n,
      models: calibration,
      evidence: calibrationEvidence,
      engineContext: {
        source: multiseasonRelative,
        sourceHash: fileHash(multiseasonRelative),
        scopeCaution: "The 1,201-match multi-season artifact validates the retrodatable statistical core, not every full Engine 4.13.0 contextual component.",
        sample: multiseason.variants["xg-blend-25"].aggregate.matches,
        oneXTwoLogLoss: multiseason.variants["xg-blend-25"].aggregate.oneXTwoLogLoss,
        oneXTwoBrier: multiseason.variants["xg-blend-25"].aggregate.oneXTwoBrier,
        scoreLogLoss: multiseason.variants["xg-blend-25"].aggregate.scoreLogLoss,
      },
    },
    protocol: {
      decision: "PROSPECTIVE HEAD-TO-HEAD",
      models: modelOrder,
      evaluateSeparately: true,
      ensemble: false,
      sisalRole: "EXTERNAL BENCHMARK ONLY — NOT A MODEL INPUT",
      futureModels: "NO M3/M4 IN THIS TASK",
      modelPromotion: "NONE",
    },
    snapshots: {
      status: snapshot.status,
      matchCount: snapshot.matchCount,
      predictionCount: snapshot.predictionCount,
      createdAt: snapshot.createdAt,
      revision: snapshot.revision,
      frozenModels: modelOrder,
      snapshotFile: snapshotRelative,
      snapshotFileSHA256: fileHash(snapshotRelative),
      containerHash: snapshot.integrity.sha256,
      manifestFile: manifestRelative,
      manifestFileSHA256: fileHash(manifestRelative),
      replacements: manifest.replacements,
      existingImmutableAssets: snapshot.inputs.immutableAssetsBefore,
    },
    evaluation: {
      status: evaluation.status,
      commonSample: evaluation.commonSample,
      pendingMatchIds: evaluation.pendingMatchIds,
      predictionRecalculation: evaluation.predictionRecalculation,
      output: evaluationRelative,
      outputSHA256: fileHash(evaluationRelative),
      metricsWhenAvailable: ["score log loss", "1X2 RPS", "BTTS Brier", "Over 2.5 Brier", "home/away goal MAE", "exact hit", "top 3/top 5", "calibration"],
    },
    tests: validation,
    productionIntegrity: {
      snapshotGeneration: snapshot.productionIntegrity,
      reportGeneration: null,
      status: "PENDING",
    },
    decision: {
      diagnostic: "COMPLETE",
      prospectiveModels: "ENGINE_4.13.0 + M0 + M1 + M2",
      md6Snapshots: snapshot.status,
      matchesFrozen: `${snapshot.matchCount}/10`,
      evaluation: evaluation.status,
      modelPromotion: "NONE",
      productionModels: "UNCHANGED",
      existingImmutableSnapshots: "UNCHANGED",
      productionIntegrity: "PENDING",
      phase: snapshot.status === "FROZEN" && validation.status === "PASS" ? "CLOSED" : "BLOCKED",
    },
  };

  const modelCell = model => `λ ${number(model.lambdaHome, 2)}/${number(model.lambdaAway, 2)} · ${percent(model.oneXTwo["1"])} / ${percent(model.oneXTwo.X)} / ${percent(model.oneXTwo["2"])}`;
  const markdown = [];
  markdown.push("# Chiusura definitiva ricerca 1X2 / exact-score MD6", "");
  markdown.push("## A. Diagnosi delle anomalie", "");
  for (const anomaly of anomalies) {
    markdown.push(`### ${anomaly.label}`, "");
    markdown.push(`Engine: λ ${number(anomaly.engine.lambdaHome, 2)}/${number(anomaly.engine.lambdaAway, 2)}; 1/X/2 ${percent(anomaly.engine.oneXTwo["1"])} / ${percent(anomaly.engine.oneXTwo.X)} / ${percent(anomaly.engine.oneXTwo["2"])}. Sisal no-vig: ${percent(anomaly.marketNoVig["1"])} / ${percent(anomaly.marketNoVig.X)} / ${percent(anomaly.marketNoVig["2"])}. Delta Engine-mercato: ${pp(anomaly.engineMinusMarket["1"])} / ${pp(anomaly.engineMinusMarket.X)} / ${pp(anomaly.engineMinusMarket["2"])}.`, "");
    markdown.push(`${anomaly.evidence}: ${anomaly.diagnosis}`, "");
    markdown.push(`Causa classificata: **${anomaly.cause}**. Causa parametrica finale: **${anomaly.rootCause}**. ${anomaly.reason}`, "");
  }
  markdown.push("## B. Confronto Engine/M0/M1/M2", "");
  markdown.push(table(["Partita", "Engine 4.13.0 1/X/2", "M0 1/X/2", "M1 1/X/2", "M2 1/X/2"], modelComparison.map(row => [row.label, ...modelOrder.map(label => modelCell(row.models[label]))])), "");
  markdown.push("Tutte le probabilità derivano dalla matrice del rispettivo modello. Nessun ensemble e nessuna selezione retrospettiva del modello più favorevole.", "");
  markdown.push("## C. Evidenza di calibrazione", "");
  markdown.push(table(["Segnale", "Classificazione", "Evidenza"], calibrationEvidence.map(row => [row.signal, row.classification, row.evidence])), "");
  markdown.push(`Metriche retrospettive già disponibili su ${retrospective.commonSample.n} gare: M0 RPS ${number(retrospective.M0.oneXtwo.rps, 4)}, M1 ${number(retrospective.M1.oneXtwo.rps, 4)}, M2 ${number(retrospective.M2.oneXtwo.rps, 4)}. M2 resta leader descrittivo sullo score LogLoss, M1 sul RPS; nessuna superiorità è stabilita. Il backtest pluristagionale del nucleo retrodatabile copre ${closure.calibration.engineContext.sample} gare, ma non identifica la calibrazione categoria-per-categoria del full Engine 4.13.0.`, "");
  markdown.push("## D. Protocollo adottato", "");
  markdown.push("**PROSPECTIVE HEAD-TO-HEAD**: Engine 4.13.0 SHADOW, M0, M1 e M2 RESEARCH restano separati. Le quote Sisal sono soltanto benchmark esterno. Nessun ensemble, nessun M3/M4, nessun tuning verso il mercato, nessun vincitore scelto oggi.", "");
  markdown.push("## E. Snapshot create", "");
  markdown.push(table(["Artefatto", "Timestamp", "Copertura", "SHA-256"], [
    [snapshotRelative, snapshot.createdAt, `${snapshot.matchCount}/10 partite · ${snapshot.predictionCount}/40 previsioni`, closure.snapshots.snapshotFileSHA256],
    [manifestRelative, manifest.updatedAt, `${manifest.snapshots.length} record`, closure.snapshots.manifestFileSHA256],
  ]), "");
  markdown.push(`Revision research: **${snapshot.revision}**. ${manifest.replacements.length ? `${manifest.replacements.length} sostituzioni controllate pre-kickoff sono registrate nel manifest; ultima motivazione: ${manifest.replacements.at(-1).reason}` : "Nessuna sostituzione registrata."}`, "");
  markdown.push("Engine conserva il timestamp originario della snapshot immutabile del 3 ottobre e il nuovo `frozenAt`; M0/M1/M2 conservano l'ora effettiva di calcolo. Ogni prediction include lambda, 1X2, BTTS, O/U 2.5, matrice, top 3/top 5, provenance, fallback, maturity, configuration hash e snapshot hash.", "");
  markdown.push("## F. Valutazione", "");
  markdown.push(`**EVALUATION ${evaluation.status}**. Common sample: ${evaluation.commonSample.n}. L'evaluator legge le prediction congelate e non le ricalcola. Dopo i risultati produrrà score LogLoss, 1X2 RPS, Brier BTTS/O2.5, MAE gol, exact/top3/top5 e calibrazione sullo stesso campione.`, "");
  markdown.push("## G. Test e integrità", "");
  markdown.push(`Test focalizzati: **${validation.status}**, ${validation.assertions} asserzioni. Leakage, matrici, 1X2, BTTS, O/U, cutoff, hash, immutabilità, common sample e integrità produzione verificati. Il guard repository storico del 3 ottobre è documentato ma non rieseguito.`, "");
  markdown.push(`Generazione snapshot: ${snapshot.productionIntegrity.checkedFiles} file protetti, modifiche ${snapshot.productionIntegrity.changedFiles.length}, stato **${snapshot.productionIntegrity.status}**.`, "");
  markdown.push("## H. Decisione finale", "");
  markdown.push("Ricerca preliminare MD6 chiusa. Nessun modello è promosso o modificato. Il prossimo lavoro exact-score è esclusivamente la valutazione degli actual delle partite disputate.", "");

  write(reportJsonRelative, closure);
  fs.mkdirSync(require("path").dirname(require("path").join(root, reportMarkdownRelative)), { recursive: true });
  fs.writeFileSync(require("path").join(root, reportMarkdownRelative), `${markdown.join("\n")}\n`);
  const after = captureProtectedHashes();
  const changed = compareHashes(before, after);
  closure.productionIntegrity.reportGeneration = { checkedFiles: Object.keys(before).length, manifestBefore: hashManifest(before), manifestAfter: hashManifest(after), changedFiles: changed };
  closure.productionIntegrity.status = changed.length || snapshot.productionIntegrity.status !== "PASS" ? "FAILED" : "PASS";
  closure.decision.productionIntegrity = closure.productionIntegrity.status;
  if (closure.productionIntegrity.status !== "PASS") closure.decision.phase = "BLOCKED";
  const finalLines = [
    `1X2 DIAGNOSTIC: ${closure.decision.diagnostic}`,
    `PROSPECTIVE MODELS: ${closure.decision.prospectiveModels}`,
    `MD6 EXACT-SCORE SNAPSHOTS: ${closure.decision.md6Snapshots}`,
    `MD6 MATCHES FROZEN: ${closure.decision.matchesFrozen}`,
    `PROSPECTIVE EVALUATION: ${closure.decision.evaluation}`,
    `MODEL PROMOTION: ${closure.decision.modelPromotion}`,
    `PRODUCTION MODELS: ${closure.decision.productionModels}`,
    `EXISTING IMMUTABLE SNAPSHOTS: ${closure.decision.existingImmutableSnapshots}`,
    `PRODUCTION INTEGRITY: ${closure.decision.productionIntegrity}`,
    `EXACT-SCORE PRE-MD6 RESEARCH PHASE: ${closure.decision.phase}`,
  ];
  write(reportJsonRelative, closure);
  fs.writeFileSync(require("path").join(root, reportMarkdownRelative), `${markdown.join("\n")}\n${finalLines.map(line => `\`${line}\``).join("\n\n")}\n`);
  console.log(JSON.stringify({
    reportMarkdown: reportMarkdownRelative,
    reportJson: reportJsonRelative,
    snapshots: snapshot.status,
    matchesFrozen: snapshot.matchCount,
    predictionsFrozen: snapshot.predictionCount,
    evaluation: evaluation.status,
    tests: validation.status,
    productionIntegrity: closure.productionIntegrity.status,
    phase: closure.decision.phase,
  }, null, 2));
}

try { main(); }
catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
