"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  ROLE_PRIORS,
  ratePer90,
  currentReliabilityWeight,
  historicalBaseline,
  buildStandings,
  opponentStrength,
  transferFactor,
  blendRates
} = require("./champions/context-adjusted-player-baseline");
const { scaleShotProjections } = require("./champions/player-volume-utils");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const close = (actual, expected, tolerance = 1e-9, message = "") => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} != ${expected}`);

const control = read("data/analysis/champions/aek-context-control-2026-10-04.json");
const pilot = read("data/analysis/champions/aek-context-adjusted-md02-2026-10-04.json");
const algorithmSource = fs.readFileSync(path.join(root, "scripts/champions/context-adjusted-player-baseline.js"), "utf8");

assert.equal(control.immutableControl, true);
assert.equal(pilot.fixture.fixtureId, "ucl-2026-27-md02-14");
assert.ok(pilot.asOf < pilot.fixture.date, "as-of must precede the target match");
assert.equal(sha256("data/normalized/champions-player-stats-2025-26.json"), control.protectedInputs.historicalDatasetSha256, "historical baseline changed");
assert.equal(sha256("scripts/build-champions-pilot-predictions.js"), control.protectedInputs.predictionBuilderSha256, "team prediction builder changed");

assert.ok(currentReliabilityWeight(90) < currentReliabilityWeight(450));
assert.ok(currentReliabilityWeight(450) < currentReliabilityWeight(1800));
assert.ok(currentReliabilityWeight(100000) <= 0.35);

const noCurrent = blendRates({ historicalRaw: 2, historicalMinutes: 900, rolePrior: 2, domesticRaw: null, domesticMinutes: 0 });
close(noCurrent.blended, 2, 1e-12, "zero current minutes must preserve historical baseline");
const small = blendRates({ historicalRaw: 1, historicalMinutes: 900, rolePrior: 1, domesticRaw: 3, domesticMinutes: 45 });
const large = blendRates({ historicalRaw: 1, historicalMinutes: 900, rolePrior: 1, domesticRaw: 3, domesticMinutes: 450 });
assert.ok(Math.abs(small.blended - 1) < Math.abs(large.blended - 1), "larger samples must have more influence");
assert.ok(Math.abs(small.blended - 1) < 0.1, "tiny sample influence is too large");

assert.equal(ratePer90(null, 90), null, "missing must not become zero");
assert.equal(ratePer90(0, 90), 0, "observed zero must remain zero");
assert.equal(historicalBaseline(null, 0, ROLE_PRIORS.forward.shots), ROLE_PRIORS.forward.shots, "missing history must use role prior");

for (const forbiddenLeague of ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "gre.1"]) {
  assert.ok(!algorithmSource.includes(forbiddenLeague), `hardcoded league entry found: ${forbiddenLeague}`);
}
assert.equal(pilot.strengthSystem.leagueStrengthFallback.contributors.length, 1);
assert.equal(pilot.strengthSystem.leagueStrengthFallback.contributors[0].team, "AEK Athens");

const syntheticStandings = { rows: [{ providerTeamId: "2", team: "Domestic", matches: 6, pointsPerMatch: 2 }], leagueAveragePointsPerMatch: 1.5 };
const direct = opponentStrength({ opponent: { team: "European", providerTeamId: "1" }, standings: syntheticStandings, directStrengthByTeam: new Map([["European", 80]]), leagueFallback: 30, neutralFallback: 50 });
assert.equal(direct.value, 80);
assert.equal(direct.source, "opponent-specific-european-strength");
const domestic = opponentStrength({ opponent: { team: "Domestic", providerTeamId: "2" }, standings: syntheticStandings, directStrengthByTeam: new Map(), leagueFallback: 30, neutralFallback: 50 });
assert.equal(domestic.source, "opponent-domestic-ppg-anchored-to-derived-league-strength");
const league = opponentStrength({ opponent: { team: "Unknown", providerTeamId: "3" }, standings: syntheticStandings, directStrengthByTeam: new Map(), leagueFallback: 30, neutralFallback: 50 });
assert.equal(league.value, 30);
assert.equal(league.source, "derived-league-strength-fallback");
const neutral = opponentStrength({ opponent: { team: "Unknown", providerTeamId: "3" }, standings: syntheticStandings, directStrengthByTeam: new Map(), leagueFallback: null, neutralFallback: 50 });
assert.equal(neutral.value, 50);
assert.equal(neutral.source, "neutral-champions-reference-fallback");

assert.equal(transferFactor(0, 50), 0.85);
assert.equal(transferFactor(1000, 50), 1.15);
const weakContext = blendRates({ historicalRaw: 1, historicalMinutes: 900, rolePrior: 1, domesticRaw: 2, domesticMinutes: 300, domesticStrengthFactor: transferFactor(20, 50) });
const strongContext = blendRates({ historicalRaw: 1, historicalMinutes: 900, rolePrior: 1, domesticRaw: 2, domesticMinutes: 300, domesticStrengthFactor: transferFactor(80, 50) });
assert.ok(strongContext.adjustedDomestic > weakContext.adjustedDomestic);
assert.ok(strongContext.blended > weakContext.blended, "same raw rate against stronger opposition must transfer higher");

const syntheticPlayers = [
  { playerId: "a", roleKey: "forward", expectedMinutes: 90, per90: { shots: 4, shotsOnTarget: 0.5 } },
  { playerId: "b", roleKey: "forward", expectedMinutes: 90, per90: { shots: 1, shotsOnTarget: 2 } }
];
const scaledShots = scaleShotProjections(syntheticPlayers, "shots", 5);
const scaledSot = scaleShotProjections(syntheticPlayers, "shotsOnTarget", 2.5);
assert.ok(scaledShots[0].projection > scaledShots[1].projection);
assert.ok(scaledSot[0].projection < scaledSot[1].projection, "shots and SOT must remain independent channels");
const legacyPlayers = syntheticPlayers.map(({ expectedMinutes, ...player }) => player);
const sharedLegacy = scaleShotProjections(legacyPlayers, "shots", 4.7);
const legacyFactor = Math.max(0.72, Math.min(1.35, 4.7 / ((4 + 1) * 0.94)));
close(sharedLegacy[0].projection, Number((4 * 0.94 * legacyFactor).toFixed(2)), 1e-12, "shared helper changed legacy behavior");

const event = (id, date) => ({
  id,
  date: `${date}T18:00:00Z`,
  status: { type: { completed: true } },
  competitions: [{ competitors: [
    { homeAway: "home", score: "1", team: { id: "h", displayName: "Home" } },
    { homeAway: "away", score: "0", team: { id: "a", displayName: "Away" } }
  ] }]
});
const leakage = buildStandings([event("past", "2026-09-30"), event("future", "2026-10-04")], { from: "2026-08-01", asOf: "2026-10-03" });
assert.deepEqual(leakage.included.map(item => item.eventId), ["past"]);
assert.ok(pilot.strengthOfSchedule.teamSampleOpponents.every(item => item.date <= pilot.asOf));
assert.ok(pilot.players.flatMap(player => player.opponentsFaced).every(item => item.date <= pilot.asOf));

assert.equal(pilot.teamInvariant.expectedTeamShotsAfter, control.expectedTeamShots);
assert.equal(pilot.teamInvariant.expectedTeamSotAfter, control.expectedTeamSot);
assert.equal(pilot.teamInvariant.shotsInvariant, true);
assert.equal(pilot.teamInvariant.sotInvariant, true);
close(pilot.reconciliation.sumProjectedPlayerShotsAfter, pilot.reconciliation.targetTeamShots, 0.02, "player shots reconciliation");
close(pilot.reconciliation.sumProjectedPlayerSotAfter, pilot.reconciliation.targetTeamSot, 0.02, "player SOT reconciliation");

for (const controlPlayer of control.players) {
  const player = pilot.players.find(item => item.playerId === controlPlayer.playerId);
  assert.ok(player, `missing control player ${controlPlayer.playerId}`);
  assert.equal(player.expectedMinutes, controlPlayer.expectedMinutes, `${controlPlayer.playerId}: expected minutes changed`);
}
assert.ok(pilot.players.filter(player => player.expectedMinutes > 0).some(player => Math.abs(player.deltaShots) > 0 || Math.abs(player.deltaSot) > 0), "current season does not influence any starter projection");
assert.ok(pilot.players.filter(player => player.role === "goalkeeper").every(player => player.projectedShots === 0 && player.projectedSot === 0));
assert.equal(pilot.coverage.playersWithCurrentEuropeanMinutes, 0, "non-Champions UEFA evidence leaked into Champions channel");
assert.equal(pilot.coverage.playersWithCurrentOtherEuropeanMinutes, 1);
const vitalis = pilot.players.find(player => player.playerId === "milan-vitalis");
assert.ok(vitalis?.currentOtherEuropeanEvidence?.minutes > 0);
assert.equal(vitalis.currentEuropeanEvidence, null);
assert.ok(pilot.coverage.identityAnomalies.some(item => item.player === "Pilio"));
assert.ok(pilot.strengthOfSchedule.excludedFromIndividualEvidence.some(item => item.team === "Iraklis"));

console.log("Champions AEK context-adjusted baseline: OK");
