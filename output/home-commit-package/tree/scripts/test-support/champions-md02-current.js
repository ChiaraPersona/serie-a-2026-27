"use strict";
const { readJsonFile: storageReadJson } = require('../sisal/dataset-store.cjs');
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sha256, assertHistoricalFile, gitSnapshotReader } = require("./historical-files");

function assertCurrentIntegration(root) {
  const read = file => storageReadJson(path.join(root, file));
  const data = read("data/normalized/champions-md02-integration-2026-27.json");
  const official = read("data/sources/champions-official-formations-md02-2026-27.json");
  const probable = read("data/sources/champions-probable-formations-md02-2026-27.json");
  const liveOdds = read("data/normalized/odds/sisal/champions-league.json");
  const frozenRevision = "c3f193bae2ebe6407693004489e6ffd8685ca63f";
  // The live provider file rotates to later matchdays. Validate archived MD2
  // contracts against the exact snapshot recorded by the MD2 manifest, while
  // still comparing any MD2 events retained in the live file below.
  const frozenOdds = gitSnapshotReader(frozenRevision).read(data.sources.odds.normalized.path);
  assertHistoricalFile(data.sources.odds.normalized, frozenRevision);
  const canonical = new Map();
  for (const file of ["champions-registered-squads-2026-27.json", "champions-player-stats-2025-26.json"]) {
    for (const team of read(`data/normalized/${file}`).teams) {
      const ids = canonical.get(team.team) || new Set();
      team.players.forEach(player => ids.add(player.id)); canonical.set(team.team, ids);
    }
  }
  for (const player of read("data/sources/champions-player-identity-overlay-md02-2026-27.json").players) {
    const ids = canonical.get(player.team) || new Set(); ids.add(player.canonicalPlayerId); canonical.set(player.team, ids);
  }
  assert.equal(data.fixtures.length, 18);
  assert.equal(new Set(data.fixtures.map(f => f.fixtureId)).size, 18);
  assert.deepEqual(new Set(data.fixtures.map(f => f.fixtureId)), new Set(probable.fixtures.map(f => f.fixtureId)));
  const officialById = new Map(official.fixtures.filter(f => f.status === "official").map(f => [f.fixtureId, f]));
  assert.equal(data.coverage.officialLineups, data.fixtures.filter(f => officialById.has(f.fixtureId)).length);
  const players = data.fixtures.flatMap(f => [...f.lineups.home.players, ...f.lineups.away.players]);
  assert.equal(data.coverage.probableStarters, players.length);
  assert.equal(players.length, 396);
  assert.equal(data.coverage.canonicalStartersResolved, players.filter(p => p.canonicalPlayerId).length);
  assert.equal(data.coverage.canonicalStartersUnresolved, players.filter(p => !p.canonicalPlayerId).length);
  assert.equal(data.coverage.unresolvedStartersWithExternalIdentityEvidence, players.filter(p => !p.canonicalPlayerId && p.externalIdentityEvidence).length);
  const availability = data.fixtures.flatMap(f => f.availability);
  assert.equal(data.coverage.availability.total, availability.length);
  for (const [field, status] of [["unavailable", "unavailable"], ["suspended", "suspended"], ["doubts", "doubt"]]) assert.equal(data.coverage.availability[field], availability.filter(p => p.status === status).length);
  assert.equal(data.coverage.availability.canonicalResolved, availability.filter(p => p.canonicalPlayerId).length);
  assert.equal(data.coverage.availability.canonicalUnresolved, availability.filter(p => !p.canonicalPlayerId).length);

  let markets = 0, selections = 0, selectable = 0;
  for (const fixture of data.fixtures) {
    assert.equal(fixture.syncKey, fixture.fixtureId);
    for (const target of ["reading", "schedina"]) assert.equal(fixture.generationSync[target].fixtureId, fixture.fixtureId);
    const source = officialById.get(fixture.fixtureId);
    assert.equal(fixture.lineupStatus, source ? "official" : "probable");
    for (const side of ["home", "away"]) {
      assert.equal(fixture.lineups[side].players.length, 11);
      assert.equal(new Set(fixture.lineups[side].players.map(p => p.canonicalPlayerId || p.suppliedName)).size, 11);
      if (source) {
        assert.deepEqual(fixture.lineups[side].players.map(p => p.suppliedName), source[side].players.map(p => typeof p === "string" ? p : p.sourceName || p.suppliedName || p.name));
        assert.equal(fixture.lineups[side].formation, source[side].formation);
        assert.equal(fixture.editorialLineups[side].players.length, 11, "Official XI must retain editorial provenance separately");
      }
      for (const player of fixture.lineups[side].players) {
        if (player.canonicalPlayerId) assert(canonical.get(player.team)?.has(player.canonicalPlayerId), `Unknown canonical ID ${player.canonicalPlayerId}`);
        if (!player.availabilityConflict) assert.equal(player.expectedMinutes, player.role === "goalkeeper" ? 90 : 84.6);
      }
    }
    const event = liveOdds.events.find(e => e.canonicalMatchId === fixture.fixtureId)
      || frozenOdds.events.find(e => e.canonicalMatchId === fixture.fixtureId);
    assert(event, `Missing verified MD2 odds ${fixture.fixtureId}`);
    const originals = new Map(event.markets.filter(m => m.marketScope === "player").map(m => [m.providerMarketId, m]));
    assert.equal(fixture.oddsEvent.playerMarkets.length, originals.size);
    for (const market of fixture.oddsEvent.playerMarkets) {
      const original = originals.get(market.providerMarketId); assert(original);
      for (const key of ["marketCode", "marketName", "variantName", "threshold", "status", "updatedAt", "marketScope", "providerPlayerIds"]) assert.deepEqual(market[key], original[key]);
      assert.equal(market.selections.length, original.selections.length);
      market.selections.forEach((selection, i) => {
        for (const key of ["providerSelectionId", "code", "name", "odds", "oddsRaw", "status"]) assert.deepEqual(selection[key], original.selections[i][key]);
        for (const key of ["modelProbability", "fairOdds", "expectedValue"]) assert.equal(selection[key], null);
        assert.equal(selection.interfaceSelectable, selection.status === "open" && Number(selection.odds) > 1);
        if (selection.interfaceSelectable) {
          selectable++;
          assert.equal(selection.selectionId, `sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`);
          assert.equal(selection.quoteAvailability, "AVAILABLE_AT_SNAPSHOT");
        }
      });
      if (["28506", "28507", "28090"].includes(market.marketCode)) assert.equal(market.replacementIncluded, true);
      if (["28506", "28090"].includes(market.marketCode)) assert.equal(market.woodworkIncluded, true);
      markets++; selections += market.selections.length;
    }
  }
  assert.equal(data.coverage.odds.playerMarkets, markets);
  assert.equal(data.coverage.odds.playerSelections, selections);
  assert.equal(data.coverage.odds.interfaceSelectableSelections, selectable);
  assert.equal(data.coverage.odds.modelComparablePlayerSelections, 0);
  assert.equal(data.coverage.odds.usedForPlayerProbabilityOrEv, 0);
  // Metadata records the authoritative original odds snapshot, rather than a
  // promise that every later normalized serialization has identical bytes.
  assert.equal(sha256(fs.readFileSync(path.join(root, data.sources.odds.raw.path))).toUpperCase(), data.sources.odds.raw.sha256);
  for (const source of Object.values(data.sources)) if (source?.input?.path)
    assertHistoricalFile(source.input, "d4ae4f28e8464d1f096974687bbf19139df736ef");
  console.log(`OK current MD2 integration: ${data.fixtures.length} fixtures, ${markets} markets, ${selections} unchanged provider selections`);
}
module.exports = { assertCurrentIntegration };
