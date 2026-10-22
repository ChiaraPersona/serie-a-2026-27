"use strict";

// Read-only reuse of the production builder. Its single output is captured in
// memory, and its bookmaker dataset is replaced BEFORE it can be read.
// This report never calls snapshot writers, evaluators, site builders or research.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rel = file => path.relative(root, file).replaceAll("\\", "/");
const walk = directory => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const finite = Number.isFinite;
const fmt = (value, digits = 2) => finite(value) ? value.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "N/D";
const pct = value => finite(value) ? `${fmt(value * 100, 1)}%` : "N/D";
const adj = value => finite(value) ? `${value > 0 ? "+" : ""}${fmt(value)}%` : "N/D";
const yes = value => value === true ? "Sì" : value === false ? "No" : "N/D";
const esc = value => String(value ?? "N/D").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const mdEscape = value => String(value ?? "N/D").replaceAll("|", "\\|").replaceAll("\n", " ");
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
const engine = require("./predictions/engine");
const profileBuilder = require("./build-team-matchup-profiles");
const snapshotCore = require("./predictions/snapshot-core");

const protectedDirectories = ["scripts/predictions", "scripts/research", "data/predictions", "data/analysis", "statistiche-squadra"];
const protectedFiles = [...new Set([
  ...protectedDirectories.flatMap(directory => walk(path.join(root, directory))),
  ...fs.readdirSync(root).filter(name => name.endsWith(".html")).map(name => path.join(root, name)),
  ...walk(path.join(root, "js")),
  ...walk(path.join(root, "data", "sources")),
  ...walk(path.join(root, "data", "normalized")),
  ...walk(path.join(root, "data", "teams")),
  ...walk(path.join(root, "data", "generated")),
  path.join(root, "scripts/build-predictions.js"),
  path.join(root, "scripts/build-team-matchup-profiles.js"),
  path.join(root, "scripts/probable-lineups.js")
])].filter(file => fs.existsSync(file));
const before = Object.fromEntries(protectedFiles.map(file => [rel(file), hash(file)]));
const frozenPath = "data/predictions/snapshots/2026-27/md-06.json";
const frozen = read(frozenPath);
assert.equal(frozen.snapshots.length, 10);
for (const snapshot of frozen.snapshots) assert.deepEqual(snapshotCore.validateSnapshot(snapshot), [], snapshot.matchId);
const frozenByMatch = new Map(frozen.snapshots.map(snapshot => [snapshot.matchId, snapshot]));
const firstKickoff = Math.min(...frozen.snapshots.map(snapshot => snapshotCore.toKickoffUtc({ date: snapshot.kickoff.date, kickoff: snapshot.kickoff.time })));
assert(finite(firstKickoff), "Kickoff MD6 non verificabile");
assert(Date.now() < firstKickoff, "Il report pre-match non può essere ricalcolato dopo il primo kickoff MD6");

const source = read("data/sources/probable-lineups-md6-2026-27.json");
assert.equal(source.matchday, 6);
assert(Date.parse(source.importedAt) < firstKickoff);
const sourceByTeam = new Map(source.teams.map(team => [team.teamId, team]));
assert.equal(sourceByTeam.size, 20);
assert.equal(source.coverage.starters, 220);
for (const team of source.teams) {
  const timestamp = team.updatedAt.match(/^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2}):(\d{2})$/);
  assert(timestamp, `Timestamp editoriale non risolto: ${team.teamId}`);
  const editorialTime = snapshotCore.toKickoffUtc({ date: `${timestamp[3]}-${timestamp[2]}-${timestamp[1]}`, kickoff: `${timestamp[4]}:${timestamp[5]}` });
  assert(editorialTime <= Date.parse(source.importedAt) && editorialTime < firstKickoff);
}
const allMatches = read("data/normalized/matches.json");
const completed = allMatches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday < 6 && match.status === "finished");
assert.equal(completed.length, 50, "Servono tutte le 50 gare MD1–MD5 concluse");
assert(completed.every(match => match.score && match.teamStats && match.playerStats));
const targetMatches = allMatches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday === 6);
assert.equal(targetMatches.length, 10);
assert(targetMatches.every(match => match.status === "scheduled" && match.score == null), "Actual MD6 presenti: interrompere");
// Drop all future results rather than passing a full result dataset to the builder.
const safeMatches = [...completed, ...targetMatches.map(match => ({
  id: match.id, competition: match.competition, season: match.season, matchday: 6,
  homeTeam: match.homeTeam, awayTeam: match.awayTeam, status: "scheduled", score: null,
  date: frozenByMatch.get(match.id).kickoff.date, kickoff: frozenByMatch.get(match.id).kickoff.time,
  timezone: "Europe/Rome", dateStatus: "confirmed", sources: match.sources
}))];
const profileSnapshot = profileBuilder.buildProfiles({ matches: safeMatches, asOfMatchday: 6 });
assert.equal(profileSnapshot.dataCutoff.completedMatchesUsed, 50);
assert.equal(profileSnapshot.dataCutoff.asOfMatchdayExclusive, 6);
const profileByTeam = new Map(profileSnapshot.profiles.map(profile => [profile.teamId, profile]));
assert.equal(profileByTeam.size, 20);
assert(profileSnapshot.profiles.every(profile => profile.dataCutoff.latestMatchdayUsed <= 5 && profile.sampleSize === 5));

