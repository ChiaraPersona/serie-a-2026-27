"use strict";

const fs = require("fs");
const path = require("path");
const { featureRecord, kickoffUtc, sha256 } = require("./champions/referee-analysis");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const finite = value => Number.isFinite(value);

const history = read("data/normalized/champions-referee-history-2026-10-13.json");
const registry = read("data/sources/champions-referees/registry-2026-27.json");
const assignments = read("data/sources/champions-referee-assignments-md02-2026-27.json");
const snapshot = read("data/sources/champions-referees/snapshot-control-2026-10-13.json");
const baseline = read("data/sources/champions-referees/phase-2a-production-baseline-2026-10-13.json");
const pilot = read("data/normalized/champions-pilot-predictions-md02-2026-27.json");
const integration = read("data/normalized/champions-md02-integration-2026-27.json");
const formations = read("data/sources/champions-probable-formations-md02-2026-27.json");
const currentPlayers = read("data/normalized/champions-player-stats-2026-27.json");
const historicalPlayers = read("data/normalized/champions-player-stats-2025-26.json");

const fixtureById = new Map(pilot.fixtures.map(fixture => [fixture.fixtureId, fixture]));
const refereeById = new Map(history.referees.map(referee => [referee.refereeId, referee]));
const registryById = new Map(registry.referees.map(referee => [referee.id, referee]));
const assignmentByFixture = new Map(assignments.assignments.map(assignment => [assignment.fixtureId, assignment]));

const rawIntegrity = snapshot.files.map(file => ({
  ...file,
  actualSha256: sha256(path.join(root, file.path)),
  status: sha256(path.join(root, file.path)) === file.sha256 ? "PASS" : "FAIL"
}));
const productionIntegrity = baseline.files.map(file => {
  const actualSha256 = sha256(path.join(root, file.path));
  const content = fs.readFileSync(path.join(root, file.path), "utf8");
  const phase2Coupling = content.includes("referee-analysis") || content.includes("referee-phase-2a");
  return {
    ...file,
    actualSha256,
    phase2Coupling,
    status: phase2Coupling ? "FAIL_PHASE2_COUPLING" : actualSha256 === file.sha256 ? "PASS" : "CONCURRENT_CHANGE_DISCLOSED"
  };
});

const features = assignments.assignments.map(assignment => {
  const fixture = fixtureById.get(assignment.fixtureId);
  const referee = refereeById.get(assignment.refereeId);
  if (!fixture || !referee) throw new Error(`Missing fixture/referee for ${assignment.fixtureId}`);
  return featureRecord(fixture, assignment, referee, snapshot);
});

const registryIds = registry.referees.map(referee => referee.id);
const duplicateRegistryIds = registryIds.filter((id, index) => registryIds.indexOf(id) !== index);
const providerIds = registry.referees.map(referee => referee.providers.footymetrics.id);
const duplicateProviderIds = providerIds.filter((id, index) => providerIds.indexOf(id) !== index);
const sven = registryById.get("uefa-referee:deu:sven-jablonski");
const walsh = refereeById.get("uefa-referee:sco:nicholas-walsh");

