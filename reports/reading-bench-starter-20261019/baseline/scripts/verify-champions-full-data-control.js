"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256Buffer = value => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = relative => sha256Buffer(fs.readFileSync(path.join(root, relative)));
const sha256Json = value => sha256Buffer(JSON.stringify(value));
const control = read(`data/analysis/champions/full-data-control-${asOf}.json`);
const data = read("data/normalized/champions-player-stats-2026-27.json");

for (const [teamId, expected] of Object.entries(control.protectedTeamSnapshots)) {
  const team = data.teams.find(item => item.id === teamId);
  assert.ok(team, `${teamId}: squadra protetta rimossa`);
  assert.equal(sha256Json(team), expected.sha256, `${teamId}: snapshot protetto modificato`);
  assert.equal(data.teamSnapshots?.[teamId]?.asOf, expected.asOf, `${teamId}: as-of protetto modificato`);
}
for (const item of Object.values(control.protectedFiles)) {
  assert.equal(sha256File(item.path), item.sha256, `${item.path}: file protetto modificato`);
}
for (const raw of control.protectedRawSnapshots) {
  assert.ok(fs.existsSync(path.join(root, raw.path)), `${raw.path}: raw protetto rimosso`);
  assert.equal(sha256File(raw.path), raw.sha256, `${raw.path}: raw protetto sovrascritto`);
}
console.log(`Champions full-data control: OK · ${Object.keys(control.protectedTeamSnapshots).length} squadre · ${control.protectedRawSnapshots.length} raw · ${data.teams.length}/36 nel dataset`);