const builderPath = path.join(root, "scripts", "build-predictions.js");
const realRequire = createRequire(builderPath);
const capturedInputs = [];
const interceptedReads = [];
let capturedOutput;
const stubOdds = { events: [], retrievedAt: null, sourceUrl: null, provider: null };
const readonlyFs = new Proxy(fs, {
  get(target, property) {
    if (property === "readFileSync") return (file, options) => {
      const relative = rel(path.resolve(String(file)));
      interceptedReads.push(relative);
      let replacement;
      if (relative === "data/normalized/odds/sisal/serie-a.json") replacement = stubOdds;
      if (relative === "data/normalized/matches.json") replacement = safeMatches;
      if (relative === "data/sources/official-lineups-2026-27.json") {
        const value = read(relative);
        replacement = { ...value, fixtures: value.fixtures.filter(fixture => fixture.matchday < 6) };
      }
      if (replacement !== undefined) {
        const content = JSON.stringify(replacement);
        return options ? content : Buffer.from(content);
      }
      return target.readFileSync(file, options);
    };
    if (property === "writeFileSync") return (file, content) => {
      assert.equal(rel(file), "data/generated/prediction-preview-md06-2026-27.json", "Unexpected builder mutation");
      assert.equal(capturedOutput, undefined, "Unexpected second output");
      capturedOutput = JSON.parse(content);
    };
    if (/^(write|append|mkdir|rm|rmdir|unlink|rename|copyFile|truncate|chmod|chown|createWriteStream)/.test(String(property))) return () => { throw new Error(`Read-only adapter: fs.${String(property)} denied`); };
    return target[property];
  }
});
const isolatedRequire = name => {
  assert(!name.includes("research"), "Research modules are prohibited");
  if (name === "fs" || name === "node:fs") return readonlyFs;
  if (name === "./predictions/engine") return { ...engine, predictMatch: input => {
    assert.equal(input.match.matchday, 6);
    assert.equal(input.oddsEvent, undefined);
    assert.equal(input.oddsSourceUrl, null);
    assert.equal(input.myComboConfig, null);
    for (const team of [input.homeTeam, input.awayTeam]) {
      assert.equal(team.probableLineup.status, "probable");
      assert.equal(team.probableLineup.matchday, 6);
      assert.equal(team.probableLineup.players.length, 11);
    }
    capturedInputs.push(input);
    return engine.predictMatch(input);
  } };
  if (name === "./build-team-matchup-profiles") return { ...profileBuilder, buildProfiles: options => profileBuilder.buildProfiles({ ...options, matches: safeMatches }) };
  return realRequire(name);
};
vm.runInNewContext(fs.readFileSync(builderPath, "utf8"), {
  require: isolatedRequire, __dirname: path.dirname(builderPath), __filename: builderPath,
  module: { exports: {} }, exports: {}, console: { log() {} },
  process: { env: { SERIE_A_PREDICTION_PREVIEW_MATCHDAY: "6", SERIE_A_DISABLE_MYCOMBO: "1" } },
  Buffer
}, { filename: builderPath, timeout: 120000 });
assert.equal(capturedInputs.length, 10);
assert.equal(capturedOutput.predictions.length, 10);
assert(!Object.keys(require.cache).some(file => /scripts[\\/]research[\\/]/.test(file)));
const predictions = capturedOutput.predictions;
const inputByMatch = new Map(capturedInputs.map(input => [input.match.id, input]));
const hierarchy = player => player.allocationClass === "primary" ? "PRIMARY" : player.allocationClass === "co-primary" ? "SECOND PRIMARY" : player.allocationClass === "secondary" ? "SECONDARY" : player.allocationClass ? player.allocationClass.toUpperCase() : "N/D";
const dateLabel = value => new Date(value).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "medium", timeStyle: "short" });

const fixtures = predictions.map(prediction => {
  const input = inputByMatch.get(prediction.matchId);
  const match = input.match;
  const rows = prediction.shooters.allPlayers.map(player => {
    const teamSource = sourceByTeam.get(player.teamId);
    const original = teamSource.players.find(entry => entry.lineupStatus === "starter" && entry.playerId === player.playerId);
    assert(original, `Projected player outside latest XI: ${player.teamId}/${player.playerId}`);
    const opponentId = player.teamId === match.homeTeam ? match.awayTeam : match.homeTeam;
    const opponent = profileByTeam.get(opponentId);
    const policy = opponent?.vulnerabilities.positionalShotVulnerability?.[player.teamProfileRole];
    const teamProjection = prediction.teamProjections.find(team => team.teamId === player.teamId);
    const interaction = teamProjection.opponentMatchupInteraction;
    const interactionActive = Boolean(interaction && (Math.abs(interaction.shotsAdjustmentPct || 0) > 0 || Math.abs(interaction.shotsOnTargetAdjustmentPct || 0) > 0));
    for (const [metric, adjustment] of [["shots", "shotsAdjustmentPct"], ["shotsOnTarget", "shotsOnTargetAdjustmentPct"]]) {
      // `active` in metricEvidence diagnoses positive vulnerability only; the
      // existing suppression branch can have status ACTIVE with active=false.
      if (["watch", "unknown", "inactive"].includes(interaction?.metricEvidence?.[metric]?.status)) assert.equal(interaction[adjustment], 0, "WATCH/UNKNOWN/INACTIVE team signal produced an adjustment");
    }
    const warnings = [];
    if (original.probability < 90) warnings.push(`Titolarità editoriale ${original.probability}%: XI incerto; non è un ballottaggio nominativo verificato.`);
    if (player.substitutionRisk === "high") warnings.push(`Minuti incerti: rischio sostituzione high; attesi ${fmt(player.expectedMinutes, 1)}.`);
    if (player.expectedMinutesEvidence?.fallbackUsed) warnings.push("Expected Minutes con fallback/prior di ruolo.");
    if (player.fallbackUsed) warnings.push("Baseline individuale con fallback dichiarato dal motore.");
    if (player.playerMatchesUsed <= 5) warnings.push(`Sample current ridotto: ${player.playerMatchesUsed} gare, ${player.playerMinutesUsed} minuti.`);
    if (player.minutes < 700) warnings.push(`Storico limitato: ${player.minutes} minuti. Nuovo nel campione non significa trasferimento verificato.`);
    if (!player.playerId || !player.role || !player.detailedRole || player.detailedRole === player.role) warnings.push("Identità o ruolo dettagliato assente/generico: nessuna deduzione ulteriore.");
    if (!player.allocationClass) warnings.push("Hierarchy/allocationClass N/D: nessuna categoria primary o secondary viene forzata.");
    if (player.qualifiedOutsider) { assert.equal(player.outsiderQualificationEvidence.qualified, true); assert.deepEqual(player.outsiderQualificationEvidence.exclusionReasons, []); }
    if (player.qualifiedSotOutsider) { assert.equal(player.sotOutsiderQualificationEvidence.qualified, true); assert.deepEqual(player.sotOutsiderQualificationEvidence.exclusionReasons, []); }
    assert(finite(player.expectedMinutes) && player.expectedMinutes >= 0 && player.expectedMinutes <= 90);
    assert(finite(player.projectedShots) && finite(player.projectedShotsOnTarget) && player.projectedShotsOnTarget <= player.projectedShots);
    for (const value of [...Object.values(player.shotProbabilities), ...Object.values(player.shotOnTargetProbabilities)]) assert(finite(value) && value >= 0 && value <= 1);
    assert(player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25);
    assert(player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15);
    if (policy && ["watch", "unknown", "inactive"].includes(policy.status)) {
      assert.equal(player.teamProfileShotsMatchupFactor, 1);
      assert.equal(player.teamProfileShotsOnTargetMatchupFactor, 1);
    }
    return {
      ...player, sourceName: original.sourceName, name: original.sourceName,
      canonicalName: player.name, sourceRole: original.sourceRole, starterProbability: original.probability,
      lineupStatus: "PROBABLE STARTER", opponentId, matchId: match.id,
      hierarchy: hierarchy(player), positionalStatus: (policy?.status || "unknown").toUpperCase(),
      positionalPolicy: policy || null, opponentInteractionActive: interactionActive,
      opponentAdjustmentShotsPct: interaction?.shotsAdjustmentPct ?? null,
      opponentAdjustmentSotPct: interaction?.shotsOnTargetAdjustmentPct ?? null,
      warnings, modelConfidence: null
    };
  });
  assert.equal(rows.length, 20);
  assert.equal(new Set(rows.map(player => `${player.teamId}:${player.playerId}`)).size, 20);
  const top = new Set([...rows].sort((a, b) => b.projectedShots - a.projectedShots).slice(0, 5).map(player => player.playerId));
  for (const player of rows) if (top.has(player.playerId) && player.playerBaselineStability?.level === "low") player.warnings.push("Top 5 expected shots della partita con baseline stability LOW: priorità numerica fragile.");
  const topSot = new Set([...rows].sort((a, b) => b.projectedShotsOnTarget - a.projectedShotsOnTarget).slice(0, 5).map(player => player.playerId));
  for (const player of rows) if (topSot.has(player.playerId) && player.playerSotBaselineStability?.level === "low") player.warnings.push("Top 5 expected SOT della partita con SOT baseline stability LOW: priorità numerica fragile.");
  const teams = prediction.teamProjections.map(projection => {
    const profile = profileByTeam.get(projection.teamId);
    const sourceTeam = sourceByTeam.get(projection.teamId);
    const players = rows.filter(player => player.teamId === projection.teamId);
    const totals = prediction.shooters.teamTotals.find(team => team.teamId === projection.teamId);
    assert(Math.abs(sum(players, "projectedShots") - projection.shotsTotal.central) <= 0.061);
    assert(Math.abs(sum(players, "projectedShotsOnTarget") - projection.shotsOnTarget.central) <= 0.061);
    const gk = sourceTeam.players.find(player => player.lineupStatus === "starter" && player.sourceRole === "P");
    assert(gk);
    return { teamId: projection.teamId, name: sourceTeam.team, opponentId: projection.teamId === match.homeTeam ? match.awayTeam : match.homeTeam,
      formation: sourceTeam.formation, updatedAt: sourceTeam.updatedAt, goalkeeper: gk,
      projection, profile, reconciliation: totals.reconciliation,
      reserveProbabilities: sourceTeam.players.filter(player => player.lineupStatus === "reserve"),
      omittedReserves: source.omittedNonRoster.filter(player => player.teamId === projection.teamId)
    };
  });
  return { matchId: match.id, label: teams.map(team => team.name).join(" – "), date: match.date, kickoff: match.kickoff,
    engineVersion: prediction.engineVersion, playerMarketModelVersion: prediction.playerMarketModelVersion,
    teamMatchupProfileVersion: prediction.teamMatchupProfileVersion, generatedAt: prediction.generatedAt,
    players: rows, teams, dataCutoff: prediction.futureDataDiagnostics.dataCutoff };
}).sort((a, b) => `${a.date} ${a.kickoff}`.localeCompare(`${b.date} ${b.kickoff}`));
const allPlayers = fixtures.flatMap(fixture => fixture.players);
assert.equal(allPlayers.length, 200);
assert(fixtures.every(fixture => fixture.engineVersion === frozenByMatch.get(fixture.matchId).engineVersion && fixture.playerMarketModelVersion === 2));
const labelByMatch = new Map(fixtures.map(fixture => [fixture.matchId, fixture.label]));
const teamName = id => sourceByTeam.get(id)?.team || id;
const rankSpecs = [
  ["expectedShots", "TOP TOTAL SHOTS", player => player.projectedShots, false],
  ["expectedSOT", "TOP SOT", player => player.projectedShotsOnTarget, false],
  ["shots2Plus", "BEST 2+ SHOTS", player => player.shotProbabilities?.over15, true],
  ["shots3Plus", "BEST 3+ SHOTS", player => player.shotProbabilities?.over25, true],
  ["sot1Plus", "BEST 1+ SOT", player => player.shotOnTargetProbabilities?.over05, true],
  ["sot2Plus", "BEST 2+ SOT", player => player.shotOnTargetProbabilities?.over15, true]
];
const ranked = (players, value, count = Infinity) => players.filter(player => finite(value(player))).slice().sort((a, b) => value(b) - value(a) || `${a.teamId}:${a.playerId}`.localeCompare(`${b.teamId}:${b.playerId}`)).slice(0, count);
const qualified = players => players.filter(player => player.qualifiedOutsider || player.qualifiedSotOutsider);
const globalRankings = Object.fromEntries(rankSpecs.map(([key, , value]) => [key, ranked(allPlayers, value, 15).map(player => ({ matchId: player.matchId, teamId: player.teamId, playerId: player.playerId, name: player.name, value: value(player) }))]));

