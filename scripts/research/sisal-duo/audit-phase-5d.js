"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const reportDate = "2026-10-09";
const outputBase = `serie-a-md06-phase-5d-duo-audit-${reportDate}`;
const outputJson = path.join(root, "output", "reports", `${outputBase}.json`);
const outputMarkdown = path.join(root, "output", "reports", `${outputBase}.md`);
const rulesUrl = "https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf";

const sourcePaths = {
  phase5b1: "output/reports/serie-a-md06-group-b-audit-2026-10-09.json",
  priorDuoAudit: "output/reports/sisal-md06-duo-market-compatibility-2026-10-09.json",
  odds: "data/normalized/odds/sisal/serie-a.json",
  probableLineups: "data/sources/probable-lineups-md6-2026-27.json",
  quotations: "data/sources/fantacalcio-quotations-2026-27.json",
  identityAliases: "data/sources/player-identity-aliases-2026-27.json",
  operational: "output/reports/md6-latest-operational-2026-10-03.json",
  currentResults: "data/sources/match-results-2026-27.json",
  schedina: "data/normalized/schedina-md06.json",
  previousSeasonRaw: "data/raw/referee-stats/espn/2025-26/serie-a",
};

function absolute(relative) { return path.join(root, relative); }
function readJson(relative) { return JSON.parse(fs.readFileSync(absolute(relative), "utf8")); }
function sha256Buffer(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function sha256File(relative) { return sha256Buffer(fs.readFileSync(absolute(relative))); }
function sha256Value(value) { return sha256Buffer(Buffer.from(value)); }
function normalize(value) {
  return String(value || "")
    .replace(/[øØ]/g, "o").replace(/[łŁ]/g, "l").replace(/[đĐðÐ]/g, "d")
    .replace(/[þÞ]/g, "th").replace(/[æÆ]/g, "ae").replace(/[œŒ]/g, "oe").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function countBy(rows, key) {
  return Object.fromEntries([...rows.reduce((map, row) => map.set(typeof key === "function" ? key(row) : row[key], (map.get(typeof key === "function" ? key(row) : row[key]) || 0) + 1), new Map())].sort(([a], [b]) => String(a).localeCompare(String(b))));
}
function table(headers, rows) {
  const cell = value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [`| ${headers.map(cell).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(cell).join(" | ")} |`)].join("\n");
}
function roleLabel(code) { return ({ P: "Portiere", D: "Difensore", C: "Centrocampista", A: "Attaccante" })[code] || null; }

function currentHistoryAudit(results) {
  const matches = (results.matches || []).filter(match => /-md-0[1-5]$/.test(match.matchId) && match.status === "finished");
  const playerRows = matches.flatMap(match => ["home", "away"].flatMap(side => (match.playerStats?.[side] || []).map(player => ({ matchId: match.matchId, side, ...player }))));
  const substitutions = matches.flatMap(match => (match.substitutions || []).map((substitution, index) => ({ matchId: match.matchId, index, ...substitution })));
  const chains = [];
  for (const match of matches) {
    const subs = match.substitutions || [];
    for (let firstIndex = 0; firstIndex < subs.length; firstIndex++) {
      const first = subs[firstIndex];
      for (let secondIndex = firstIndex + 1; secondIndex < subs.length; secondIndex++) {
        const second = subs[secondIndex];
        if (first.team === second.team && first.playerInId && first.playerInId === second.playerOutId) {
          chains.push({ matchId: match.matchId, teamId: first.team, namedPlayerOutId: first.playerOutId, directReplacementId: first.playerInId, laterReplacementId: second.playerInId, firstMinute: first.minute, secondMinute: second.minute });
        }
      }
    }
  }
  const starterSlots = [];
  for (const match of matches) {
    const stats = ["home", "away"].flatMap(side => (match.playerStats?.[side] || []).map(player => ({ side, ...player })));
    const byId = new Map(stats.map(player => [player.playerId, player]));
    for (const starter of stats.filter(player => player.starter === true)) {
      const direct = (match.substitutions || []).find(sub => sub.playerOutId === starter.playerId);
      const replacement = direct?.playerInId ? byId.get(direct.playerInId) || null : null;
      const later = direct?.playerInId ? (match.substitutions || []).find(sub => sub.playerOutId === direct.playerInId) || null : null;
      starterSlots.push({
        matchId: match.matchId,
        starterId: starter.playerId,
        directReplacementId: direct?.playerInId || null,
        replacementObserved: !direct || Boolean(replacement),
        laterReplacementId: later?.playerInId || null,
        standardShotsObservable: Number.isFinite(starter.shots) && (!direct || Number.isFinite(replacement?.shots)),
        standardSotObservable: Number.isFinite(starter.shotsOnTarget) && (!direct || Number.isFinite(replacement?.shotsOnTarget)),
      });
    }
  }
  return {
    source: sourcePaths.currentResults,
    matchdays: [1, 2, 3, 4, 5],
    matches: matches.length,
    matchesWithCompleteCoverage: matches.filter(match => match.coverage?.teamStats && match.coverage?.playerStats && match.coverage?.participation && match.coverage?.substitutions).length,
    playerRows: playerRows.length,
    starterRows: playerRows.filter(player => player.starter === true).length,
    rowsWithMinutes: playerRows.filter(player => Number.isFinite(player.minutes)).length,
    rowsWithShots: playerRows.filter(player => Number.isFinite(player.shots)).length,
    rowsWithShotsOnTarget: playerRows.filter(player => Number.isFinite(player.shotsOnTarget)).length,
    rowsWithPlayerWoodwork: playerRows.filter(player => Number.isFinite(player.hitWoodwork) || Number.isFinite(player.woodwork)).length,
    substitutionEvents: substitutions.length,
    substitutionEventsWithExplicitIds: substitutions.filter(sub => sub.playerInId && sub.playerOutId).length,
    substitutionEventsWithAddedTimeField: substitutions.filter(sub => sub.addedTime !== undefined && sub.addedTime !== null).length,
    maxSerializedSubstitutionMinute: substitutions.reduce((max, sub) => Math.max(max, Number(sub.minute) || 0), 0),
    explicitLaterReplacementChains: chains.length,
    matchesWithExplicitLaterReplacementChains: new Set(chains.map(chain => chain.matchId)).size,
    starterSlots: starterSlots.length,
    starterSlotsWithStandardShotsObservable: starterSlots.filter(slot => slot.standardShotsObservable).length,
    starterSlotsWithStandardSotObservable: starterSlots.filter(slot => slot.standardSotObservable).length,
    starterSlotsWithLaterReplacementAmbiguity: starterSlots.filter(slot => slot.laterReplacementId).length,
    observedVsEstimated: {
      observed: ["starter flag", "player-out/player-in IDs", "substitution minute (integer 0-90)", "per-player match minutes", "per-player total shots", "per-player standard shots on target"],
      notObserved: ["player-level woodwork", "added-time component of substitution minute", "DUO settlement outcome", "bookmaker interpretation of a later replacement chain"],
      estimated: [],
    },
    chainExamples: chains.slice(0, 12),
  };
}

function previousSeasonAudit() {
  const directory = absolute(sourcePaths.previousSeasonRaw);
  if (!fs.existsSync(directory)) return { source: sourcePaths.previousSeasonRaw, files: 0, status: "ABSENT" };
  const files = fs.readdirSync(directory).filter(file => file.endsWith(".json")).sort();
  let rosterRows = 0, starters = 0, shotRows = 0, sotRows = 0, directLinks = 0, timedLinks = 0, woodworkRows = 0;
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
    for (const team of raw.bundle?.summary?.rosters || []) for (const player of team.roster || []) {
      rosterRows++;
      if (player.starter === true) starters++;
      const stats = new Map((player.stats || []).map(stat => [stat.name, stat.value]));
      if (Number.isFinite(stats.get("totalShots"))) shotRows++;
      if (Number.isFinite(stats.get("shotsOnTarget"))) sotRows++;
      if ([...stats.keys()].some(name => /wood|post|crossbar/i.test(name))) woodworkRows++;
      if (player.subbedOutFor?.athlete?.id) directLinks++;
      if (player.subbedOutFor?.athlete?.id && (player.plays || []).some(play => play.substitution && play.clock?.displayValue)) timedLinks++;
    }
  }
  return {
    source: sourcePaths.previousSeasonRaw,
    status: files.length ? "LIMITED_RAW_SAMPLE" : "ABSENT",
    files: files.length,
    rosterRows,
    starters,
    rowsWithShots: shotRows,
    rowsWithShotsOnTarget: sotRows,
    rowsWithPlayerWoodwork: woodworkRows,
    explicitDirectReplacementLinks: directLinks,
    explicitDirectReplacementLinksWithClock: timedLinks,
    limitation: "Raw ESPN sample only (ten matches, not a canonical season corpus); no player-level woodwork field and no pre-existing DUO settlement dataset.",
  };
}

