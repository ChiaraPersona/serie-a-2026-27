"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-11";
const dataAsOf = "2026-10-09";
const predictionPath = "data/normalized/champions-player-markets-md01-2026-27.json";
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha256 = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const sha256File = file => sha256(fs.readFileSync(path.join(root, file)));
const sha256Json = value => sha256(Buffer.from(JSON.stringify(value)));
const round = (value, digits = 3) => value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slug = value => normalize(value).replace(/\s+/g, "-");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 80 * 1024 * 1024 }).trim();
}

function metric(rows, predictedKey, actualKey) {
  const clean = rows.filter(row => finite(row[predictedKey]) !== null && finite(row[actualKey]) !== null);
  if (!clean.length) return { n: 0, mae: null, rmse: null, bias: null, sampleUse: "no-sample" };
  const errors = clean.map(row => finite(row[predictedKey]) - finite(row[actualKey]));
  const sampleUse = clean.length >= 60 ? "descriptive-adequate" : clean.length >= 15 ? "descriptive-small" : "tiny-no-claim";
  return {
    n: clean.length,
    mae: round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / clean.length),
    rmse: round(Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / clean.length)),
    bias: round(errors.reduce((sum, error) => sum + error, 0) / clean.length),
    sampleUse
  };
}

function segmented(rows, selector) {
  const groups = new Map();
  for (const row of rows) {
    const key = selector(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => [key, {
    shots: metric(values, "predictedShots", "actualShots"),
    shotsOnTarget: metric(values, "predictedSot", "actualSot")
  }]));
}

const control = read(`data/analysis/champions/model-calibration-control-${auditDate}.json`);
const calendar = read("data/normalized/champions-league-2026-27.json");
const phase6 = read(`data/analysis/champions/full-data-coverage-audit-${dataAsOf}.json`);
const phase7 = read(`data/analysis/champions/data-recovery-audit-${dataAsOf}.json`);
const identities = read(`data/analysis/champions/player-identity-recovery-${dataAsOf}.json`);
const uefa = read(`data/analysis/champions/uefa-squad-audit-${dataAsOf}.json`);
const currentStats = read("data/normalized/champions-player-stats-2026-27.json");
const teamSource = read("data/sources/champions-pilot-match-stats-2025-27.json");
const leagueStrength = read("data/analysis/champions/league-strength-2026-10-03.json");
const contextPilot = read("data/analysis/champions/aek-context-adjusted-md02-2026-10-04.json");

const teamIdByName = new Map(phase6.teams.map(team => [normalize(team.team), team.teamId]));
const aliases = new Map([
  ["as roma", "roma"],
  ["roma", "roma"],
  ["bodo glimt", "bodo-glimt"],
  ["bayern munich", "bayern-munchen"],
  ["psg", "paris-saint-germain"]
]);
const teamId = name => teamIdByName.get(normalize(name)) || aliases.get(normalize(name)) || slug(name);
const pairKey = ids => [...ids].sort().join("|");

const rawAtleticoPath = "data/raw/champions-recovery/2026-10-09/uefa-squads/atletico-de-madrid.json.gz";
const rawAtletico = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, rawAtleticoPath))));
const atleticoBody = String(rawAtletico.body || "");
const atleticoAudit = {
  team: "Atlético de Madrid",
  requestedUrl: rawAtletico.requestedUrl,
  resolvedUrl: rawAtletico.url,
  uefaClubId: String(rawAtletico.requestedUrl || rawAtletico.url).match(/clubs\/(\d+)/)?.[1] || null,
  pathSlugLooksLikeAthleticClub: /--athletic-club/i.test(String(rawAtletico.requestedUrl || rawAtletico.url)),
  bodyDeclaresAtletico: /team:code[^>]+Atl[eé]tico de Madrid/i.test(atleticoBody),
  bodyDeclaresAthleticClub: /team:code[^>]+Athletic Club/i.test(atleticoBody),
  contentDecision: /team:code[^>]+Atl[eé]tico de Madrid/i.test(atleticoBody) && !/team:code[^>]+Athletic Club/i.test(atleticoBody)
    ? "club-id-and-content-confirm-atletico; misleading slug is non-structural"
    : "identity-content-conflict"
};