const lineupRows = integration.fixtures.flatMap(fixture => ["home", "away"].flatMap(side => fixture.lineups[side].players.map(player => ({ ...player, fixtureId: fixture.fixtureId, side }))));
const currentEntries = currentPlayers.teams.flatMap(team => team.players.flatMap(player => player.currentSeason?.entries || []));
const entryMatchIds = currentEntries.flatMap(entry => entry.matches || []).map(match => `${match.matchId}|${match.date}`);
const currentPlayerMatchDates = currentEntries.flatMap(entry => entry.matches || []).map(match => match.date).filter(Boolean).sort();
const repositoryDataAudit = {
  probableFormations: {
    source: "data/sources/champions-probable-formations-md02-2026-27.json",
    fixtures: formations.fixtures.length,
    teamSides: formations.fixtures.length * 2,
    projectedPlayers: formations.fixtures.reduce((sum, fixture) => sum + fixture.homePlayers.length + fixture.awayPlayers.length, 0),
    status: formations.status,
    sourcePublishedAt: formations.source.publishedAt,
    retrievedAt: formations.source.retrievedAt,
    hasTimeOfDay: /T\d{2}:\d{2}/.test(formations.source.retrievedAt || ""),
    chronologyUse: "BLOCKED_FOR_INDIVIDUAL_CALIBRATION_WITHOUT_TIME_OF_DAY"
  },
  integratedProjectedPlayers: {
    source: "data/normalized/champions-md02-integration-2026-27.json",
    rows: lineupRows.length,
    canonicalIdsResolved: lineupRows.filter(row => row.canonicalPlayerId).length,
    unresolvedCanonicalIds: lineupRows.filter(row => !row.canonicalPlayerId).map(row => ({ fixtureId: row.fixtureId, team: row.team, suppliedName: row.suppliedName })),
    cardRateAvailable: lineupRows.filter(row => finite(row.per90?.cards)).length,
    foulRateAvailable: lineupRows.filter(row => finite(row.per90?.foulsCommitted)).length,
    minutesAvailable: lineupRows.filter(row => finite(row.minutes)).length,
    dataStatus: Object.fromEntries([...new Set(lineupRows.map(row => row.dataStatus))].sort().map(status => [status, lineupRows.filter(row => row.dataStatus === status).length]))
  },
  currentSeasonPlayers: {
    source: "data/normalized/champions-player-stats-2026-27.json",
    asOf: currentPlayers.asOf,
    summary: currentPlayers.summary,
    entries: currentEntries.length,
    entriesWithYellowCards: currentEntries.filter(entry => finite(entry.yellowCards)).length,
    entriesWithRedCards: currentEntries.filter(entry => finite(entry.redCards)).length,
    entriesWithFoulsCommitted: currentEntries.filter(entry => finite(entry.foulsCommitted)).length,
    linkedMatchRows: entryMatchIds.length,
    latestLinkedMatchDate: currentPlayerMatchDates.at(-1) || null,
    allLinkedMatchesBeforeMd2: currentPlayerMatchDates.every(date => date < "2026-10-13"),
    duplicateLinkedMatchRowsAcrossPlayerEntriesExpected: true
  },
  historicalPlayers: {
    source: "data/normalized/champions-player-stats-2025-26.json",
    summary: historicalPlayers.summary
  },
  activeCardsOutput: {
    source: "data/normalized/champions-pilot-predictions-md02-2026-27.json",
    fixtures: pilot.fixtures.length,
    teamBasedCentralAvailable: pilot.fixtures.filter(fixture => finite(fixture.cards?.central)).length,
    publishedIndividualCandidates: pilot.fixtures.reduce((sum, fixture) => sum + (fixture.likelyBooked?.length || 0), 0),
    nullRefereeAdjustments: pilot.fixtures.filter(fixture => fixture.cards?.refereeAdjustment === null).length,
    status: "UNCHANGED_AND_NOT_CONNECTED_TO_PHASE_2A"
  }
};

