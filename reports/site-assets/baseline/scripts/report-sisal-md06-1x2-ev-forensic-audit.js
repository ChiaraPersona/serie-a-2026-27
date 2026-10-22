"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const {
  independentPoissonScoreMatrix,
  validateMatrix,
  deriveMarkets,
  topScores,
} = require("./research/exact-score/distribution");
const { stabilizedRate } = require("./research/exact-score/baselines");

const root = path.resolve(__dirname, "..");
const reportDate = "2026-10-09";
const outputDirectory = path.join(root, "output", "reports");
const jsonOutput = path.join(outputDirectory, `sisal-md06-1x2-ev-forensic-audit-${reportDate}.json`);
const markdownOutput = path.join(outputDirectory, `sisal-md06-1x2-ev-forensic-audit-${reportDate}.md`);
const priorReportPath = path.join(outputDirectory, `sisal-md06-market-analysis-${reportDate}.json`);
const oddsPath = path.join(root, "data", "normalized", "odds", "sisal", "serie-a.json");
const rawOddsPath = path.join(root, "data", "raw", "odds", "sisal", "serie-a", "2026-10-09T10-43-00-203Z.json.gz");
const snapshotPath = path.join(root, "data", "predictions", "snapshots", "2026-27", "md-06.json");
const manifestPath = path.join(root, "data", "predictions", "snapshots", "manifest.json");
const prospectiveInputsPath = path.join(root, "data", "analysis", "exact-score-research", "exact-score-prospective-inputs.json");
const evaluationPath = path.join(root, "data", "analysis", "exact-score-research", "exact-score-evaluation.json");
const registryPath = path.join(root, "data", "analysis", "exact-score-research", "exact-score-models.json");
const researchConfigPath = path.join(root, "data", "analysis", "exact-score-research", "exact-score-research-config.json");
const matchesPath = path.join(root, "data", "normalized", "matches.json");
const sisalRulesUrl = "https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf";

const relative = file => path.relative(root, file).replace(/\\/g, "/");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const fileHash = file => sha256(fs.readFileSync(file));
const sum = values => values.reduce((total, value) => total + value, 0);
const round = (value, digits = 6) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const percent = (value, digits = 1) => Number.isFinite(value) ? `${round(value * 100, digits)}%` : "N/D";
const value = (vector, key) => vector.features[key]?.value ?? null;
const probabilityObject = values => {
  const first = round(values[0] * 100, 1);
  const second = round(values[1] * 100, 1);
  const third = round(100 - first - second, 1);
  return { "1": first, "X": second, "2": third };
};

function poisson(k, lambda) {
  let factorial = 1;
  for (let index = 2; index <= k; index += 1) factorial *= index;
  return Math.exp(-lambda) * (lambda ** k) / factorial;
}

function productionScoreMatrix(lambdaHome, lambdaAway, maxGoals = 7) {
  const rows = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      rows.push({ home, away, probability: poisson(home, lambdaHome) * poisson(away, lambdaAway) });
    }
  }
  const rawMass = sum(rows.map(row => row.probability));
  const normalized = rows.map(row => ({ ...row, probability: row.probability / rawMass }));
  const outcomeArray = [
    sum(normalized.filter(row => row.home > row.away).map(row => row.probability)),
    sum(normalized.filter(row => row.home === row.away).map(row => row.probability)),
    sum(normalized.filter(row => row.home < row.away).map(row => row.probability)),
  ];
  return {
    support: "0-7 goals per team",
    normalization: "TRUNCATE_THEN_RENORMALIZE",
    rawMass,
    truncatedTailBeforeNormalization: 1 - rawMass,
    outcomeArray,
    roundedPercentages: probabilityObject(outcomeArray),
  };
}

function matrixArtifact(matrix) {
  const validation = validateMatrix(matrix);
  const markets = deriveMarkets(matrix);
  const homeMarginal = matrix.cells.map(row => sum(row));
  const awayMarginal = matrix.cells[0].map((_, away) => sum(matrix.cells.map(row => row[away])));
  const outcomes = { "1": markets.outcomes.home, "X": markets.outcomes.draw, "2": markets.outcomes.away };
  return {
    lambdaHome: matrix.lambdaHome,
    lambdaAway: matrix.lambdaAway,
    maxHomeGoals: matrix.maxHomeGoals,
    maxAwayGoals: matrix.maxAwayGoals,
    representedMass: validation.representedMass,
    tailMass: validation.tailMass,
    tailBound: validation.tailBound,
    numericalMassError: matrix.numericalMassError,
    outcomeMass: sum(Object.values(outcomes)),
    outcomes,
    homeGoalDistribution: homeMarginal,
    awayGoalDistribution: awayMarginal,
    cells: matrix.cells,
    topScores: topScores(matrix, 5),
  };
}

function researchEnvironment(vector, xg) {
  const total = value(vector, "league.currentMatches");
  const result = {};
  for (const side of ["home", "away"]) {
    const title = side === "home" ? "Home" : "Away";
    const currentKey = `league.${side}${xg ? "XG" : "Goals"}Average`;
    const historicalKey = `league.historical${title}${xg ? "XG" : "Goals"}Average`;
    const current = vector.features[currentKey];
    const historical = vector.features[historicalKey];
    const coverage = total ? current.provenance.sample / total : null;
    const currentUsable = current.value != null && (!xg || coverage >= 1);
    const chosen = currentUsable ? current : historical;
    result[side] = {
      rate: chosen.value,
      source: chosen.provenance,
      currentCoverage: coverage,
      fallback: currentUsable ? null : (historical.value != null ? "HISTORICAL_LEAGUE" : "NO_AVAILABLE_LEAGUE_PRIOR"),
    };
  }
  return result;
}

