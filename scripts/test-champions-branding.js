"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-league-2026-27.json"), "utf8"));
const squads = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-registered-squads-2026-27.json"), "utf8"));
const historyMap = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-team-history-map-2026-27.json"), "utf8"));
const historyIds = new Map(historyMap.teams.map(item => [item.team, item.uefaTeamId]));

assert.equal(calendar.teamBranding.length, 36);
assert.equal(new Set(calendar.teamBranding.map(item => item.team)).size, 36);
assert.equal(new Set(calendar.teamBranding.map(item => item.logo)).size, 36);
assert.deepEqual(calendar.teamBranding.map(item => item.team).sort(), [...calendar.teams].sort());
assert.equal(squads.teams.length, 36);
assert.deepEqual(calendar.teamBranding.map(item => item.team).sort(), squads.teams.map(item => item.team).sort(), "Ogni logo deve avere una scheda squadra associata");
for (const team of calendar.teamBranding) {
  assert.equal(team.uefaTeamId, historyIds.get(team.team), `${team.team}: ID UEFA non allineato allo storico`);
  assert.match(team.sourceUrl, new RegExp(`/${team.uefaTeamId}\\.png$`), `${team.team}: fonte logo non coerente`);
  const logo = fs.readFileSync(path.join(root, team.logo));
  assert.equal(logo.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${team.team}: firma PNG non valida`);
  assert(logo.length >= 100, `${team.team}: logo vuoto`);
}

console.log("OK branding Champions: 36 squadre · 36 ID UEFA · 36 PNG locali validi");
