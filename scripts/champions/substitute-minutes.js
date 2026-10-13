"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { scaleShotProjections } = require("./player-volume-utils");

const POLICY = Object.freeze({
  minimumStarterAppearances: 3,
  maximumRecentStarterAppearances: 8,
  minimumNamedBenchAppearances: 3,
  minimumSubstituteEntries: 2,
  maximumRecentNamedBenchAppearances: 12,
  competitionPreference: "uefa-first-then-cross-competition",
  sourceAvailabilityRule: "event-before-kickoff-and-source-retrieved-no-later-than-kickoff",
  serieACoefficientsReused: false
});

const ROLE_PRIOR = Object.freeze({
  goalkeeper: { shots: 0.01, shotsOnTarget: 0 },
  defender: { shots: 0.65, shotsOnTarget: 0.18 },
  midfielder: { shots: 1.35, shotsOnTarget: 0.42 },
  forward: { shots: 2.35, shotsOnTarget: 0.86 }
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : entry.name.endsWith(".json.gz") ? [target] : [];
  });
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function statMap(stats) {
  return Object.fromEntries((stats || []).map(stat => [stat.name, number(stat.value ?? stat.displayValue)]));
}

function playedMinutes(row) {
  const stats = statMap(row.stats);
  if ((stats.appearances ?? 0) < 1) return null;
  const substitutionMinutes = (row.plays || [])
    .filter(item => item.substitution && item.clock?.displayValue)
    .map(item => Number(String(item.clock.displayValue).match(/\d+/)?.[0]))
    .filter(Number.isFinite)
    .map(value => Math.min(90, value));
  if (row.starter) return row.subbedOut && substitutionMinutes.length ? substitutionMinutes[0] : 90;
  if (!row.subbedIn || !substitutionMinutes.length) return null;
  const enteredAt = substitutionMinutes[0];
  const exitedAt = row.subbedOut && substitutionMinutes.length > 1 ? substitutionMinutes.at(-1) : 90;
  return Math.max(0, exitedAt - enteredAt);
}

function eventDate(raw, payload) {
  return raw.eventDate || payload?.header?.competitions?.[0]?.date?.slice(0, 10) || null;
}

function collectRosterEvidence(root, providerPlayerIds) {
  const wanted = new Set([...providerPlayerIds].filter(Boolean).map(String));
  const snapshots = new Map();
  for (const season of ["2025-26", "2026-27"]) {
    const seasonRoot = path.join(root, "data/raw/champions-pilot/espn/summaries", season);
    for (const file of files(seasonRoot)) {
      const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
      const payload = raw.payload || raw.bundle?.summary || {};
      const relative = path.relative(seasonRoot, file).split(path.sep);
      const league = raw.league || relative[0];
      const matchId = String(raw.eventId || payload.header?.id || path.basename(file, ".json.gz"));
      const key = `${season}:${league}:${matchId}`;
      const retrievedAt = raw.retrievedAt || null;
      const previous = snapshots.get(key);
      if (!previous || String(retrievedAt || "9999") < String(previous.retrievedAt || "9999")) {
        snapshots.set(key, { raw, payload, season, league, matchId, retrievedAt, file });
      }
    }
  }

  const byPlayer = new Map();
  for (const snapshot of snapshots.values()) {
    const date = eventDate(snapshot.raw, snapshot.payload);
    for (const roster of snapshot.payload.rosters || []) {
      for (const row of roster.roster || []) {
        const providerPlayerId = String(row.athlete?.id || "");
        if (!wanted.has(providerPlayerId)) continue;
        const record = {
          providerPlayerId,
          playerName: row.athlete?.fullName || row.athlete?.displayName || null,
          season: snapshot.season,
          competitionCode: snapshot.league,
          competitionType: snapshot.league.startsWith("uefa.") ? "uefa-competition" : "domestic-league",
          matchId: snapshot.matchId,
          date,
          retrievedAt: snapshot.retrievedAt,
          sourceUrl: snapshot.raw.url || `https://site.api.espn.com/apis/site/v2/sports/soccer/${snapshot.league}/summary?event=${snapshot.matchId}`,
          providerTeamId: String(roster.team?.id || ""),
          team: roster.team?.displayName || roster.team?.name || null,
          starter: row.starter === true,
          namedBench: row.starter !== true,
          entered: row.subbedIn === true,
          subbedOut: row.subbedOut === true,
          minutes: playedMinutes(row)
        };
        if (!byPlayer.has(providerPlayerId)) byPlayer.set(providerPlayerId, []);
        byPlayer.get(providerPlayerId).push(record);
      }
    }
  }
  for (const records of byPlayer.values()) records.sort((left, right) => String(left.date).localeCompare(String(right.date)) || left.matchId.localeCompare(right.matchId));
  return byPlayer;
}

