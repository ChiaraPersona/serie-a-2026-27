"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/sources/uefa-head-to-head-history-2020-23.json"), "utf8"));
const excluded = data.sources.flatMap(source => source.excludedMatches || []);

assert.deepEqual(data.seasons, ["2020-21", "2021-22", "2022-23"]);
assert.equal(data.matches.length, 1140);
assert.equal(new Set(data.matches.map(match => match.id)).size, 1140);
assert.equal(excluded.length, 4);
assert.ok(data.matches.every(match => match.status === "finished"));
assert.ok(data.matches.every(match => Number.isInteger(match.score90?.home) && Number.isInteger(match.score90?.away)));
assert.ok(excluded.every(match => match.reason === "Risultato nei tempi regolamentari non disponibile"));

console.log("OK archivio H2H UEFA 2020-23: 1140 concluse · 4 non disputate escluse");
