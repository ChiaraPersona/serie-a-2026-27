const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/sources/probable-lineups-md2-2026-27.json"), "utf8"));
const players = dataset.teams.flatMap(team => team.players);

assert.equal(dataset.provider, "Fantacalcio.it");
assert.equal(dataset.sourceUrl, "https://www.fantacalcio.it/probabili-formazioni-serie-a");
assert.equal(dataset.season, "2026/27");
assert.equal(dataset.matchday, 2);
assert.equal(dataset.teams.length, 20);
assert.equal(new Set(dataset.teams.map(team => team.teamId)).size, 20);
assert.ok(players.length >= 440);
assert.equal(dataset.coverage.starters, 220);
assert.ok(dataset.teams.every(team => /^[1-9](?:-[1-9]){2,4}$/.test(team.formation) && team.players.filter(player => player.lineupStatus === "starter").length === 11));
assert.ok(players.every(player => ["starter", "reserve"].includes(player.lineupStatus) && Number.isFinite(player.probability)));
assert.equal(dataset.coverage.linkedPlayers + dataset.coverage.linkedListoneOnly + dataset.coverage.unmatched, players.length);

console.log(`Fantacalcio MD2: ${dataset.teams.length} squadre, ${dataset.coverage.starters} titolari, ${dataset.coverage.linkedPlayers} collegati.`);