function main() {
  const phase5b1 = readJson(sourcePaths.phase5b1);
  const priorDuo = readJson(sourcePaths.priorDuoAudit);
  const odds = readJson(sourcePaths.odds);
  const lineups = readJson(sourcePaths.probableLineups);
  const quotations = readJson(sourcePaths.quotations);
  const identityAliases = readJson(sourcePaths.identityAliases);
  const operational = readJson(sourcePaths.operational);
  const results = readJson(sourcePaths.currentResults);
  const schedina = readJson(sourcePaths.schedina);

  const originalRows = phase5b1.classifications.filter(row => ["player-sot-duo", "player-shots-duo"].includes(row.family));
  const priorBySelection = new Map(priorDuo.markets.map(row => [String(row.selectionId), row]));
  const lineupByPlayer = new Map(lineups.teams.flatMap(team => (team.players || []).filter(player => player.playerId).map(player => [player.playerId, { ...player, teamUpdatedAt: team.updatedAt }])));
  const operationalByPlayerMatch = new Map(operational.fixtures.flatMap(fixture => (fixture.players || []).map(player => [`${fixture.matchId}:${player.playerId}`, player])));
  const catalogIds = new Set(schedina.marketCatalog.matches.flatMap(match => match.selections || []).map(selection => selection.selectionId));
  const localIdentityEvidence = new Map();
  const addIdentityEvidence = (playerId, evidence) => {
    if (!playerId) return;
    const values = localIdentityEvidence.get(playerId) || [];
    if (!values.includes(evidence)) values.push(evidence);
    localIdentityEvidence.set(playerId, values);
  };
  for (const team of lineups.teams) for (const player of team.players || []) addIdentityEvidence(player.playerId, sourcePaths.probableLineups);
  for (const player of quotations.players || []) addIdentityEvidence(player.playerId, sourcePaths.quotations);
  for (const player of identityAliases.players || []) addIdentityEvidence(player.playerId, sourcePaths.identityAliases);
  for (const file of fs.readdirSync(path.join(root, "data", "teams")).filter(file => file.endsWith(".json") && file !== "index.json")) {
    const relative = `data/teams/${file}`;
    for (const player of readJson(relative).squad || []) addIdentityEvidence(player.id, relative);
  }

  const classifications = originalRows.map(original => {
    const prior = priorBySelection.get(String(original.providerSelectionId));
    assert(prior, `${original.providerSelectionId}: missing prior DUO diagnostic row`);
    const association = prior.namedPlayers?.[0] || null;
    const wasOriginallyResolved = original.lineup.identityStatus === "VERIFIED_PROVIDER_PLAYER_ID";
    const identityEvidence = association?.playerId ? localIdentityEvidence.get(association.playerId) || [] : [];
    const acceptedPriorCrosswalk = !wasOriginallyResolved && association?.status === "EXACT" && Number(association.score) >= 96 && association.playerId && identityEvidence.length > 0;
    const playerId = wasOriginallyResolved ? original.lineup.playerId : acceptedPriorCrosswalk ? association.playerId : null;
    const lineup = playerId ? lineupByPlayer.get(playerId) || null : null;
    const engine = playerId ? operationalByPlayerMatch.get(`${original.matchId}:${playerId}`) || null : null;
    const identityStatus = wasOriginallyResolved
      ? "VERIFIED_PHASE_5B1_PROVIDER_PLAYER_ID"
      : acceptedPriorCrosswalk
        ? "DETERMINISTIC_LOCAL_EXACT_CROSSWALK"
        : association?.status === "FUZZY_VERIFIED_WITHIN_FIXTURE"
          ? "REVIEW_ONLY_APPROXIMATE_NOT_ACCEPTED"
          : "UNRESOLVED";
    const lineupStatus = lineup?.lineupStatus === "starter" ? "probable-starter" : lineup?.lineupStatus === "reserve" ? "reserve" : "unknown";
    const identityEligible = Boolean(playerId);
    const starterEligible = lineupStatus === "probable-starter";
    const quoteEligible = original.normalizationStatus === "VERIFIED_EXACT" && original.marketStatus === "open" && original.selectionStatus === "open" && Number(original.odds) >= 1;
    const classification = identityEligible && starterEligible && quoteEligible ? "D3" : "D4";
    const reasonCodes = classification === "D3"
      ? ["EXACT_IDENTITY_AND_PROBABLE_STARTER", "NO_VALIDATED_DUO_DISTRIBUTION", ...(original.family === "player-sot-duo" ? ["WOODWORK_TARGET_NOT_SERIALIZED"] : []), "SUBSTITUTION_SCENARIOS_NOT_MODELLED"]
      : [
          ...(!identityEligible ? ["IDENTITY_NOT_DETERMINISTIC"] : []),
          ...(identityEligible && !starterEligible ? [lineupStatus === "reserve" ? "POLICY_NOT_PROBABLE_STARTER" : "LINEUP_STATUS_UNAVAILABLE"] : []),
          ...(!quoteEligible ? ["QUOTE_OR_RAW_RECONCILIATION_INVALID"] : []),
        ];
    const crosswalk = wasOriginallyResolved ? {
      origin: "phase-5b1",
      status: "PREEXISTING_VERIFIED",
      providerLabel: association?.providerLabel || null,
      playerId,
      score: null,
      definitive: true,
    } : {
      origin: "phase-5d-review-of-local-links",
      status: acceptedPriorCrosswalk ? "ACCEPTED_DETERMINISTIC" : "NOT_ACCEPTED",
      providerLabel: association?.providerLabel || null,
      priorMatcherStatus: association?.status || "UNMATCHED",
      priorMatcherScore: association?.score || null,
      candidatePlayerId: association?.playerId || null,
      candidatePlayerName: association?.player || null,
      candidateTeamId: association?.teamId || null,
      playerId,
      definitive: Boolean(acceptedPriorCrosswalk),
      localCanonicalEvidence: identityEvidence,
      evidence: acceptedPriorCrosswalk ? "Existing local fixture-scoped name matcher produced a unique exact/token-initial match (score >=96); canonical ID is retained without approximate promotion." : "Approximate, ambiguous, or unmatched local candidate is not promoted to canonical identity.",
    };
    return {
      providerSelectionId: String(original.providerSelectionId),
      selectionId: original.selectionId,
      matchId: original.matchId,
      fixture: original.fixture,
      providerEventId: String(original.providerEventId),
      providerMarketId: String(original.providerMarketId),
      providerPlayerIds: (original.providerPlayerIds || []).map(String),
      marketCode: prior.marketCode,
      marketName: original.marketName,
      variantName: original.variantName,
      marketFamily: original.family,
      metric: prior.rule.metric,
      selection: original.selection,
      threshold: Number(original.threshold),
      minimumCount: Math.floor(Number(original.threshold)) + 1,
      odds: Number(original.odds),
      marketStatus: original.marketStatus,
      selectionStatus: original.selectionStatus,
      marketUpdatedAt: original.marketUpdatedAt,
      rawNormalizedIntegrity: original.normalizationStatus,
      rawReconciliationReasons: original.rawReconciliationReasons,
      alreadyInSchedinaCatalog: catalogIds.has(original.selectionId),
      originalPhase5B1: { level: original.level, identityStatus: original.lineup.identityStatus, lineupStatus: original.lineup.status },
      identity: {
        status: identityStatus,
        playerId,
        playerName: lineup?.currentName || association?.player || original.lineup.playerName || null,
        teamId: lineup?.teamId || association?.teamId || original.lineup.teamId || null,
        team: lineup?.team || null,
        roleCode: lineup?.sourceRole || engine?.sourceRole || null,
        role: roleLabel(lineup?.sourceRole) || engine?.role || null,
        crosswalk,
      },
      lineup: {
        status: lineupStatus,
        eligibleUnderUnchangedStarterPolicy: starterEligible,
        probability: lineup?.probability ?? engine?.starterProbability ?? null,
        source: lineup ? lineups.provider : null,
        sourceUrl: lineup ? lineups.sourceUrl : null,
        sourceImportedAt: lineup ? lineups.importedAt : null,
        teamSourceUpdatedAt: lineup?.teamUpdatedAt || null,
        associationMethod: lineup?.associationMethod || null,
      },
      commercialContract: {
        marketRuleId: prior.marketRuleId,
        namedPlayerPlusDirectReplacement: true,
        noReplacementMeansNamedPlayerOnly: true,
        namedPlayerDidNotParticipate: "REFUND",
        extraTimeIncluded: true,
        woodworkIncluded: true,
        laterReplacementChain: "RULE_UNVERIFIED",
        stoppageTimeSpecificClause: "NOT_FOUND_SEPARATELY",
      },
      engineV2: {
        available: Boolean(engine),
        playerMarketModelVersion: engine ? 2 : null,
        expectedMinutes: engine?.expectedMinutes ?? null,
        starterProbability: engine?.starterProbability ?? null,
        substitutionRiskCategory: engine?.substitutionRisk ?? null,
        substitutionProbability: null,
        likelyReplacement: engine?.likelyReplacement ?? null,
        projectedShots: engine?.projectedShots ?? null,
        projectedShotsOnTarget: engine?.projectedShotsOnTarget ?? null,
        shotThresholdProbabilities: engine?.shotProbabilities ?? null,
        sotThresholdProbabilities: engine?.shotOnTargetProbabilities ?? null,
        role: engine?.role ?? null,
        detailedRole: engine?.detailedRole ?? null,
        matchupDependent: Boolean(engine?.matchupEvidence || engine?.shotsMatchupFactor || engine?.shotsOnTargetMatchupFactor),
        matchupFactors: engine ? { shots: engine.shotsMatchupFactor ?? null, shotsOnTarget: engine.shotsOnTargetMatchupFactor ?? null } : null,
        completeCountDistributionSerialized: false,
        duoProbability: null,
        individualProbabilityUsedAsDuo: false,
      },
      classification,
      classificationReasons: reasonCodes,
      safeToAddNow: false,
      requiresNewModel: classification === "D3",
      evaluation: null,
    };
  }).sort((left, right) => left.providerSelectionId.localeCompare(right.providerSelectionId));

  const unresolvedOriginal = classifications.filter(row => row.originalPhase5B1.level === "B4");
  const acceptedCrosswalks = unresolvedOriginal.filter(row => row.identity.crosswalk.status === "ACCEPTED_DETERMINISTIC");
  const countedClassifications = countBy(classifications, "classification");
  const classificationTotals = Object.fromEntries(["D1", "D2", "D3", "D4"].map(level => [level, countedClassifications[level] || 0]));
  const currentHistory = currentHistoryAudit(results);
  const previousHistory = previousSeasonAudit();
  const stableRows = classifications.map(row => ({ providerSelectionId: row.providerSelectionId, playerId: row.identity.playerId, lineupStatus: row.lineup.status, classification: row.classification, reasons: row.classificationReasons }));
  const classificationSignature = sha256Value(JSON.stringify(stableRows));
  const sourceHashes = Object.fromEntries(Object.entries(sourcePaths).filter(([, relative]) => fs.existsSync(absolute(relative)) && fs.statSync(absolute(relative)).isFile()).map(([key, relative]) => [key, sha256File(relative)]));

  const report = {
    schemaVersion: 1,
    audit: "Serie A 2026/27 — Fase 5D: audit tecnico dei mercati giocatore DUO",
    generatedAt: new Date().toISOString(),
    reportDate,
    scope: "Diagnostic only; no production probability, catalog, policy, odds, UI, MyCombo, historical result, or Engine V2 mutation.",
    sources: { paths: sourcePaths, sha256: sourceHashes, sisalRulesUrl: rulesUrl, oddsRetrievedAt: odds.retrievedAt, probableLineupsImportedAt: lineups.importedAt, operationalGeneratedAt: operational.generatedAt },
    invariants: {
      schedinaCatalog: { total: schedina.marketCatalog.totals.finalSelections, evaluated: schedina.marketCatalog.totals.evaluated, notModelled: schedina.marketCatalog.totals.notModelled, unchanged: true },
      duoRowsInCatalog: classifications.filter(row => row.alreadyInSchedinaCatalog).length,
      probabilitiesCreated: 0,
      classificationSignature,
    },
    summary: {
      outcomes: classifications.length,
      byFamily: countBy(classifications, "marketFamily"),
      originalPhase5B1: { resolvedIdentityAndStarter: classifications.filter(row => row.originalPhase5B1.level === "B3").length, withoutReliableCrosswalk: unresolvedOriginal.length },
      crosswalkReview: {
        acceptedDeterministicOutcomes: acceptedCrosswalks.length,
        acceptedDeterministicProviderPlayers: new Set(acceptedCrosswalks.flatMap(row => row.providerPlayerIds)).size,
        acceptedAndProbableStarterOutcomes: acceptedCrosswalks.filter(row => row.lineup.status === "probable-starter").length,
        acceptedReserveOutcomes: acceptedCrosswalks.filter(row => row.lineup.status === "reserve").length,
        acceptedButLineupUnknownOutcomes: acceptedCrosswalks.filter(row => row.lineup.status === "unknown").length,
        approximateNotAcceptedOutcomes: unresolvedOriginal.filter(row => row.identity.status === "REVIEW_ONLY_APPROXIMATE_NOT_ACCEPTED").length,
        unresolvedOutcomes: unresolvedOriginal.filter(row => row.identity.status === "UNRESOLVED").length,
      },
      classificationTotals,
      safeToAddNow: classifications.filter(row => row.safeToAddNow).length,
      requiresNewModel: classifications.filter(row => row.requiresNewModel).length,
      nonEligible: classifications.filter(row => row.classification === "D4").length,
    },
    semantics: {
      explicitlyDocumented: [
        { topic: "single-player total-shots DUO", status: "VERIFIED", rule: "Named player plus the player who directly replaces him; if no substitution, named player only; goals, on-target, off-target and woodwork count; refund if named player does not participate; INC TS includes extra time.", source: rulesUrl, officialPdfLinesFromPriorAudit: "8250-8264" },
        { topic: "single-player SOT DUO including woodwork", status: "VERIFIED", rule: "Named player plus the player who directly replaces him; if no substitution, named player only; goals, shots that would enter, posts/crossbar count; refund if named player does not participate; INC TS includes extra time.", source: rulesUrl, officialPdfLinesFromPriorAudit: "8197-8215" },
        { topic: "participation", status: "VERIFIED", rule: "Entering the field even briefly is participation; otherwise the named-player single DUO is refunded.", source: rulesUrl },
      ],
      structuredDataSemantics: [
        "Market codes 28507 (total shots) and 28506 (SOT including woodwork) identify a single named providerPlayerId.",
        "All 553 variants contain SOMMA ... E SUO SOST. INCL. T.S.; threshold, selection, price and open status are normalized.",
        "The normalized contract stores providerPlayerIds and replacementIncluded=true in existing player-market links, but it does not encode later-chain settlement.",
      ],
      unconfirmed: [
        { topic: "replacement later substituted", status: "RULE_UNVERIFIED", consequence: "No settlement is invented; must be resolved with an explicit Sisal/settlement-provider clarification before production." },
        { topic: "multiple successive substitutions", status: "RULE_UNVERIFIED", consequence: "The phrase direct replacement proves the first link only; it does not prove whether a later substitute is aggregated." },
        { topic: "stoppage time", status: "NO_SEPARATE_CLAUSE_FOUND", consequence: "The rules identify regular/extra-time scope, but the local current-season source serializes only integer minute 0-90 and no added-time component." },
      ],
      authorizableNow: false,
    },
    engineV2Capability: {
      available: ["expected minutes", "editorial starter probability", "categorical substitution risk", "expected total shots", "expected standard SOT", "individual Poisson threshold probabilities", "role", "matchup adjustment"],
      unavailableForDuo: ["calibrated substitution probability", "substitution-time distribution", "replacement identity distribution", "replacement conditional shot/SOT rate", "later-chain scenario treatment", "player-level woodwork target", "DNP/refund probability", "joint scenario weights", "validated full DUO count distribution"],
      importantDistinction: "Individual probabilities are diagnostic marginals only and are never copied into the DUO field.",
    },
    historicalData: { currentSeasonMd1Md5: currentHistory, previousSeason: previousHistory },
    feasibilitySpecification: {
      status: "FEASIBLE_ONLY_AFTER_DATA_AND_MODEL_WORK",
      observedVariables: ["pre-match lineup snapshot", "post-match starter", "explicit direct substitution edge and minute", "per-player minutes", "per-player shots", "per-player standard SOT"],
      alreadyPredicted: ["starter editorial probability", "expected minutes", "categorical substitution risk", "named-player shot/SOT rate and marginals", "role and matchup factors"],
      missingVariables: ["probability and timing distribution for substitution", "conditional replacement identity", "replacement count intensity", "woodwork count intensity", "DNP/refund state", "later-chain rule and target", "extra-time scenario probability", "dependence among slot occupants and match context"],
      requiredAssumptionsToValidate: ["count distribution family", "rate scaling with exposure", "conditional dependence structure", "stable replacement-selection process", "mapping between data-provider SOT/woodwork definitions and Sisal settlement"],
      candidateSources: ["official pre-kickoff lineups", "explicit match substitution feeds", "OPTA/organizer settlement source named by Sisal", "current player-event data with woodwork", "immutable Engine V2 snapshots"],
      calibrationRisks: ["selection bias from probable starters", "rare DNP/refund and later-chain states", "lineup/news leakage", "small match-cluster sample", "provider definition drift", "extra-time scarcity"],
      simplerSubgroups: [
        { subgroup: "named player plays full match", benefit: "No replacement contribution after the fact.", limitation: "Not knowable with certainty pre-kickoff; still needs a scenario probability." },
        { subgroup: "total shots rather than SOT+woodwork", benefit: "Current history has total shots.", limitation: "Still lacks replacement/timing distributions and prospective calibration." },
        { subgroup: "stable role/replacement pair", benefit: "May reduce identity entropy.", limitation: "Cannot be promoted without a validated conditional replacement process." },
      ],
      implementationPerformed: false,
    },
    prospectiveValidationProtocol: [
      "Freeze a pre-kickoff snapshot with quote, provider IDs, exact contract version, model inputs, probable/official lineup state, and source timestamps.",
      "When official lineups arrive, record starter/DNP state without replacing the earlier snapshot; preserve both vintages.",
      "Record every explicit substitution edge, its event time including added time, and any later chain; never infer an edge from equal minutes.",
      "Obtain settlement-grade shots, SOT and woodwork from the organizer/OPTA-compatible source and store the settled DUO target plus void/refund state.",
      "Score each threshold with Brier score and log loss; report reliability bins/ECE and calibration slope/intercept with uncertainty.",
      "Compare against frozen baselines (named-player-only diagnostic, market-implied probability after margin handling, historical slot-rate model).",
      "Cluster uncertainty by match/player slot, enforce chronological training cutoffs, and exclude target/future information from features.",
      "Reserve a later independent temporal holdout; do not set PASS from the retrospective MD1-MD5 sample.",
    ],
    classifications,
  };

  assert.equal(report.summary.outcomes, 553);
  assert.deepEqual(report.summary.byFamily, { "player-shots-duo": 217, "player-sot-duo": 336 });
  assert.deepEqual(report.summary.originalPhase5B1, { resolvedIdentityAndStarter: 397, withoutReliableCrosswalk: 156 });
  assert.equal(new Set(classifications.map(row => row.providerSelectionId)).size, 553);
  assert(classifications.every(row => row.rawNormalizedIntegrity === "VERIFIED_EXACT"));
  assert(classifications.every(row => row.threshold >= 0.5 && Number.isInteger(row.minimumCount)));
  assert(classifications.every(row => row.odds >= 1 && row.marketStatus === "open" && row.selectionStatus === "open"));
  assert(classifications.every(row => row.evaluation === null && row.engineV2.duoProbability === null));
  assert(classifications.every(row => !row.alreadyInSchedinaCatalog));
  assert.equal(report.invariants.schedinaCatalog.total, 383);
  assert.equal(report.invariants.schedinaCatalog.evaluated, 367);
  assert.equal(report.invariants.schedinaCatalog.notModelled, 16);

  const unresolvedProviderRows = [...new Map(unresolvedOriginal.map(row => [row.providerPlayerIds.join(","), row])).values()].sort((a, b) => String(a.identity.crosswalk.providerLabel).localeCompare(String(b.identity.crosswalk.providerLabel)));
  const crosswalkTable = table(
    ["providerPlayerId", "Etichetta Sisal", "Esiti", "Esito verifica", "playerId candidato", "Formazione", "Classificazione esiti"],
    unresolvedProviderRows.map(example => {
      const same = unresolvedOriginal.filter(row => row.providerPlayerIds.join(",") === example.providerPlayerIds.join(","));
      return [example.providerPlayerIds.join(","), example.identity.crosswalk.providerLabel, same.length, example.identity.crosswalk.status, example.identity.playerId || example.identity.crosswalk.candidatePlayerId || "N/D", example.lineup.status, [...new Set(same.map(row => row.classification))].join(", ")];
    })
  );
  const classificationTable = table(
    ["Classe", "Esiti", "Interpretazione"],
    [
      ["D1", classificationTotals.D1, "Contratto DUO identico già valutato canonicamente"],
      ["D2", classificationTotals.D2, "Derivazione esatta da distribuzioni già validate"],
      ["D3", classificationTotals.D3, "Identità+titolare+quota riconciliati; serve nuovo modello DUO"],
      ["D4", classificationTotals.D4, "Identità/titolarità/policy non eleggibile"],
    ]
  );
  const md = `# Serie A 2026/27 — Fase 5D: audit tecnico dei mercati giocatore DUO

Data audit: ${reportDate}  
Ambito: **esclusivamente diagnostico**. Nessuna probabilità DUO è stata calcolata o aggiunta al prodotto.

## Esito sintetico

- Ricostruiti **553/553** esiti: **336** SOT DUO e **217** tiri totali DUO.
- Stato originario Fase 5B.1: **397** con identità+titolare riconciliate; **156** senza crosswalk affidabile.
- Nei 156: **${report.summary.crosswalkReview.acceptedDeterministicOutcomes} esiti / ${report.summary.crosswalkReview.acceptedDeterministicProviderPlayers} providerPlayerId** hanno un crosswalk locale esatto e verificabile; di questi **${report.summary.crosswalkReview.acceptedAndProbableStarterOutcomes}** esiti riguardano titolari probabili, **${report.summary.crosswalkReview.acceptedReserveOutcomes}** riserve e **${report.summary.crosswalkReview.acceptedButLineupUnknownOutcomes}** stato formazione ignoto. Le corrispondenze approssimative non sono state promosse.
- Classificazione finale: **D1 ${classificationTotals.D1} · D2 ${classificationTotals.D2} · D3 ${classificationTotals.D3} · D4 ${classificationTotals.D4}**.
- Aggiungibili in sicurezza oggi: **${report.summary.safeToAddNow}**. Esiti che richiedono un nuovo modello DUO: **${report.summary.requiresNewModel}**. Gli altri **${report.summary.nonEligible}** restano non eleggibili per identità/titolarità/policy.
- Catalogo Schedina invariato: **383 totali / 367 valutate / 16 NOT_MODELLED**.

${classificationTable}

## 1. Riconciliazione dei 553 esiti

Il JSON diagnostico **output/reports/${outputBase}.json** contiene, per ogni **providerSelectionId**: partita, ID evento/mercato/esito/giocatore provider, identità canonica, nome, squadra, ruolo, stato e fonte formazione, timestamp, soglia, quota, stato mercato, audit raw→normalizzato, capacità V2, motivi D1-D4 e flag di autorizzabilità.

Controlli: **553 ID unici**, **553/553** riconciliazioni raw→normalizzato esatte, quote numeriche e mercati/esiti aperti, soglie coerenti, **0** duplicati nel catalogo corrente. La firma deterministica delle sole decisioni è **${classificationSignature}**.

## 2. Semantica commerciale verificata

Fonte primaria: [Regole calcio Sisal](${rulesUrl}).

### Regole esplicitamente documentate

- Il DUO singolo somma il giocatore nominato e **chi lo sostituisce direttamente**; se non viene sostituito conta solo il nominato.
- Se il nominato non partecipa, l'esito è rimborsato; anche un ingresso breve costituisce partecipazione.
- Tiri totali: goal, tiri nello specchio, fuori e legni. SOT DUO in questo perimetro: goal, conclusioni che entrerebbero e pali/traverse.
- Le varianti analizzate sono **INCL. T.S.**, quindi includono gli eventuali supplementari.

### Semantica strutturata

- Codici **28507** (tiri totali) e **28506** (SOT con pali/traverse), un **providerPlayerId** nominato, soglia e quota per riga.
- Le 553 varianti riportano **SOMMA ... E SUO SOST. INCL. T.S.**; i link V2 esistenti marcano **replacementIncluded=true**.

### Non confermato — nessun settlement inventato

- Non è stata trovata una clausola esplicita che stabilisca se, quando il sostituto diretto viene poi sostituito, entri anche il giocatore successivo. Le catene multiple restano **RULE_UNVERIFIED**.
- Non è stata trovata una clausola separata sul minuto di recupero. Il dataset MD1-MD5 conserva solo il minuto intero 0-90 e non il componente **+N**.
- Questi limiti rendono il mercato **non autorizzabile oggi**, anche se il nucleo del contratto è documentato.

## 3. Stato dei 156 crosswalk mancanti

Sono stati riusati soltanto collegamenti locali fixture-scoped già presenti e deterministici: match esatto o token+iniziale univoco con punteggio del matcher >=96. Mononimi/fuzzy, pareggi e mismatch di iniziale restano non definitivi. La policy titolari non è cambiata.

${crosswalkTable}

Nota: candidati locali come **NDIAYE N.**→Abdoulaye Ndiaye o **BOWIE T.**→Kieron Bowie non sono accettati perché l'iniziale non coincide. Un nome simile non basta.

## 4. Capacità attuali dell'Engine V2

Per i giocatori coperti sono disponibili minuti attesi, probabilità editoriale di titolarità, rischio di sostituzione **categoriale**, tiri/SOT attesi, marginali Poisson per soglia, ruolo e fattori matchup. **likelyReplacement** è nullo nell'intero snapshot operativo e non esistono probabilità/tempistiche di sostituzione o una distribuzione completa DUO serializzata.

Mancano: distribuzione dell'identità del subentrante, tempi di cambio, volume condizionale del sostituto, catene successive, stato DNP/rimborso, legni a livello giocatore e pesi congiunti degli scenari. Le probabilità individuali sono conservate soltanto come diagnostica: **mai usate come probabilità DUO**.

## 5. Disponibilità storica delle sostituzioni

MD1-MD5: **${currentHistory.matches}** partite concluse, **${currentHistory.matchesWithCompleteCoverage}** con copertura dichiarata completa, **${currentHistory.playerRows}** righe giocatore, **${currentHistory.starterRows}** titolari, **${currentHistory.substitutionEvents}** sostituzioni con ID out/in espliciti. Tiri, SOT standard e minuti sono presenti in **${currentHistory.rowsWithShots}/${currentHistory.rowsWithShotsOnTarget}/${currentHistory.rowsWithMinutes}** righe; legni giocatore in **${currentHistory.rowsWithPlayerWoodwork}**.

Le sostituzioni permettono di osservare **${currentHistory.explicitLaterReplacementChains}** catene in cui un subentrante esce successivamente, distribuite su **${currentHistory.matchesWithExplicitLaterReplacementChains}** partite. Non sono state inferite catene dai minuti. I ${currentHistory.starterSlots} slot titolare hanno tiri/SOT standard ricostruibili per titolare + sostituto diretto, ma ${currentHistory.starterSlotsWithLaterReplacementAmbiguity} slot incontrano l'ambiguità della catena e i SOT Sisal con legni non sono ricostruibili.

Stagione precedente: **${previousHistory.files}** file ESPN raw, **${previousHistory.rosterRows}** righe roster, **${previousHistory.explicitDirectReplacementLinks}** link di sostituzione espliciti (${previousHistory.explicitDirectReplacementLinksWithClock} con clock), **${previousHistory.rowsWithPlayerWoodwork}** righe con legni giocatore. È un campione di dieci partite, non un corpus canonico di stagione né una base di settlement DUO.

## 6. Fattibilità del modello DUO

La fattibilità tecnica è condizionata a nuovi dati e a un nuovo modello. La specifica minima è:

1. Stato discreto: DNP/rimborso, nessun cambio, cambio a tempo t con identità del sostituto, eventuale catena successiva secondo regola certificata.
2. Distribuzione temporale del cambio condizionata a giocatore, ruolo, squadra, punteggio/contesto e formazione ufficiale.
3. Intensità tiri/SOT/legni per ciascun occupante dello slot nei minuti assegnati, con dipendenza dal matchup e senza assumere indipendenza non validata.
4. Aggregazione degli scenari con pesi calibrati e distribuzione discreta del conteggio, separata per tiri totali e SOT+legni.
5. Stato di rimborso separato dalla probabilità sportiva e tracciamento della versione delle regole Sisal.

Sottogruppi come “nessun cambio”, tiri totali o coppie sostituto stabili possono ridurre la complessità, ma non sono automaticamente D2: pre-kickoff lo scenario resta incerto e richiede calibrazione.

## 7. Protocollo di validazione prospettica

- Snapshot immutabile prima del kickoff con quota, ID provider, contratto, input, formazione e timestamp; seconda fotografia quando esce l'XI ufficiale senza sovrascrivere la prima.
- Acquisizione post-partita di sostituzioni esplicite (compreso **+N**), catene, tiri, SOT, legni e settlement/void da fonte organizer/OPTA compatibile.
- Brier e log loss per soglia, reliability/ECE e pendenza/intercetta di calibrazione con incertezza clusterizzata per partita/slot.
- Baseline congelate: named-player-only diagnostica, implicita di mercato corretta per margine, modello storico dello slot.
- Cutoff cronologici, nessuna informazione target/futura, holdout temporale indipendente. **Nessun gate PASS** viene fissato sui soli dati retrospettivi MD1-MD5.

## 8. Conclusione operativa

**0 mercati DUO possono essere aggiunti in sicurezza oggi.** I **${classificationTotals.D3} D3** hanno identità, titolarità e quote riconciliate ma richiedono un nuovo modello e una nuova calibrazione; i **${classificationTotals.D4} D4** restano non eleggibili. D1 e D2 sono entrambi zero. Nessuna formula, quota, policy, pagina o voce del catalogo è stata modificata.
`;

  fs.mkdirSync(path.dirname(outputJson), { recursive: true });
  fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputMarkdown, md);
  process.stdout.write(`${JSON.stringify({ outputJson: path.relative(root, outputJson), outputMarkdown: path.relative(root, outputMarkdown), summary: report.summary, classificationSignature }, null, 2)}\n`);
}

if (require.main === module) main();

module.exports = { main, currentHistoryAudit, previousSeasonAudit };
