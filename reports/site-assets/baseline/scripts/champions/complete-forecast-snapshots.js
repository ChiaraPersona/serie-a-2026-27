"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { scaleShotProjections } = require("./player-volume-utils");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const normalize = value => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/ł/g, "l").replace(/đ/g, "d").replace(/ø/g, "o")
  .replace(/[^a-z0-9]+/g, " ").trim();
const tokens = value => normalize(value).split(" ").filter(Boolean);
const slug = value => normalize(value).replace(/ /g, "-");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = file => sha256(fs.readFileSync(file));

const roleLabel = role => ({
  goalkeeper: "Portiere",
  defender: "Difensore",
  midfielder: "Centrocampista",
  forward: "Attaccante"
}[role] || "N/D");

const rolePrior = {
  goalkeeper: { shots: 0.01, shotsOnTarget: 0 },
  defender: { shots: 0.65, shotsOnTarget: 0.18 },
  midfielder: { shots: 1.35, shotsOnTarget: 0.42 },
  forward: { shots: 2.35, shotsOnTarget: 0.86 }
};

function inferRole(formation, index) {
  if (index === 0) return "goalkeeper";
  const lines = String(formation || "4-4-2").split("-").map(Number).filter(Number.isFinite);
  const defenders = lines[0] || 4;
  const forwards = lines.at(-1) || 2;
  if (index <= defenders) return "defender";
  if (index > 10 - forwards) return "forward";
  return "midfielder";
}

function findPlayer(players, value) {
  const wanted = normalize(value);
  const wantedTokens = tokens(value);
  const exact = players.filter(player => normalize(player.name) === wanted || normalize(player.id) === wanted);
  if (exact.length === 1) return exact[0];
  const significant = wantedTokens.filter(token => token.length > 2);
  if (significant.length) {
    const contained = players.filter(player => {
      const current = tokens(player.name);
      return significant.every(token => current.includes(token));
    });
    if (contained.length === 1) return contained[0];
  }
  const surname = wantedTokens.at(-1);
  const matches = players.filter(player => {
    const current = tokens(player.name);
    return current.at(-1) === surname || (wantedTokens.length > 1 && wantedTokens.every(token => current.includes(token)));
  });
  return matches.length === 1 ? matches[0] : null;
}

function zonedLocalToUtc(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(utc)).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    utc += target - represented;
  }
  return new Date(utc).toISOString();
}

function buildIdentityOverlay(phase9) {
  const resolved = phase9.identityResolution.cases.map(item => ({
    internalPlayerId: item.internalPlayerId,
    canonicalName: item.profileName,
    uefaPlayerId: item.uefaPlayerId,
    status: item.status,
    confidence: item.confidence,
    sourceUrl: item.sourceUrl
  }));
  const mika = phase9.identityResolution.mikaMedina;
  resolved.push({
    internalPlayerId: mika.internalPlayerId,
    canonicalName: mika.resolvedPlayer,
    aliases: ["Mika Medina", "Mika Mármol", "Mika Mármol Medina"],
    uefaPlayerId: mika.uefaPlayerId,
    providerPlayerId: mika.providerPlayerId,
    status: mika.status,
    confidence: mika.confidence,
    sourceUrl: mika.evidence[0].sourceUrl
  });
  const ambiguousListA = phase9.uefaRegistryDiscrepancies.cases
    .filter(item => item.classification === "uefa_list_a_registry_delta_timing_unresolved")
    .map(item => ({
      teamId: item.teamId,
      player: item.player,
      providerPlayerId: item.providerPlayerId,
      uefaPlayerId: item.uefaPlayerId,
      classification: item.classification,
      automaticError: false,
      decision: item.decision
    }));
  return {
    schemaVersion: 1,
    source: "data/analysis/champions/historical-recovery-audit-2026-10-13.json",
    policy: "Verified Phase 9 identities are an additive lookup overlay; protected squad registries are not rewritten.",
    resolved,
    ambiguousListA
  };
}

