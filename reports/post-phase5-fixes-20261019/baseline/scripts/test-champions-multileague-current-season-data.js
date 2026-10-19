"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const builder = require("./build-champions-player-stats");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const hashFile = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const hashJson = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const batch = ["arsenal", "inter", "bayern-munchen", "real-madrid", "paris-saint-germain", "bodo-glimt"];
const expectedAll = [...batch, "aek-athens"];
const data = read("data/normalized/champions-player-stats-2026-27.json");
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const audit = read("data/analysis/champions/multileague-current-season-batch-2026-10-09.json");

assert.equal(data.asOf, "2026-10-09");
assert.ok(expectedAll.every(id => data.teams.some(team => team.id === id)), "AEK + sei squadre non preservate nel dataset consolidato");
assert.deepEqual(new Set(audit.source.lastImport.teams), new Set(batch), "audit Fase 5 non limitato al batch richiesto");
assert.deepEqual(audit.source.lastImport.seasons, ["2026-27"]);
assert.equal(audit.source.lastImport.asOf, "2026-10-09");
assert.equal(audit.source.lastImport.matches, 36);

const aek = data.teams.find(team => team.id === "aek-athens");
assert.equal(data.teamSnapshots["aek-athens"].asOf, "2026-10-03");
assert.equal(hashJson(aek), "f2f3deb29a908c2637510dbfecf2d754ff2ebe1086ef16bae0da1d545ef9d308", "AEK non preservata");
const aekSourceMatches = source.matches.filter(match => match.season === "2026-27" && (match.home?.providerTeamId === "887" || match.away?.providerTeamId === "887"));
assert.equal(hashJson(aekSourceMatches), "207c225e9b37d95be6134de09e880e767823048c62c572a2268da418d0d04a94", "gare sorgente AEK modificate");
assert.equal(audit.aekInvariant.preserved, true);

for (const team of data.teams) {
  assert.equal(new Set(team.players.map(player => builder.normalize(player.name))).size, team.players.length, `${team.id}: nomi duplicati`);
  const providerIds = team.players.map(player => player.providerPlayerId).filter(Boolean);
  assert.equal(new Set(providerIds).size, providerIds.length, `${team.id}: providerPlayerId duplicati`);
  const snapshotAsOf = data.teamSnapshots[team.id].asOf;
  assert.ok(team.coverage.to === null || team.coverage.to <= snapshotAsOf, `${team.id}: future leakage nella copertura`);
  for (const player of team.players.filter(player => player.currentSeason)) {
    if (batch.includes(team.id)) {
      const primaryEntries = player.currentSeason.entries.filter(entry => entry.teamId === team.espnTeamId && entry.competitionType === "domestic-league");
      assert.deepEqual(player.currentSeason.totals, builder.currentAggregate(primaryEntries), `${team.id}/${player.name}: totali principali contaminati da altre squadre o competizioni`);
      assert.deepEqual(player.currentSeason.totalsScope, { teamId: team.espnTeamId, competitionType: "domestic-league" });
      if (player.currentSeason.allEvidenceTotals) {
        assert.deepEqual(player.currentSeason.allEvidenceTotals, builder.currentAggregate(player.currentSeason.entries), `${team.id}/${player.name}: totale separato di tutte le evidenze incoerente`);
      }
    }
    const keys = new Set();
    for (const entry of player.currentSeason.entries) {
      assert.ok(entry.matches.every(match => match.date <= snapshotAsOf), `${team.id}/${player.name}: future leakage`);
      assert.ok(["domestic-league", "uefa-competition"].includes(entry.competitionType), `${team.id}/${player.name}: competitionType non valido`);
      assert.ok(entry.competition && entry.team && entry.source === "ESPN" && entry.sourceUrl, `${team.id}/${player.name}: provenienza incompleta`);
      const key = `${entry.teamId}|${entry.competitionType}|${entry.competition}`;
      assert.ok(!keys.has(key), `${team.id}/${player.name}: bucket competizione duplicato`);
      keys.add(key);
      assert.ok(entry.starts <= entry.appearances && entry.substituteAppearances <= entry.appearances, `${team.id}/${player.name}: starts/sub incoerenti`);
      assert.ok(entry.starts + entry.substituteAppearances <= entry.appearances, `${team.id}/${player.name}: presenze duplicate`);
      assert.ok(entry.minutes <= entry.appearances * 90, `${team.id}/${player.name}: minuti incoerenti`);
      if (entry.shots !== null && entry.shotsOnTarget !== null) assert.ok(entry.shotsOnTarget <= entry.shots, `${team.id}/${player.name}: shots/SOT invertiti`);
    }
  }
}

for (const team of data.teams.filter(team => batch.includes(team.id))) {
  assert.equal(team.asOf, "2026-10-09");
  assert.ok(team.players.every(player => player.teamId === team.id), `${team.id}: teamId giocatore mancante`);
}

const nullable = builder.currentAggregate([{ appearances: 1, shots: null, shotsOnTarget: 0 }]);
assert.equal(nullable.shots, null);
assert.equal(nullable.shotsOnTarget, 0);
assert.equal(hashFile("data/normalized/champions-player-stats-2025-26.json"), "4c09d7f109f9d5a3b769c153ed4c051cc7a99adb588a11f7c3a7cb3b348ef692");
assert.equal(hashFile("scripts/build-champions-pilot-predictions.js"), "135788a773b8607db7f1386a1c9d6b5d2fb8560fdab914d652318bfe95691be5");
assert.equal(hashFile("data/analysis/champions/league-strength-2026-10-03.json"), "82a4975c77509a1b49faa1b63ee84c08cade57cccd2edbf07625215644563d22");

assert.equal(audit.teams.length, 6);
assert.equal(audit.teams.every(team => team.status === "usable"), true);
assert.equal(audit.summary.partialMatches, 0);
assert.equal(audit.summary.matchesWithoutSummary, 0);
for (const team of audit.teams) {
  const outsideShots = team.reconciliation.outsideRegisteredSquad.reduce((total, player) => total + player.shots, 0);
  const outsideSot = team.reconciliation.outsideRegisteredSquad.reduce((total, player) => total + player.shotsOnTarget, 0);
  assert.equal(team.reconciliation.registeredPlayerShots + outsideShots, team.reconciliation.teamShots, `${team.team}: mismatch tiri non spiegato`);
  assert.equal(team.reconciliation.registeredPlayerShotsOnTarget + outsideSot, team.reconciliation.teamShotsOnTarget, `${team.team}: mismatch SOT non spiegato`);
}
assert.equal(audit.gate, "CHAMPIONS MULTILEAGUE DATA GATE = PASS");

console.log(`Champions multileague current-season batch: OK · ${audit.summary.matches} gare · ${audit.summary.playersWithMinutes}/${audit.summary.registeredPlayers} con minuti`);