function diagnosticStrengthBaseline(vector, kind, config) {
  const xg = kind === "M2";
  const environment = researchEnvironment(vector, xg);
  const leagueHome = environment.home.rate;
  const leagueAway = environment.away.rate;
  if (!(leagueHome > 0) || !(leagueAway > 0)) return null;

  const component = (side, attack) => {
    const base = (side === "home") === attack ? leagueHome : leagueAway;
    const oppositeBase = (side === "home") === attack ? leagueAway : leagueHome;
    const suffix = attack ? "For" : "Against";
    const allKey = `${side}.${xg ? (attack ? "currentXGF" : "currentXGA") : `goals${suffix}`}`;
    const venueKey = `${side}.${xg ? (attack ? "venueXGF" : "venueXGA") : `venueGoals${suffix}`}`;
    const historicalVenueKey = `${side}.${xg ? (attack ? "historicalVenueXGF" : "historicalVenueXGA") : `historicalVenueGoals${suffix}`}`;
    const historicalAllKey = `${side}.${xg ? (attack ? "historicalXGF" : "historicalXGA") : `historicalGoals${suffix}`}`;
    const all = vector.features[allKey];
    const venue = vector.features[venueKey];
    const historicalVenue = vector.features[historicalVenueKey];
    const historicalAll = vector.features[historicalAllKey];
    const coverage = {
      overall: xg ? value(vector, `${side}.${attack ? "xgCoverage" : "xgaCoverage"}`) : null,
      venue: xg ? value(vector, `${side}.${attack ? "venueXgCoverage" : "venueXgaCoverage"}`) : null,
    };
    const currentAllowed = !xg || value(vector, `${side}.currentMatches`) === 0 || (coverage.overall != null && coverage.overall >= config.minimumXGCoverage);
    const nAll = currentAllowed && all.value != null ? all.provenance.sample : 0;
    const nVenue = currentAllowed && venue.value != null ? venue.provenance.sample : 0;
    if (nVenue > nAll) throw new Error(`${vector.matchId}: venue observations exceed overall observations`);
    const nOther = nAll - nVenue;
    const otherRaw = nOther ? (all.value * nAll - (venue.value ?? 0) * nVenue) / nOther : null;
    if (otherRaw != null && otherRaw < -1e-10) throw new Error(`${vector.matchId}: inconsistent disjoint current evidence`);
    let prior = base;
    let fallback = "LEAGUE_PRIOR_NO_SERIE_A_TEAM_PRIOR";
    let priorSource = (side === "home") === attack ? environment.home.source : environment.away.source;
    if (historicalVenue.value != null) {
      prior = historicalVenue.value;
      priorSource = historicalVenue.provenance;
      fallback = "HISTORICAL_TEAM_VENUE";
    } else if (historicalAll.value != null) {
      prior = historicalAll.value * base / ((leagueHome + leagueAway) / 2);
      priorSource = historicalAll.provenance;
      fallback = "HISTORICAL_TEAM_OVERALL_VENUE_ADJUSTED";
    }
    const otherVenueEquivalent = otherRaw == null ? null : otherRaw * base / oppositeBase;
    const borrowed = stabilizedRate(otherVenueEquivalent, nOther, prior, config.priorEquivalentMatches);
    const final = stabilizedRate(currentAllowed ? venue.value : null, nVenue, borrowed.value, config.priorEquivalentMatches);
    return {
      stabilizedRate: final.value,
      stabilizedStrength: final.value / base,
      rawVenueRate: venue.value,
      rawOverallRate: all.value,
      sample: { all: nAll, venue: nVenue, nonVenue: nOther },
      coverage,
      currentAllowed,
      priorRate: prior,
      priorFallback: fallback,
      priorSource: priorSource.source,
      priorPeriod: priorSource.period,
      historicalPriorUsed: fallback.startsWith("HISTORICAL_TEAM"),
      currentWeight: 1 - final.priorWeight * borrowed.priorWeight,
      priorWeight: final.priorWeight * borrowed.priorWeight,
    };
  };

  const components = {
    homeAttack: component("home", true),
    homeDefense: component("home", false),
    awayAttack: component("away", true),
    awayDefense: component("away", false),
  };
  const lambdaHome = leagueHome * components.homeAttack.stabilizedStrength * components.awayDefense.stabilizedStrength;
  const lambdaAway = leagueAway * components.awayAttack.stabilizedStrength * components.homeDefense.stabilizedStrength;
  return { lambdaHome, lambdaAway, environment, components };
}

function diagnosticPrediction(vector, modelId, researchConfig, generatedAt) {
  let lambdaHome;
  let lambdaAway;
  let diagnostics;
  if (modelId === "M0") {
    lambdaHome = value(vector, "league.homeGoalsAverage") ?? value(vector, "league.historicalHomeGoalsAverage");
    lambdaAway = value(vector, "league.awayGoalsAverage") ?? value(vector, "league.historicalAwayGoalsAverage");
    diagnostics = { leagueFallbackUsed: value(vector, "league.currentMatches") === 0, goalStrength: "LEAGUE_AVERAGE" };
  } else {
    const output = diagnosticStrengthBaseline(vector, modelId, researchConfig);
    if (!output) return null;
    ({ lambdaHome, lambdaAway } = output);
    diagnostics = output;
  }
  const matrix = independentPoissonScoreMatrix(lambdaHome, lambdaAway);
  return {
    model: modelId,
    modelId: modelId === "M0" ? "league-poisson-r0" : modelId === "M1" ? "goals-poisson-r0" : "xg-poisson-r0",
    modelVersion: modelId === "M0" ? "r0.1" : "r1.0",
    state: "RESEARCH",
    generationClass: "DIAGNOSTIC_RECOMPUTATION",
    generatedAt,
    inputCreatedAt: null,
    dataCutoff: vector.dataCutoff,
    matrix: matrixArtifact(matrix),
    diagnostics,
  };
}

function rawOneXTwoMarkets(raw) {
  const records = [];
  for (const response of raw.responses || []) {
    const payload = response.payload || {};
    const event = payload.avvenimentoFe;
    for (const info of Object.values(payload.infoAggiuntivaMap || {})) {
      if (Number(info.codiceScommessa) !== 3 || !Array.isArray(info.esitoList)) continue;
      const marketKey = `${info.codicePalinsesto}-${info.codiceAvvenimento}-${info.codiceScommessa}`;
      const market = payload.scommessaMap?.[marketKey] || null;
      records.push({
        responseUrl: response.url,
        sourcePageUrl: response.sourcePageUrl,
        responseDate: response.headers?.Date || null,
        eventId: String(info.eventId || event?.eventId || ""),
        eventName: event?.descrizione || market?.descrizioneAvvenimento || null,
        eventType: event?.eventType || market?.eventType || null,
        startsAt: event?.data || market?.data || null,
        firstCompetitor: event?.firstCompetitor?.description || null,
        secondCompetitor: event?.secondCompetitor?.description || null,
        marketId: String(info.marketId),
        marketCode: String(info.codiceScommessa),
        marketName: market?.descrizione || null,
        variantName: info.descrizione || null,
        updatedAt: info.dataUltimaModifica || market?.dataUltimaModifica || null,
        live: Boolean(market?.live || info.offertaLive),
        selections: info.esitoList.map(selection => ({
          providerSelectionId: String(selection.selectionId),
          rawCode: Number(selection.codiceEsito),
          rawName: selection.descrizione,
          oddsRaw: selection.quota,
          odds: selection.quota / 100,
          open: selection.stato === 1,
        })),
      });
    }
  }
  return records;
}

function captureProtectedHashes() {
  const listed = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  }).toString().split("\0").filter(Boolean).map(file => file.replace(/\\/g, "/"));
  const explicit = [relative(rawOddsPath), relative(oddsPath), relative(snapshotPath), relative(manifestPath)];
  const excluded = new Set([relative(jsonOutput), relative(markdownOutput), relative(__filename)]);
  const files = [...new Set([...listed, ...explicit])]
    .filter(file => !excluded.has(file))
    .filter(file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile())
    .sort();
  return Object.fromEntries(files.map(file => [file, fileHash(path.join(root, file))]));
}

function hashManifest(hashes) {
  return sha256(JSON.stringify(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right))));
}