function buildStarterCandidates(fixture, prediction, statsByTeam) {
  const rows = [];
  for (const side of ["home", "away"]) {
    const formation = fixture.probableFormation?.[side];
    const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
    const teamPlayers = statsByTeam.get(team)?.players || [];
    const teamProjection = prediction.teamProjections.find(item => item.team === team);
    for (const [index, lineupName] of (formation?.players || []).entries()) {
      const player = findPlayer(teamPlayers, lineupName);
      if (!player?.position && formation?.formation === null) continue;
      const roleKey = player?.position || inferRole(formation?.formation, index);
      const totals = player?.previousSeason?.totals || {};
      const per90 = totals.per90 || {};
      const historicalMinutes = Number(totals.minutes || 0);
      const reliability = clamp(historicalMinutes / (historicalMinutes + 900), 0, 0.82);
      const prior = rolePrior[roleKey] || rolePrior.midfielder;
      const rate = key => round((Number.isFinite(per90[key]) ? per90[key] : prior[key]) * reliability + prior[key] * (1 - reliability), 3);
      rows.push({
        lineupName,
        name: player?.name || lineupName,
        internalPlayerId: player?.id || slug(`${team}-${lineupName}`),
        team,
        teamId: slug(team),
        venue: side,
        roleKey,
        role: roleLabel(roleKey),
        starterIndex: index,
        expectedMinutes: roleKey === "goalkeeper" ? 90 : 84.6,
        historicalMinutes,
        per90: { shots: rate("shots"), shotsOnTarget: rate("shotsOnTarget") },
        dataStatus: player && historicalMinutes >= 700 ? "verified-history" : player ? "limited-history" : "role-baseline",
        teamProjection
      });
    }
  }
  return rows;
}

function projectStarters(players, prediction) {
  const output = [];
  for (const side of ["home", "away"]) {
    const selected = players.filter(player => player.venue === side);
    const teamProjection = prediction.teamProjections.find(item => item.venue === side);
    const shots = scaleShotProjections(selected, "shots", teamProjection?.shotsTotal?.central);
    const sot = scaleShotProjections(selected, "shotsOnTarget", teamProjection?.shotsOnTarget?.central);
    const shotsById = new Map(shots.map(item => [item.player.internalPlayerId, item]));
    const sotById = new Map(sot.map(item => [item.player.internalPlayerId, item]));
    for (const player of selected) {
      const shot = shotsById.get(player.internalPlayerId);
      const target = sotById.get(player.internalPlayerId);
      output.push({
        ...player,
        projectedShots: shot?.projection ?? null,
        projectedShotsOnTarget: target?.projection ?? null,
        reconciliationFactors: shot && target ? { shots: round(shot.reconciliationFactor, 8), shotsOnTarget: round(target.reconciliationFactor, 8) } : null
      });
    }
  }
  return output;
}