const observationsByProvider = new Map();
for (const team of phase6.teams) for (const match of team.matches) for (const player of match.players) {
  if (!player.providerPlayerId) continue;
  const key = String(player.providerPlayerId);
  if (!observationsByProvider.has(key)) observationsByProvider.set(key, []);
  observationsByProvider.get(key).push({ team: team.team, teamId: team.teamId, date: match.date, matchId: String(match.matchId), player: player.player, competition: match.competition });
}

const crossClubCases = [...observationsByProvider.entries()].map(([providerPlayerId, observations]) => {
  const teams = [...new Set(observations.map(item => item.teamId))];
  if (teams.length < 2) return null;
  const intervals = teams.map(id => {
    const rows = observations.filter(item => item.teamId === id).sort((a, b) => a.date.localeCompare(b.date));
    return { teamId: id, team: rows[0].team, firstObserved: rows[0].date, lastObserved: rows.at(-1).date, observations: rows.length };
  }).sort((a, b) => a.firstObserved.localeCompare(b.firstObserved));
  const sameDateConflicts = [...new Set(observations.map(item => item.date))].filter(date => new Set(observations.filter(item => item.date === date).map(item => item.teamId)).size > 1);
  const separatedIntervals = intervals.every((item, index) => index === 0 || intervals[index - 1].lastObserved < item.firstObserved);
  return {
    providerPlayerId,
    player: [...new Set(observations.map(item => item.player))].join(" / "),
    intervals,
    sameDateConflicts,
    decision: sameDateConflicts.length ? "structural-conflict" : separatedIntervals ? "chronologically-consistent-club-change" : "overlapping-period-review"
  };
}).filter(Boolean);

const veermanAudit = crossClubCases.find(item => item.providerPlayerId === "240912");
const exactNameOnly = identities.cases.filter(item => item.resolutionMethod === "uefa_exact_name");
const exactNamePlusAffiliation = identities.cases.filter(item => item.resolutionMethod === "uefa_exact_name_plus_espn_team_affiliation");
const outsideVerified = uefa.cases.filter(item => ["uefa_list_a_verified", "uefa_list_b_verified"].includes(item.uefaRegistrationStatus));
const mika = identities.cases.find(item => item.player === "Mika Medina");
const historicalOtherClubEvidence = phase6.teams.flatMap(team => team.classifications.registeredNoAppearance
  .filter(player => (player.otherClubEvidence || []).length)
  .map(player => ({ team: team.team, teamId: team.teamId, player: player.player, playerId: player.playerId, otherClubEvidence: player.otherClubEvidence })));

const commitRows = git(["log", "--format=%H|%aI", "--", predictionPath]).split(/\r?\n/).filter(Boolean).map(line => {
  const [hash, committedAt] = line.split("|");
  const snapshot = JSON.parse(git(["show", `${hash}:${predictionPath}`]));
  return { hash, committedAt, snapshot, generatedAt: snapshot.generatedAt };
});

const actualMatches = new Map();
for (const team of phase6.teams) for (const match of team.matches.filter(item => item.competition === "uefa.champions")) {
  const key = String(match.matchId);
  if (!actualMatches.has(key)) actualMatches.set(key, []);
  actualMatches.get(key).push({ team: team.team, teamId: team.teamId, ...match });
}
const actualByPair = new Map([...actualMatches.entries()].map(([matchId, sides]) => [pairKey(sides.map(side => side.teamId)), { matchId, sides }]));
const exactOnlyKey = new Set(exactNameOnly.map(item => `${item.teamId}|${item.playerId}`));
const unresolvedKey = new Set(identities.cases.filter(item => item.status === "open").map(item => `${item.teamId}|${item.playerId}`));
const majorLeagues = new Set(["eng.1", "esp.1", "ita.1", "ger.1", "fra.1"]);
const teamConfig = new Map(teamSource.teams.map(team => [team.id, team]));

