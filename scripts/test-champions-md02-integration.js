"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// The original Phase 12 regression is tied to its reviewed nine-official-XI
// commit. Every original count/hash/assertion below remains unchanged.
const snapshot = require("./test-support/historical-files").gitSnapshotReader("c3f193bae2ebe6407693004489e6ffd8685ca63f");
const read = snapshot.read;
const hash = snapshot.hash;

const output = read("data/normalized/champions-md02-integration-2026-27.json");
const odds = read("data/normalized/odds/sisal/champions-league.json");
const squads = read("data/normalized/champions-registered-squads-2026-27.json");
const stats = read("data/normalized/champions-player-stats-2025-26.json");
const identityOverlay = read("data/sources/champions-player-identity-overlay-md02-2026-27.json");

assert.strictEqual(hash("data/sources/champions-probable-formations-md02-2026-27.json"), "83AEE4C3049B20BAA900E67E54A16FA25FEE3960906EB178085B11782D56F289");
assert.strictEqual(hash("data/sources/champions-official-formations-md02-2026-27.json"), "72172D796F50D8A9C5CACBBC16EF3A8993174C29A54966C10AA11E8C42F6CAE6");
assert.strictEqual(hash("data/normalized/odds/sisal/champions-league.json"), "2969A579C55F3748FA8712BD83374E86239163518204ED7FAFCBDAC7C03FA4FB");
assert.strictEqual(hash("data/raw/odds/sisal/champions-league/2026-10-13T09-55-14-800Z.json.gz"), "4F4D59E24F0CA81D224344C8D5533668D63FD2F5C13CDD82C1E7F3B96E472BF0");

assert.strictEqual(output.phase, 12);
assert.strictEqual(output.matchday, 2);
assert.strictEqual(output.fixtures.length, 18);
assert.strictEqual(output.coverage.fixtures, 18);
assert.strictEqual(output.coverage.probableLineups, 18);
assert.strictEqual(output.coverage.officialLineups, 9);
assert.strictEqual(output.coverage.probableStarters, 396);
assert.strictEqual(output.coverage.canonicalStartersResolved, 392);
assert.strictEqual(output.coverage.canonicalStartersUnresolved, 4);
assert.strictEqual(output.coverage.unresolvedStartersWithExternalIdentityEvidence, 2);
assert.strictEqual(output.coverage.availability.total, 124);
assert.strictEqual(output.coverage.availability.unavailable, 99);
assert.strictEqual(output.coverage.availability.suspended, 3);
assert.strictEqual(output.coverage.availability.doubts, 22);
assert.strictEqual(output.coverage.availability.canonicalResolved, 108);
assert.strictEqual(output.coverage.availability.canonicalUnresolved, 16);
assert.strictEqual(output.coverage.availability.unresolvedWithExternalIdentityEvidence, 0);
assert.strictEqual(output.coverage.odds.events, 18);
assert.strictEqual(output.coverage.odds.matchedEvents, 18);
assert.strictEqual(output.coverage.odds.playerMarkets, odds.summary.playerMarkets);
assert.strictEqual(output.coverage.odds.usedForPlayerProbabilityOrEv, 0);
assert.strictEqual(output.coverage.odds.interfaceSelectableSelections, 50399);
assert.strictEqual(output.coverage.odds.mathematicallyEvaluableSelections, 0);
assert.strictEqual(output.generationReadiness.synchronizedFixtures, 18);
assert.strictEqual(output.policies.frozenSnapshots.includes("No frozen snapshot"), true);
assert.strictEqual(output.policies.serieA.includes("No Serie A input or output"), true);

for (const source of Object.values(output.sources)) {
  if (source?.input?.path) assert.strictEqual(hash(source.input.path), source.input.sha256, `Hash input non coerente: ${source.input.path}`);
}
assert.strictEqual(hash(output.sources.odds.normalized.path), output.sources.odds.normalized.sha256);
assert.strictEqual(hash(output.sources.odds.raw.path), output.sources.odds.raw.sha256);

