"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const context = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-pre-match-context-2026-27.json"), "utf8"));

assert.equal(context.status, "awaiting-final-domestic-match");
assert.equal(context.summary.teams, 36);
assert.equal(context.summary.pendingTeams, 36);
assert.equal(context.summary.readyTeams, 0);
assert.equal(context.summary.remainingMatchesPerPendingTeam, 1);
assert.equal(context.summary.adjustedFixtures, 0);
assert.equal(context.summary.baseOnlyFixtures, 144);
assert.equal(context.summary.allTeamsComplete, false);
assert.equal(context.summary.adjustmentsEnabled, false);
assert.equal(context.teams.length, 36);
assert.equal(new Set(context.teams.map(item => item.team)).size, 36);
assert.ok(context.teams.every(item => item.remainingMatchesBeforeFirstUcl === 1));
assert.ok(context.teams.every(item => item.metrics.lastFivePointsPerMatch === null));
assert.ok(context.teams.every(item => item.metrics.restDays === null));
assert.ok(context.fixtures.filter(item => item.matchday === 1).every(item => item.contextStatus === "awaiting-final-domestic-refresh"));
assert.ok(context.fixtures.filter(item => item.matchday > 1).every(item => item.contextStatus === "future-refresh-required"));
assert.ok(context.fixtures.every(item => item.probabilityStatus === "base-only" && item.totalProbabilityShiftPctPoints === 0));

console.log("OK contesto Champions: 36 squadre pendenti · 144 probabilità base · 0 correzioni parziali");