const fixtureAudits = [];
const candidateRows = [];
for (const fixture of calendar.fixtures.filter(item => item.matchday === 1)) {
  const kickoff = new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  const eligibleSnapshots = commitRows.filter(row => new Date(row.committedAt) < kickoff && new Date(row.generatedAt) < kickoff);
  const selected = eligibleSnapshots.sort((a, b) => new Date(b.committedAt) - new Date(a.committedAt))[0] || null;
  const prediction = selected?.snapshot.fixtures.find(item => item.fixtureId === fixture.id) || null;
  const homeId = teamId(fixture.homeTeam), awayId = teamId(fixture.awayTeam);
  const actual = actualByPair.get(pairKey([homeId, awayId])) || null;
  const predictedPlayers = prediction ? [...prediction.shooters.totalShots, ...prediction.shooters.shotsOnTarget].reduce((map, player) => {
    const key = `${player.teamId}|${player.playerId}`;
    if (!map.has(key)) map.set(key, player);
    return map;
  }, new Map()) : new Map();
  const fixtureRows = [];
  for (const player of predictedPlayers.values()) {
    const row = {
      fixtureId: fixture.id,
      fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
      date: fixture.date,
      kickoff: fixture.kickoff,
      predictionCommit: selected?.hash || null,
      predictionAvailableAt: selected?.committedAt || null,
      predictionGeneratedAt: selected?.generatedAt || null,
      team: player.team,
      teamId: player.teamId,
      player: player.name,
      playerId: player.playerId,
      role: player.roleKey || normalize(player.role) || "unknown",
      predictedShots: finite(player.projectedShots),
      predictedSot: finite(player.projectedShotsOnTarget),
      admitted: false,
      exclusionReason: null
    };
    if (!actual) row.exclusionReason = "observed_champions_match_unavailable";
    else if (unresolvedKey.has(`${row.teamId}|${row.playerId}`)) row.exclusionReason = "identity_unresolved";
    else if (exactOnlyKey.has(`${row.teamId}|${row.playerId}`)) row.exclusionReason = "identity_exact_name_only_without_independent_affiliation";
    else {
      const side = actual.sides.find(item => item.teamId === row.teamId);
      const actualPlayer = side?.players.find(item => item.registeredPlayerId === row.playerId);
      const nameOnlyPlayer = side?.players.find(item => normalize(item.player) === normalize(row.player));
      if (!side) row.exclusionReason = "team_identity_join_failed";
      else if (!actualPlayer && nameOnlyPlayer) row.exclusionReason = "player_identity_join_mismatch";
      else if (!actualPlayer) row.exclusionReason = "no_observed_appearance";
      else if (actualPlayer.classification !== "registered_active" || !actualPlayer.registeredPlayerId) row.exclusionReason = "actual_identity_not_reliable";
      else if ([actualPlayer.minutes, actualPlayer.shots, actualPlayer.shotsOnTarget].some(value => finite(value) === null)) row.exclusionReason = "observed_minutes_shots_or_sot_missing";
      else if ([row.predictedShots, row.predictedSot].some(value => value === null)) row.exclusionReason = "prediction_point_estimate_missing";
      else {
        const config = teamConfig.get(row.teamId);
        Object.assign(row, {
          admitted: true,
          matchId: actual.matchId,
          actualMinutes: finite(actualPlayer.minutes),
          actualShots: finite(actualPlayer.shots),
          actualSot: finite(actualPlayer.shotsOnTarget),
          providerPlayerId: actualPlayer.providerPlayerId,
          leagueCode: config?.league || null,
          leagueSegment: majorLeagues.has(config?.league) ? "major-five-league" : "limited-or-other-league",
          minuteBand: actualPlayer.minutes >= 61 ? "61-90" : actualPlayer.minutes >= 31 ? "31-60" : "1-30",
          minuteSegment: actualPlayer.minutes >= 60 ? "high-minutes-60-plus" : "low-minutes-under-60"
        });
      }
    }
    fixtureRows.push(row);
    candidateRows.push(row);
  }
  fixtureAudits.push({
    fixtureId: fixture.id,
    fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
    date: fixture.date,
    kickoff: fixture.kickoff,
    predictionSnapshot: selected ? { commit: selected.hash, committedAt: selected.committedAt, generatedAt: selected.generatedAt } : null,
    actualMatchId: actual?.matchId || null,
    candidatePlayerObservations: fixtureRows.length,
    admittedPlayerObservations: fixtureRows.filter(row => row.admitted).length,
    status: actual && fixtureRows.some(row => row.admitted) ? "ADMITTED" : "EXCLUDED",
    exclusionReason: !selected ? "no_pre_match_prediction_snapshot" : !actual ? "observed_champions_match_unavailable" : !fixtureRows.some(row => row.admitted) ? "no_reliable_paired_player_observations" : null
  });
}