// Descriptive comparison only: do not reconstruct a historical model run.
// The frozen artifact does not preserve a complete, replayable input bundle.
const comparisons = fixtures.map(fixture => {
  const snapshot = frozenByMatch.get(fixture.matchId);
  const oldById = new Map(snapshot.prediction.players.map(player => [`${player.team}:${player.playerId}`, player]));
  const latestById = new Map(fixture.players.map(player => [`${player.teamId}:${player.playerId}`, player]));
  const changes = [];
  for (const player of fixture.players) {
    const old = oldById.get(`${player.teamId}:${player.playerId}`);
    if (!old) { changes.push({ kind: "ENTERED", teamId: player.teamId, playerId: player.playerId, name: player.name }); continue; }
    const differences = {};
    for (const [key, previous, current] of [
      ["expectedMinutes", old.expectedMinutes, player.expectedMinutes], ["expectedShots", old.predictedShots, player.projectedShots],
      ["expectedSOT", old.predictedSOT, player.projectedShotsOnTarget],
      ["hierarchy", old.classification?.allocationClass, player.allocationClass],
      ["outsiderShots", old.outsiderStatus?.shots, player.qualifiedOutsider], ["outsiderSOT", old.outsiderStatus?.sot, player.qualifiedSotOutsider]
    ]) if (previous !== current) differences[key] = { frozen: previous ?? null, latest: current ?? null };
    if (Object.keys(differences).length) changes.push({ kind: "CHANGED", teamId: player.teamId, playerId: player.playerId, name: player.name, differences });
  }
  for (const [key, old] of oldById) if (!latestById.has(key)) changes.push({ kind: "EXITED", teamId: old.team, playerId: old.playerId, name: old.player });
  const teamChanges = fixture.teams.flatMap(team => {
    const old = snapshot.prediction.teamProjections.find(previous => previous.teamId === team.teamId);
    return [["Team shots", old.predictedTeamShots, team.projection.shotsTotal.central], ["Team SOT", old.predictedTeamSOT, team.projection.shotsOnTarget.central]]
      .filter(([, previous, current]) => previous !== current).map(([metric, previous, current]) => ({ teamId: team.teamId, metric, frozen: previous, latest: current }));
  });
  return { matchId: fixture.matchId, frozenGeneratedAt: snapshot.generatedAt, frozenSnapshotId: snapshot.snapshotId, frozenSha256: snapshot.integrity.sha256,
    interpretation: "Differenze osservate con engine e cutoff invariati. XI entrati/usciti verificabili; attribuzione causale esclusiva degli altri delta N/D senza bundle storico completo. Nessun replay frozen.", changes, teamChanges };
});

