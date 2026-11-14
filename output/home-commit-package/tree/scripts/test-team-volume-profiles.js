"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-volume-profiles-2025-26.json"), "utf8"));

assert.strictEqual(dataset.coverage.matches, 380, "Lo storico volume deve coprire 380 gare");
assert.strictEqual(dataset.coverage.teamPerformances, 760, "Lo storico volume deve contenere 760 prestazioni squadra");
assert.strictEqual(dataset.profiles.length, 20, "Servono 20 profili volume 2025/26");
assert.deepStrictEqual(dataset.metrics, ["totalShots", "shotsOnTarget", "wonCorners"], "Metriche volume inattese");
for (const profile of dataset.profiles) {
  assert.strictEqual(profile.matches, 38, `${profile.teamId}: storico incompleto`);
  for (const metric of dataset.metrics) {
    const overall = profile.venues.overall[metric];
    const home = profile.venues.home[metric];
    const away = profile.venues.away[metric];
    assert.strictEqual(overall.for.matches, 38, `${profile.teamId}/${metric}: totale prodotto incompleto`);
    assert.strictEqual(overall.against.matches, 38, `${profile.teamId}/${metric}: totale concesso incompleto`);
    assert.strictEqual(home.for.matches, 19, `${profile.teamId}/${metric}: casa incompleta`);
    assert.strictEqual(away.for.matches, 19, `${profile.teamId}/${metric}: trasferta incompleta`);
    assert.strictEqual(home.for.values.length + away.for.values.length, overall.for.values.length, `${profile.teamId}/${metric}: campioni sede non riconciliati`);
    assert(overall.for.p20 <= overall.for.median && overall.for.median <= overall.for.p80, `${profile.teamId}/${metric}: percentili non ordinati`);
    assert.strictEqual(profile.recent[metric].matches, 8, `${profile.teamId}/${metric}: forma recente incompleta`);
  }
}
console.log(`OK profili volume: ${dataset.coverage.matches} gare, casa/trasferta e percentili p20-p80 validati`);
