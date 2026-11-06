"use strict";
// Read-only verification against the archived calendars and original responses.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const { project, TARGETS } = require("./acquire-xgot-seasons.cjs");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const unpack = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, file))));
const digest = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
let matches = 0, playerObservations = 0;
for (const target of TARGETS) {
  const slug = target.season.replace("/", "-");
  const data = read(`data/normalized/xgot-history-seasons/${target.competition}-${slug}.json`);
  const audit = read(`data/analysis/xgot/seasons/${target.competition}-${slug}.json`);
  assert.deepEqual(data.summary, audit.summary);
  const calendar = unpack(data.calendarEvidence.rawPath);
  assert.equal(digest(data.calendarEvidence.rawPath), data.calendarEvidence.sha256);
  assert.equal(calendar.payload.details.selectedSeason, target.season);
  const fixtures = calendar.payload.fixtures.allMatches.filter(f => f.status.finished && !f.status.cancelled && !f.status.awarded);
  assert.equal(new Set(data.matches.map(m => m.providerMatchId)).size, data.matches.length);
  assert.equal(data.matches.length + audit.failures.length, fixtures.length);
  assert.equal(data.summary.expectedMatches, target.expectedMatches);
  assert.equal(data.summary.predictiveUseApproved, false);
  assert.equal(data.summary.canonicalIdentityValidationComplete, false);
  for (const m of data.matches) {
    const fixture = fixtures.find(f => String(f.id) === m.providerMatchId);
    assert(fixture);
    const raw = unpack(m.source.rawPath);
    assert.equal(digest(m.source.rawPath), m.source.sha256);
    assert.deepEqual(project(raw, fixture, target, m.source.rawPath), m);
    assert.equal(m.fixtureId, null);
    assert.equal(m.predictiveUseApproved, false);
    for (const t of m.teams) assert(t.xgot === null || Number.isFinite(t.xgot) && t.xgot >= 0);
    const publishedKeys = Object.values(raw.payload.content?.playerStats || {}).flatMap(p =>
      (p.stats || []).flatMap(g => Object.values(g.stats || {}))).filter(f => ["expected_goals_on_target", "expected_goals_on_target_variant", "expected_goalsontarget"].includes(f.key));
    assert(m.players.filter(p => p.xgot !== null).length <= publishedKeys.length);
    matches++; playerObservations += m.coverage.playerXgotObservations;
  }
  const first = data.matches[0];
  const raw = unpack(first.source.rawPath);
  const fixture = fixtures.find(f => String(f.id) === first.providerMatchId);
  const wrong = structuredClone(raw); wrong.payload.general.matchId = "wrong";
  assert.throws(() => project(wrong, fixture, target, first.source.rawPath), /identity/);
  const goalkeeperOnly = structuredClone(raw);
  goalkeeperOnly.payload.content.playerStats = { 999: { id: 999, teamId: fixture.home.id, isGoalkeeper: true,
    stats: [{ stats: { faced: { key: "expected_goals_on_target_faced", stat: { value: 1.5 } } } }] } };
  const gk = project(goalkeeperOnly, fixture, target, first.source.rawPath).players[0];
  assert.equal(gk.xgot, null, "Goalkeeper xGOT faced must not become attacking xGOT");
  assert.equal(gk.xgotFaced, 1.5);
  const missing = structuredClone(raw); delete missing.payload.content.stats;
  const projected = project(missing, fixture, target, first.source.rawPath);
  assert(projected.teams.every(t => t.xgot === null));
  assert.equal(projected.coverage.teamXgotPresent, false);
}
console.log(`OK xGOT seasons: ${matches} archived matches, ${playerObservations} published player xGOT observations; hashes, calendars, provider values, missing data and scope separation`);