const audit = {
  title: "MD6 LATEST OPERATIONAL PREDICTION", generatedAt: capturedOutput.generatedAt,
  scope: "Standalone report; no site publication; no prospective snapshot/evaluation writes",
  engineVersion: engine.ENGINE_VERSION, playerMarketModelVersion: engine.PLAYER_MARKET_MODEL_VERSION,
  frozenGeneratedAt: frozen.generatedAt, frozenFile: frozenPath, frozenFileSha256Before: before[frozenPath],
  manifestSha256Before: before["data/predictions/snapshots/manifest.json"],
  firstKickoffUtc: new Date(firstKickoff).toISOString(),
  latestSource: { file: "data/sources/probable-lineups-md6-2026-27.json", sha256: before["data/sources/probable-lineups-md6-2026-27.json"], importedAt: source.importedAt, sourceUrl: source.sourceUrl,
    coverage: source.coverage, updates: source.teams.map(team => ({ teamId: team.teamId, updatedAt: team.updatedAt })) },
  dataCutoff: profileSnapshot.dataCutoff, completedMatchIds: completed.map(match => match.id).sort(),
  preKickoff: true, bookmakerDatasetParsedByBuilder: false, bookmakerInputs: 0, myComboInputs: 0, researchModulesLoaded: 0,
  bookmakerIsolation: "Empty odds dataset substituted before builder read. Existing odds file bytes are hashed solely for preservation checks; no prices parsed or passed to the engine.",
  exactScoreResearchOutputs: 0, actualMD6Used: 0, projectedOutfieldPlayers: 200, probableGoalkeepersWithoutShotProjection: 20,
  capturedBuilderOutput: "memory-only", interceptedReads: [...new Set(interceptedReads)].sort(),
  inputProfileCutoffs: profileSnapshot.profiles.map(profile => ({ teamId: profile.teamId, ...profile.dataCutoff })),
  invariants: { uniqueFixtures: 10, linkedProjectedPlayers: 200, latestXIOnly: true, missingNotZero: true, probabilityBounds: true,
    sotNotAboveShots: true, poissonThresholdsMonotonic: true, teamReconciliationTolerance: 0.061, watchUnknownInactiveRoleFactorsNeutral: true, frozenInternalHashesValid: true },
  comparisonLimit: "No historical full-input replay; numerical deltas are descriptive, not exclusively causal lineup effects.",
  protectedFileHashesBefore: before
};

// One shared document model renders readable Markdown and standalone HTML.
const blocks = [];
const heading = (level, text, id) => blocks.push({ type: "heading", level, text, id });
const paragraph = text => blocks.push({ type: "paragraph", text });
const list = items => { if (items.length) blocks.push({ type: "list", items }); };
const table = (headers, rows, caption) => blocks.push({ type: "table", headers, rows, caption });
const details = (label, content) => blocks.push({ type: "details", label, content });
const playerName = player => `${player.name} (${teamName(player.teamId)})`;
const probabilityCells = player => [pct(player.shotProbabilities?.over05), pct(player.shotProbabilities?.over15), pct(player.shotProbabilities?.over25), pct(player.shotOnTargetProbabilities?.over05), pct(player.shotOnTargetProbabilities?.over15)];
const predictionHeaders = ["Giocatore", "Ruolo / detailed role", "XI / titolarità", "Minuti", "Shots", "SOT", "P1+ shots", "P2+ shots", "P3+ shots", "P1+ SOT", "P2+ SOT", "Hierarchy", "Stability shots / SOT", "Fallback", "Matchup shots / SOT", "Opponent interaction"];
const playerCells = player => [playerName(player), `${player.sourceRole} · ${player.role} / ${player.detailedRole || "N/D"} [${player.teamProfileRole || "N/D"}]`, `PROBABLE · ${fmt(player.starterProbability, 0)}%`, fmt(player.expectedMinutes, 1), fmt(player.projectedShots), fmt(player.projectedShotsOnTarget), ...probabilityCells(player), player.hierarchy,
  `${player.playerBaselineStability?.level ?? "N/D"} (${fmt(player.playerBaselineStability?.score)}) / ${player.playerSotBaselineStability?.level ?? "N/D"} (${fmt(player.playerSotBaselineStability?.score)})`, yes(player.fallbackUsed), `${fmt(player.shotsMatchupFactor, 3)} / ${fmt(player.shotsOnTargetMatchupFactor, 3)}`,
  player.opponentInteractionActive ? `ACTIVE team: shots ${adj(player.opponentAdjustmentShotsPct)}; SOT ${adj(player.opponentAdjustmentSotPct)}` : "Nessun adjustment team attivo"];
const rankTable = (players, spec, count, global = false) => {
  const [key, title, value, probability] = spec;
  const stabilityField = key === "expectedSOT" || key.startsWith("sot") ? "playerSotBaselineStability" : "playerBaselineStability";
  heading(global ? 3 : 4, `${title}${global ? " · Top 15 MD6" : count === 5 ? " · Top 5" : " · tutti i proiettati"}`);
  table(["#", "Giocatore", global ? "Partita" : "Ruolo", probability ? "Probabilità" : "Expected", "Minuti", stabilityField === "playerSotBaselineStability" ? "Stability SOT" : "Stability shots", "Titolarità"], ranked(players, value, count).map((player, index) => [index + 1, playerName(player), global ? labelByMatch.get(player.matchId) : `${player.sourceRole} / ${player.teamProfileRole || "N/D"}`, probability ? pct(value(player)) : fmt(value(player)), fmt(player.expectedMinutes, 1), player[stabilityField]?.level || "N/D", `${fmt(player.starterProbability, 0)}%`]));
};
const outsidersSection = (players, global = false) => {
  const rows = qualified(players);
  heading(global ? 3 : 4, global ? "OUTSIDERS MD6 · gate V2 effettivamente superati" : "HIDDEN OUTSIDERS · qualificati V2");
  paragraph(`${rows.length} giocatori qualificati (unione dei gate shots e SOT). Nessun numero minimo. Il ruolo MF/DF è informativo; nessuna preferenza cambia il ranking del motore.`);
  if (!rows.length) { paragraph("Nessun outsider qualificato dal V2."); return; }
  for (const [market, flag, score, gate] of [["SHOTS", "qualifiedOutsider", "outsiderScore", "outsiderQualificationEvidence"], ["SOT", "qualifiedSotOutsider", "sotOutsiderScore", "sotOutsiderQualificationEvidence"]]) {
    heading(global ? 4 : 5, `Outsider ${market} · ordine per score V2`);
    table(["Giocatore / ruolo", "Score V2", "Confidence / evidence", "Minuti", "Shots", "SOT", "P1+ shots", "P2+ shots", "P3+ shots", "P1+ SOT", "P2+ SOT", "Matchup posizionale shots / SOT"], ranked(rows.filter(player => player[flag] === true), player => player[score]).map(player => [
      `${playerName(player)} · ${player.sourceRole}/${player.teamProfileRole}`, fmt(player[score], 1), `${player[gate]?.confidence ?? "N/D"} / ${fmt(player[gate]?.evidenceScore, 3)}`, fmt(player.expectedMinutes, 1), fmt(player.projectedShots), fmt(player.projectedShotsOnTarget), ...probabilityCells(player), `${player.positionalStatus}: ${adj(player.teamProfileShotBoostPct)} / ${adj(player.teamProfileSotBoostPct)}`
    ]));
  }
  if (!global) for (const player of rows) {
    const gates = [player.qualifiedOutsider ? `shots: score ${fmt(player.outsiderScore, 1)}, P1+ ≥55%, P2+ ≥20%, evidence ≥0,58; confidence ${player.outsiderConfidence}` : null,
      player.qualifiedSotOutsider ? `SOT: score ${fmt(player.sotOutsiderScore, 1)}, P1+ ≥30%, P2+ ≥5%, evidence ≥0,58; confidence ${player.sotOutsiderConfidence}` : null].filter(Boolean).join("; ");
    details(`${player.name}: motivo della qualificazione`, [
      "Ruolo MF/DF e non primary, gate qualità V2 superati senza exclusion reasons.", gates,
      ...(player.allocationEvidence || ["Allocation evidence N/D"]), ...(player.matchupEvidence || ["Matchup evidence N/D"]),
      `Gate shots: ${JSON.stringify(player.outsiderQualificationEvidence)}; gate SOT: ${JSON.stringify(player.sotOutsiderQualificationEvidence)}`
    ]);
  }
};

