const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-registered-squads-2026-27.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const expected = calendar.teams;

assert.deepStrictEqual(data.teams.map(team => team.team), expected);
assert.strictEqual(data.summary.teams, 36);
assert.strictEqual(data.summary.players, 970);
assert(data.summary.playersWithHistoricalStats >= 794);
assert(data.summary.playersWithoutHistoricalStats <= 176);
assert.strictEqual(data.playerStatistics.season, "2025/26");
for (const team of data.teams) {
  assert(team.players.length >= 18, `${team.team}: rosa incompleta`);
  assert(team.id);
  assert.strictEqual(team.registration.status, "registered");
  assert.strictEqual(team.availability.status, null);
  assert(team.sources.every(source => ["UEFA", "AS Roma"].includes(source.provider)), `${team.team}: fonte non ufficiale`);
  for (const player of team.players) {
    assert.strictEqual(player.registered, true);
    assert.strictEqual(player.availability.status, null);
    assert.strictEqual(player.matchCallup.status, null);
    assert(!Object.hasOwn(player, "number"));
    assert([null, "B"].includes(player.registrationList));
    assert.strictEqual(player.statistics.season, "2026-27");
    assert.strictEqual(player.statistics.appearances, null);
    assert(["complete", "unavailable"].includes(player.historicalDataQuality));
    if (player.previousSeason) {
      assert(["2025/26","2025"].includes(player.previousSeason.season));
      assert(player.previousSeason.entries.length > 0);
      assert(Number.isFinite(player.previousSeason.totals.appearances));
      assert(Object.hasOwn(player.previousSeason.totals, "per90"));
    } else {
      assert(player.historicalUnmatchedReason, `${team.team}/${player.name}: motivo N/D mancante`);
    }
  }
}
for (const teamName of ["Inter", "Napoli", "Roma", "Como"]) {
  const team = data.teams.find(candidate => candidate.team === teamName);
  const local=JSON.parse(fs.readFileSync(path.join(root,`data/teams/${team.id}.json`),"utf8"));
  for(const player of team.players){const original=local.squad.find(p=>p.id===player.id);
    if(original?.previousSeason?.entries?.length) assert.deepStrictEqual(player.previousSeason,original.previousSeason,`${teamName}/${player.name}: storico locale alterato`);
  }
}
const inter = JSON.parse(fs.readFileSync(path.join(root, "data/teams/inter.json"), "utf8"));
const localMartinez = inter.squad.find(player => player.id === "josep-martinez");
const championsMartinez = data.teams.find(team => team.team === "Inter").players.find(player => player.id === "josep-martinez");
assert.deepStrictEqual(championsMartinez.previousSeason, localMartinez.previousSeason, "Inter/Josep Martínez: copia Serie A non identica");
assert(data.teams.find(team => team.team === "Roma").sourceNote.includes("Giorgio De Marzi"));
assert(data.teams.find(team => team.team === "Fenerbahçe").sourceNote.includes("non risultano perfettamente allineate"));
console.log("Rose registrate Champions: test superato.");