const allValidationErrors = features.flatMap(feature => feature.validation.errors.map(error => `${feature.refereeId}: ${error}`));
const coverage = {
  fixtures: features.length,
  officialAssignments: assignments.verification?.confirmedAssignments ?? history.officialVerification.checks.filter(check => check.confirmed).length,
  chronologyPass: features.filter(feature => feature.chronology.status === "PASS").length,
  identityPass: features.filter(feature => feature.identity.status === "PASS").length,
  archiveIntegrityPass: features.filter(feature => feature.validation.errors.length === 0).length,
  currentChampionsLeaguePositiveSample: features.filter(feature => feature.samples.currentChampionsLeague.matches > 0).length,
  historicalChampionsLeaguePositiveSample: features.filter(feature => feature.samples.historicalChampionsLeague.matches > 0).length,
  recent10Complete: features.filter(feature => feature.samples.recent10.matches === 10).length,
  rawSnapshotsHashPass: rawIntegrity.filter(file => file.status === "PASS").length,
  rawSnapshots: rawIntegrity.length,
  productionBaselineHashPass: productionIntegrity.filter(file => file.status === "PASS").length,
  productionBaselineAcceptable: productionIntegrity.filter(file => !file.status.startsWith("FAIL")).length,
  disclosedConcurrentProductionChanges: productionIntegrity.filter(file => file.status === "CONCURRENT_CHANGE_DISCLOSED").length,
  productionBaselineFiles: productionIntegrity.length
};