heading(1, "MD6 LATEST OPERATIONAL PREDICTION", "inizio");
paragraph(`Serie A 2026/27 · 6ª giornata · generato ${dateLabel(capturedOutput.generatedAt)} (Europe/Rome). Prediction Engine ${engine.ENGINE_VERSION}, Player Market V2, Team Profiles V2 AS-OF MD6. Report operativo separato dalla valutazione prospettica.`);
paragraph(`Dati current: tutte le 50 partite MD1–MD5 concluse; 5 gare per squadra. Probabili Fantacalcio importate ${dateLabel(source.importedAt)}; aggiornamento editoriale per squadra indicato sotto. Primo kickoff MD6: ${dateLabel(firstKickoff)}. Formazioni PROBABLE, non ufficiali.`);
paragraph("Le previsioni individuali e le probabilità Poisson sono i valori del motore esistente, senza nuove formule o coefficienti e senza quote bookmaker. M0/M1/M2 non eseguiti; nessun risultato esatto né M2 xG-Poisson nel report. Missing ≠ 0: N/D significa dato non disponibile; modelConfidence non è calcolata dal motore e rimane N/D.");
paragraph("Copertura: 200 giocatori di movimento proiettati, tutti collegati all’XI più recente; 20 portieri conservati nella probabile, con tiri/SOT/minuti/probabilità N/D perché il V2 non li proietta. Le riserve servono soltanto a leggere l’incertezza della probabile; non vengono aggiunte ai mercati individuali.");
paragraph("Guida: shots = tiri totali; SOT = tiri in porta. Expected Minutes e probabilità sono condizionati alla probabile titolarità: la percentuale Fantacalcio non viene moltiplicata per le probabilità del V2. Le classifiche usano i valori serializzati; i segnali WATCH/UNKNOWN/INACTIVE non vengono trasformati in nuovi bonus.");
heading(2, "Indice delle 10 partite", "indice");
table(["Partita", "Data / ora Roma", "Team shots casa / ospite", "Team SOT casa / ospite", "Outsider qualificati"], fixtures.map(fixture => [fixture.label, `${fixture.date} ${fixture.kickoff}`, fixture.teams.map(team => fmt(team.projection.shotsTotal.central)).join(" / "), fixture.teams.map(team => fmt(team.projection.shotsOnTarget.central)).join(" / "), qualified(fixture.players).length]));

