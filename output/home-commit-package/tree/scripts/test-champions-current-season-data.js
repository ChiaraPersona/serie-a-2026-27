"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const importer = require("./import-champions-pilot-stats");
const builder = require("./build-champions-player-stats");

const root = path.resolve(__dirname, "..");
const baselinePath = path.join(root, "data/normalized/champions-player-stats-2025-26.json");
const currentPath = path.join(root, "data/normalized/champions-player-stats-2026-27.json");
const sourcePath = path.join(root, "data/sources/champions-pilot-match-stats-2025-27.json");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));

const args = importer.parseArgs(["--season", "2026-27", "--team", "aek-athens", "--as-of", "2026-09-05"], "2099-12-31");
assert.equal(args.asOf, "2026-09-05");
assert.equal(args.seasons[0].dates, "20260701-20260905");
assert.deepEqual(args.selectedTeams.map(team => team.id), ["aek-athens"]);
assert.equal(importer.teams.find(team => team.id === "aek-athens").espnTeamId, "887");
assert.equal(importer.teams.find(team => team.id === "aek-athens").league, "gre.1");
assert.equal(importer.parseArgs(["--season", "2026-27", "--team", "aek-athens"], "2026-10-03").asOf, "2026-10-03");
assert.deepEqual(
  importer.parseArgs(["--season", "2026-27", "--teams", "arsenal,aston-villa,liverpool,manchester-city,manchester-united", "--as-of", "2026-10-03"]).selectedTeams.map(team => team.id),
  ["arsenal", "aston-villa", "liverpool", "manchester-city", "manchester-united"]
);
assert.deepEqual(
  importer.parseArgs(["--season", "2026-27", "--league", "eng.1", "--as-of", "2026-10-03"]).selectedTeams.map(team => team.league),
  ["eng.1", "eng.1", "eng.1", "eng.1", "eng.1"]
);
const intervals = importer.splitDateInterval("2026-07-01", "2026-10-03");
assert.deepEqual(intervals.map(item => [item.from, item.to]), [
  ["2026-07-01", "2026-07-31"],
  ["2026-08-01", "2026-08-31"],
  ["2026-09-01", "2026-10-01"],
  ["2026-10-02", "2026-10-03"]
]);

const source = read(sourcePath);
const asOf = source.asOf || source.cutoffDate;
assert.equal(hash(baselinePath), "4c09d7f109f9d5a3b769c153ed4c051cc7a99adb588a11f7c3a7cb3b348ef692", "il dataset storico 2025/26 deve restare immutato");

