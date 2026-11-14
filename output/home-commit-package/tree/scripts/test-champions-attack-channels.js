"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-attack-channels-2025-26.json"), "utf8"));
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));

assert.strictEqual(data.coverage.teams, 36);
assert.strictEqual(data.coverage.available, 30);
assert.strictEqual(data.coverage.unavailable, 6);
assert.strictEqual(data.coverage.domestic, 28);
assert.strictEqual(data.coverage.uefaFallback, 2);
assert.deepStrictEqual(data.profiles.map(profile => profile.team), calendar.teams);
assert.deepStrictEqual(data.profiles.filter(profile => !profile.attackChannels).map(profile => profile.team), ["AEK Athens", "LASK", "Sabah", "Shakhtar Donetsk", "Slovan Bratislava", "Viking"]);

for (const profile of data.profiles) {
  if (!profile.attackChannels) {
    assert(profile.unavailableReason);
    assert.strictEqual(profile.counts, null);
    continue;
  }
  const channels = profile.attackChannels;
  assert(["left", "central", "right"].includes(channels.dominant));
  assert(Math.abs(channels.left + channels.central + channels.right - 100) <= 0.2, `${profile.team}: somma percentuali non valida`);
  assert(profile.totalTouches === profile.counts.reduce((sum, value) => sum + value, 0));
  assert(/^https:\/\/it\.whoscored\.com\//.test(profile.sourceUrl));
}

const arsenal = data.profiles.find(profile => profile.team === "Arsenal");
assert.deepStrictEqual(arsenal.counts, [4646, 3877, 6121]);
assert.strictEqual(arsenal.attackChannels.dominant, "right");
console.log("Fasce d'attacco Champions: 30 disponibili · 6 N/D espliciti.");