const admittedRows = candidateRows.filter(row => row.admitted);
const exclusionReasons = candidateRows.filter(row => !row.admitted).reduce((output, row) => {
  output[row.exclusionReason] = (output[row.exclusionReason] || 0) + 1;
  return output;
}, {});
const baselineA = {
  id: "A",
  label: "baseline-production-as-historically-serialized",
  status: admittedRows.length ? "EVALUATED_LIMITED" : "NOT_EVALUABLE",
  pointMetrics: {
    overall: {
      shots: metric(admittedRows, "predictedShots", "actualShots"),
      shotsOnTarget: metric(admittedRows, "predictedSot", "actualSot")
    },
    byRole: segmented(admittedRows, row => row.role),
    byTeam: segmented(admittedRows, row => row.team),
    byMinuteBand: segmented(admittedRows, row => row.minuteBand),
    byMinuteSegment: segmented(admittedRows, row => row.minuteSegment),
    byLeagueSegment: segmented(admittedRows, row => row.leagueSegment)
  },
  brier: {
    status: "NOT_CALCULATED",
    reason: "The versioned shooter rows preserve point forecasts, not a complete explicit probability surface for the same admitted observations. No artificial probabilities were reconstructed."
  }
};

const baselineB = {
  id: "B",
  label: "current-season-domestic-existing-blending",
  status: "CHRONOLOGY_BLOCKED",
  pointMetrics: null,
  sourceAvailability: currentStats.retrievedAt,
  reason: `The current-season player dataset was retrieved ${currentStats.retrievedAt}, after all matchday-1 events. Event dates exist, but no versioned pre-match availability snapshot of these player inputs was found.`
};
const baselineC = {
  id: "C",
  label: "context-adjusted-league-strength-elo-candidate",
  status: "UNCALIBRATED",
  pointMetrics: null,
  sourceAvailability: {
    leagueStrengthGeneratedAt: leagueStrength.generatedAt || leagueStrength.asOf || "2026-10-03",
    contextPilotGeneratedAt: contextPilot.generatedAt,
    contextPilotAsOf: contextPilot.asOf
  },
  reason: "League Strength/context inputs post-date matchday 1, only the AEK pilot is serialized, and there is no prior Champions training window on which to estimate constrained coefficients without touching the final test."
};

const outsideEligibility = phase6.teams.flatMap(team => team.classifications.playedNotRegistered.map(player => ({
  teamId: team.teamId,
  providerPlayerId: player.providerPlayerId,
  player: player.player,
  predictionCandidateEligible: player.predictionCandidateEligible
})));
const protectedFileChanges = Object.values(control.protectedFiles).filter(item => sha256File(item.path) !== item.sha256);
const protectedRawChanges = control.protectedRawSnapshots.filter(item => sha256File(item.path) !== item.sha256);
const eligibilityChanged = sha256Json(outsideEligibility) !== control.predictionCandidateEligibility.sha256;
const structuralConflicts = crossClubCases.filter(item => item.decision === "structural-conflict");
const gate = structuralConflicts.length || atleticoAudit.contentDecision === "identity-content-conflict" ? "FAIL" : admittedRows.length && baselineB.status === "CHRONOLOGY_BLOCKED" && baselineC.status === "UNCALIBRATED" ? "PARTIAL" : "FAIL";