const canonicalByTeam = new Map();
for (const teamName of new Set([...squads.teams.map(team => team.team), ...stats.teams.map(team => team.team)])) {
  const ids = new Set([
    ...(squads.teams.find(team => team.team === teamName)?.players || []).map(player => player.id),
    ...(stats.teams.find(team => team.team === teamName)?.players || []).map(player => player.id)
  ]);
  canonicalByTeam.set(teamName, ids);
}
for (const identity of identityOverlay.players) {
  const ids = canonicalByTeam.get(identity.team) || new Set();
  ids.add(identity.canonicalPlayerId);
  canonicalByTeam.set(identity.team, ids);
}
assert.strictEqual(new Set(identityOverlay.players.map(identity => identity.stablePlayerId)).size, identityOverlay.players.length, "stablePlayerId overlay duplicati");

const unresolved = output.fixtures.flatMap(fixture => [...fixture.lineups.home.players, ...fixture.lineups.away.players]).filter(player => !player.canonicalPlayerId);
assert.deepStrictEqual(unresolved.map(player => [player.team, player.suppliedName]), [["Sporting CP", "Joao Simoes"], ["Arsenal", "Lewis-Skelly"], ["Bayern München", "Karl"], ["Napoli", "Giovane"]]);
const veerman = output.fixtures.flatMap(fixture => [...fixture.lineups.home.players, ...fixture.lineups.away.players]).find(player => player.suppliedName === "Veerman");
assert(veerman, "Veerman assente dalle probabili");
assert.strictEqual(veerman.team, "Borussia Dortmund");
assert.strictEqual(veerman.canonicalPlayerId, "joey-veerman");
assert.strictEqual(identityOverlay.players.find(player => player.stablePlayerId === "borussia-dortmund:joey-veerman")?.providerIds.sisal, "245502");
const targetedFixtureIds = new Set(["ucl-2026-27-md02-03", "ucl-2026-27-md02-04", "ucl-2026-27-md02-05", "ucl-2026-27-md02-06", "ucl-2026-27-md02-07", "ucl-2026-27-md02-08", "ucl-2026-27-md02-09"]);
assert.strictEqual(crypto.createHash("sha256").update(JSON.stringify(output.fixtures.filter(fixture => !targetedFixtureIds.has(fixture.fixtureId)))).digest("hex").toUpperCase(), "D04A3F852EBBB1B008CAAB6F6128B2AE2DBBB6A914E64B8554D01A854C631BFB", "Le 11 integrazioni Champions fuori ambito sono cambiate");
const untouchedVolumeRows = output.fixtures.filter(fixture => !targetedFixtureIds.has(fixture.fixtureId)).flatMap(fixture => ["home", "away"].flatMap(side => fixture.lineups[side].players.map((player, index) => [fixture.fixtureId, side, index, player.expectedMinutes, player.projectedShots, player.projectedShotsOnTarget])));
assert.strictEqual(crypto.createHash("sha256").update(JSON.stringify(untouchedVolumeRows)).digest("hex").toUpperCase(), "F7F2A3E3E2F06A4D339921A49FC6BCEE7BAA697AD5D514DDAA63366CA83CFE3A", "Volumi/minuti delle 11 gare fuori ambito modificati");
for (const fixtureId of targetedFixtureIds) {
  const fixture = output.fixtures.find(item => item.fixtureId === fixtureId);
  assert.strictEqual(fixture.lineupStatus, "official");
  assert.strictEqual(fixture.probableFormationSource.provider, "Diretta.it");
  assert.strictEqual(fixture.editorialLineups.home.players.length, 11);
  assert.strictEqual(fixture.editorialLineups.away.players.length, 11);
  assert(fixture.lineups.home.bench.length >= 8);
  assert(fixture.lineups.away.bench.length >= 8);
}
const missingDetailed = output.fixtures.filter(fixture => !fixture.teamPrediction.dataQuality?.detailedVolumesAvailable);
assert.deepStrictEqual(missingDetailed.map(fixture => fixture.fixtureId), ["ucl-2026-27-md02-02"]);
assert.deepStrictEqual(missingDetailed[0].teamPrediction.dataQuality.teamSamples, ["N/D", "N/D"]);

