const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-registered-squads-2026-27.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const expected = calendar.teams;

assert.deepStrictEqual(data.teams.map(team => team.team), expected);
assert.strictEqual(data.summary.teams, 36);
assert(data.summary.players > 800);
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
  }
}
assert(data.teams.find(team => team.team === "Roma").sourceNote.includes("Giorgio De Marzi"));
assert(data.teams.find(team => team.team === "Fenerbahçe").sourceNote.includes("non risultano perfettamente allineate"));
console.log("Rose registrate Champions: test superato.");
