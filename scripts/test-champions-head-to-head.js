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
assert.equal(data.summary.recentMeetingsUsed, 96);
assert.equal(data.summary.fixturesWithRecentMeetings + data.summary.fixturesWithoutRecentMeetings, 144);
assert.ok(data.fixtures.every(item => item.meetings <= item.maximumMeetings));
assert.ok(data.fixtures.every(item => item.recentMatches.every(match => data.method.seasons.includes(match.season) || match.sources?.length)));
assert.ok(data.fixtures.every(item => item.meetings === item.homeWins + item.draws + item.awayWins));

const realInter = data.fixtures.find(item => item.fixtureId === "ucl-2026-27-md01-06");
assert.equal(realInter.meetings, 5);
assert.equal(realInter.maximumMeetings, 5);
assert.deepEqual(realInter.recentMatches.map(match => match.id), ["2032726", "2032670", "2029425", "2029417", "55764"]);
assert.ok(realInter.recentMatches.every(match => match.goals.length && Array.isArray(match.bookings) && match.sources.length));
assert.equal(realInter.recentMatches.reduce((total, match) => total + match.goals.length, 0), 14);
assert.equal(realInter.recentMatches.reduce((total, match) => total + match.bookings.length, 0), 21);

console.log(`OK H2H Champions: archivio generale dal 2020/21 · Real Madrid-Inter con 5 precedenti dettagliati · ${data.summary.fixturesWithRecentMeetings} gare coperte`);
