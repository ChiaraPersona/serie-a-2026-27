"use strict";

const assert = require("assert");
const matches = require("../data/normalized/matches.json");
const profileSource = require("../data/sources/team-matchup-profiles-2026-27.json");
const predictions = require("../data/normalized/predictions.json");
const { buildProfile, buildProfiles, robustUpperMean } = require("./build-team-matchup-profiles");
const { expectedMinutes, playerBaselineStability, poissonAtLeast } = require("./predictions/engine");
const { assertUniqueMatchIds, selectCompletedMatches, signalStatusTransition } = require("./predictions/future-readiness");

const checks = [];
const test = (name, fn) => { fn(); checks.push(name); };
const clone = value => JSON.parse(JSON.stringify(value));
const veneziaConfig = profileSource.profiles.find(profile => profile.teamId === "venezia");

function teamStats({ shots, sot, xg, corners = 4, possession = 50 }) {
  return {
    possessionPct: possession, expectedGoals: xg, expectedAssists: Math.max(0, xg - 0.2), shots, shotsOnTarget: sot,
    shotsOffTarget: Math.max(0, shots - sot), shotsBlocked: 1, hitWoodwork: 0, bigChancesMissed: 1, corners,
    passesCompleted: 360, passesAttempted: 440, passAccuracyPct: 82, keyPasses: Math.max(1, sot), tackles: 14,
    tacklesWon: 9, interceptions: 7, clearances: 18, recoveries: 45, fouls: 11, yellowCards: 2,
    secondYellowCards: 0, straightRedCards: 0, penaltiesFor: 0, penaltiesAgainst: 0, duelsWon: 48,
    aerialsWon: 12, goalkeeperSaves: 3
  };
}

function syntheticMatch(matchday) {
  const veneziaHome = matchday % 2 === 0;
  const improvingYeboah = matchday <= 15 ? 4 : 2;
  const decliningAdams = matchday <= 15 ? 1 : 0;
  const own = teamStats({ shots: matchday <= 15 ? 10 : 13, sot: matchday % 3 === 0 ? 6 : 3, xg: matchday % 4 === 0 ? 2.1 : 1.05, corners: matchday === 6 ? 14 : 4, possession: 53 });
  const opponent = teamStats({ shots: 12, sot: matchday <= 15 ? 5 : 3, xg: matchday <= 15 ? 1.8 : 0.9, corners: 5, possession: 47 });
  const veneziaPlayers = [
    { playerId: "akor-adams", player: "Akor Adams", starter: true, minutes: 90, shots: decliningAdams, shotsOnTarget: decliningAdams, expectedGoals: decliningAdams * 0.12, foulsCommitted: 1, foulsWon: 1 },
    { playerId: "john-yeboah", player: "John Yeboah", starter: true, minutes: 90, shots: improvingYeboah, shotsOnTarget: Math.min(2, improvingYeboah), expectedGoals: improvingYeboah * 0.11, foulsCommitted: 0, foulsWon: 1 },
    ...(matchday >= 20 ? [{ playerId: "synthetic-new-cf", player: "Synthetic New CF", starter: false, minutes: 18, shots: 1, shotsOnTarget: 0, expectedGoals: 0.08, foulsCommitted: 0, foulsWon: 0 }] : [])
  ];
  const opponentPlayers = [{ playerId: "synthetic-opponent-cf", player: "Synthetic Opponent CF", starter: true, minutes: 90, shots: 4, shotsOnTarget: 2, expectedGoals: 0.55, foulsCommitted: 1, foulsWon: 1 }];
  return {
    id: `synthetic-venezia-lecce-md-${String(matchday).padStart(2, "0")}`,
    competition: "serie-a", season: "2026-27", matchday, date: `2027-01-${String(Math.min(28, matchday)).padStart(2, "0")}`,
    status: "finished", homeTeam: veneziaHome ? "venezia" : "lecce", awayTeam: veneziaHome ? "lecce" : "venezia",
    score: veneziaHome ? { home: 1, away: 1 } : { home: 1, away: 1 },
    teamStats: veneziaHome ? { home: own, away: opponent } : { home: opponent, away: own },
    playerStats: veneziaHome ? { home: veneziaPlayers, away: opponentPlayers } : { home: opponentPlayers, away: veneziaPlayers },
    sources: [{ sourceType: "synthetic-test", retrievedAt: `2027-01-${String(Math.min(28, matchday)).padStart(2, "0")}` }]
  };
}