function buildCandidate({ root, generatedAt, kickoffVerification }) {
  const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  const calendarPath = "data/normalized/champions-league-2026-27.json";
  const predictionPath = "data/normalized/champions-pilot-predictions-2026-27.json";
  const marketPath = "data/normalized/champions-player-markets-md01-2026-27.json";
  const statsPath = "data/normalized/champions-player-stats-2025-26.json";
  const squadsPath = "data/normalized/champions-registered-squads-2026-27.json";
  const phase9Path = "data/analysis/champions/historical-recovery-audit-2026-10-13.json";
  const builderPath = "scripts/build-champions-player-markets.js";
  const volumePath = "scripts/champions/player-volume-utils.js";
  const calendar = read(calendarPath);
  const predictions = read(predictionPath);
  const originalMarkets = read(marketPath);
  const stats = read(statsPath);
  const squads = read(squadsPath);
  const phase9 = read(phase9Path);
  const overlay = buildIdentityOverlay(phase9);
  const overlayById = new Map(overlay.resolved.map(item => [item.internalPlayerId, item]));
  const statsByTeam = new Map(stats.teams.map(team => [team.team, team]));
  const squadsByTeam = new Map(squads.teams.map(team => [team.team, team]));
  const calendarById = new Map(calendar.fixtures.map(fixture => [fixture.id, fixture]));
  const originalById = new Map(originalMarkets.fixtures.map(fixture => [fixture.fixtureId, fixture]));
  const verifiedMatchdays = new Set(kickoffVerification.matchdays);
  if (!kickoffVerification.source?.url?.startsWith("https://www.uefa.com/")) throw new Error("Kickoff verification must use an official UEFA URL");
  if (kickoffVerification.calendarSha256 !== sha256File(path.join(root, calendarPath))) throw new Error("Kickoff verification does not match the current canonical calendar");

  const fixtures = predictions.fixtures.map(prediction => {
    const fixture = calendarById.get(prediction.fixtureId);
    if (!fixture) throw new Error(`${prediction.fixtureId}: fixture missing from calendar`);
    const starterRows = projectStarters(buildStarterCandidates(fixture, prediction, statsByTeam), prediction);
    const startersByTeamId = new Map(starterRows.map(player => [`${player.teamId}:${player.internalPlayerId}`, player]));
    const rows = [];
    for (const side of ["home", "away"]) {
      const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
      const teamId = slug(team);
      const squad = squadsByTeam.get(team);
      if (!squad) throw new Error(`${fixture.id}: registered squad missing for ${team}`);
      const benchNames = fixture.probableFormation?.[side]?.bench || [];
      const resolvedBench = benchNames.map(name => ({ name, player: findPlayer(squad.players, name) }));
      const benchIds = new Set(resolvedBench.map(item => item.player?.id).filter(Boolean));
      for (const player of squad.players) {
        const starter = startersByTeamId.get(`${teamId}:${player.id}`) || null;
        const identity = overlayById.get(player.id) || null;
        const metricEligible = Boolean(starter && starter.roleKey !== "goalkeeper");
        rows.push({
          stablePlayerId: `${teamId}:${player.id}`,
          internalPlayerId: player.id,
          canonicalName: identity?.canonicalName || player.name,
          sourceName: player.name,
          aliases: identity?.aliases || [],
          uefaPlayerId: identity?.uefaPlayerId || null,
          providerIds: {
            ...player.providerIds,
            ...(identity?.providerPlayerId ? { phase9Resolved: identity.providerPlayerId } : {})
          },
          team,
          teamId,
          venue: side,
          role: roleLabel(player.position),
          roleKey: player.position,
          registrationEligible: player.registered === true,
          lineupStatus: starter ? "starter" : benchIds.has(player.id) ? "potential-substitute" : "registered-reserve",
          forecastEligibility: metricEligible ? "eligible-existing-model" : starter ? "metric-ineligible-goalkeeper" : "blocked-expected-minutes-unavailable",
          expectedMinutes: starter?.expectedMinutes ?? null,
          historicalMinutes: starter?.historicalMinutes ?? player.previousSeason?.totals?.minutes ?? null,
          projectedShots: metricEligible ? starter.projectedShots : null,
          projectedShotsOnTarget: metricEligible ? starter.projectedShotsOnTarget : null,
          eventProbabilities: null,
          probabilityStatus: "not-produced-by-current-player-volume-model",
          dataStatus: starter?.dataStatus || player.historicalDataQuality || "unknown",
          identityResolution: identity ? { status: identity.status, confidence: identity.confidence, sourceUrl: identity.sourceUrl } : null,
          forecastStatus: metricEligible ? "produced-existing-formula" : "not-produced"
        });
      }
      const represented = new Set(rows.filter(row => row.teamId === teamId).map(row => row.internalPlayerId));
      for (const starter of starterRows.filter(row => row.teamId === teamId && !represented.has(row.internalPlayerId))) {
        const identity = overlayById.get(starter.internalPlayerId) || null;
        const metricEligible = starter.roleKey !== "goalkeeper";
        rows.push({
          stablePlayerId: `${teamId}:${starter.internalPlayerId}`,
          internalPlayerId: starter.internalPlayerId,
          canonicalName: identity?.canonicalName || starter.name,
          sourceName: starter.lineupName,
          aliases: identity?.aliases || [],
          uefaPlayerId: identity?.uefaPlayerId || null,
          providerIds: identity?.providerPlayerId ? { phase9Resolved: identity.providerPlayerId } : {},
          team,
          teamId,
          venue: side,
          role: starter.role,
          roleKey: starter.roleKey,
          registrationEligible: false,
          registrationStatus: "outside-frozen-registry-or-identity-unresolved",
          lineupStatus: "starter",
          forecastEligibility: metricEligible ? "eligible-existing-model" : "metric-ineligible-goalkeeper",
          expectedMinutes: starter.expectedMinutes,
          historicalMinutes: starter.historicalMinutes,
          projectedShots: metricEligible ? starter.projectedShots : null,
          projectedShotsOnTarget: metricEligible ? starter.projectedShotsOnTarget : null,
          eventProbabilities: null,
          probabilityStatus: "not-produced-by-current-player-volume-model",
          dataStatus: starter.dataStatus,
          identityResolution: identity ? { status: identity.status, confidence: identity.confidence, sourceUrl: identity.sourceUrl } : null,
          forecastStatus: metricEligible ? "produced-existing-formula" : "not-produced"
        });
        represented.add(starter.internalPlayerId);
      }
      for (const item of resolvedBench.filter(item => !item.player)) {
        const internalPlayerId = `unresolved-${teamId}-${slug(item.name)}`;
        if (represented.has(internalPlayerId)) continue;
        rows.push({
          stablePlayerId: `${teamId}:${internalPlayerId}`,
          internalPlayerId,
          canonicalName: item.name,
          sourceName: item.name,
          aliases: [],
          uefaPlayerId: null,
          providerIds: {},
          team,
          teamId,
          venue: side,
          role: "N/D",
          roleKey: null,
          registrationEligible: false,
          registrationStatus: "official-bench-name-unresolved-against-frozen-registry",
          lineupStatus: "potential-substitute",
          forecastEligibility: "blocked-identity-and-expected-minutes-unavailable",
          expectedMinutes: null,
          historicalMinutes: null,
          projectedShots: null,
          projectedShotsOnTarget: null,
          eventProbabilities: null,
          probabilityStatus: "not-produced-by-current-player-volume-model",
          dataStatus: "identity-unresolved",
          identityResolution: null,
          forecastStatus: "not-produced"
        });
        represented.add(internalPlayerId);
      }
    }
    const kickoffAt = zonedLocalToUtc(fixture.date, fixture.kickoff, fixture.timezone || "Europe/Rome");
    const sourceVerified = verifiedMatchdays.has(fixture.matchday);
    const chronologyStatus = sourceVerified && new Date(generatedAt) < new Date(kickoffAt)
      ? "PREMATCH_CANDIDATE"
      : sourceVerified ? "POST_KICKOFF_RECALCULATION" : "KICKOFF_NOT_VERIFIED";
    const forecastEligible = rows.filter(row => row.forecastEligibility === "eligible-existing-model");
    const completeForecastRows = forecastEligible.filter(row => Number.isFinite(row.expectedMinutes) && Number.isFinite(row.projectedShots) && Number.isFinite(row.projectedShotsOnTarget));
    const blockedPotentialSubstitutes = rows.filter(row => row.lineupStatus === "potential-substitute" && row.forecastStatus === "not-produced");
    const original = originalById.get(fixture.id);
    const originalTopFive = [...(original?.shooters?.totalShots || []), ...(original?.shooters?.shotsOnTarget || [])];
    return {
      fixtureId: fixture.id,
      competition: "UEFA Champions League",
      phase: fixture.phase,
      season: calendar.season,
      matchday: fixture.matchday,
      date: fixture.date,
      kickoff: fixture.kickoff,
      timezone: fixture.timezone,
      kickoffAt,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      chronologyStatus,
      generationKind: chronologyStatus === "PREMATCH_CANDIDATE" ? "original-candidate" : "recalculation",
      evaluationWindow: "unassigned",
      players: rows,
      coverage: {
        registrationEligiblePlayers: rows.filter(row => row.registrationEligible).length,
        starters: rows.filter(row => row.lineupStatus === "starter").length,
        potentialSubstitutes: rows.filter(row => row.lineupStatus === "potential-substitute").length,
        registeredReserves: rows.filter(row => row.lineupStatus === "registered-reserve").length,
        forecastEligiblePlayers: forecastEligible.length,
        completeForecastRows: completeForecastRows.length,
        blockedPotentialSubstitutes: blockedPotentialSubstitutes.length,
        completeForCurrentModelEligibility: completeForecastRows.length === forecastEligible.length,
        completeForAllRegisteredPlayers: rows.every(row => !row.registrationEligible || row.forecastStatus === "produced-existing-formula" || row.forecastEligibility === "metric-ineligible-goalkeeper"),
        originalTopFiveReferences: new Set(originalTopFive.map(row => `${row.teamId}:${row.playerId}`)).size
      }
    };
  });

  const allPlayers = fixtures.flatMap(fixture => fixture.players);
  const uniqueTeams = new Set(squads.teams.map(team => team.id));
  const candidate = {
    schemaVersion: 1,
    kind: "champions-complete-player-forecast-candidate",
    competition: "UEFA Champions League",
    season: calendar.season,
    matchday: predictions.fixtures[0] ? calendarById.get(predictions.fixtures[0].fixtureId).matchday : null,
    generatedAt,
    immutable: false,
    publicInterfaceChanged: false,
    sourceForecastsModified: false,
    model: {
      id: "champions-player-volume-existing-formula",
      version: `${sha256File(path.join(root, builderPath)).slice(0, 12)}-${sha256File(path.join(root, volumePath)).slice(0, 12)}`,
      formulaChanged: false,
      expectedMinutesPolicy: "Existing implicit exposure made explicit: 90 goalkeeper, 84.6 outfield starter; no minutes are inferred for substitutes or reserves.",
      probabilityPolicy: "Null unless the upstream player-volume model serializes an original event probability. Heuristics and Poisson reconstruction are not promoted to original probabilities."
    },
    dataVersion: Object.fromEntries([calendarPath, predictionPath, marketPath, statsPath, squadsPath, phase9Path].map(relative => [relative, sha256File(path.join(root, relative))])),
    kickoffVerification,
    identityOverlay: overlay,
    summary: {
      supportedTeams: uniqueTeams.size,
      fixtures: fixtures.length,
      registrationEligiblePlayers: allPlayers.filter(player => player.registrationEligible).length,
      forecastEligiblePlayers: allPlayers.filter(player => player.forecastEligibility === "eligible-existing-model").length,
      completeForecastRows: allPlayers.filter(player => player.forecastStatus === "produced-existing-formula").length,
      potentialSubstitutes: allPlayers.filter(player => player.lineupStatus === "potential-substitute").length,
      potentialSubstitutesWithForecast: allPlayers.filter(player => player.lineupStatus === "potential-substitute" && player.forecastStatus === "produced-existing-formula").length,
      eventProbabilitiesProduced: allPlayers.filter(player => player.eventProbabilities !== null).length,
      prematchCandidates: fixtures.filter(fixture => fixture.chronologyStatus === "PREMATCH_CANDIDATE").length,
      postKickoffRecalculations: fixtures.filter(fixture => fixture.chronologyStatus === "POST_KICKOFF_RECALCULATION").length,
      completeForAllRegisteredPlayers: fixtures.every(fixture => fixture.coverage.completeForAllRegisteredPlayers)
    },
    fixtures
  };
  return candidate;
}