for (const fixture of fixtures) {
  heading(2, `${fixture.label} · ${fixture.date} ${fixture.kickoff}`, fixture.matchId);
  heading(3, "TEAM ENVIRONMENT");
  table(["Squadra", "Expected shots", "Expected SOT", "Baseline matchup pre-V2 shots / SOT", "Baseline V2 stabilizzata shots / SOT", "Own adjustment shots / SOT", "Opponent adjustment shots / SOT", "Direction", "Maturity / confidence"], fixture.teams.map(team => {
    const p = team.projection, profile = team.profile;
    return [team.name, fmt(p.shotsTotal.central), fmt(p.shotsOnTarget.central), `${fmt(p.legacyVolumeProjection?.shotsTotal.central)} / ${fmt(p.legacyVolumeProjection?.shotsOnTarget.central)}`, `${fmt(profile.offense?.teamShotVolume.shrunkPerGame)} / ${fmt(profile.offense?.teamSotVolume.shrunkPerGame)}`, `${adj(p.ownOffensiveInteraction?.shotsAdjustmentPct)} / ${adj(p.ownOffensiveInteraction?.shotsOnTargetAdjustmentPct)}`, `${adj(p.opponentMatchupInteraction?.shotsAdjustmentPct)} / ${adj(p.opponentMatchupInteraction?.shotsOnTargetAdjustmentPct)}`, p.opponentMatchupInteraction?.direction ?? "N/D", `${fmt(profile.confidence?.maturityWeight)} / ${profile.confidence?.overall ?? "N/D"} · n=${profile.sampleSize}`];
  }));
  paragraph("Baseline matchup pre-V2 = volume già costruito dal modello storico per sede/avversario/forma, prima delle interazioni V2. Baseline V2 stabilizzata = volume offensivo del Team Profile; non è il target finale. Own e opponent adjustment sono applicazioni distinte, serializzate dal motore; il secondo riguarda la squadra che riceve la correzione.");
  for (const team of fixture.teams) {
    const p = team.projection, profile = team.profile;
    heading(4, `${team.name} · ${team.formation} · fonte ${team.updatedAt}`);
    table(["Baseline offensiva", "Storico", "Current grezzo", "Current robust", "Stabilizzata", "Peso storico / current", "Persistenza"], [["Shots", profile.offense?.teamShotVolume], ["SOT", profile.offense?.teamSotVolume]].map(([metric, signal]) => [metric, fmt(signal?.historicalPerGame), fmt(signal?.current?.mean), fmt(signal?.robustCurrentPerGame), fmt(signal?.shrunkPerGame), `${pct(signal?.shrinkage?.historicalWeight)} / ${pct(signal?.shrinkage?.currentWeight)}`, signal?.signalPersistence?.level || "N/D"]));
    table(["Reconciliation", "Somma pre", "Target squadra", "Somma post", "Scaling", "Modalità"], [["Shots", team.reconciliation.shots], ["SOT", team.reconciliation.shotsOnTarget]].map(([metric, value]) => [metric, fmt(value.preReconciliation, 3), fmt(value.teamTarget), fmt(value.postReconciliation), fmt(value.teamScaling, 4), value.allocationMode]));
    paragraph(`Confidence: ${profile.confidence.reason}. Somme post arrotondamento possono differire dal target di pochi centesimi; non correggiamo i valori del motore.`);
    details("Evidenza ambiente / adjustment", [
      `Baseline shots inputs: ${JSON.stringify(p.shotsTotal.inputs)}`, `Baseline SOT inputs: ${JSON.stringify(p.shotsOnTarget.inputs)}`,
      `Own offensive interaction: ${JSON.stringify(p.ownOffensiveInteraction)}`, `Opponent interaction: ${JSON.stringify(p.opponentMatchupInteraction)}`,
      `Dati non disponibili nel profilo: ${(profile.dataQuality.missing || []).join("; ") || "N/D"}`
    ]);
  }
  heading(3, "PLAYER PREDICTIONS");
  table(predictionHeaders, fixture.players.map(playerCells));
  paragraph(`Portieri nell’XI: ${fixture.teams.map(team => `${team.goalkeeper.sourceName} (${team.name}, ${team.goalkeeper.probability}% titolarità)`).join("; ")}. Ruolo P; detailed role / Expected Minutes / shots / SOT / probabilità / hierarchy = N/D, non proiettati dal motore tiri.`);
  for (const player of fixture.players) details(`${playerName(player)} · ${fmt(player.projectedShots)} shots · ${fmt(player.projectedShotsOnTarget)} SOT · ${fmt(player.expectedMinutes, 1)} minuti`, [
    `Nome canonico: ${player.canonicalName}; playerId: ${player.playerId}; PROBABLE STARTER (${player.starterProbability}%).`,
    `Probabilità Poisson: P1+ shots ${pct(player.shotProbabilities?.over05)}, P2+ shots ${pct(player.shotProbabilities?.over15)}, P3+ shots ${pct(player.shotProbabilities?.over25)}; P1+ SOT ${pct(player.shotOnTargetProbabilities?.over05)}, P2+ SOT ${pct(player.shotOnTargetProbabilities?.over15)}. Hierarchy ${player.hierarchy}; fallback ${yes(player.fallbackUsed)}.`,
    `Baseline shots /90 ${fmt(player.baselineShots90)} → stabilizzata ${fmt(player.stabilizedShots90)}; SOT /90 ${fmt(player.baselineShotsOnTarget90)} → stabilizzata ${fmt(player.stabilizedShotsOnTarget90)}.`,
    `Minuti ${fmt(player.expectedMinutes, 1)}; minutesFactor ${fmt(player.minutesFactor, 3)}; substitutionRisk ${player.substitutionRisk}; replacement ${player.likelyReplacement || "N/D"}. ${JSON.stringify(player.expectedMinutesEvidence)}`,
    `Scaling/reconciliation shots ${fmt(player.projectedShotsTeamScaling, 3)}; SOT ${fmt(player.projectedShotsOnTargetTeamScaling, 3)}; allocation factors shots ${fmt(player.playerAllocationFactor, 3)}, SOT ${fmt(player.playerSotAllocationFactor, 3)}. Baseline V2 pre allocazione ${fmt(player.projectedShotsV2Base)} shots / ${fmt(player.projectedShotsOnTargetV2Base)} SOT.`,
    `Matchup generico ${fmt(player.genericMatchupFactor, 3)}; specifico V2 shots ${fmt(player.teamProfileShotsMatchupFactor, 4)}, SOT ${fmt(player.teamProfileShotsOnTargetMatchupFactor, 4)}; ruolo ${player.teamProfileRole}: ${player.positionalStatus}; confidence ${player.teamProfileConfidence ?? "N/D"}.`,
    `Opponent team adjustment shots ${adj(player.opponentAdjustmentShotsPct)}, SOT ${adj(player.opponentAdjustmentSotPct)}; applicato ${yes(player.opponentInteractionActive)}. Effetto individuale controfattuale post-reconciliation: N/D, non serializzato.`,
    `Baseline shots: ${JSON.stringify(player.playerBaselineStability)}; baseline SOT: ${JSON.stringify(player.playerSotBaselineStability)}; modelConfidence N/D.`,
    ...(player.allocationEvidence || ["Allocation evidence N/D"]), ...(player.matchupEvidence || ["Matchup evidence N/D"])
  ]);
  heading(3, "PRIMARY SHOOTERS");
  table(["Squadra", "PRIMARY", "SECOND PRIMARY", "SECONDARY", "Altre classi V2"], fixture.teams.map(team => {
    const players = fixture.players.filter(player => player.teamId === team.teamId);
    const names = filter => ranked(players.filter(filter), player => player.projectedShots).map(player => `${player.name} (${fmt(player.projectedShots)} shots; ${fmt(player.projectedShotsOnTarget)} SOT)`).join("; ") || "Nessuno supportato";
    return [team.name, names(player => player.allocationClass === "primary"), names(player => player.allocationClass === "co-primary"), names(player => player.allocationClass === "secondary"), names(player => !["primary", "co-primary", "secondary"].includes(player.allocationClass))];
  }));
  paragraph("Hierarchy ripresa da allocationClass del motore: co-primary è mostrato come SECOND PRIMARY. Outsider è una qualifica separata e non sovrascrive la hierarchy. Occasional/low-volume restano nelle loro classi; se allocationClass manca, la hierarchy resta N/D anche per un giocatore ad alto volume.");
  heading(3, "MATCHUP");
  paragraph("ACTIVE è lo stato del segnale; il bonus quantitativo applicato va letto separatamente. Anche un ruolo ACTIVE può avere +0% se la baseline non supera i gate o il livello è neutro. Il matchup generico storico resta una componente distinta e può essere diverso da 1 anche con profilo posizionale WATCH.");
  for (const team of fixture.teams) {
    const opponent = profileByTeam.get(team.opponentId);
    heading(4, `${team.name} contro ${teamName(team.opponentId)}`);
    table(["Segnale avversario", "Stato", "Livello", "Confidence", "Effetto dichiarato"], Object.entries(opponent.vulnerabilities.signals).map(([key, signal]) => [key, (signal.status || "unknown").toUpperCase(), signal.level || "N/D", signal.confidence || "N/D", signal.modelEffect || "N/D"]));
    for (const status of ["ACTIVE", "WATCH", "UNKNOWN", "INACTIVE"]) {
      const players = fixture.players.filter(player => player.teamId === team.teamId && player.positionalStatus === status);
      paragraph(`${status} posizionale: ${players.length ? players.map(player => `${player.name} [${player.teamProfileRole}]: shots ${adj(player.teamProfileShotBoostPct)}, SOT ${adj(player.teamProfileSotBoostPct)}`).join("; ") : "nessun giocatore"}.`);
    }
    const receiving = team.projection.opponentMatchupInteraction;
    paragraph(`Interazione di volume ricevuta da ${team.name}: shots ${adj(receiving?.shotsAdjustmentPct)}, SOT ${adj(receiving?.shotsOnTargetAdjustmentPct)} (${receiving?.direction || "N/D"}); stability shots ${fmt(receiving?.signalStability?.shots)}, SOT ${fmt(receiving?.signalStability?.shotsOnTarget)}. Il volume viene riconciliato su tutti i proiettati: nessun uplift individuale controfattuale disponibile.`);
  }
  const beneficiaries = fixture.players.filter(player => player.positionalStatus === "ACTIVE" && (player.teamProfileShotBoostPct > 0 || player.teamProfileSotBoostPct > 0));
  paragraph(beneficiaries.length ? `Beneficiari posizionali effettivi: ${beneficiaries.map(player => `${playerName(player)}: shots ${adj(player.teamProfileShotBoostPct)}, SOT ${adj(player.teamProfileSotBoostPct)}; ${player.matchupEvidence.filter(item => item.startsWith("profilo ")).join("; ")}`).join(". ")}.` : "Nessun bonus posizionale individuale positivo applicato; nessun beneficiario specifico viene forzato.");
  heading(3, "WARNINGS");
  paragraph("Formazioni non ufficiali. Il sample current è di sole cinque giornate: gli adjustment già regolarizzati non equivalgono a una validazione prospettica. Le percentuali basse indicano incertezza editoriale; le alternative non vengono accoppiate in ballottaggi non verificati.");
  table(["Giocatore", "Avvertenze"], fixture.players.map(player => [playerName(player), player.warnings.join(" ") || "Nessun warning individuale aggiuntivo"]));
  for (const team of fixture.teams) {
    details(`${team.name}: riserve e probabilità della fonte`, [
      team.reserveProbabilities.map(player => `${player.sourceName}: ${player.probability}%`).join("; "),
      `Riserve fuori rosa/listone conservate dalla fonte, non proiettate: ${team.omittedReserves.map(player => `${player.sourceName}: ${player.probability}%`).join("; ") || "nessuna"}`
    ]);
  }
  heading(3, "RANKING FINALE PER PARTITA");
  for (const spec of rankSpecs) rankTable(fixture.players, spec, ["expectedShots", "expectedSOT"].includes(spec[0]) ? 5 : Infinity);
  outsidersSection(fixture.players);
}