const oddsByFixture = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
let playerMarketCount = 0;
let playerSelectionCount = 0;
for (const fixture of output.fixtures) {
  assert.strictEqual(fixture.syncKey, fixture.fixtureId);
  assert.strictEqual(fixture.generationSync.reading.fixtureId, fixture.fixtureId);
  assert.strictEqual(fixture.generationSync.schedina.fixtureId, fixture.fixtureId);
  const starters = [...fixture.lineups.home.players, ...fixture.lineups.away.players];
  assert.strictEqual(starters.length, 22);
  for (const player of starters) {
    if (player.canonicalPlayerId) assert(canonicalByTeam.get(player.team)?.has(player.canonicalPlayerId), `${fixture.fixtureId}: ID non canonico ${player.canonicalPlayerId}`);
    if (!player.availabilityConflict) assert.strictEqual(player.expectedMinutes, player.role === "goalkeeper" ? 90 : 84.6);
  }

  const originalEvent = oddsByFixture.get(fixture.fixtureId);
  assert(originalEvent, `Evento quote mancante: ${fixture.fixtureId}`);
  const originals = new Map(originalEvent.markets.filter(market => market.marketScope === "player").map(market => [market.providerMarketId, market]));
  assert.strictEqual(fixture.oddsEvent.playerMarkets.length, originals.size);
  for (const market of fixture.oddsEvent.playerMarkets) {
    const original = originals.get(market.providerMarketId);
    assert(original, `Mercato originale mancante: ${market.providerMarketId}`);
    for (const key of ["marketCode", "marketName", "variantName", "threshold", "status", "updatedAt", "marketScope"]) assert.deepStrictEqual(market[key], original[key], `${market.providerMarketId}: ${key} alterato`);
    assert.deepStrictEqual(market.providerPlayerIds, original.providerPlayerIds);
    assert.strictEqual(market.selections.length, original.selections.length);
    market.selections.forEach((selection, index) => {
      const expected = original.selections[index];
      for (const key of ["providerSelectionId", "code", "name", "odds", "oddsRaw", "status"]) assert.deepStrictEqual(selection[key], expected[key], `${market.providerMarketId}/${selection.providerSelectionId}: ${key} alterato`);
      assert.strictEqual(selection.modelProbability, null);
      assert.strictEqual(selection.fairOdds, null);
      assert.strictEqual(selection.expectedValue, null);
      assert.strictEqual(selection.interfaceSelectable, selection.status === "open" && Number(selection.odds) > 1);
      if (selection.interfaceSelectable) {
        assert(selection.selectionId.startsWith(`sisal:${originalEvent.providerEventId}:${market.providerMarketId}:`));
        assert.strictEqual(selection.quoteAvailability, "AVAILABLE_AT_SNAPSHOT");
      }
    });
    if (market.marketCode === "28506") {
      assert.strictEqual(market.replacementIncluded, true);
      assert.strictEqual(market.woodworkIncluded, true);
      assert.strictEqual(market.forecastCompatibility, "REFERENCE_ONLY_DUO_REPLACEMENT_AND_WOODWORK_NOT_MODELLED");
    }
    if (market.marketCode === "28507") {
      assert.strictEqual(market.replacementIncluded, true);
      assert.strictEqual(market.forecastCompatibility, "REFERENCE_ONLY_DUO_REPLACEMENT_NOT_MODELLED");
    }
    if (market.marketCode === "28090") {
      assert.strictEqual(market.replacementIncluded, true);
      assert.strictEqual(market.woodworkIncluded, true);
      assert.strictEqual(market.forecastCompatibility, "REFERENCE_ONLY_REPLACEMENT_AND_WOODWORK_NOT_MODELLED");
    }
    playerMarketCount += 1;
    playerSelectionCount += market.selections.length;
  }
}

assert.strictEqual(playerMarketCount, output.coverage.odds.playerMarkets);
assert.strictEqual(playerSelectionCount, output.coverage.odds.playerSelections);
assert.strictEqual(output.coverage.odds.modelComparablePlayerSelections, 0);
console.log(`OK test Fase 12 MD2: 18/18 · titolari ${output.coverage.canonicalStartersResolved}/396 · disponibilità ${output.coverage.availability.canonicalResolved}/${output.coverage.availability.total} · ${playerMarketCount} mercati · ${playerSelectionCount} selezioni integre`);

require("./test-support/champions-md02-current").assertCurrentIntegration(root);