const syntheticDataset = [...clone(matches), ...Array.from({ length: 25 }, (_, index) => syntheticMatch(index + 6))];
const profileAt = targetMatchday => buildProfile(veneziaConfig, { matches: syntheticDataset, asOfMatchday: targetMatchday });
const t0 = profileAt(6), t1 = profileAt(7), t2 = profileAt(11), t3 = profileAt(21), t4 = profileAt(31);

test("1 MD5 -> MD6 update", () => { assert.equal(t0.sampleSize, 5); assert.equal(t1.sampleSize, 6); assert.notEqual(t0.offense.teamShotVolume.current.mean, t1.offense.teamShotVolume.current.mean); });
test("2 MD5 -> MD10", () => assert.equal(t2.sampleSize, 10));
test("3 MD5 -> MD20/MD30", () => { assert.equal(t3.sampleSize, 20); assert.equal(t4.sampleSize, 30); });
test("4 historical weight decay", () => assert(t4.offense.teamShotVolume.shrinkage.historicalWeight < t0.offense.teamShotVolume.shrinkage.historicalWeight));
test("5 maturity growth", () => assert(t4.confidence.maturityWeight > t0.confidence.maturityWeight));
test("6 player hierarchy change", () => {
  const players = new Map(t2.offense.shooterStructure.playerTiers.map(player => [player.playerId, player]));
  assert(players.get("john-yeboah").shotTier.score > players.get("akor-adams").shotTier.score);
});
test("7 Expected Minutes decline", () => {
  const candidate = { role: "Attaccante", player: { previousSeason: { totals: { appearances: 30, starts: 28, minutes: 2400, substituteAppearances: 2, completeMatches: 20, substitutedOff: 8 } } } };
  const high = expectedMinutes(candidate, { starterAppearances: 5, starterMinutes: 450, recentTeamMatches: 5, recentAppearances: 5, recentStarts: 5, recentAverageMinutes: 90 });
  const low = expectedMinutes(candidate, { starterAppearances: 10, starterMinutes: 550, recentTeamMatches: 5, recentAppearances: 5, recentStarts: 0, recentAverageMinutes: 20 });
  assert(low.expectedMinutes < high.expectedMinutes - 25);
});
test("8 new player fallback", () => {
  const result = expectedMinutes({ role: "Attaccante", player: { previousSeason: { totals: {} } } }, null);
  assert(result.expectedMinutes > 0); assert.equal(result.evidence.fallbackUsed, true);
});
test("9 transferred/inactive player", () => {
  const result = expectedMinutes({ role: "Attaccante", player: { previousSeason: { totals: { appearances: 30, starts: 30, minutes: 2700 } } } }, { starterAppearances: 5, starterMinutes: 450, recentTeamMatches: 5, recentAppearances: 0, recentStarts: 0, recentAverageMinutes: 0 });
  assert(result.expectedMinutes < 55);
});
test("10 WATCH -> ACTIVE", () => assert.equal(signalStatusTransition({ configuredStatus: "watch", sampleSize: 15, evidenceMatches: 12, persistence: 0.75, stability: 0.8, normalizedMagnitude: 0.12 }).status, "active"));
test("11 ACTIVE -> WATCH", () => assert.equal(signalStatusTransition({ configuredStatus: "active", sampleSize: 15, evidenceMatches: 12, persistence: 0.45, stability: 0.5, normalizedMagnitude: 0.06 }).status, "watch"));
test("12 WATCH -> INACTIVE", () => assert.equal(signalStatusTransition({ configuredStatus: "watch", sampleSize: 15, evidenceMatches: 12, persistence: 0.2, stability: 0.8, normalizedMagnitude: 0.02 }).status, "inactive"));
test("13 role residual accumulation", () => { const role = t4.shotDefense.roleAccessDiagnostics.roles.CF; assert(role.matches >= t0.shotDefense.roleAccessDiagnostics.roles.CF.matches); });
test("14 outlier dilution", () => { assert(robustUpperMean([4, 4, 5, 4, 14]).value > robustUpperMean([4, 4, 5, 4, 14, 4, 4, 4, 5, 4, 4, 4, 5, 4, 4]).value); });
test("15 shots/SOT independence", () => { assert.notEqual(t2.offense.teamShotVolume.current.mean / t0.offense.teamShotVolume.current.mean, t2.offense.teamSotVolume.current.mean / t0.offense.teamSotVolume.current.mean); });
test("16 shots/xG independence", () => { assert.notEqual(t4.offense.teamShotVolume.current.mean, t4.offense.offensiveShotQuality.xg.mean); });
test("17 opponent normalization update", () => { assert.notDeepEqual(t1.shotDefense.opponentStrengthDiagnostics.rows, t4.shotDefense.opponentStrengthDiagnostics.rows); });
test("18 no future leakage", () => { const eligible = selectCompletedMatches(syntheticDataset, { competition: "serie-a", season: "2026-27", teamId: "venezia", asOfMatchday: 10 }); assert(eligible.every(match => match.matchday < 10)); });
test("19 target match exclusion", () => { const target = syntheticDataset.find(match => match.matchday === 10 && match.id.startsWith("synthetic")); const eligible = selectCompletedMatches(syntheticDataset, { competition: "serie-a", season: "2026-27", excludeMatchId: target.id }); assert(!eligible.some(match => match.id === target.id)); });
test("20 unplayed fixture exclusion", () => { const future = { ...syntheticMatch(31), id: "synthetic-unplayed", status: "scheduled", score: null, teamStats: null, playerStats: null }; const eligible = selectCompletedMatches([...syntheticDataset, future], { competition: "serie-a", season: "2026-27" }); assert(!eligible.some(match => match.id === future.id)); });
test("21 duplicate match protection", () => assert.throws(() => assertUniqueMatchIds([...matches, clone(matches[0])]), /duplicato/));
test("22 shuffled chronological input", () => { const shuffled = [...syntheticDataset].reverse(); assert.deepEqual(buildProfile(veneziaConfig, { matches: shuffled, asOfMatchday: 11 }), t2); });
test("23 idempotency", () => assert.equal(JSON.stringify(profileAt(21)), JSON.stringify(profileAt(21))));
test("24 probability monotonicity", () => { const p1 = poissonAtLeast(1.7, 1), p2 = poissonAtLeast(1.7, 2), p3 = poissonAtLeast(1.7, 3); assert(p1 >= p2 && p2 >= p3); });
test("25 SOT <= shots", () => predictions.predictions.filter(prediction => prediction.shooters?.allPlayers).forEach(prediction => prediction.shooters.allPlayers.forEach(player => assert(player.projectedShotsOnTarget <= player.projectedShots + 0.001))));
test("26 team/player reconciliation", () => predictions.predictions.filter(prediction => prediction.shooters?.teamTotals).forEach(prediction => prediction.shooters.teamTotals.forEach(total => { assert(Math.abs(total.projectedShots - total.reconciliation.shots.postReconciliation) <= 0.02); assert(Math.abs(total.projectedShotsOnTarget - total.reconciliation.shotsOnTarget.postReconciliation) <= 0.02); })));
test("27 outsider 0..N", () => predictions.predictions.filter(prediction => prediction.shooters?.allPlayers).forEach(prediction => { assert(prediction.shooters.outsiders.length >= 0); assert(prediction.shooters.outsiders.length <= prediction.shooters.allPlayers.length); }));
test("28 missing != zero", () => { const future = { ...syntheticMatch(32), id: "synthetic-missing", status: "scheduled", score: null, teamStats: null }; assert.equal(selectCompletedMatches([future], { competition: "serie-a", season: "2026-27" }).length, 0); });
test("29 all 20 Team Profiles regression", () => { const output = buildProfiles(); assert.equal(output.profiles.length, 20); assert.equal(new Set(output.profiles.map(profile => profile.teamId)).size, 20); });

test("player structural baseline reacts without discarding history", () => {
  const historical = playerBaselineStability({ historicalBaseline: 3, historicalObserved: 3, historicalMinutes: 1800, current: { minutes: 900, shots: 10, shotsCoverage: 10, shotsSequence: [3, 3, 3, 3, 3, 1, 1, 1, 1, 1] }, key: "shots", includePersistence: true });
  assert(historical.value < 3 && historical.value > 1);
});

console.log(`OK future-data readiness: ${checks.length} controlli`);
checks.forEach((name, index) => console.log(`${String(index + 1).padStart(2, "0")}. ${name}`));