function chronologicalEvidence(records, kickoffAt) {
  const kickoff = new Date(kickoffAt).getTime();
  return (records || []).filter(record => {
    const matchTime = record.date ? new Date(`${record.date}T23:59:59Z`).getTime() : NaN;
    const retrieved = record.retrievedAt ? new Date(record.retrievedAt).getTime() : NaN;
    return Number.isFinite(matchTime) && matchTime < kickoff && Number.isFinite(retrieved) && retrieved <= kickoff;
  });
}

function preferCompetition(records, sufficient) {
  const uefa = records.filter(record => record.competitionType === "uefa-competition");
  if (sufficient(uefa)) return { records: uefa, scope: "uefa-only" };
  return { records, scope: "cross-competition-fallback" };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function estimateExpectedMinutes(records, lineupStatus, kickoffAt) {
  const available = chronologicalEvidence(records, kickoffAt);
  const rotation = {
    namedSquadAppearances: available.length,
    starts: available.filter(record => record.starter).length,
    namedBench: available.filter(record => record.namedBench).length,
    enteredFromBench: available.filter(record => record.namedBench && record.entered).length,
    startFrequency: available.length ? round(available.filter(record => record.starter).length / available.length, 3) : null
  };
  if (lineupStatus === "starter") {
    const exact = available.filter(record => record.starter && Number.isFinite(record.minutes));
    const selected = preferCompetition(exact, rows => rows.length >= POLICY.minimumStarterAppearances);
    const recent = selected.records.slice(-POLICY.maximumRecentStarterAppearances);
    if (recent.length < POLICY.minimumStarterAppearances) {
      return { status: "not-evaluable", expectedMinutes: null, confidence: "none", reason: "insufficient-exact-starter-appearances", rotation, sample: { exactStarterAppearances: recent.length, competitionScope: selected.scope } };
    }
    return {
      status: "evaluable",
      expectedMinutes: round(mean(recent.map(record => record.minutes)), 1),
      confidence: selected.scope === "uefa-only" && recent.length >= 6 ? "high" : selected.scope === "uefa-only" ? "medium" : recent.length >= 6 ? "medium" : "low",
      method: "arithmetic-mean-of-exact-starting-minutes",
      rotation,
      sample: {
        exactStarterAppearances: recent.length,
        competitionScope: selected.scope,
        seasons: [...new Set(recent.map(record => record.season))],
        competitionCodes: [...new Set(recent.map(record => record.competitionCode))],
        from: recent[0].date,
        to: recent.at(-1).date,
        sourceRetrievedFrom: recent.map(record => record.retrievedAt).sort()[0],
        sourceRetrievedTo: recent.map(record => record.retrievedAt).sort().at(-1),
        matchIds: recent.map(record => record.matchId),
        sourceUrls: [...new Set(recent.map(record => record.sourceUrl))]
      }
    };
  }
  if (lineupStatus === "potential-substitute") {
    const bench = available.filter(record => record.namedBench);
    const sufficient = rows => rows.length >= POLICY.minimumNamedBenchAppearances
      && rows.filter(record => record.entered && Number.isFinite(record.minutes)).length >= POLICY.minimumSubstituteEntries;
    const selected = preferCompetition(bench, sufficient);
    const recent = selected.records.slice(-POLICY.maximumRecentNamedBenchAppearances);
    const entries = recent.filter(record => record.entered && Number.isFinite(record.minutes));
    if (!sufficient(recent)) {
      return { status: "not-evaluable", expectedMinutes: null, confidence: "none", reason: "insufficient-named-bench-or-exact-entry-history", rotation, sample: { namedBenchAppearances: recent.length, exactSubstituteEntries: entries.length, competitionScope: selected.scope } };
    }
    const entryProbability = entries.length / recent.length;
    const conditionalMinutes = mean(entries.map(record => record.minutes));
    return {
      status: "evaluable",
      expectedMinutes: round(entryProbability * conditionalMinutes, 1),
      confidence: selected.scope === "uefa-only" && recent.length >= 8 && entries.length >= 3 ? "high" : selected.scope === "uefa-only" ? "medium" : recent.length >= 8 && entries.length >= 3 ? "medium" : "low",
      method: "observed-bench-entry-frequency-times-mean-exact-minutes-conditional-on-entry",
      rotation,
      entryProbability: round(entryProbability, 3),
      conditionalMinutesIfUsed: round(conditionalMinutes, 1),
      sample: {
        namedBenchAppearances: recent.length,
        exactSubstituteEntries: entries.length,
        competitionScope: selected.scope,
        seasons: [...new Set(recent.map(record => record.season))],
        competitionCodes: [...new Set(recent.map(record => record.competitionCode))],
        from: recent[0].date,
        to: recent.at(-1).date,
        sourceRetrievedFrom: recent.map(record => record.retrievedAt).sort()[0],
        sourceRetrievedTo: recent.map(record => record.retrievedAt).sort().at(-1),
        matchIds: recent.map(record => record.matchId),
        sourceUrls: [...new Set(recent.map(record => record.sourceUrl))]
      }
    };
  }
  return { status: "not-in-snapshot-universe", expectedMinutes: null, confidence: "none", reason: "registered-reserve-not-named-as-potential-substitute", rotation };
}

function rateForPlayer(player, statsPlayer) {
  const totals = statsPlayer?.previousSeason?.totals || {};
  const per90 = totals.per90 || {};
  const historicalMinutes = Number(totals.minutes || 0);
  const reliability = clamp(historicalMinutes / (historicalMinutes + 900), 0, 0.82);
  const prior = ROLE_PRIOR[player.roleKey] || ROLE_PRIOR.midfielder;
  const rate = key => round((Number.isFinite(per90[key]) ? per90[key] : prior[key]) * reliability + prior[key] * (1 - reliability), 3);
  return { shots: rate("shots"), shotsOnTarget: rate("shotsOnTarget") };
}

function conserveTeamVolume(items, target) {
  if (!Number.isFinite(target) || !items.length) return items;
  const allocated = items.reduce((sum, item) => sum + (Number(item.projection) || 0), 0);
  if (!(allocated > 0)) return items;
  const factor = target / allocated;
  return items.map(item => ({ ...item, projection: round(item.projection * factor, 4), conservationFactor: round(factor, 8) }));
}

function buildSubstituteForecastCandidate({ root, baseCandidate }) {
  const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  const statsPath = "data/normalized/champions-player-stats-2025-26.json";
  const predictionsPath = "data/normalized/champions-pilot-predictions-2026-27.json";
  const sourceConfigPath = "data/sources/champions-pilot-match-stats-2025-27.json";
  const stats = read(statsPath);
  const predictions = read(predictionsPath);
  const statsByTeamAndId = new Map(stats.teams.flatMap(team => team.players.map(player => [`${team.id}:${player.id}`, player])));
  const predictionsByFixture = new Map(predictions.fixtures.map(fixture => [fixture.fixtureId, fixture]));
  const providerIds = new Set(baseCandidate.fixtures.flatMap(fixture => fixture.players.flatMap(player => [player.providerIds?.espn, player.providerIds?.phase9Resolved])).filter(Boolean));
  const evidenceByPlayer = collectRosterEvidence(root, providerIds);

  const fixtures = baseCandidate.fixtures.map(fixture => {
    const rows = fixture.players.map(player => {
      if (!new Set(["starter", "potential-substitute"]).has(player.lineupStatus)) {
        return { ...player, minutesEstimate: estimateExpectedMinutes([], player.lineupStatus, fixture.kickoffAt) };
      }
      const providerPlayerId = player.providerIds?.espn || player.providerIds?.phase9Resolved || null;
      const minutesEstimate = providerPlayerId
        ? estimateExpectedMinutes(evidenceByPlayer.get(String(providerPlayerId)), player.lineupStatus, fixture.kickoffAt)
        : { status: "not-evaluable", expectedMinutes: null, confidence: "none", reason: "provider-player-id-unavailable", rotation: { namedSquadAppearances: 0, starts: 0, namedBench: 0, enteredFromBench: 0, startFrequency: null } };
      return {
        ...player,
        expectedMinutes: minutesEstimate.expectedMinutes,
        minutesEstimate: { ...minutesEstimate, providerPlayerId },
        forecastEligibility: player.roleKey === "goalkeeper"
          ? (minutesEstimate.status === "evaluable" ? "minutes-only-metric-ineligible-goalkeeper" : "not-evaluable-minutes")
          : minutesEstimate.status === "evaluable" ? "eligible-champions-minutes-model" : "not-evaluable-minutes",
        forecastStatus: "pending-volume-reconciliation",
        projectedShots: null,
        projectedShotsOnTarget: null
      };
    });

    const teamMinutes = [];
    for (const teamId of new Set(rows.map(player => player.teamId))) {
      const universe = rows.filter(player => player.teamId === teamId && new Set(["starter", "potential-substitute"]).has(player.lineupStatus) && Number.isFinite(player.expectedMinutes));
      const rawTotal = universe.reduce((sum, player) => sum + player.expectedMinutes, 0);
      const budgetFactor = rawTotal > 990 ? 990 / rawTotal : 1;
      for (const player of universe) player.expectedMinutes = round(player.expectedMinutes * budgetFactor, 1);
      let allocated = round(universe.reduce((sum, player) => sum + player.expectedMinutes, 0), 1);
      if (allocated > 990 && universe.length) {
        const largest = universe.reduce((best, player) => player.expectedMinutes > best.expectedMinutes ? player : best, universe[0]);
        largest.expectedMinutes = round(largest.expectedMinutes - (allocated - 990), 1);
        allocated = round(universe.reduce((sum, player) => sum + player.expectedMinutes, 0), 1);
      }
      teamMinutes.push({ teamId, rawExpectedMinutes: round(rawTotal, 1), budgetFactor: round(budgetFactor, 6), allocatedExpectedMinutes: allocated, unallocatedOrUnknownMinutes: round(990 - allocated, 1), exceededBudget: allocated > 990.1 });
    }

    const prediction = predictionsByFixture.get(fixture.fixtureId);
    const reconciliations = [];
    for (const side of ["home", "away"]) {
      const eligible = rows.filter(player => player.venue === side && player.roleKey !== "goalkeeper" && Number.isFinite(player.expectedMinutes));
      for (const player of eligible) {
        const statsPlayer = statsByTeamAndId.get(`${player.teamId}:${player.internalPlayerId}`);
        player.per90 = rateForPlayer(player, statsPlayer);
      }
      const teamProjection = prediction?.teamProjections?.find(item => item.venue === side);
      const shots = conserveTeamVolume(scaleShotProjections(eligible, "shots", teamProjection?.shotsTotal?.central), teamProjection?.shotsTotal?.central);
      const sot = conserveTeamVolume(scaleShotProjections(eligible, "shotsOnTarget", teamProjection?.shotsOnTarget?.central), teamProjection?.shotsOnTarget?.central);
      const shotsById = new Map(shots.map(item => [item.player.stablePlayerId, item]));
      const sotById = new Map(sot.map(item => [item.player.stablePlayerId, item]));
      for (const player of eligible) {
        const shot = shotsById.get(player.stablePlayerId);
        const target = sotById.get(player.stablePlayerId);
        player.projectedShots = shot?.projection ?? null;
        player.projectedShotsOnTarget = target?.projection ?? null;
        player.forecastStatus = Number.isFinite(player.projectedShots) && Number.isFinite(player.projectedShotsOnTarget) ? "produced-champions-minutes-extension" : "not-produced";
        player.reconciliationFactors = shot && target ? {
          shots: round(shot.reconciliationFactor, 8),
          shotsOnTarget: round(target.reconciliationFactor, 8),
          shotsConservation: round(shot.conservationFactor ?? 1, 8),
          shotsOnTargetConservation: round(target.conservationFactor ?? 1, 8)
        } : null;
      }
      for (const player of rows.filter(row => row.venue === side && row.roleKey === "goalkeeper" && Number.isFinite(row.expectedMinutes))) player.forecastStatus = "minutes-estimate-only-metric-ineligible";
      for (const player of rows.filter(row => row.venue === side && new Set(["starter", "potential-substitute"]).has(row.lineupStatus) && !Number.isFinite(row.expectedMinutes))) player.forecastStatus = "not-evaluable";
      const projectedShots = round(eligible.reduce((sum, player) => sum + (player.projectedShots || 0), 0), 2);
      const projectedSot = round(eligible.reduce((sum, player) => sum + (player.projectedShotsOnTarget || 0), 0), 2);
      reconciliations.push({
        side,
        team: side === "home" ? fixture.homeTeam : fixture.awayTeam,
        teamId: eligible[0]?.teamId || null,
        players: eligible.length,
        shots: { target: teamProjection?.shotsTotal?.central ?? null, allocated: projectedShots, delta: Number.isFinite(teamProjection?.shotsTotal?.central) ? round(projectedShots - teamProjection.shotsTotal.central, 2) : null },
        shotsOnTarget: { target: teamProjection?.shotsOnTarget?.central ?? null, allocated: projectedSot, delta: Number.isFinite(teamProjection?.shotsOnTarget?.central) ? round(projectedSot - teamProjection.shotsOnTarget.central, 2) : null }
      });
    }

    const snapshotUniverse = rows.filter(player => new Set(["starter", "potential-substitute"]).has(player.lineupStatus));
    const evaluable = snapshotUniverse.filter(player => player.minutesEstimate?.status === "evaluable");
    const outfieldEvaluable = evaluable.filter(player => player.roleKey !== "goalkeeper");
    const nonEvaluable = snapshotUniverse.filter(player => player.minutesEstimate?.status === "not-evaluable");
    return {
      ...fixture,
      players: rows,
      teamMinutes,
      volumeReconciliation: reconciliations,
      coverage: {
        ...fixture.coverage,
        snapshotUniversePlayers: snapshotUniverse.length,
        evaluableExpectedMinutes: evaluable.length,
        nonEvaluablePlayers: nonEvaluable.length,
        startersWithExpectedMinutes: rows.filter(player => player.lineupStatus === "starter" && Number.isFinite(player.expectedMinutes)).length,
        startersWithForecast: rows.filter(player => player.lineupStatus === "starter" && player.forecastStatus === "produced-champions-minutes-extension").length,
        potentialSubstitutesWithExpectedMinutes: rows.filter(player => player.lineupStatus === "potential-substitute" && Number.isFinite(player.expectedMinutes)).length,
        potentialSubstitutesWithForecast: rows.filter(player => player.lineupStatus === "potential-substitute" && player.forecastStatus === "produced-champions-minutes-extension").length,
        forecastEligiblePlayers: outfieldEvaluable.length,
        completeForecastRows: outfieldEvaluable.filter(player => player.forecastStatus === "produced-champions-minutes-extension").length,
        blockedPotentialSubstitutes: nonEvaluable.filter(player => player.lineupStatus === "potential-substitute").length,
        completeForCurrentModelEligibility: outfieldEvaluable.every(player => player.forecastStatus === "produced-champions-minutes-extension"),
        allEvaluableForecastsProduced: outfieldEvaluable.every(player => player.forecastStatus === "produced-champions-minutes-extension"),
        allSnapshotPlayersClassified: snapshotUniverse.every(player => new Set(["evaluable", "not-evaluable"]).has(player.minutesEstimate?.status)),
        completeForSnapshotUniverse: outfieldEvaluable.every(player => player.forecastStatus === "produced-champions-minutes-extension") && snapshotUniverse.every(player => new Set(["evaluable", "not-evaluable"]).has(player.minutesEstimate?.status))
      }
    };
  });

  const allPlayers = fixtures.flatMap(fixture => fixture.players);
  const snapshotUniverse = allPlayers.filter(player => new Set(["starter", "potential-substitute"]).has(player.lineupStatus));
  const evidenceFingerprint = fixtures.flatMap(fixture => fixture.players.filter(player => player.minutesEstimate?.sample).map(player => ({ fixtureId: fixture.fixtureId, stablePlayerId: player.stablePlayerId, expectedMinutes: player.expectedMinutes, sample: player.minutesEstimate.sample })));
  return {
    ...baseCandidate,
    schemaVersion: 2,
    kind: "champions-full-player-forecast-candidate-with-substitute-minutes",
    model: {
      ...baseCandidate.model,
      id: "champions-player-volume-with-data-driven-substitute-minutes",
      version: `${baseCandidate.model.version}-${sha256(fs.readFileSync(__filename)).slice(0, 12)}`,
      formulaChanged: "champions-only-minutes-exposure-extension; player per-90 and team-volume reconciliation unchanged",
      expectedMinutesPolicy: POLICY,
      probabilityPolicy: baseCandidate.model.probabilityPolicy
    },
    dataVersion: {
      ...baseCandidate.dataVersion,
      [statsPath]: sha256(fs.readFileSync(path.join(root, statsPath))),
      [predictionsPath]: sha256(fs.readFileSync(path.join(root, predictionsPath))),
      [sourceConfigPath]: sha256(fs.readFileSync(path.join(root, sourceConfigPath))),
      "selected-chronological-minute-evidence": sha256(JSON.stringify(evidenceFingerprint))
    },
    availabilityData: {
      status: "not-integrated-no-timestamped-player-availability-feed-in-current-champions-inputs",
      policy: "No absence or availability assumption is converted into minutes without timestamped documentary evidence."
    },
    summary: {
      ...baseCandidate.summary,
      snapshotUniversePlayers: snapshotUniverse.length,
      starters: allPlayers.filter(player => player.lineupStatus === "starter").length,
      startersWithExpectedMinutes: allPlayers.filter(player => player.lineupStatus === "starter" && Number.isFinite(player.expectedMinutes)).length,
      startersWithForecast: allPlayers.filter(player => player.lineupStatus === "starter" && player.forecastStatus === "produced-champions-minutes-extension").length,
      potentialSubstitutes: allPlayers.filter(player => player.lineupStatus === "potential-substitute").length,
      potentialSubstitutesWithExpectedMinutes: allPlayers.filter(player => player.lineupStatus === "potential-substitute" && Number.isFinite(player.expectedMinutes)).length,
      potentialSubstitutesWithForecast: allPlayers.filter(player => player.lineupStatus === "potential-substitute" && player.forecastStatus === "produced-champions-minutes-extension").length,
      nonEvaluablePlayers: snapshotUniverse.filter(player => player.minutesEstimate?.status === "not-evaluable").length,
      forecastEligiblePlayers: allPlayers.filter(player => player.roleKey !== "goalkeeper" && player.minutesEstimate?.status === "evaluable").length,
      completeForecastRows: allPlayers.filter(player => player.forecastStatus === "produced-champions-minutes-extension").length,
      completeForSnapshotUniverse: fixtures.every(fixture => fixture.coverage.completeForSnapshotUniverse),
      eventProbabilitiesProduced: allPlayers.filter(player => player.eventProbabilities !== null).length
    },
    fixtures
  };
}

module.exports = {
  POLICY,
  buildSubstituteForecastCandidate,
  chronologicalEvidence,
  collectRosterEvidence,
  estimateExpectedMinutes,
  playedMinutes,
  conserveTeamVolume
};