function snapshotPayload(candidate, fixture, evaluationWindow) {
  return {
    schemaVersion: 1,
    kind: "champions-immutable-prematch-player-forecast-snapshot",
    immutable: true,
    createdAt: candidate.generatedAt,
    competition: fixture.competition,
    phase: fixture.phase,
    season: fixture.season,
    matchday: fixture.matchday,
    fixtureId: fixture.fixtureId,
    date: fixture.date,
    kickoff: fixture.kickoff,
    timezone: fixture.timezone,
    kickoffAt: fixture.kickoffAt,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    chronologyStatus: "VALID_PREMATCH_SNAPSHOT",
    evaluationWindow,
    model: candidate.model,
    dataVersion: candidate.dataVersion,
    kickoffVerification: candidate.kickoffVerification,
    identityOverlaySource: candidate.identityOverlay.source,
    coverage: fixture.coverage,
    players: fixture.players,
    ...(fixture.events?{events:fixture.events}:{}),
    ...(fixture.teamProjections?{teamProjections:fixture.teamProjections}:{})
  };
}

function freezeCandidate({ candidate, outputRoot, evaluationWindow = "unassigned" }) {
  if (!new Set(["calibration", "test", "unassigned"]).has(evaluationWindow)) throw new Error("Evaluation window must be calibration, test, or unassigned");
  const results = [];
  for (const fixture of candidate.fixtures) {
    if (fixture.chronologyStatus !== "PREMATCH_CANDIDATE" || !(new Date(candidate.generatedAt) < new Date(fixture.kickoffAt))) {
      results.push({ fixtureId: fixture.fixtureId, status: "REJECTED_AFTER_KICKOFF_OR_UNVERIFIED" });
      continue;
    }
    const completeCoverage = fixture.coverage.completeForSnapshotUniverse ?? fixture.coverage.completeForAllRegisteredPlayers;
    if (!completeCoverage) {
      results.push({ fixtureId: fixture.fixtureId, status: "REJECTED_INCOMPLETE_PLAYER_FORECAST_COVERAGE" });
      continue;
    }
    const payload = snapshotPayload(candidate, fixture, evaluationWindow);
    const contentHash = sha256(Buffer.from(JSON.stringify(payload)));
    const document = { ...payload, contentHash };
    const directory = path.join(outputRoot, `md${String(fixture.matchday).padStart(2, "0")}`);
    fs.mkdirSync(directory, { recursive: true });
    const timestamp = candidate.generatedAt.replace(/[:.]/g, "-");
    const outputPath = path.join(directory, `${fixture.fixtureId}--${timestamp}.json`);
    const serialized = `${JSON.stringify(document, null, 2)}\n`;
    try {
      const handle = fs.openSync(outputPath, "wx");
      try { fs.writeFileSync(handle, serialized); } finally { fs.closeSync(handle); }
      results.push({ fixtureId: fixture.fixtureId, status: "FROZEN", path: outputPath, contentHash });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = fs.readFileSync(outputPath, "utf8");
      if (existing !== serialized) throw new Error(`${fixture.fixtureId}: immutable snapshot conflict at ${outputPath}`);
      results.push({ fixtureId: fixture.fixtureId, status: "ALREADY_FROZEN_IDENTICAL", path: outputPath, contentHash });
    }
  }
  return results;
}