heading(2, "RIEPILOGO GLOBALE MD6", "globale");
for (const spec of rankSpecs) rankTable(allPlayers, spec, 15, true);
outsidersSection(allPlayers, true);
const allTeams = fixtures.flatMap(fixture => fixture.teams.map(team => ({ ...team, matchId: fixture.matchId })));
for (const [title, metric] of [["Squadre · expected team shots", "shotsTotal"], ["Squadre · expected team SOT", "shotsOnTarget"]]) {
  heading(3, title);
  table(["#", "Squadra", "Partita", "Expected", "Baseline pre-V2", "Opponent adjustment", "Confidence"], allTeams.slice().sort((a, b) => b.projection[metric].central - a.projection[metric].central).map((team, index) => [index + 1, team.name, labelByMatch.get(team.matchId), fmt(team.projection[metric].central), fmt(team.projection.legacyVolumeProjection?.[metric].central), adj(team.projection.opponentMatchupInteraction?.[metric === "shotsTotal" ? "shotsAdjustmentPct" : "shotsOnTargetAdjustmentPct"]), team.profile.confidence.overall]));
}
heading(3, "Matchup individuali quantitativi più forti");
paragraph("Classifiche separate per bonus posizionale shots e SOT già applicati dal V2; nessuna combinazione artificiale degli score. Sono percentuali prima della reconciliation, non delta individuali causali in tiri. Sono esclusi WATCH/UNKNOWN/INACTIVE e bonus zero.");
for (const [metric, field] of [["SHOTS", "teamProfileShotBoostPct"], ["SOT", "teamProfileSotBoostPct"]]) {
  heading(4, `Bonus posizionali ACTIVE · ${metric}`);
  const players = ranked(allPlayers.filter(player => player.positionalStatus === "ACTIVE" && player[field] > 0), player => player[field]);
  if (!players.length) paragraph("Nessun bonus quantitativo positivo disponibile.");
  else table(["Giocatore", "Avversario", "Ruolo", "Bonus applicato", "Confidence", "Shots", "SOT"], players.map(player => [playerName(player), teamName(player.opponentId), player.teamProfileRole, adj(player[field]), player.teamProfileConfidence, fmt(player.projectedShots), fmt(player.projectedShotsOnTarget)]));
}
heading(2, "FROZEN MD6 vs LATEST OPERATIONAL MD6", "confronto");
paragraph(`Frozen: ${dateLabel(frozen.generatedAt)}; operational: ${dateLabel(capturedOutput.generatedAt)}. Engine/versioni e cutoff MD<6 invariati. Nessuna scrittura nello snapshot, manifest o valutazione. Il confronto elenca solo campi cambiati e ingressi/uscite dai proiettati.`);
paragraph("Limite di attribuzione: lo snapshot conserva previsioni e component trace, ma non l’intero bundle storico di input (XI completo, formazione e tutte le fonti con hash). Gli ingressi/uscite sono verificabili; gli altri delta sono differenze osservate e non vengono dichiarati causati esclusivamente dalla nuova probabile. Non ricostruiamo una previsione storica usando dati correnti.");
for (const comparison of comparisons) {
  heading(3, labelByMatch.get(comparison.matchId));
  if (!comparison.changes.length && !comparison.teamChanges.length) { paragraph("Nessuna variazione nei campi confrontabili."); continue; }
  table(["Giocatore", "Variazione", "Frozen → operational"], comparison.changes.map(change => [
    `${change.name} (${teamName(change.teamId)})`, change.kind === "ENTERED" ? "Entrato nella probabile proiettata" : change.kind === "EXITED" ? "Uscito dalla probabile proiettata" : "Campi modificati",
    change.differences ? Object.entries(change.differences).map(([field, values]) => `${field}: ${typeof values.frozen === "number" ? fmt(values.frozen) : values.frozen ?? "N/D"} → ${typeof values.latest === "number" ? fmt(values.latest) : values.latest ?? "N/D"}`).join("; ") : change.kind === "ENTERED" ? "Assente → presente" : "Presente → assente"
  ]));
  if (comparison.teamChanges.length) table(["Squadra", "Target", "Frozen", "Operational", "Delta"], comparison.teamChanges.map(change => [teamName(change.teamId), change.metric, fmt(change.frozen), fmt(change.latest), finite(change.frozen) && finite(change.latest) ? fmt(change.latest - change.frozen) : "N/D"]));
}
heading(2, "Integrità e fonti", "integrita");
paragraph(`Fonte probabili: ${source.sourceUrl}. Dati current canonici MD1–MD5, Team Profiles V2 AS-OF MD6 e baseline storiche già previste dal motore. File fonte: data/sources/probable-lineups-md6-2026-27.json. Non è stato effettuato un nuovo fetch dopo l’import fornito.`);
paragraph(`Snapshot frozen SHA-256: ${before[frozenPath]}. Manifest SHA-256: ${before["data/predictions/snapshots/manifest.json"]}. Tutti i ${protectedFiles.length} file preesistenti protetti sono verificati byte per byte dopo il calcolo e la scrittura del report. I 10 hash interni frozen sono validi.`);
paragraph("L’audit allegato registra cutoff, ID delle 50 gare, hash degli input, isolamento delle quote, vincoli di probabilità/SOT, neutralità dei segnali non attivi e reconciliation. JSON operativo contiene soltanto volumi, giocatori, profili, confronto e ranking; non contiene exact scores o output M0/M1/M2.");
paragraph("MD6 OPERATIONAL PREDICTION READY");

