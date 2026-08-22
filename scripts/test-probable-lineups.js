const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/sources/probable-lineups-md1-2026-27.json"), "utf8"));
const players = dataset.teams.flatMap(team => team.players);

assert.equal(dataset.provider, "Sky Sport");
assert.match(dataset.sourceUrl, /^https:\/\/sport\.sky\.it\//);
assert.equal(dataset.season, "2026/27");
assert.equal(dataset.matchday, 1);
assert.equal(dataset.teams.length, 20);
assert.equal(new Set(dataset.teams.map(team => team.teamId)).size, 20);
assert.equal(players.length, 220);
assert.equal(dataset.coverage.starters, 220);
assert.equal(dataset.coverage.ambiguous, 0);
assert.ok(dataset.teams.every(team => /^[1-9](?:-[1-9]){2,4}$/.test(team.formation) && team.players.length === 11));
assert.ok(dataset.teams.every(team => team.updatedAt === dataset.sourceUpdatedAt));
assert.ok(players.every(player => player.lineupStatus === "starter" && player.probability === null));
assert.equal(dataset.coverage.linkedPlayers + dataset.coverage.unmatched, 220);

console.log(`Sky Sport: ${dataset.teams.length} squadre, ${players.length} titolari, ${dataset.coverage.linkedPlayers} collegati.`);