const data = read(currentPath);
assert.equal(data.source.rawSeason, "2026-27");
// Team imports, player imports and raw retrieval timestamps are different clocks.
const package1 = data.package1Import ? read(path.join(root, data.package1Import.source)) : null;
const frozen = package1 ? read(path.join(root, "data/analysis/champions/package1-2026-10-19/normalized-before.json")) : data;
const individualAsOf = data.package1Import?.asOf || asOf;
assert.equal(data.asOf, [asOf, individualAsOf].sort().at(-1));
assert.equal(data.cutoffDate, data.asOf);
assert.equal(data.dateInterval.to, data.asOf);
assert(asOf <= data.asOf, "team input cannot be later than the consolidated cutoff");
if (package1) {
  assert.equal(package1.performances.length, data.package1Import.performances);
  const updatedTeams = new Set(package1.performances.map(row => row.canonicalTeamId));
  for (const team of data.teams) {
    const previous = frozen.teams.find(item => item.id === team.id);
    if (!updatedTeams.has(team.id)) {
      assert.deepEqual(team, previous, `${team.id}: untouched team changed`);
      assert.deepEqual(data.teamSnapshots[team.id], frozen.teamSnapshots[team.id]);
      continue;
    }
    assert.deepEqual(team.coverage, previous.coverage, `${team.id}: collective coverage changed during individual import`);
    assert.equal(data.teamSnapshots[team.id].asOf, individualAsOf);
    const rows = package1.performances.filter(row => row.canonicalTeamId === team.id);
    const latestRetrieval = rows.map(row => row.evidenceRetrievedAt).sort().at(-1);
    assert.equal(data.teamSnapshots[team.id].retrievedAt, latestRetrieval);
    for (const row of rows) {
      assert(row.date <= individualAsOf, `${row.auditKey}: event later than individual cutoff`);
      assert.equal(row.minutesObserved, null);
      assert.equal(row.minutesStatus, "estimated");
      const rawPath = path.join(root, `data/raw/champions-pilot/espn/summaries/2026-27/${row.league}/${individualAsOf}/${row.event_id}.json.gz`);
      const raw = JSON.parse(require("zlib").gunzipSync(fs.readFileSync(rawPath)));
      assert.equal(raw.retrievedAt, row.evidenceRetrievedAt);
      assert.equal(raw.eventDate, row.date);
      assert.equal(raw.asOf, individualAsOf);
      assert.equal(String(raw.eventId), row.event_id);
    }
  }
}
const protectedSeven = ["aek-athens", "arsenal", "inter", "bayern-munchen", "real-madrid", "paris-saint-germain", "bodo-glimt"];
assert.ok(protectedSeven.every(id => data.teams.some(team => team.id === id)), "AEK più il batch di sei squadre devono restare presenti");
assert.equal(data.teams.length, 36, "il dataset consolidato deve contenere le 36 squadre");
const aek = data.teams.find(team => team.id === "aek-athens");
assert.ok(aek, "AEK deve essere preservata nel merge");
assert.equal(aek.id, "aek-athens");
assert.equal(aek.espnTeamId, "887");
const frozenAek = frozen.teams.find(team => team.id === "aek-athens");
assert.equal(frozen.teamSnapshots["aek-athens"].asOf, "2026-10-03");
assert.equal(crypto.createHash("sha256").update(JSON.stringify(frozenAek)).digest("hex"), "f2f3deb29a908c2637510dbfecf2d754ff2ebe1086ef16bae0da1d545ef9d308", "snapshot AEK congelato modificato");
assert(!source.matches.some(match => match.season === "2026-27" && match.date > "2026-10-03" && (match.home?.providerTeamId === "887" || match.away?.providerTeamId === "887")), "future leakage nei match AEK");

const espn = builder.collectEspnRows({ season: "2026-27", asOf: individualAsOf });
for (const player of aek.players.filter(item => item.currentSeason)) {
  const rows = espn.matchesByAthlete.get(player.providerPlayerId) || [];
  for (const entry of player.currentSeason.entries) {
    // Compare the actual entry sample, not every raw event acquired since a snapshot.
    const ids = new Set((entry.matches || []).map(match => String(match.matchId)));
    const matching = rows.filter(row => ids.has(row.matchId));
    assert.equal(new Set(matching.map(row => row.matchId)).size, ids.size, `${player.name}: raw sample incomplete`);
    assert((entry.matches || []).every(match => match.date <= (entry.asOf || player.currentSeason.asOf || individualAsOf)));
    const sum = field => {
      const values = matching.map(row => row.stats[field]).filter(Number.isFinite);
      return values.length ? values.reduce((total, value) => total + value, 0) : null;
    };
    assert.equal(entry.shots, sum("totalShots"), `${player.name}: shots non allineati a totalShots ESPN`);
    assert.equal(entry.shotsOnTarget, sum("shotsOnTarget"), `${player.name}: SOT non allineati a shotsOnTarget ESPN`);
  }
}

const nullable = builder.currentAggregate([{ appearances: 1, shots: null, shotsOnTarget: 0 }]);
assert.equal(nullable.shots, null, "un dato non disponibile non deve diventare zero");
assert.equal(nullable.shotsOnTarget, 0, "uno zero reale deve restare zero");
assert.equal(builder.normalize("Barnabás Varga"), builder.normalize("Barnabas Varga"));
assert.equal(builder.normalize("Mijat Gaćinović"), builder.normalize("Mijat Gacinovic"));
assert.equal(new Set(aek.players.map(player => builder.normalize(player.name))).size, aek.players.length, "duplicati nominali nella rosa AEK");

console.log(`Test Champions current-season OK: team input ${asOf}; individual cutoff ${individualAsOf}; raw retrieval verified independently; frozen AEK 2026-10-03 preserved`);