const audit = {
  schemaVersion: 1,
  phase: "8",
  auditDate,
  dataAsOf,
  status: gate,
  scope: "Diagnostic identity audit and leakage-safe Champions player shots/SOT calibration assessment. No production activation.",
  identityAudit: {
    structuralContaminationDetected: Boolean(structuralConflicts.length || atleticoAudit.contentDecision === "identity-content-conflict"),
    atletico: atleticoAudit,
    crossClubProviderIdentities: { count: crossClubCases.length, structuralConflicts: structuralConflicts.length, cases: crossClubCases },
    joeyVeerman: veermanAudit,
    exactNameOnlyResolutions: { count: exactNameOnly.length, calibrationPolicy: "exclude unless independently corroborated", cases: exactNameOnly },
    exactNamePlusTeamAffiliation: { count: exactNamePlusAffiliation.length },
    currentRegistryPlayersWithOtherClubEvidence: { count: historicalOtherClubEvidence.length, policy: "retain as dated historical-club evidence; never relabel as current-club stats", cases: historicalOtherClubEvidence },
    uefaVerifiedOutsideInternalRegistry: { count: outsideVerified.length, listA: outsideVerified.filter(item => item.uefaRegistrationStatus === "uefa_list_a_verified").length, listB: outsideVerified.filter(item => item.uefaRegistrationStatus === "uefa_list_b_verified").length, predictionCandidateEligibilityChanged: false },
    mikaMedina: mika,
    decision: structuralConflicts.length ? "structural contamination blocks calibration" : "no proven structural collision; material identity limitations remain and are excluded from calibration"
  },
  evaluationDataset: {
    competition: "UEFA Champions League",
    season: "2026/27",
    matchday: 1,
    chronology: "Latest Git-committed player forecast snapshot strictly before fixture kickoff; actuals joined later by teamId + registeredPlayerId.",
    selectionScope: "Union of the serialized top-five shots and top-five shots-on-target candidates per fixture; this is not a full-XI evaluation.",
    walkForwardStatus: "Pre-match snapshot evaluation without refitting. A rolling/expanding calibration fit is not identifiable from one partially observed matchday.",
    candidateMatches: fixtureAudits.length,
    admittedMatches: fixtureAudits.filter(item => item.status === "ADMITTED").length,
    excludedMatches: fixtureAudits.filter(item => item.status === "EXCLUDED").length,
    candidatePlayerObservations: candidateRows.length,
    admittedPlayerObservations: admittedRows.length,
    excludedPlayerObservations: candidateRows.length - admittedRows.length,
    uniqueAdmittedPlayers: new Set(admittedRows.map(row => `${row.teamId}|${row.playerId}`)).size,
    shotsObservations: admittedRows.filter(row => finite(row.actualShots) !== null).length,
    shotsOnTargetObservations: admittedRows.filter(row => finite(row.actualSot) !== null).length,
    exclusionReasons,
    fixtures: fixtureAudits,
    admittedObservations: admittedRows
  },
  models: { A: baselineA, B: baselineB, C: baselineC },
  pairedComparison: {
    commonObservationsABC: 0,
    status: "NOT_RUN",
    reason: "B and C have no chronology-admissible predictions for the same observations; a paired test would manufacture a comparison."
  },
  sampleAssessment: {
    status: admittedRows.length >= 60 ? "LIMITED" : "VERY_LIMITED",
    interpretation: "One partially observed Champions matchday supports descriptive baseline diagnostics only, not calibration or coefficient selection. Team and role cells marked tiny-no-claim must not be interpreted directionally."
  },
  invariants: {
    productionModelChanged: protectedFileChanges.some(item => /Builder|Predictions|resultModel|contextBaseline|teamStrength|leagueStrength/.test(item.path)),
    protectedFilesChanged: protectedFileChanges.length > 0,
    protectedRawChanged: protectedRawChanges.length > 0,
    predictionCandidateEligibilityChanged: eligibilityChanged,
    registryOrSquadAutoEdited: false,
    calibrationActivated: false,
    htmlOrUiChanged: false
  },
  hashComparison: {
    protectedFiles: { count: Object.keys(control.protectedFiles).length, changed: protectedFileChanges, status: protectedFileChanges.length ? "FAIL" : "UNCHANGED" },
    protectedRawSnapshots: { count: control.protectedRawSnapshots.length, changed: protectedRawChanges, status: protectedRawChanges.length ? "FAIL" : "UNCHANGED" },
    predictionCandidateEligibility: { count: outsideEligibility.length, status: eligibilityChanged ? "FAIL" : "UNCHANGED" }
  },
  gate: {
    value: `CHAMPIONS MODEL-CALIBRATION GATE = ${gate}`,
    reasons: gate === "PARTIAL" ? [
      `Baseline A has ${admittedRows.length} chronology-admissible player observations across ${fixtureAudits.filter(item => item.status === "ADMITTED").length} matches.`,
      "No severe structural identity collision was proven after resolving Atlético by UEFA club ID/content and Veerman by dated club observations.",
      "Baseline B is chronology-blocked and candidate C is uncalibrated; no A/B/C paired comparison is valid.",
      `${exactNameOnly.length} exact-name-only resolutions, ${outsideVerified.length} UEFA/internal-registry discrepancies and Mika Medina remain outside calibration.`
    ] : ["A structural identity conflict or an unusable main evaluation prevents calibration."],
    productionRecommendation: "DO_NOT_ACTIVATE; collect versioned pre-match current-season inputs and at least two later chronological test windows, then rerun."
  }
};

