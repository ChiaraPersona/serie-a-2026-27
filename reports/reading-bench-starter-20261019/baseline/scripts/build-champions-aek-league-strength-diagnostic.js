"use strict";

const fs = require("fs");
const path = require("path");
const { resolveOpponentStrength, round } = require("./champions/league-strength");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const asOf = process.argv.includes("--as-of") ? process.argv[process.argv.indexOf("--as-of") + 1] : null;
if (!asOf) throw new Error("Uso: node scripts/build-champions-aek-league-strength-diagnostic.js --as-of YYYY-MM-DD");

const before = read("data/analysis/champions/aek-context-adjusted-md02-2026-10-04.json");
const control = read("data/analysis/champions/aek-context-control-2026-10-04.json");
const leagueDatasetPath = `data/analysis/champions/league-strength-${asOf}.json`;
const leagueDataset = read(leagueDatasetPath);
if (before.asOf !== asOf || leagueDataset.asOf !== asOf) throw new Error(`As-of mismatch: ${before.asOf}, ${leagueDataset.asOf}, ${asOf}`);
if (before.fixture.fixtureId !== control.fixture.fixtureId) throw new Error("CONTROL fixture mismatch");

const greekLeague = leagueDataset.leagues.find(league => league.association === "GRE");
if (!greekLeague) throw new Error("Greek league evidence missing");
const opponentRows = before.strengthOfSchedule.individualEvidenceOpponents.map(opponent => ({
  eventId: opponent.eventId,
  date: opponent.date,
  team: opponent.team,
  ...resolveOpponentStrength({ opponent, league: greekLeague, directClub: null })
}));
const opponentValues = opponentRows.map(item => item.value).filter(Number.isFinite);
const averageOpponentStrength = opponentValues.length ? opponentValues.reduce((sum, value) => sum + value, 0) / opponentValues.length : null;
const watchedIds = ["luka-jovic", "barnabas-varga", "aboubakary-koita", "zini"];
const players = watchedIds.map(playerId => {
  const player = before.players.find(item => item.playerId === playerId);
  if (!player) throw new Error(`Missing AEK player ${playerId}`);
  return {
    playerId,
    player: player.player,
    beforeBlendedShotsPer90: round(player.blendedShotsPer90, 6),
    afterBlendedShotsPer90: round(player.blendedShotsPer90, 6),
    difference: 0,
    status: "unchanged-production-freeze",
    reason: "No calibrated UEFA-Elo-to-shots transfer function is available."
  };
});

const output = {
  schemaVersion: 1,
  status: "diagnostic-only-partial",
  asOf,
  fixture: before.fixture,
  activation: false,
  gate: "CHAMPIONS LEAGUE-STRENGTH GATE = PARTIAL",
  reason: "The repository supports a common inter-league Elo scale and explicit league fallbacks, but not a validated conversion from Elo gaps to player shot-rate multipliers.",
  chain: [
    "league level: association median UEFA Elo",
    "past opponent strength: direct club Elo else explicit league/neutral fallback",
    "current evidence adjustment: NOT APPLIED pending calibration",
    "blended player baseline: frozen from prior AEK pilot",
    "future matchup: frozen team model only"
  ],
  before: {
    scale: "provisional Champions ESI 0-100",
    leagueStrengthGreece: before.strengthSystem.leagueStrengthFallback.value,
    leagueContributors: before.strengthSystem.leagueStrengthFallback.contributors.length,
    averageOpponentStrength: before.strengthOfSchedule.averageOpponentStrength,
    transferabilityFactor: round(before.players.find(player => player.playerId === "luka-jovic").strengthAdjustmentShots, 6)
  },
  after: {
    scale: "UEFA cross-competition Elo",
    leagueStrengthGreece: greekLeague.leagueStrength,
    clubsRated: greekLeague.clubsRated,
    reliability: greekLeague.reliability,
    evidenceStatus: greekLeague.evidenceStatus,
    averageOpponentStrength: round(averageOpponentStrength),
    transferabilityFactor: null,
    transferabilityStatus: "insufficient_evidence",
    fallback: greekLeague.fallback,
    opponentRows
  },
  scaleDifference: "N/D: ESI and Elo are not linearly interchangeable.",
  players,
  teamInvariant: before.teamInvariant,
  expectedMinutesInvariant: control.players.map(player => ({ playerId: player.playerId, expectedMinutes: player.expectedMinutes })),
  protectedInputs: {
    historicalDatasetSha256: control.protectedInputs.historicalDatasetSha256,
    predictionBuilderSha256: control.protectedInputs.predictionBuilderSha256,
    leagueStrengthDataset: leagueDatasetPath
  }
};
const outputPath = path.join(root, `data/analysis/champions/aek-league-strength-consolidation-${asOf}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`AEK league-strength diagnostic: ${output.gate} · activation ${output.activation}`);
