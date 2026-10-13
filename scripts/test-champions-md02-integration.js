"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const hash = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex").toUpperCase();

const output = read("data/normalized/champions-md02-integration-2026-27.json");
const odds = read("data/normalized/odds/sisal/champions-league.json");
const squads = read("data/normalized/champions-registered-squads-2026-27.json");
const stats = read("data/normalized/champions-player-stats-2025-26.json");

assert.strictEqual(hash("data/sources/champions-probable-formations-md02-2026-27.json"), "83AEE4C3049B20BAA900E67E54A16FA25FEE3960906EB178085B11782D56F289");
assert.strictEqual(hash("data/normalized/odds/sisal/champions-league.json"), "2969A579C55F3748FA8712BD83374E86239163518204ED7FAFCBDAC7C03FA4FB");
assert.strictEqual(hash("data/raw/odds/sisal/champions-league/2026-10-13T09-55-14-800Z.json.gz"), "4F4D59E24F0CA81D224344C8D5533668D63FD2F5C13CDD82C1E7F3B96E472BF0");

assert.strictEqual(output.phase, 12);
assert.strictEqual(output.matchday, 2);
assert.strictEqual(output.fixtures.length, 18);
assert.strictEqual(output.coverage.fixtures, 18);
assert.strictEqual(output.coverage.probableLineups, 18);
assert.strictEqual(output.coverage.probableStarters, 396);
assert.strictEqual(output.coverage.canonicalStartersResolved, 382);
assert.strictEqual(output.coverage.canonicalStartersUnresolved, 14);
assert.strictEqual(output.coverage.unresolvedStartersWithExternalIdentityEvidence, 12);
assert.strictEqual(output.coverage.availability.total, 109);
assert.strictEqual(output.coverage.availability.unavailable, 75);
assert.strictEqual(output.coverage.availability.suspended, 4);
assert.strictEqual(output.coverage.availability.doubts, 30);
assert.strictEqual(output.coverage.availability.canonicalResolved, 105);
assert.strictEqual(output.coverage.availability.canonicalUnresolved, 4);
assert.strictEqual(output.coverage.availability.unresolvedWithExternalIdentityEvidence, 3);
assert.strictEqual(output.coverage.odds.events, 18);
assert.strictEqual(output.coverage.odds.matchedEvents, 18);
assert.strictEqual(output.coverage.odds.playerMarkets, odds.summary.playerMarkets);
assert.strictEqual(output.coverage.odds.usedForPlayerProbabilityOrEv, 0);
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
    playerMarketCount += 1;
    playerSelectionCount += market.selections.length;
  }
}

assert.strictEqual(playerMarketCount, output.coverage.odds.playerMarkets);
assert.strictEqual(playerSelectionCount, output.coverage.odds.playerSelections);
assert.strictEqual(output.coverage.odds.modelComparablePlayerSelections, 0);
console.log(`OK test Fase 12 MD2: 18/18 · titolari ${output.coverage.canonicalStartersResolved}/396 · ${playerMarketCount} mercati · ${playerSelectionCount} selezioni integre`);