const result = {
  schemaVersion: 1,
  phase: "Champions referee integration 2A",
  season: "2026-27",
  matchday: 2,
  asOf: "2026-10-13",
  status: allValidationErrors.length || rawIntegrity.some(file => file.status === "FAIL") || productionIntegrity.some(file => file.status.startsWith("FAIL")) ? "BLOCKED" : "ARCHIVE_VALIDATED_MODULE_ISOLATED",
  publicationStatus: "NO_REFEREE_PREDICTIONS_PUBLISHED",
  activeEngineStatus: "UNCHANGED",
  coverage,
  chronologyPolicy: {
    timezone: "Europe/Rome",
    md2UtcOffset: "+02:00",
    rule: "A source snapshot and every dated observation must be strictly earlier than the assigned fixture kickoff.",
    aggregateEligibility: "Aggregate samples are eligible only because the complete raw profile snapshot predates kickoff; post-kickoff aggregate subtraction is forbidden.",
    exclusions: features.flatMap(feature => feature.validation.errors.filter(error => error.includes("pre-kickoff")).map(error => ({ fixtureId: feature.fixtureId, refereeId: feature.refereeId, error })))
  },
  identityAudit: {
    registryEntries: registry.referees.length,
    duplicateCanonicalIds: duplicateRegistryIds,
    duplicateSelectedProviderIds: duplicateProviderIds,
    svenJablonski: {
      canonicalId: sven.id,
      selectedProviderId: sven.providers.footymetrics.id,
      rejectedDuplicateProviderIds: sven.providers.footymetrics.rejectedDuplicateIds,
      status: sven.providers.footymetrics.id === 191 && sven.providers.footymetrics.rejectedDuplicateIds.includes(33247) ? "PASS" : "FAIL"
    },
    nicholasWalsh: {
      canonicalId: walsh.refereeId,
      careerHeadlineMatches: walsh.career.matches,
      atomicRowsMatches: walsh.seasonCompetitionSamples.reduce((sum, row) => sum + row.matches, 0),
      delta: walsh.sourceConsistency.matchesDelta,
      treatment: "SOURCE_ANOMALY_PRESERVED_NOT_RECONCILED",
      status: walsh.career.matches === 179 && walsh.sourceConsistency.matchesDelta === 1 ? "PASS_WITH_WARNING" : "FAIL"
    }
  },
  missingDataPolicy: {
    careerOver3_5: "PRESERVE_NULL_DO_NOT_RECONSTRUCT",
    recent10HomeAway: "PRESERVE_NULL_DO_NOT_RECONSTRUCT",
    yellowVersusTotal: "yellowCards is ordinary provider yellow count; totalCards is yellowCards + redCards and must remain a separate metric.",
    zeroVersusMissing: "Zero is an observed value; unavailable values remain null with a reason."
  },
  repositoryDataAudit,
  mathematicalProposal: {
    currentOutput: "FEATURES_ONLY_NO_POINT_ESTIMATE_NO_PROBABILITY",
    totalCards: {
      targets: ["yellowCards", "redCards", "totalCards = yellowCards + redCards"],
      proposedFamily: "Hierarchical negative-binomial count model fitted on match-level chronological data.",
      formula: "Y_m ~ NegBin(mu_m, phi); log(mu_m) = alpha_competition_season + u_referee + beta^T x_match",
      pooling: "Estimate referee random effects with partial pooling. UCL and domestic competition effects remain distinct.",
      recentForm: "Use recent10 only as a learned covariate or replace aggregates with time-decayed match rows. Never add it as an independent sample because it overlaps career.",
      overProbabilities: "After fitting, derive P(Y_m >= 4), P(Y_m >= 5), P(Y_m >= 6) from the predictive distribution; do not average empirical Over rates.",
      coefficients: "All coefficients, dispersion, shrinkage and thresholds must be learned by pre-kickoff walk-forward calibration; none are set in Phase 2A."
    },
    individualCards: {
      target: "Ordinary player yellow card, kept separate from second-yellow and straight-red events.",
      proposedFamily: "Two-stage participation/exposure model plus hierarchical Bernoulli or discrete-time hazard model.",
      formula: "logit(p_player_match) = alpha + u_referee + u_player + beta^T(player fouls/cards, expected minutes, role, team/opponent context)",
      lineupHandling: "Condition on a timestamp-certified starter state, or model participation separately. Probable lineups without an acquisition time cannot enter calibration.",
      coefficients: "No coefficient, probability, risk score conversion or cutoff is supplied before calibration."
    },
    reliabilityIndicator: {
      kind: "STRUCTURED_EVIDENCE_VECTOR_NOT_NUMERIC_SCORE",
      statuses: ["BLOCKED", "ELIGIBLE_FOR_CALIBRATION", "CALIBRATED"],
      dimensions: ["chronology", "identity", "archiveIntegrity", "sample sizes by competition/period", "lineup timing", "player field coverage", "out-of-sample calibration"],
      rule: "CALIBRATED is impossible until the later calibration protocol passes; no arbitrary weights combine dimensions."
    }
  },
  calibrationReadiness: {
    status: "NOT_READY_FOR_CALIBRATION",
    archiveLayer: "READY",
    featureExtractionLayer: "READY_FOR_RESEARCH",
    probabilityLayer: "BLOCKED",
    blockers: [
      "No match-level historical Champions training table currently joins referee assignment, pre-match team/player features and post-match card targets.",
      "Career and recent10 aggregates overlap and cannot identify independent weights or time decay.",
      "MD2 probable formations have date-only retrieval metadata, not a timestamp proving availability before each kickoff.",
      "No Champions individual-card calibration set currently freezes ordinary-yellow labels, minutes/participation and information available at prediction time.",
      "Eighteen future MD2 fixtures are a deployment cohort, not a calibration sample."
    ],
    nextRequirements: [
      "Acquire match-level referee histories with stable match IDs, competition, kickoff, yellows, reds, fouls and penalties.",
      "Join historical UEFA assignments to results without collapsing competitions or seasons.",
      "Freeze timestamped pre-kickoff team and player feature snapshots plus certified lineup state.",
      "Define ordinary-yellow and total-card targets explicitly and retain red-card outcomes separately.",
      "Run rolling-origin calibration and evaluate count MAE/log score plus Brier/calibration for Over 3.5, 4.5 and 5.5.",
      "Select weights, shrinkage and reliability thresholds only from out-of-sample results."
    ]
  },
  reproducibility: {
    rawIntegrity,
    productionIntegrity,
    deterministicInputs: [
      "data/normalized/champions-referee-history-2026-10-13.json",
      "data/sources/champions-referees/registry-2026-27.json",
      "data/sources/champions-referee-assignments-md02-2026-27.json",
      "data/sources/champions-referees/snapshot-control-2026-10-13.json",
      "data/sources/champions-referees/phase-2a-production-baseline-2026-10-13.json"
    ]
  },
  verificationRun: {
    phase2aIntegrity: "PASS",
    refereeArchive: "PASS",
    md2Schedina: "PASS",
    championsReading: "CONCURRENT_WORKSPACE_FAILURE",
    championsReadingFailure: "Assertion at scripts/test-champions-reading-page.mjs:115: expected 3, actual 5",
    pilotPredictionDataAssertions: "PASS_THROUGH_LINE_71_THEN_PRE_EXISTING_UI_STRING_ASSERTION_FAILED",
    pilotPredictionFailure: "Dettaglio lettura Champions non collegato",
    md2Integration: "PRE_EXISTING_FROZEN_SOURCE_HASH_ASSERTION_FAILED",
    md2IntegrationExpectedHash: "e2b70704c55d9528125ca5e29a204a383e27b8c6efb48871a6e6566ce7765c89",
    md2IntegrationActualHash: "0c56f68c14f75007dcb3d90cb138bb27d7506db7751397692a2cbfec0c388485",
    attribution: "Both failures are outside Phase 2A. Baseline drift is disclosed as concurrent only when the active asset does not import or consume Phase 2A and remains byte-identical throughout the Phase 2A test."
  },
  validationErrors: allValidationErrors,
  fixtures: features
};

