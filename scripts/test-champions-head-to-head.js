"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-head-to-head-2026-27.json"), "utf8"));

assert.deepEqual(data.method.seasons, ["2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]);
assert.equal(data.method.maximumMeetingsPerFixture, 4);
assert.equal(data.summary.fixtures, 144);
assert.equal(data.fixtures.length, 144);
assert.equal(data.summary.fixturesWithRecentMeetings, 42);
assert.equal(data.summary.recentMeetingsUsed, 95);
assert.equal(data.summary.fixturesWithRecentMeetings + data.summary.fixturesWithoutRecentMeetings, 144);
assert.ok(data.fixtures.every(item => item.meetings <= 4));
assert.ok(data.fixtures.every(item => item.recentMatches.every(match => data.method.seasons.includes(match.season))));
assert.ok(data.fixtures.every(item => item.meetings === item.homeWins + item.draws + item.awayWins));

console.log(`OK H2H Champions: dal 2020/21 · massimo 4 confronti · ${data.summary.fixturesWithRecentMeetings} gare coperte`);