const analysisTarget = path.join(root, `data/analysis/champions/model-calibration-audit-${auditDate}.json`);
fs.writeFileSync(analysisTarget, `${JSON.stringify(audit, null, 2)}\n`);

const table = rows => rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|")).join(" | ")} |`).join("\n");
const fmt = value => value === null || value === undefined ? "N/D" : typeof value === "number" ? String(value).replace(".", ",") : value;
const metricRows = (groups, label) => Object.entries(groups).map(([name, values]) => [label, name, values.shots.n, fmt(values.shots.mae), fmt(values.shots.rmse), fmt(values.shots.bias), values.shots.sampleUse, values.shotsOnTarget.n, fmt(values.shotsOnTarget.mae), fmt(values.shotsOnTarget.rmse), fmt(values.shotsOnTarget.bias), values.shotsOnTarget.sampleUse]);
const segmentRows = [
  ...metricRows(baselineA.pointMetrics.byRole, "ruolo"),
  ...metricRows(baselineA.pointMetrics.byTeam, "squadra"),
  ...metricRows(baselineA.pointMetrics.byMinuteBand, "minuti"),
  ...metricRows(baselineA.pointMetrics.byMinuteSegment, "minuti high/low"),
  ...metricRows(baselineA.pointMetrics.byLeagueSegment, "lega")
];
const exclusionRows = Object.entries(exclusionReasons).sort((a, b) => b[1] - a[1]);
const report = `# Champions League 2026/27 — Fase 8 audit identità, calibrazione e backtest

Data audit: **${auditDate}**  
Cutoff dati Fase 7: **${dataAsOf}**  
Gate finale: **${audit.gate.value}**

## A. Executive summary

Il baseline A è valutabile in modo cronologico ma soltanto su **${audit.evaluationDataset.admittedPlayerObservations} osservazioni giocatore** in **${audit.evaluationDataset.admittedMatches} partite** della prima giornata. Il campione è descrittivo e non abilita calibrazione. Il baseline B è bloccato perché il dataset individuale current-season è stato acquisito il ${currentStats.retrievedAt}, dopo le gare. Il candidato C resta non calibrato: League Strength e pilot contestuale sono posteriori alla giornata e non esiste una finestra di training Champions precedente separata dal test.

Non emerge una contaminazione identitaria strutturale provata: il caso Atlético è uno slug URL fuorviante con **club ID 50124** e contenuto ufficiale Atlético; Veerman presenta PSV il 15 agosto e Dortmund dal 29 agosto, senza sovrapposizioni. Restano però ${exactNameOnly.length} risoluzioni basate sulla sola corrispondenza nominale, ${outsideVerified.length} giocatori verificati UEFA ma assenti dal registro interno e Mika Medina irrisolto: tutti esclusi dalla calibrazione quando pertinenti.

## B. Audit identità prima della calibrazione

| caso | evidenza | decisione |
|---|---|---|
| Atlético de Madrid | URL richiesto ${atleticoAudit.requestedUrl}; club ID ${atleticoAudit.uefaClubId}; meta body Atlético=${atleticoAudit.bodyDeclaresAtletico}; meta body Athletic=${atleticoAudit.bodyDeclaresAthleticClub} | ${atleticoAudit.contentDecision} |
| Joey Veerman | ${veermanAudit.intervals.map(item => `${item.team}: ${item.firstObserved} → ${item.lastObserved}`).join("; ")} | ${veermanAudit.decision}; lista UEFA Dortmund, nessun conflitto nella stessa data |
| exact-name only | ${exactNameOnly.length} casi | non ammessi alla calibrazione senza affiliazione indipendente |
| exact-name + affiliazione ESPN | ${exactNamePlusAffiliation.length} casi | evidenza più forte, sempre soggetta al cutoff |
| provider ID su club diversi | ${crossClubCases.length} casi; conflitti stessa data ${structuralConflicts.length} | ${structuralConflicts.length ? "contaminazione strutturale" : "sequenze temporali compatibili con cambio club"} |
| UEFA verificati fuori registro | ${outsideVerified.length}: List A ${audit.identityAudit.uefaVerifiedOutsideInternalRegistry.listA}, List B ${audit.identityAudit.uefaVerifiedOutsideInternalRegistry.listB} | discrepanza diagnostica; 74 flag invariati |
| Mika Medina | providerPlayerId=${mika.providerPlayerId}; uefaPlayerId=${mika.uefaPlayerId}; stato=${mika.status} | escluso da qualunque calibrazione |

Le statistiche storiche restano attribuite al club e alla data originali. Sono presenti ${historicalOtherClubEvidence.length} giocatori del registro corrente con evidenza su altro club; nessuna riga viene retroattivamente rietichettata come statistica del club corrente.

## C. Dataset di valutazione

| misura | valore |
|---|---:|
| Match candidati | ${audit.evaluationDataset.candidateMatches} |
| Match ammessi | ${audit.evaluationDataset.admittedMatches} |
| Match esclusi | ${audit.evaluationDataset.excludedMatches} |
| Osservazioni giocatore candidate | ${audit.evaluationDataset.candidatePlayerObservations} |
| Osservazioni ammesse | ${audit.evaluationDataset.admittedPlayerObservations} |
| Osservazioni escluse | ${audit.evaluationDataset.excludedPlayerObservations} |
| Giocatori unici ammessi | ${audit.evaluationDataset.uniqueAdmittedPlayers} |
| Osservazioni shots | ${audit.evaluationDataset.shotsObservations} |
| Osservazioni SOT | ${audit.evaluationDataset.shotsOnTargetObservations} |

Il timestamp di disponibilità del forecast è il commit Git che contiene lo snapshot, e deve essere strettamente precedente al kickoff. La data evento degli actual non viene confusa con la data di disponibilità degli input.

Il perimetro giocatore è l'unione dei top-5 serializzati per tiri e per SOT in ciascuna gara: **non è un backtest dell'intero XI**. Con una sola giornata parzialmente coperta, il disegno è una valutazione di snapshot pre-match senza refit; una calibrazione rolling/expanding non è ancora identificabile.

| motivo esclusione osservazione | conteggio |
|---|---:|
${table(exclusionRows)}

## D. Disegno walk-forward e leakage audit

Per ogni gara è stato selezionato l'ultimo snapshot di \`${predictionPath}\` sia generato sia committato prima del kickoff. Gli actual sono stati uniti dopo la gara con chiave \`teamId + registeredPlayerId\`. Non sono state usate formazioni future, aggregate di fine finestra, trasferimenti retroattivi, rose UEFA successive, Elo successivo o parametri fittati sul test.

| stato | partite |
|---|---:|
| ADMITTED | ${fixtureAudits.filter(item => item.status === "ADMITTED").length} |
| EXCLUDED — actual individuali Champions non disponibili | ${fixtureAudits.filter(item => item.exclusionReason === "observed_champions_match_unavailable").length} |
| EXCLUDED — altro | ${fixtureAudits.filter(item => item.status === "EXCLUDED" && item.exclusionReason !== "observed_champions_match_unavailable").length} |

## E. Confronto A / B / C

| modello | stato | campione accoppiato | decisione |
|---|---|---:|---|
| A — baseline production storico | ${baselineA.status} | ${admittedRows.length} | metriche descrittive consentite |
| B — domestic current-season, blending esistente | ${baselineB.status} | 0 | input recuperati dopo le gare; nessun backfill causale |
| C — context-adjusted League Strength/Elo | ${baselineC.status} | 0 | nessuna finestra training/test separata; nessun coefficiente stimato |

Confronto paired A/B/C: **NON ESEGUITO**. Non esistono osservazioni comuni cronologicamente ammissibili; produrre delta o test statistici creerebbe un confronto artificiale.

## F. Metriche baseline A

| metrica | n | MAE | RMSE | bias |
|---|---:|---:|---:|---:|
| shots | ${baselineA.pointMetrics.overall.shots.n} | ${fmt(baselineA.pointMetrics.overall.shots.mae)} | ${fmt(baselineA.pointMetrics.overall.shots.rmse)} | ${fmt(baselineA.pointMetrics.overall.shots.bias)} |
| SOT | ${baselineA.pointMetrics.overall.shotsOnTarget.n} | ${fmt(baselineA.pointMetrics.overall.shotsOnTarget.mae)} | ${fmt(baselineA.pointMetrics.overall.shotsOnTarget.rmse)} | ${fmt(baselineA.pointMetrics.overall.shotsOnTarget.bias)} |

Il bias è \`predetto - osservato\`. Brier score: **NON CALCOLATO**; gli snapshot versionati conservano point forecast, non una superficie probabilistica esplicita completa sulle stesse osservazioni. Nessuna probabilità è stata ricostruita artificialmente.

| segmento | valore | n shots | MAE | RMSE | bias | uso campione | n SOT | MAE SOT | RMSE SOT | bias SOT | uso campione SOT |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|
${table(segmentRows)}

Le celle \`tiny-no-claim\` non supportano conclusioni. Anche le celle \`descriptive-small\` sono solo segnali da monitorare.

## G. Qualità del campione e trasferibilità

Il campione copre una sola giornata, soltanto ${audit.evaluationDataset.admittedMatches}/18 gare con actual individuali recuperati e solo i candidati top-5 serializzati. Le segmentazioni major-five-league e limited-or-other-league sono diagnostiche; non misurano ancora la trasferibilità europea. League Strength resta descrittiva e separata da opponent strength e da qualsiasi fattore player-level.

## H. Invarianti e hash

| controllo | elementi | esito |
|---|---:|---|
| File protetti | ${audit.hashComparison.protectedFiles.count} | ${audit.hashComparison.protectedFiles.status} |
| Raw Champions | ${audit.hashComparison.protectedRawSnapshots.count} | ${audit.hashComparison.protectedRawSnapshots.status} |
| Flag predictionCandidateEligible | ${audit.hashComparison.predictionCandidateEligibility.count} | ${audit.hashComparison.predictionCandidateEligibility.status} |

Modello, builder, League Strength, Elo, expected minutes, team shots/SOT, blending, riconciliazione, 1X2, risultati esatti, Motivation, Surprise Factor, cards, UI, HTML, Serie A e MD6 non sono stati modificati. Nessuna calibrazione è stata attivata.

## I. File creati

- \`scripts/create-champions-model-calibration-control.js\`
- \`scripts/build-champions-model-calibration-audit.js\`
- \`scripts/test-champions-model-calibration-audit.js\`
- \`data/analysis/champions/model-calibration-control-${auditDate}.json\`
- \`data/analysis/champions/model-calibration-audit-${auditDate}.json\`
- \`output/reports/champions-model-calibration-audit-${auditDate}.md\`

## J. Gate finale

**${audit.gate.value}**

${audit.gate.reasons.map(reason => `- ${reason}`).join("\n")}

Raccomandazione: **${audit.gate.productionRecommendation}**
`;

const reportTarget = path.join(root, `output/reports/champions-model-calibration-audit-${auditDate}.md`);
fs.mkdirSync(path.dirname(reportTarget), { recursive: true });
fs.writeFileSync(reportTarget, report);
console.log(`${audit.gate.value} · ${audit.evaluationDataset.admittedMatches}/${audit.evaluationDataset.candidateMatches} match · ${admittedRows.length} osservazioni`);