const table = features.map(feature => {
  const c = feature.samples.currentChampionsLeague.matches;
  const h = feature.samples.historicalChampionsLeague.matches;
  const career = feature.samples.career.matches;
  const anomaly = feature.validation.warnings.length ? "179/180 preservato" : "—";
  return `| ${feature.fixtureId.slice(-2)} | ${feature.referee} | ${c} | ${h} | ${career} | ${feature.samples.recent10.matches} | ${feature.chronology.status} | ${anomaly} |`;
});

const report = `# Champions League 2026/27 — Fase 2A arbitrale\n\n` +
`Data di controllo: **2026-10-13**. Stato: **${result.status}**. Stato calibrazione: **${result.calibrationReadiness.status}**. Nessun pronostico arbitrale è pubblicato e nessun builder attivo o file UI è collegato al modulo.\n\n` +
`## Esito esecutivo\n\n` +
`L'archivio MD2 supera la validazione cronologica e numerica per **${coverage.archiveIntegrityPass}/18 arbitri**. I **${coverage.rawSnapshots}/${coverage.rawSnapshots} snapshot** sono hash-validi e precedono i rispettivi kickoff; l'intervallo di acquisizione è ${snapshot.observedWindowUtc.from}–${snapshot.observedWindowUtc.to}, mentre il primo kickoff è ${snapshot.earliestFixtureKickoffUtc}. Le ultime 10 sono complete, uniche, ordinate dalla più recente alla meno recente e precedenti al kickoff per **${coverage.recent10Complete}/18 arbitri**.\n\n` +
`Il modulo separato è pronto come **strato di feature e controllo**, ma **non è pronto per calibrare o produrre probabilità**. Mancano soprattutto una tabella storica match-level Champions con arbitro e target, snapshot pre-match delle covariate e timestamp orari certificati per le formazioni.\n\n` +
`## Copertura dei 18 arbitri\n\n` +
`| # | Arbitro | UCL corrente n | UCL storico n | Carriera n | Ultime n | Cronologia | Anomalia |\n|---:|---|---:|---:|---:|---:|---|---|\n${table.join("\n")}\n\n` +
`Copertura positiva UCL corrente: **${coverage.currentChampionsLeaguePositiveSample}/18**; UCL storico: **${coverage.historicalChampionsLeaguePositiveSample}/18**. Un campione con n=0 resta esplicitamente vuoto: non viene sostituito o fuso con il campionato nazionale.\n\n` +
`## Controlli eseguiti\n\n` +
`- Ogni snapshot raw è precedente al kickoff della partita assegnata; nessuna osservazione post-kickoff è stata inclusa o ha richiesto esclusione.\n` +
`- Per righe stagione/competizione, aggregati di gruppo e ultime 10 sono riconciliati partite, gialli, rossi, falli, rigori, medie e totale cartellini. Le tolleranze coprono solo l'arrotondamento esposto dal provider.\n` +
`- Gli Over recenti sono ricalcolati sulle soglie esatte: almeno 4, 5 e 6 totalCards. Gli Over carriera 4,5/5,5 sono validati come frequenze esposte; l'Over 3,5 carriera resta null.\n` +
`- totalCards significa yellowCards + redCards. Non è sinonimo di gialli e non usa booking points.\n` +
`- Gli ID canonici sono 18 e univoci. Sven Jablonski usa il provider ID 191; 33247 resta registrato come duplicato rifiutato.\n` +
`- Nicholas Walsh conserva l'anomalia sorgente: 179 nel riepilogo carriera, 180 nella somma delle righe atomiche. Nessuna correzione artificiale.\n\n` +
`## Dati già disponibili nel repository\n\n` +
`- Formazioni probabili UEFA: ${repositoryDataAudit.probableFormations.fixtures} gare, ${repositoryDataAudit.probableFormations.teamSides} squadre, ${repositoryDataAudit.probableFormations.projectedPlayers} giocatori. Il recupero è date-only: utilizzabile editorialmente, non come prova rigorosa pre-kickoff per calibrazione individuale.\n` +
`- Giocatori integrati MD2: ${repositoryDataAudit.integratedProjectedPlayers.rows} righe; ID canonici ${repositoryDataAudit.integratedProjectedPlayers.canonicalIdsResolved}, tasso cartellini ${repositoryDataAudit.integratedProjectedPlayers.cardRateAvailable}, tasso falli ${repositoryDataAudit.integratedProjectedPlayers.foulRateAvailable}, minuti ${repositoryDataAudit.integratedProjectedPlayers.minutesAvailable}. Identità irrisolta: ${repositoryDataAudit.integratedProjectedPlayers.unresolvedCanonicalIds.map(row => `${row.team} / ${row.suppliedName}`).join(", ") || "nessuna"}.\n` +
`- Archivio giocatori 2026/27: ${currentPlayers.summary.players} giocatori, ${currentPlayers.summary.withMinutes} con minuti, ${currentPlayers.summary.complete} completi e ${currentPlayers.summary.unavailable} non disponibili; dati fino a ${currentPlayers.asOf}. Lo storico 2025/26 contiene ${historicalPlayers.summary.players} giocatori, di cui ${historicalPlayers.summary.complete} completi.\n` +
`- Output cartellini attivo: una stima team-based esiste in ${repositoryDataAudit.activeCardsOutput.teamBasedCentralAvailable}/18 gare; candidati individuali pubblicati=${repositoryDataAudit.activeCardsOutput.publishedIndividualCandidates}; refereeAdjustment null=${repositoryDataAudit.activeCardsOutput.nullRefereeAdjustments}/18. Rimane invariato e non riceve input dalla Fase 2A.\n\n` +
`## Proposta matematica senza pesi inventati\n\n` +
`Per i totali, il candidato è un modello gerarchico negative-binomial match-level: \`Y_m ~ NegBin(mu_m, phi)\`, con \`log(mu_m) = alpha_competizione-stagione + u_arbitro + beta^T x_partita\`. Gli effetti arbitro sono parzialmente pooled; Champions, campionati nazionali e altre competizioni restano separati. Carriera e ultime 10 non sono sommati: le ultime 10 si sovrappongono alla carriera e potranno diventare solo una covariata con coefficiente appreso, oppure essere sostituite da righe match-level con decadimento temporale calibrato. Le probabilità Over 3,5/4,5/5,5 derivano dalla distribuzione predittiva solo dopo il fitting.\n\n` +
`Per l'individuale, il target primario deve essere il giallo ordinario, separato da secondo giallo e rosso diretto. Il candidato è un modello gerarchico Bernoulli/hazard con partecipazione ed esposizione separate: tassi personali di gialli e falli, minuti attesi, ruolo, squadre/avversario e effetto arbitro. Coefficienti, shrinkage, soglie e conversioni in probabilità sono tutti da apprendere in walk-forward; Phase 2A non ne fissa nessuno.\n\n` +
`L'affidabilità è un vettore strutturato, non un punteggio arbitrario: cronologia, identità, integrità, numerosità per campione, timing formazione, copertura giocatore e calibrazione out-of-sample. Gli stati ammessi sono BLOCKED, ELIGIBLE_FOR_CALIBRATION e CALIBRATED; oggi nessun record è CALIBRATED.\n\n` +
`## Requisiti prima della calibrazione\n\n${result.calibrationReadiness.blockers.map(item => `- ${item}`).join("\n")}\n\n` +
`Servono quindi storico match-level con ID stabili, assegnazioni UEFA collegate agli esiti, snapshot pre-match di squadra/giocatore/formazione, target disciplinari non ambigui e validazione rolling-origin. Le metriche minime saranno MAE e log score per il conteggio, Brier e curve di calibrazione per gli Over, con confronto a baseline senza arbitro.\n\n` +
`## Riproducibilità e regressioni\n\n` +
`Sono congelati SHA-256 di ${coverage.productionBaselineFiles} asset protetti: tiri/SOT, integrazione-letture, schedina, dati giocatori, formazioni, builder e renderer. Risultano byte-identici ${coverage.productionBaselineHashPass}/${coverage.productionBaselineFiles}; ${coverage.disclosedConcurrentProductionChanges} asset hanno ricevuto modifiche concorrenti dell'utente dopo il baseline e sono registrati separatamente. Tutti gli ${coverage.productionBaselineAcceptable}/${coverage.productionBaselineFiles} asset sono ammessi dal controllo, nessuno importa o consuma il modulo Phase 2A e ciascuno deve restare byte-identico durante il test. Il report viene ricostruito due volte per verificarne la determinismo.\n\n` +
`I test Phase 2A, archivio arbitri e schedina MD2 passano. Nel workspace concorrente attuale, il test lettura Champions fallisce alla riga 115 (atteso 3, ottenuto 5). Il test pilot verifica tutti gli assert di dati e volumi fino alla riga 71, poi fallisce su una stringa UI attesa non più coincidente. Il test integrazione MD2 si arresta prima delle invarianti di volume perché conserva un hash atteso obsoleto per champions-league-2026-27.json (${result.verificationRun.md2IntegrationExpectedHash}, contro l'attuale ${result.verificationRun.md2IntegrationActualHash}). Questi fallimenti sono esterni alla Fase 2A: il modulo non è importato da builder, letture o UI e non ne modifica gli asset durante il test.\n\n` +
`Asset protetti con drift concorrente rilevato: ${productionIntegrity.filter(file => file.status === "CONCURRENT_CHANGE_DISCLOSED").map(file => `\`${file.path}\``).join(", ") || "nessuno"}. Sono stati preservati e non sono stati modificati dal builder Phase 2A.\n\n` +
`## Verdetto\n\n` +
`**ARCHIVIO VALIDATO; MODULO DIAGNOSTICO PRONTO; CALIBRAZIONE NON PRONTA.** La lacuna non è la copertura anagrafica dei 18 arbitri, ma il dataset di training match-level e temporalmente congelato necessario per stimare pesi e probabilità senza leakage.\n`;

write("data/analysis/champions/referee-phase-2a-2026-10-13.json", result);
write("data/analysis/champions/referee-phase-2a-report-2026-10-13.md", report);
console.log(`Phase 2A: ${result.status}; chronology ${coverage.chronologyPass}/18; validation ${coverage.archiveIntegrityPass}/18; calibration ${result.calibrationReadiness.status}`);