function metric(rows, predicted, actual) {
  const values = rows.filter(row => Number.isFinite(row[predicted]) && Number.isFinite(row[actual]));
  if (!values.length) return { n: 0, mae: null, rmse: null, bias: null };
  const errors = values.map(row => row[predicted] - row[actual]);
  return {
    n: values.length,
    mae: round(errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length, 3),
    rmse: round(Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length), 3),
    bias: round(errors.reduce((sum, value) => sum + value, 0) / errors.length, 3)
  };
}

function evaluateSnapshots(snapshots, actuals) {
  const actualByKey = new Map(actuals.map(row => [`${row.fixtureId}:${row.teamId}:${row.internalPlayerId || row.playerId}`, row]));
  const windows = {};
  for (const window of ["calibration", "test", "unassigned"]) {
    const rows = snapshots.filter(snapshot => snapshot.evaluationWindow === window).flatMap(snapshot => snapshot.players.map(player => {
      const actual = actualByKey.get(`${snapshot.fixtureId}:${player.teamId}:${player.internalPlayerId}`);
      return {
        fixtureId: snapshot.fixtureId,
        teamId: player.teamId,
        playerId: player.internalPlayerId,
        predictedShots: player.projectedShots,
        predictedSot: player.projectedShotsOnTarget,
        actualShots: actual?.shots ?? actual?.actualShots ?? null,
        actualSot: actual?.shotsOnTarget ?? actual?.actualSot ?? null,
        probabilities: player.eventProbabilities,
        actual
      };
    })).filter(row => row.actual);
    const probabilityRows = rows.filter(row => Number.isFinite(row.probabilities?.shotsAtLeast1) && Number.isFinite(row.actualShots));
    windows[window] = {
      observations: rows.length,
      shots: metric(rows, "predictedShots", "actualShots"),
      shotsOnTarget: metric(rows, "predictedSot", "actualSot"),
      brierShotsAtLeast1: probabilityRows.length ? {
        n: probabilityRows.length,
        value: round(probabilityRows.reduce((sum, row) => sum + (row.probabilities.shotsAtLeast1 - (row.actualShots >= 1 ? 1 : 0)) ** 2, 0) / probabilityRows.length, 4)
      } : { n: 0, value: null, status: "NOT_CALCULATED_NO_ORIGINAL_PROBABILITIES" }
    };
  }
  return { schemaVersion: 1, calibrationExecuted: false, windows };
}

module.exports = {
  buildCandidate,
  buildIdentityOverlay,
  evaluateSnapshots,
  freezeCandidate,
  sha256File,
  zonedLocalToUtc
};