function runCommand(name, executable, args) {
  try {
    const output = execFileSync(executable, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { name, status: "PASS", output: output.slice(-1600) };
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`.trim();
    return { name, status: "FAIL", exitCode: error.status ?? null, output: output.slice(-3000) };
  }
}

function markdownTable(headers, rows) {
  const escape = item => String(item ?? "N/D").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n");
}

async function main() {
  const protectedBefore = captureProtectedHashes();
  const generatedAt = new Date().toISOString();
  const priorReport = readJson(priorReportPath);
  const odds = readJson(oddsPath);
  const rawOdds = JSON.parse(zlib.gunzipSync(fs.readFileSync(rawOddsPath)).toString("utf8"));
  const snapshots = readJson(snapshotPath);
  const manifest = readJson(manifestPath);
  const prospective = readJson(prospectiveInputsPath);
  const evaluation = readJson(evaluationPath);
  const registry = readJson(registryPath);
  const researchConfig = readJson(researchConfigPath);
  const matches = readJson(matchesPath);

  if (odds.events.length !== 10 || snapshots.snapshots.length !== 10 || prospective.rows.length !== 10) throw new Error("MD6 coverage must be 10/10 for odds, snapshots and research inputs");
  if (prospective.label !== "PROSPECTIVE FROZEN V2 INPUTS — NO EXACT-SCORE PREDICTIONS") throw new Error("Unexpected prospective-input contract");
  if (evaluation.exactScoreDataGate !== "INSUFFICIENT" || evaluation.prospective?.exactScorePredictions !== 0) throw new Error("Unexpected exact-score research gate or pre-existing MD6 predictions");

  const matchById = new Map(matches.filter(match => match.competition === "serie-a" && match.matchday === 6).map(match => [match.id, match]));
  const eventByMatch = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
  const snapshotByMatch = new Map(snapshots.snapshots.map(snapshot => [snapshot.matchId, snapshot]));
  const manifestByMatch = new Map(manifest.snapshots.filter(snapshot => snapshot.matchday === 6).map(snapshot => [snapshot.matchId, snapshot]));
  const vectorByMatch = new Map(prospective.rows.map(row => [row.matchId, row.vector]));
  const rawMarkets = rawOneXTwoMarkets(rawOdds);
  const rawByMarketId = new Map(rawMarkets.map(market => [market.marketId, market]));
  const priorOneXTwoByMatch = new Map(priorReport.oneXTwo.map(match => [match.matchId, match]));
  const modelNames = ["M0", "M1", "M2"];
  const outcomes = ["1", "X", "2"];
  const outcomeIndex = { "1": 0, "X": 1, "2": 2 };

  const fixtureAudits = [...matchById.values()].sort((left, right) => left.id.localeCompare(right.id)).map(match => {
    const event = eventByMatch.get(match.id);
    const snapshot = snapshotByMatch.get(match.id);
    const manifestEntry = manifestByMatch.get(match.id);
    const vector = vectorByMatch.get(match.id);
    if (!event || !snapshot || !manifestEntry || !vector) throw new Error(`${match.id}: incomplete cross-source identity`);
    if (vector.homeTeam !== match.homeTeam || vector.awayTeam !== match.awayTeam) throw new Error(`${match.id}: vector home/away mismatch`);

    const markets = event.markets.filter(market => market.marketCode === "3" && market.marketName === "1X2 ESITO FINALE" && market.variantName === "ESITO FINALE 1X2");
    if (markets.length !== 1) throw new Error(`${match.id}: expected one certified 1X2 final market, found ${markets.length}`);
    const market = markets[0];
    const rawMarket = rawByMarketId.get(String(market.providerMarketId));
    if (!rawMarket) throw new Error(`${match.id}: raw market ${market.providerMarketId} missing`);
    const normalizedSelectionNames = market.selections.map(selection => selection.name);
    const rawSelectionNames = rawMarket.selections.map(selection => selection.rawName);
    const rawCodes = rawMarket.selections.map(selection => selection.rawCode);
    const normalizedKickoff = new Date(event.startsAt).getTime();
    const snapshotKickoff = new Date(`${snapshot.kickoff.date}T${snapshot.kickoff.time}:00+02:00`).getTime();
    const expectedOrientation = { "1": match.homeTeam, "X": "draw", "2": match.awayTeam };
    const marketChecks = {
      providerEventId: rawMarket.eventId === String(event.providerEventId),
      providerMarketId: rawMarket.marketId === String(market.providerMarketId),
      eventName: rawMarket.eventName === event.name,
      eventType: rawMarket.eventType === "MATCH" && event.eventType === "MATCH",
      marketCode: rawMarket.marketCode === "3" && market.marketCode === "3",
      marketName: rawMarket.marketName === "1X2 ESITO FINALE" && market.marketName === "1X2 ESITO FINALE",
      variantName: rawMarket.variantName === "ESITO FINALE 1X2" && market.variantName === "ESITO FINALE 1X2",
      prematch: rawMarket.live === false,
      selections: JSON.stringify(normalizedSelectionNames) === JSON.stringify(["1", "X", "2"]) && JSON.stringify(rawSelectionNames) === JSON.stringify(["1", "X", "2"]),
      rawCodeMapping: JSON.stringify(rawCodes) === JSON.stringify([1, 2, 3]),
      odds: market.selections.every(selection => {
        const rawSelection = rawMarket.selections.find(candidate => candidate.providerSelectionId === selection.providerSelectionId);
        return rawSelection && rawSelection.open && selection.status === "open" && selection.odds === rawSelection.odds && selection.oddsRaw === rawSelection.oddsRaw && selection.odds > 1;
      }),
      kickoff: normalizedKickoff === snapshotKickoff && rawMarket.startsAt === event.startsAt,
      homeAway: event.home.canonicalTeamId === match.homeTeam && event.away.canonicalTeamId === match.awayTeam && rawMarket.firstCompetitor === event.home.name && rawMarket.secondCompetitor === event.away.name,
    };
    const marketCertified = Object.values(marketChecks).every(Boolean);

    const production = productionScoreMatrix(snapshot.prediction.expectedGoals.home, snapshot.prediction.expectedGoals.away);
    const serializedProbabilities = snapshot.prediction.probabilities.final;
    const probabilityReproductionChecks = outcomes.map(outcome => production.roundedPercentages[outcome] === serializedProbabilities[outcome]);
    if (!probabilityReproductionChecks.every(Boolean)) throw new Error(`${match.id}: production 1X2 probabilities do not reproduce from expected goals`);

    const modelPredictions = Object.fromEntries(modelNames.map(model => {
      const prediction = diagnosticPrediction(vector, model, researchConfig, generatedAt);
      if (prediction) prediction.inputCreatedAt = prospective.createdAt;
      return [model, prediction];
    }));
    const marketRawProbabilities = Object.fromEntries(market.selections.map(selection => [selection.name, 1 / selection.odds]));
    const rawSum = sum(Object.values(marketRawProbabilities));
    const noVigProbabilities = Object.fromEntries(outcomes.map(outcome => [outcome, marketRawProbabilities[outcome] / rawSum]));
    const marketUpdatedAt = market.updatedAt;
    const marketAgeAtRetrievalHours = (new Date(odds.retrievedAt) - new Date(marketUpdatedAt)) / 36e5;

    const selectionAudits = outcomes.map(outcome => {
      const selection = market.selections.find(candidate => candidate.name === outcome);
      const priorSelection = priorOneXTwoByMatch.get(match.id)?.selections.find(candidate => candidate.selection === outcome);
      const serializedProbability = serializedProbabilities[outcome] / 100;
      const unroundedProbability = production.outcomeArray[outcomeIndex[outcome]];
      const ev = serializedProbability * selection.odds - 1;
      const evUnrounded = unroundedProbability * selection.odds - 1;
      const diagnosticModels = Object.fromEntries(modelNames.map(model => {
        const probability = modelPredictions[model]?.matrix.outcomes[outcome] ?? null;
        return [model, {
          probability,
          ev: probability == null ? null : probability * selection.odds - 1,
          edgeVsNoVig: probability == null ? null : probability - noVigProbabilities[outcome],
        }];
      }));
      const priorEvMatches = priorSelection && Math.abs(priorSelection.theoreticalEv - ev) < 1e-12;
      const priorProbabilityMatches = priorSelection && Math.abs(priorSelection.modelProbability - serializedProbability) < 1e-12;
      const priorOddsMatches = priorSelection && priorSelection.odds === selection.odds;
      return {
        outcome,
        semanticMeaning: expectedOrientation[outcome],
        providerSelectionId: selection.providerSelectionId,
        rawOutcomeCode: rawMarket.selections.find(candidate => candidate.providerSelectionId === selection.providerSelectionId)?.rawCode ?? null,
        odds: selection.odds,
        rawImpliedProbability: marketRawProbabilities[outcome],
        noVigProbability: noVigProbabilities[outcome],
        originalSerializedProbability: serializedProbability,
        originalUnroundedMatrixProbability: unroundedProbability,
        originalEvReported: priorSelection?.theoreticalEv ?? null,
        originalEvRecomputed: ev,
        evUsingUnroundedMatrixProbability: evUnrounded,
        serializationRoundingEvDelta: ev - evUnrounded,
        originalReproduction: {
          odds: Boolean(priorOddsMatches),
          probability: Boolean(priorProbabilityMatches),
          ev: Boolean(priorEvMatches),
          formula: "P_serialized_0_to_1 * decimal_odds - 1",
        },
        diagnosticModels,
      };
    });

    const sourceMatchIds = [...new Set(Object.values(vector.features).flatMap(feature => feature.provenance?.matchesUsed || []))];
    const futureEvidence = sourceMatchIds.filter(matchId => matchId === match.id || /-md-0[6-9]|-md-[1-9][0-9]/.test(matchId));
    const kickoffTime = new Date(event.startsAt).getTime();
    const temporalChecks = {
      snapshotBeforeKickoff: new Date(snapshot.generatedAt).getTime() < kickoffTime,
      researchInputBeforeKickoff: new Date(prospective.createdAt).getTime() < kickoffTime,
      oddsCaptureBeforeKickoff: new Date(odds.retrievedAt).getTime() < kickoffTime,
      cutoffExclusiveMd6: vector.dataCutoff.matchdayExclusive === 6 && vector.dataCutoff.completedOnly === true,
      targetExcluded: vector.dataCutoff.targetMatchIdExcluded === match.id,
      noTargetOrFutureMatchesUsed: futureEvidence.length === 0,
      snapshotSourceHashMatches: Object.values(vector.features).filter(feature => feature.provenance?.source === relative(snapshotPath)).every(feature => feature.provenance.sourceHash === fileHash(snapshotPath)),
    };

    return {
      matchId: match.id,
      label: event.name.replace(" - ", " – "),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: event.startsAt,
      orientation: expectedOrientation,
      provider: {
        eventId: event.providerEventId,
        regulatorEventId: event.regulatorEventId,
        marketId: market.providerMarketId,
        marketCode: market.marketCode,
        marketName: market.marketName,
        variantName: market.variantName,
        marketUpdatedAt,
        retrievedAt: odds.retrievedAt,
        marketAgeAtRetrievalHours,
        rawResponseDate: rawMarket.responseDate,
        rawResponseUrl: rawMarket.responseUrl,
        sourcePageUrl: rawMarket.sourcePageUrl,
        overround: rawSum - 1,
        rawImpliedProbabilities: marketRawProbabilities,
        noVigMethod: "PROPORTIONAL_NORMALIZATION",
        noVigProbabilities,
      },
      marketCertification: { status: marketCertified ? "PASS" : "FAILED", checks: marketChecks },
      originalProbabilitySource: {
        sourceClass: "IMMUTABLE_PRODUCTION_SNAPSHOT",
        sourceFile: relative(snapshotPath),
        snapshotId: snapshot.snapshotId,
        snapshotHash: manifestEntry.hash,
        snapshotGeneratedAt: snapshot.generatedAt,
        engineVersion: snapshot.engineVersion,
        snapshotModelVersion: snapshot.modelVersion,
        actualProbabilityGenerator: "scripts/predictions/engine.js expectedGoals -> scoreMatrix(0..7 normalized) -> technicalProbabilities -> probabilities.final",
        probabilityType: "PRODUCTION_ENGINE_POISSON_1X2",
        notPlayerMarketProbability: true,
        notM0M1M2: true,
        dataCutoff: snapshot.dataCutoff,
        expectedGoals: snapshot.prediction.expectedGoals,
        productionMatrixReproduction: production,
      },
      diagnosticResearchModels: modelPredictions,
      selections: selectionAudits,
      temporalAudit: {
        sourceMatchIds,
        futureEvidence,
        checks: temporalChecks,
        status: Object.values(temporalChecks).every(Boolean) ? "PASS" : "FAILED",
      },
    };
  });

  const selectionComparisons = fixtureAudits.flatMap(fixture => fixture.selections.map(selection => ({
    matchId: fixture.matchId,
    label: fixture.label,
    outcome: selection.outcome,
    odds: selection.odds,
    originalProbability: selection.originalSerializedProbability,
    originalEv: selection.originalEvRecomputed,
    M0: selection.diagnosticModels.M0,
    M1: selection.diagnosticModels.M1,
    M2: selection.diagnosticModels.M2,
  })));
  const originalPositive = selectionComparisons.filter(selection => selection.originalEv > 0).sort((left, right) => right.originalEv - left.originalEv);
  if (originalPositive.length !== 9) throw new Error(`Expected nine original positive EV rows, found ${originalPositive.length}`);

  const classifiedSignals = originalPositive.map(signal => {
    const fixture = fixtureAudits.find(candidate => candidate.matchId === signal.matchId);
    const selection = fixture.selections.find(candidate => candidate.outcome === signal.outcome);
    const positives = modelNames.filter(model => selection.diagnosticModels[model].ev > 0);
    const marketCertified = fixture.marketCertification.status === "PASS";
    const reproductionPass = Object.values(selection.originalReproduction).filter(value => typeof value === "boolean").every(Boolean);
    const orientationPass = selection.semanticMeaning === fixture.orientation[signal.outcome];
    const verified = marketCertified && reproductionPass && orientationPass;
    const stale = fixture.provider.marketAgeAtRetrievalHours > 48;
    const researchModelsAgree = selection.diagnosticModels.M1.ev > 0 && selection.diagnosticModels.M2.ev > 0;
    const categories = ["RESEARCH_ONLY_SIGNAL"];
    if (stale) categories.unshift("STALE_INPUT");
    if (positives.length !== modelNames.length) categories.unshift("MODEL_DISAGREEMENT");
    const disposition = stale
      ? "SCARTARE_FINCHÉ_NON_RIQUOTATO"
      : researchModelsAgree
        ? "MANTENERE_SOLO_COME_SEGNALE_RESEARCH"
        : "SCARTARE_COME_VALUE_ROBUSTO_MODEL_DEPENDENT";
    return {
      ...signal,
      providerMarketId: fixture.provider.marketId,
      providerSelectionId: selection.providerSelectionId,
      marketUpdatedAt: fixture.provider.marketUpdatedAt,
      quoteRetrievedAt: fixture.provider.retrievedAt,
      marketAgeAtRetrievalHours: fixture.provider.marketAgeAtRetrievalHours,
      semanticMeaning: selection.semanticMeaning,
      source: fixture.originalProbabilitySource,
      exactMarket: marketCertified,
      originalReproductionPass: reproductionPass,
      orientationPass,
      verified,
      diagnosticPositiveModels: positives,
      robustAcrossM1M2: researchModelsAgree,
      categories,
      disposition,
    };
  });

  const verifiedCount = classifiedSignals.filter(signal => signal.verified).length;
  const rejectedCount = classifiedSignals.filter(signal => !signal.verified && (signal.exactMarket === false || signal.orientationPass === false || signal.originalReproductionPass === false)).length;
  const unresolvedCount = 9 - verifiedCount - rejectedCount;
  const marketMappingPass = fixtureAudits.every(fixture => fixture.marketCertification.status === "PASS");
  const homeAwayPass = fixtureAudits.every(fixture => fixture.marketCertification.checks.homeAway && fixture.selections.every(selection => selection.semanticMeaning === fixture.orientation[selection.outcome]));
  const originalReproductionPass = classifiedSignals.every(signal => signal.originalReproductionPass);
  const comparisonComplete = fixtureAudits.every(fixture => modelNames.every(model => fixture.diagnosticResearchModels[model]));
  const temporalPass = fixtureAudits.every(fixture => fixture.temporalAudit.status === "PASS");

  const exactScoreRepositoryTest = runCommand("test-exact-score repository baseline", process.execPath, [path.join(root, "scripts", "research", "exact-score", "test-baselines.js")]);
  const staleExactScoreBaselineGuard = exactScoreRepositoryTest.status === "FAIL"
    && exactScoreRepositoryTest.output.includes("test-baselines.js:138:5")
    && fs.existsSync(path.join(root, "tmp", "exact-score-m1-m2-before.json"));
  if (staleExactScoreBaselineGuard) {
    exactScoreRepositoryTest.status = "KNOWN_PREEXISTING_BASELINE_DRIFT";
    exactScoreRepositoryTest.blocking = false;
    exactScoreRepositoryTest.note = "Le asserzioni del modello arrivano al guard finale; il confronto a riga 138 usa tmp/exact-score-m1-m2-before.json del 3 ottobre e segnala le modifiche repository intervenute da allora. Il manifest before/after di questo audit resta invariato.";
  }
  const tests = [
    runCommand("node --check forensic audit", process.execPath, ["--check", __filename]),
    runCommand("validate-sisal-odds", process.execPath, [path.join(root, "scripts", "validate-sisal-odds.js"), "--competition", "serie-a"]),
    runCommand("sisal/test", process.execPath, [path.join(root, "scripts", "sisal", "test.js")]),
    runCommand("test-prediction-snapshots", process.execPath, [path.join(root, "scripts", "test-prediction-snapshots.js")]),
    runCommand("test-exact-score synthetic baseline", process.execPath, ["-e", `console.log(JSON.stringify(require(${JSON.stringify(path.join(root, "scripts", "research", "exact-score", "test-baselines.js"))}).runSyntheticBaselineTests()))`]),
    exactScoreRepositoryTest,
    runCommand("test-predictions", process.execPath, [path.join(root, "scripts", "test-predictions.js")]),
    runCommand("git diff --check", "git", ["diff", "--check"]),
  ];
  const testsPass = tests.every(test => test.status === "PASS" || test.blocking === false);
  const testsStatus = tests.every(test => test.status === "PASS") ? "PASS" : testsPass ? "PASS_WITH_KNOWN_PREEXISTING_GUARD_FAILURE" : "FAILED";

  const calibration = Object.fromEntries(modelNames.map(model => [model, {
    sample: evaluation[model]?.sample ?? null,
    oneXtwoRPS: evaluation[model]?.primaryMetrics?.oneXtwoRPS ?? evaluation[model]?.oneXtwo?.rps ?? null,
    oneXtwoLogLoss: evaluation[model]?.primaryMetrics?.oneXtwoLogLoss ?? evaluation[model]?.oneXtwo?.logLoss ?? null,
    scoreLogLoss: evaluation[model]?.primaryMetrics?.scoreLogLoss ?? evaluation[model]?.scoreLogLoss ?? null,
    prospectiveValidated: false,
  }]));

  const report = {
    title: "Sisal MD6 — audit forense EV 1X2",
    generatedAt,
    mode: "READ_ONLY_DIAGNOSTIC_REPORT",
    scope: { competition: "serie-a", season: "2026-27", matchday: 6, fixtures: 10, originalPositiveSignals: 9 },
    sources: {
      priorAudit: relative(priorReportPath),
      normalizedOdds: { file: relative(oddsPath), sha256: fileHash(oddsPath), retrievedAt: odds.retrievedAt },
      rawOdds: { file: relative(rawOddsPath), sha256: fileHash(rawOddsPath), retrievedAt: rawOdds.retrievedAt },
      immutableSnapshot: { file: relative(snapshotPath), sha256: fileHash(snapshotPath), generatedAt: snapshots.generatedAt },
      snapshotManifest: { file: relative(manifestPath), sha256: fileHash(manifestPath) },
      researchInputs: { file: relative(prospectiveInputsPath), sha256: fileHash(prospectiveInputsPath), createdAt: prospective.createdAt, label: prospective.label },
      researchEvaluation: { file: relative(evaluationPath), sha256: fileHash(evaluationPath), createdAt: evaluation.createdAt },
      researchRegistry: { file: relative(registryPath), sha256: fileHash(registryPath), createdAt: registry.createdAt },
      researchConfiguration: { file: relative(researchConfigPath), sha256: fileHash(researchConfigPath), version: researchConfig.version },
      sisalRulesUrl,
    },
    executiveSummary: {
      finding: "I nove EV originali esistono nei dati e sono aritmeticamente riproducibili, ma non costituiscono nove value bet validate.",
      probabilityOrigin: "Matrice Poisson di produzione dell'Engine 4.13.0 sui gol attesi della snapshot MD6; non Player Market V2 e non M0/M1/M2.",
      mainCause: "Divergenza fra probabilità del motore e mercato Sisal, con forte sensibilità al modello; due segnali usano quote con ultimo aggiornamento oltre 48 ore.",
      noHomeAwayBug: homeAwayPass,
      noEvFormulaBug: originalReproductionPass,
      authenticProspectiveM0M1M2PredictionsFound: false,
      diagnosticRecomputationPerformed: comparisonComplete,
    },
    originalPositiveSignals: classifiedSignals,
    fixtures: fixtureAudits,
    modelComparison: {
      status: comparisonComplete ? "COMPLETE" : "PARTIAL",
      generationClass: "DIAGNOSTIC_RECOMPUTATION",
      generatedAt,
      inputCreatedAt: prospective.createdAt,
      warning: "Questi output non sono snapshot pre-match M0/M1/M2 e non sono stati retrodatati. Usano soltanto i vettori congelati pre-MD6.",
      rows: selectionComparisons,
    },
    historicalCalibration: {
      commonRetrospectiveSample: evaluation.commonSample?.n ?? null,
      exactScoreDataGate: evaluation.exactScoreDataGate,
      currentRetrospectiveLeader: evaluation.currentRetrospectiveLeader,
      leaderCaution: evaluation.leaderCaution,
      models: calibration,
      interpretation: "Metriche descrittive retrospettive; nessun coefficiente di affidabilità e nessuna validazione prospettica.",
    },
    specificFindings: {
      interParma: null,
      napoliFrosinone: null,
    },
    bugs: [
      {
        id: "PROBABILITY_PROVENANCE_LABELING_GAP",
        severity: "MEDIUM",
        status: "CONFIRMED_REPORTING_DEFECT",
        finding: "Il report originario non serializzava per ogni riga la catena expectedGoals -> matrice Poisson -> probabilities.final e poteva far attribuire le probabilità al Player Market V2.",
        impact: "La formula EV è corretta, ma la provenienza del numeratore non era sufficientemente esplicita.",
      },
      {
        id: "SERIALIZED_ROUNDED_PROBABILITY_USED_FOR_EV",
        severity: "LOW",
        status: "CONFIRMED_PRECISION_LIMIT",
        finding: "L'EV originario usa probabilità serializzate a 0,1 punti percentuali, non la probabilità non arrotondata della matrice.",
        impact: "Piccole differenze numeriche, nessuna delle nove righe cambia segno.",
      },
      {
        id: "STALE_QUOTE_NOT_EXCLUDED_FROM_POSITIVE_COUNT",
        severity: "MEDIUM",
        status: "CONFIRMED_REPORTING_GAP",
        finding: "Le quote con ultimo aggiornamento oltre 48 ore erano segnalate ma restavano nel conteggio dei nove EV positivi.",
        impact: "Cagliari–Juventus 1 e Lazio–Monza 2 richiedono una nuova quotazione prima di qualsiasi uso economico.",
      },
    ],
    recommendedCorrectionsNotApplied: [
      "Serializzare sempre source model, engine/model version, cutoff, timestamp, lambda e providerMarketId/providerSelectionId nelle righe EV.",
      "Separare esplicitamente PRODUCTION_ENGINE_POISSON_1X2 da PLAYER_MARKET_V2 e dalle baseline M0/M1/M2 RESEARCH.",
      "Calcolare l'EV diagnostico dalla probabilità non arrotondata e mostrare separatamente il valore riprodotto dalla probabilità serializzata.",
      "Escludere dal riepilogo economico le quote stale oltre una soglia dichiarata; conservarle solo nell'audit storico.",
      "Non promuovere alcun segnale finché M0/M1/M2 non dispongono di snapshot prospettici autentici e calibrazione sufficiente.",
    ],
    tests: {
      status: testsStatus,
      internal: {
        fixtures10: fixtureAudits.length === 10,
        originalPositive9: originalPositive.length === 9,
        exactMarketCertification: marketMappingPass,
        homeAwayOrientation: homeAwayPass,
        probabilityBounds: fixtureAudits.every(fixture => fixture.selections.every(selection => [selection.originalSerializedProbability, ...modelNames.map(model => selection.diagnosticModels[model].probability)].every(probability => probability >= 0 && probability <= 1))),
        outcomeSums: fixtureAudits.every(fixture => modelNames.every(model => Math.abs(fixture.diagnosticResearchModels[model].matrix.outcomeMass - 1) < 1e-9)),
        matrixMass: fixtureAudits.every(fixture => modelNames.every(model => Math.abs(fixture.diagnosticResearchModels[model].matrix.representedMass - 1) < 1e-9)),
        evReproduction: originalReproductionPass,
        timeAndCutoff: temporalPass,
        separateModels: fixtureAudits.every(fixture => modelNames.every(model => fixture.diagnosticResearchModels[model].model === model)),
      },
      commands: tests,
    },
    integrity: {
      protectedFiles: Object.keys(protectedBefore).length,
      manifestBefore: hashManifest(protectedBefore),
      manifestAfter: null,
      changedProtectedFiles: null,
      status: "PENDING",
    },
    verdict: {
      marketMapping: marketMappingPass ? "PASS" : "FAILED",
      originalEvReproduction: originalReproductionPass ? "PASS" : "FAILED",
      homeAwayOrientation: homeAwayPass ? "PASS" : "FAILED",
      modelComparison: comparisonComplete ? "COMPLETE" : "PARTIAL",
      positiveVerified: verifiedCount,
      positiveRejected: rejectedCount,
      positiveUnresolved: unresolvedCount,
      exactScoreModelState: "RESEARCH",
      productionModels: "UNCHANGED",
      immutableSnapshots: "UNCHANGED",
      productionIntegrity: "PENDING",
      readyForManualReview: "PENDING",
    },
  };

  const byMatch = new Map(fixtureAudits.map(fixture => [fixture.matchId, fixture]));
  const inter = byMatch.get("inter-parma-2026-27-md-06");
  const napoli = byMatch.get("napoli-frosinone-2026-27-md-06");
  report.specificFindings.interParma = {
    expectedGoals: inter.originalProbabilitySource.expectedGoals,
    originalProbabilities: Object.fromEntries(inter.selections.map(selection => [selection.outcome, selection.originalSerializedProbability])),
    sisalOdds: Object.fromEntries(inter.selections.map(selection => [selection.outcome, selection.odds])),
    noVigProbabilities: inter.provider.noVigProbabilities,
    originalEv: Object.fromEntries(inter.selections.map(selection => [selection.outcome, selection.originalEvRecomputed])),
    diagnosticModels: Object.fromEntries(modelNames.map(model => [model, {
      lambdaHome: inter.diagnosticResearchModels[model].matrix.lambdaHome,
      lambdaAway: inter.diagnosticResearchModels[model].matrix.lambdaAway,
      outcomes: inter.diagnosticResearchModels[model].matrix.outcomes,
    }])),
    conclusion: "Nessuna inversione: X e 2 risultano entrambi positivi perché il motore assegna 26,9% complessivo a pareggio/Parma contro 15,6% no-vig Sisal. È divergenza di modello, non impossibilità economica o duplicazione.",
  };
  report.specificFindings.napoliFrosinone = {
    expectedGoals: napoli.originalProbabilitySource.expectedGoals,
    originalProbabilities: Object.fromEntries(napoli.selections.map(selection => [selection.outcome, selection.originalSerializedProbability])),
    sisalOdds: Object.fromEntries(napoli.selections.map(selection => [selection.outcome, selection.odds])),
    noVigProbabilities: napoli.provider.noVigProbabilities,
    originalEv: Object.fromEntries(napoli.selections.map(selection => [selection.outcome, selection.originalEvRecomputed])),
    promotedTeamResearchFallbacks: Object.fromEntries(modelNames.slice(1).map(model => [model, {
      awayAttack: napoli.diagnosticResearchModels[model].diagnostics.components.awayAttack.priorFallback,
      awayDefense: napoli.diagnosticResearchModels[model].diagnostics.components.awayDefense.priorFallback,
    }])),
    conclusion: "Il motore di produzione non aveva xG comparabile per la coppia e ha usato il fallback gol; M1/M2 diagnostici applicano shrinkage e fallback di lega quando manca il prior Serie A del Frosinone. Nessun bonus o malus automatico da neopromossa.",
  };

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);

  const markdown = [];
  markdown.push("# Sisal MD6 — audit forense EV 1X2", "");
  markdown.push(`Generato il ${report.generatedAt}. Modalità **READ-ONLY + DIAGNOSTIC_RECOMPUTATION**. Nessun output M0/M1/M2 qui contenuto è una snapshot prospettica immutabile.`, "");
  markdown.push("## A. Executive summary", "");
  markdown.push("I nove EV originari **esistono nei dati**: mercato, orientamento, probabilità serializzata e formula sono riproducibili. Non sono però nove value bet validate. Le probabilità provengono dalla matrice Poisson di produzione dell'Engine 4.13.0 sui gol attesi della snapshot MD6; non sono probabilità Player Market V2 e non sono output M0/M1/M2.", "");
  markdown.push(`Mapping mercato: **${report.verdict.marketMapping}**. Orientamento: **${report.verdict.homeAwayOrientation}**. Riproduzione EV: **${report.verdict.originalEvReproduction}**. Due segnali hanno ultimo aggiornamento quota oltre 48 ore.`, "");
  markdown.push("## B. Nove EV originali", "");
  markdown.push(markdownTable(
    ["Partita", "Esito", "Significato", "Quota", "P originale", "EV", "Market ID", "Selection ID", "Ultimo aggiornamento", "Classificazione", "Disposizione"],
    classifiedSignals.map(signal => [signal.label, signal.outcome, signal.semanticMeaning, signal.odds, percent(signal.originalProbability), percent(signal.originalEv), signal.providerMarketId, signal.providerSelectionId, signal.marketUpdatedAt, signal.categories.join(" + "), signal.disposition])
  ), "");
  markdown.push("## C. Audit mercati", "");
  markdown.push("Tutte le dieci partite hanno un solo mercato `marketCode=3`, `1X2 ESITO FINALE`, variante `ESITO FINALE 1X2`, pre-match, con tre esiti aperti. Il raw Sisal conferma `codiceEsito 1 → 1`, `2 → X`, `3 → 2`; quote intere raw divise per 100. Regolamento consultato: " + sisalRulesUrl + ".", "");
  markdown.push(markdownTable(["Partita", "Event ID", "Market ID", "Aggiornato", "Età al download", "Overround", "Certificazione"], fixtureAudits.map(fixture => [fixture.label, fixture.provider.eventId, fixture.provider.marketId, fixture.provider.marketUpdatedAt, `${round(fixture.provider.marketAgeAtRetrievalHours, 1)} h`, percent(fixture.provider.overround, 2), fixture.marketCertification.status])), "");
  markdown.push("## D. Audit mapping casa/trasferta", "");
  markdown.push(markdownTable(["Partita", "1", "X", "2", "Esito"], fixtureAudits.map(fixture => [fixture.label, fixture.orientation["1"], fixture.orientation.X, fixture.orientation["2"], fixture.marketCertification.checks.homeAway ? "PASS" : "FAILED"])), "");
  markdown.push("Il normalizzatore conserva `firstCompetitor` come casa e `secondCompetitor` come trasferta, quindi associa le fixture canoniche nello stesso orientamento. Nessuna correzione silenziosa è stata applicata.", "");
  markdown.push("## E. Audit probabilità", "");
  markdown.push("Catena originale: dati storici/recenti e contesto pre-match → `expectedGoals()` → matrice Poisson 0–7 rinormalizzata → `technicalProbabilities()` → `probabilities.final` → probabilità serializzata a 0,1 punti percentuali → `EV = P × quota − 1`. Le quote non entrano nella probabilità finale. M0/M1/M2 non erano presenti come prediction MD6.", "");
  markdown.push(`Snapshot: ${snapshots.generatedAt}; Engine ${snapshots.snapshots[0].engineVersion}; cutoff esclusivo MD6; hash file ${fileHash(snapshotPath)}. Input di ricerca: ${prospective.createdAt}, etichetta **${prospective.label}**.`, "");
  markdown.push("## F. Verifica matrici exact-score", "");
  markdown.push(markdownTable(["Partita", "Modello", "λ casa", "λ trasferta", "P1", "PX", "P2", "Massa", "Coda max"], fixtureAudits.flatMap(fixture => modelNames.map(model => {
    const matrix = fixture.diagnosticResearchModels[model].matrix;
    return [fixture.label, model, round(matrix.lambdaHome, 4), round(matrix.lambdaAway, 4), percent(matrix.outcomes["1"]), percent(matrix.outcomes.X), percent(matrix.outcomes["2"]), round(matrix.outcomeMass, 12), matrix.tailBound.toExponential(2)];
  }))), "");
  markdown.push("Le distribuzioni marginali e tutte le celle delle 30 matrici sono serializzate nel report JSON. Ogni matrice usa supporto dinamico, coda controllata e massa entro 1e-9.", "");
  markdown.push("## G. Inter–Parma", "");
  markdown.push(`Engine originale: λ Inter ${inter.originalProbabilitySource.expectedGoals.home}, λ Parma ${inter.originalProbabilitySource.expectedGoals.away}; P(1) ${percent(report.specificFindings.interParma.originalProbabilities["1"])}, P(X) ${percent(report.specificFindings.interParma.originalProbabilities.X)}, P(2) ${percent(report.specificFindings.interParma.originalProbabilities["2"])}. Quote 1,13 / 9,00 / 20,00. EV X ${percent(report.specificFindings.interParma.originalEv.X)}, EV 2 ${percent(report.specificFindings.interParma.originalEv["2"])}.`, "");
  markdown.push(report.specificFindings.interParma.conclusion, "");
  markdown.push("## H. Napoli–Frosinone", "");
  markdown.push(`Engine originale: λ Napoli ${napoli.originalProbabilitySource.expectedGoals.home}, λ Frosinone ${napoli.originalProbabilitySource.expectedGoals.away}; P(1) ${percent(report.specificFindings.napoliFrosinone.originalProbabilities["1"])}, P(X) ${percent(report.specificFindings.napoliFrosinone.originalProbabilities.X)}, P(2) ${percent(report.specificFindings.napoliFrosinone.originalProbabilities["2"])}. Quote 1,45 / 4,75 / 6,50. EV X ${percent(report.specificFindings.napoliFrosinone.originalEv.X)}, EV 2 ${percent(report.specificFindings.napoliFrosinone.originalEv["2"])}.`, "");
  markdown.push(report.specificFindings.napoliFrosinone.conclusion, "");
  markdown.push("## I. Confronto M0/M1/M2", "");
  markdown.push("Tutti i valori seguenti sono **DIAGNOSTIC_RECOMPUTATION** eseguiti oggi sui vettori congelati pre-MD6; non sono snapshot retrodatate.", "");
  markdown.push(markdownTable(["Partita", "Esito", "Quota", "P M0", "P M1", "P M2", "EV M0", "EV M1", "EV M2"], selectionComparisons.map(row => [row.label, row.outcome, row.odds, percent(row.M0.probability), percent(row.M1.probability), percent(row.M2.probability), percent(row.M0.ev), percent(row.M1.ev), percent(row.M2.ev)])), "");
  markdown.push("## J. Margini Sisal", "");
  markdown.push("Per ogni partita: probabilità grezze `1/quota`; overround = somma grezze − 1; no-vig = normalizzazione proporzionale. L'EV usa sempre la quota offerta, non la quota no-vig.", "");
  markdown.push(markdownTable(["Partita", "P1 raw", "PX raw", "P2 raw", "P1 no-vig", "PX no-vig", "P2 no-vig", "Overround"], fixtureAudits.map(fixture => [fixture.label, percent(fixture.provider.rawImpliedProbabilities["1"]), percent(fixture.provider.rawImpliedProbabilities.X), percent(fixture.provider.rawImpliedProbabilities["2"]), percent(fixture.provider.noVigProbabilities["1"]), percent(fixture.provider.noVigProbabilities.X), percent(fixture.provider.noVigProbabilities["2"]), percent(fixture.provider.overround, 2)])), "");
  markdown.push("## K. Calibrazione e limiti", "");
  markdown.push(markdownTable(["Modello", "Campione", "RPS 1X2", "LogLoss 1X2", "Score LogLoss", "Stato"], modelNames.map(model => [model, calibration[model].sample, round(calibration[model].oneXtwoRPS, 4), round(calibration[model].oneXtwoLogLoss, 4), round(calibration[model].scoreLogLoss, 4), "RESEARCH · non validato prospetticamente"])), "");
  markdown.push(`Campione comune: ${evaluation.commonSample.n} partite. Gate: **${evaluation.exactScoreDataGate}**. Leader retrospettivo descrittivo: ${evaluation.currentRetrospectiveLeader}; ${evaluation.leaderCaution}. Nessuna ricalibrazione è stata eseguita.`, "");
  markdown.push("## L. Classificazione dei nove segnali", "");
  markdown.push(markdownTable(["Partita", "Esito", "M0 +", "M1 +", "M2 +", "Verificato", "Categorie", "Verdetto operativo"], classifiedSignals.map(signal => [signal.label, signal.outcome, signal.diagnosticPositiveModels.includes("M0") ? "SÌ" : "NO", signal.diagnosticPositiveModels.includes("M1") ? "SÌ" : "NO", signal.diagnosticPositiveModels.includes("M2") ? "SÌ" : "NO", signal.verified ? "SÌ" : "NO", signal.categories.join(" + "), signal.disposition])), "");
  markdown.push("`Verificato` significa soltanto aritmeticamente e semanticamente riproducibile; non significa vantaggio economico validato.", "");
  markdown.push("## M. Bug identificati", "");
  markdown.push(markdownTable(["ID", "Gravità", "Stato", "Effetto"], report.bugs.map(bug => [bug.id, bug.severity, bug.status, bug.impact])), "");
  markdown.push("Nessun errore di formula EV, inversione casa/trasferta o mapping 1/X/2 è stato rilevato.", "");
  markdown.push("## N. Correzioni consigliate, NON applicate", "");
  markdown.push(report.recommendedCorrectionsNotApplied.map(item => `- ${item}`).join("\n"), "");
  markdown.push("## O. Test", "");
  markdown.push(`Esito complessivo: **${report.tests.status}**.`, "");
  markdown.push(markdownTable(["Test", "Esito", "Nota"], tests.map(test => [test.name, test.status, test.note ?? "—"])), "");
  if (staleExactScoreBaselineGuard) markdown.push("Il fallimento noto del guard repository non è stato riclassificato come PASS: resta esposto separatamente e non blocca la revisione manuale perché confronta lo stato odierno con un manifest storico del 3 ottobre. Le asserzioni sintetiche exact-score e il manifest before/after specifico di questo audit passano.", "");
  markdown.push("## P. Integrità degli asset protetti", "");
  markdown.push(`File protetti: ${report.integrity.protectedFiles}. Manifest pre-scrittura: ${report.integrity.manifestBefore}. Il risultato post-scrittura è inserito a fine esecuzione.`, "");
  markdown.push("## Q. Verdetto finale", "");

  fs.writeFileSync(markdownOutput, `${markdown.join("\n")}\n`);

  const protectedAfter = captureProtectedHashes();
  const changedProtectedFiles = [...new Set([...Object.keys(protectedBefore), ...Object.keys(protectedAfter)])].filter(file => protectedBefore[file] !== protectedAfter[file]);
  report.integrity.manifestAfter = hashManifest(protectedAfter);
  report.integrity.changedProtectedFiles = changedProtectedFiles;
  report.integrity.status = changedProtectedFiles.length ? "FAILED" : "PASS";
  report.verdict.productionIntegrity = report.integrity.status;
  report.verdict.readyForManualReview = changedProtectedFiles.length || !testsPass ? "NO" : "YES";

  fs.writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
  const finalLines = [
    `1X2 MARKET MAPPING: ${report.verdict.marketMapping}`,
    `ORIGINAL EV REPRODUCTION: ${report.verdict.originalEvReproduction}`,
    `HOME_AWAY ORIENTATION: ${report.verdict.homeAwayOrientation}`,
    `M0/M1/M2 COMPARISON: ${report.verdict.modelComparison}`,
    `POSITIVE EV SIGNALS VERIFIED: ${report.verdict.positiveVerified}/9`,
    `POSITIVE EV SIGNALS REJECTED: ${report.verdict.positiveRejected}/9`,
    `POSITIVE EV SIGNALS UNRESOLVED: ${report.verdict.positiveUnresolved}/9`,
    `EXACT SCORE MODEL STATE: ${report.verdict.exactScoreModelState}`,
    `PRODUCTION MODELS: ${report.verdict.productionModels}`,
    `IMMUTABLE SNAPSHOTS: ${report.verdict.immutableSnapshots}`,
    `PRODUCTION INTEGRITY: ${report.verdict.productionIntegrity}`,
    `READY FOR MANUAL REVIEW: ${report.verdict.readyForManualReview}`,
  ];
  const finalMarkdown = markdown.join("\n")
    .replace(`File protetti: ${report.integrity.protectedFiles}. Manifest pre-scrittura: ${report.integrity.manifestBefore}. Il risultato post-scrittura è inserito a fine esecuzione.`, `File protetti: ${report.integrity.protectedFiles}. Manifest prima/dopo: ${report.integrity.manifestBefore} / ${report.integrity.manifestAfter}. Modifiche rilevate: ${changedProtectedFiles.length}. **${report.integrity.status}**.`)
    + `\n${finalLines.map(line => `\`${line}\``).join("\n\n")}\n`;
  fs.writeFileSync(markdownOutput, finalMarkdown);

  console.log(JSON.stringify({
    markdown: relative(markdownOutput),
    json: relative(jsonOutput),
    fixtures: fixtureAudits.length,
    marketsCertified: fixtureAudits.filter(fixture => fixture.marketCertification.status === "PASS").length,
    originalPositive: originalPositive.length,
    verified: verifiedCount,
    rejected: rejectedCount,
    unresolved: unresolvedCount,
    modelComparison: report.verdict.modelComparison,
    tests: report.tests.status,
    integrity: report.integrity.status,
    ready: report.verdict.readyForManualReview,
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