const markdown = blocks.map(block => {
  if (block.type === "heading") return `${"#".repeat(block.level)} ${block.text}\n`;
  if (block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.map(item => `- ${item}`).join("\n");
  if (block.type === "details") return `<details>\n<summary>${esc(block.label)}</summary>\n\n${block.content.map(item => `- ${mdEscape(item)}`).join("\n")}\n\n</details>`;
  return [block.caption || "", `| ${block.headers.map(mdEscape).join(" | ")} |`, `| ${block.headers.map(() => "---").join(" | ")} |`, ...block.rows.map(row => `| ${row.map(mdEscape).join(" | ")} |`)].filter(Boolean).join("\n");
}).join("\n\n");
const htmlBlocks = blocks.map(block => {
  if (block.type === "heading") return `<h${Math.min(block.level, 5)}${block.id ? ` id="${esc(block.id)}"` : ""}>${esc(block.text)}</h${Math.min(block.level, 5)}>`;
  if (block.type === "paragraph") return `<p>${esc(block.text)}</p>`;
  if (block.type === "list") return `<ul>${block.items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  if (block.type === "details") return `<details><summary>${esc(block.label)}</summary><ul>${block.content.map(item => `<li>${esc(item)}</li>`).join("")}</ul></details>`;
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(block.headers.join(", "))}"><table>${block.caption ? `<caption>${esc(block.caption)}</caption>` : ""}<thead><tr>${block.headers.map(cell => `<th scope="col">${esc(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows.map(row => `<tr>${row.map((cell, index) => {
    const fixture = index === 0 && block.headers[0] === "Partita" ? fixtures.find(fixture => fixture.label === cell) : null;
    return `<td>${fixture ? `<a href="#${esc(fixture.matchId)}">${esc(cell)}</a>` : esc(cell)}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`;
}).join("\n");
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MD6 LATEST OPERATIONAL PREDICTION</title><style>
:root{color-scheme:light;--ink:#17283d;--muted:#52677e;--line:#d6dfeb;--accent:#174b8c}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:95px}body{margin:0;background:#f2f5fa;color:var(--ink);font:15px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}nav{position:sticky;top:0;z-index:2;background:#102e51;color:white;padding:12px 22px;display:flex;gap:18px;align-items:center;overflow:auto;white-space:nowrap}nav a{color:white;text-decoration:none;font-size:14px}main{max-width:1440px;margin:26px auto;padding:30px;background:white;border:1px solid var(--line);border-radius:14px}h1{font-size:clamp(25px,3vw,38px);line-height:1.2;color:#123c6b;margin:0 0 22px}h2{font-size:26px;border-top:3px solid #174b8c;padding-top:30px;margin-top:50px}h3{font-size:20px;margin-top:30px;color:var(--accent)}h4{font-size:17px;margin-top:25px}h5{font-size:15px}p{max-width:112ch;overflow-wrap:anywhere}.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px;margin:16px 0 22px;max-width:100%}table{width:100%;border-collapse:collapse;font-size:13px;text-align:left}th{background:#e9f0fa;color:#173c67;font-weight:700;white-space:nowrap}th,td{padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;min-width:80px}td:first-child{font-weight:600;min-width:160px}tr:nth-child(even){background:#f7f9fc}tbody tr:hover{background:#eaf2ff}details{margin:10px 0;border:1px solid var(--line);border-radius:8px;padding:10px 14px;background:#f8fafc;font-size:13px;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:650;color:#28577d}li{margin:8px 0}footer{padding:28px;text-align:center;color:var(--muted)}@media(max-width:600px){main{margin:10px;padding:18px 14px;border-radius:10px}nav{padding:12px 14px;gap:16px}h2{font-size:23px}body{font-size:14px}th,td{padding:8px 10px}}@media print{nav{display:none}main{max-width:none;border:0;padding:0;margin:0}.table-wrap{overflow:visible}table{font-size:8px}th,td{min-width:0;padding:4px}details{display:block}h2{break-before:page}}
</style></head><body><nav aria-label="Navigazione report"><a href="#inizio">MD6 · Operational</a><a href="#indice">Indice</a><a href="#globale">Top 15 MD6</a><a href="#confronto">Frozen vs latest</a><a href="#integrita">Integrità</a></nav><main>${htmlBlocks}</main><footer>Report locale separato · Prediction Engine V2 invariato · Nessuna pubblicazione</footer></body></html>`;
const outputDirectory = path.join(root, "output", "reports");
fs.mkdirSync(outputDirectory, { recursive: true });
const prefix = path.join(outputDirectory, "md6-latest-operational-2026-10-03");
fs.writeFileSync(`${prefix}.html`, html, "utf8");
fs.writeFileSync(`${prefix}.md`, `${markdown}\n`, "utf8");
fs.writeFileSync(`${prefix}.json`, `${JSON.stringify({ title: audit.title, generatedAt: audit.generatedAt, engineVersion: audit.engineVersion, source: audit.latestSource, dataCutoff: audit.dataCutoff, fixtures, globalRankings, comparisons }, null, 2)}\n`);
const after = Object.fromEntries(protectedFiles.map(file => [rel(file), hash(file)]));
assert.deepEqual(after, before, "Protected existing file changed");
for (const snapshot of read(frozenPath).snapshots) assert.deepEqual(snapshotCore.validateSnapshot(snapshot), []);
audit.protectedFileHashesAfter = after;
audit.protectedFilesUnchanged = protectedFiles.length;
audit.frozenFileSha256After = after[frozenPath];
audit.manifestSha256After = after["data/predictions/snapshots/manifest.json"];
audit.validation = "PASS";
fs.writeFileSync(`${prefix}-audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: "MD6 OPERATIONAL PREDICTION READY", report: `${prefix}.html`, matches: fixtures.length, players: allPlayers.length,
  outsidersShots: allPlayers.filter(player => player.qualifiedOutsider).length, outsidersSOT: allPlayers.filter(player => player.qualifiedSotOutsider).length,
  protectedFilesUnchanged: protectedFiles.length, frozenSha256: audit.frozenFileSha256After, changes: comparisons.reduce((total, row) => total + row.changes.length, 0), validation: audit.validation }, null, 2));
