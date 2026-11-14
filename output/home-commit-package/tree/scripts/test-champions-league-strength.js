"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  MIN_RATED_CLUBS,
  ASSOCIATION_LEAGUES,
  buildLeagueStrengthDataset,
  resolveOpponentStrength
} = require("./champions/league-strength");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex").toUpperCase();
const dataset = read("data/analysis/champions/league-strength-2026-10-03.json");
const diagnostic = read("data/analysis/champions/aek-league-strength-consolidation-2026-10-03.json");
const control = read("data/analysis/champions/aek-context-control-2026-10-04.json");
const buildInputs = {
  history: read("data/normalized/uefa-europe-history-2023-26.json"),
  model: read("data/normalized/uefa-1x2-model-2026-27.json"),
  championsStrength: read("data/normalized/champions-team-strength-2026-27.json"),
  championsTeamMap: read("data/sources/champions-team-history-map-2026-27.json")
};

assert.equal(dataset.asOf, "2026-10-03");
assert.equal(dataset.method.commonScale, true);
assert.equal(dataset.method.minimumRatedClubs, MIN_RATED_CLUBS);
assert.deepEqual(dataset.method.competitionUpdateWeights, { ucl: 1, uel: 1, uecl: 1 });
assert.equal(dataset.sources[0].observations, 1469);
assert.deepEqual(buildLeagueStrengthDataset({ ...buildInputs, asOf: "2026-10-03" }), dataset, "league-strength build must be deterministic");
assert.ok(dataset.esiCoherence.comparablePairs >= 30);
assert.ok(dataset.esiCoherence.spearmanRankCorrelation > 0, "ESI/Elo direction must agree in aggregate");
assert.match(dataset.esiCoherence.note, /not combined|not.*interchangeable/i);

const requiredAssociations = ["ENG", "ITA", "GER", "ESP", "FRA", "GRE", "NOR"];
for (const association of requiredAssociations) assert.ok(dataset.leagues.some(league => league.association === association), `${association} missing`);
const england = dataset.leagues.find(league => league.association === "ENG");
const greece = dataset.leagues.find(league => league.association === "GRE");
const norway = dataset.leagues.find(league => league.association === "NOR");
const azerbaijan = dataset.leagues.find(league => league.association === "AZE");
assert.equal(england.clubsRated, 12);
assert.equal(england.reliability, "high");
assert.equal(greece.clubsRated, 4);
assert.equal(greece.evidenceStatus, "estimated");
assert.equal(greece.reliability, "low");
assert.equal(norway.clubsRated, 3);
assert.equal(norway.evidenceStatus, "estimated");
assert.equal(azerbaijan.clubsRated, 1);
assert.equal(azerbaijan.leagueStrength, null);
assert.equal(azerbaijan.evidenceStatus, "insufficient_evidence");
assert.equal(azerbaijan.fallback.status, "fallback");
assert.equal(dataset.leagues.every(league => league.coveragePct === null), true, "unknown domestic coverage must not become zero");
assert.equal(dataset.leagues.every(league => /European qualifiers/.test(league.selectionBias)), true);

const direct = resolveOpponentStrength({ directClub: { rating: 1600 }, league: greece, opponent: {} });
assert.equal(direct.evidenceStatus, "direct");
assert.equal(direct.value, 1600);
const leagueFallback = resolveOpponentStrength({ directClub: null, league: greece, opponent: { pointsPerMatch: 2, matches: 5 } });
assert.equal(leagueFallback.evidenceStatus, "fallback");
assert.equal(leagueFallback.value, greece.leagueStrength);
assert.equal(leagueFallback.withinLeagueAdjustmentStatus, "insufficient_calibration");
const neutral = resolveOpponentStrength({ directClub: null, league: azerbaijan, opponent: {} });
assert.equal(neutral.evidenceStatus, "fallback");
assert.equal(neutral.value, dataset.neutralFallback.value);

const associationMetadata = JSON.stringify(ASSOCIATION_LEAGUES);
assert.ok(!/leagueStrength|coefficient|multiplier/i.test(associationMetadata), "league metadata must not contain manual strength coefficients");
assert.throws(() => buildLeagueStrengthDataset({
  ...buildInputs,
  asOf: "2026-05-01"
}), /AS_OF_SNAPSHOT_UNAVAILABLE/);

assert.equal(diagnostic.activation, false);
assert.equal(diagnostic.gate, "CHAMPIONS LEAGUE-STRENGTH GATE = PARTIAL");
assert.equal(diagnostic.after.transferabilityFactor, null);
assert.equal(diagnostic.after.transferabilityStatus, "insufficient_evidence");
assert.equal(diagnostic.chain.length, 5);
assert.match(diagnostic.chain[2], /NOT APPLIED/);
assert.equal(diagnostic.players.every(player => player.difference === 0 && player.status === "unchanged-production-freeze"), true);
assert.equal(diagnostic.teamInvariant.expectedTeamShotsBefore, diagnostic.teamInvariant.expectedTeamShotsAfter);
assert.equal(diagnostic.teamInvariant.expectedTeamSotBefore, diagnostic.teamInvariant.expectedTeamSotAfter);
assert.equal(sha256("data/normalized/champions-player-stats-2025-26.json"), control.protectedInputs.historicalDatasetSha256.toUpperCase());
assert.equal(sha256("scripts/build-champions-pilot-predictions.js"), control.protectedInputs.predictionBuilderSha256.toUpperCase());

console.log("Champions league strength consolidation: OK");
