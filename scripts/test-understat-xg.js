"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "understat-serie-a-xg.json"), "utf8"));
assert.strictEqual(dataset.provider, "Understat", "Provider xG non valido");
assert.strictEqual(dataset.seasons.length, 7, "Servono sette stagioni xG");
assert(dataset.seasons.every(season => season.matches === 380), "Copertura stagionale xG incompleta");
assert.strictEqual(dataset.matches.length, 2660, "Numero partite xG inatteso");
assert(dataset.matches.every(match => Number.isFinite(match.xg.home) && Number.isFinite(match.xg.away)), "xG mancanti");
assert.strictEqual(new Set(dataset.matches.map(match => match.providerMatchId)).size, dataset.matches.length, "Partite xG duplicate");
const rawRoot = path.join(root, "data", "raw", "xg", "understat");
const snapshots = fs.readdirSync(rawRoot).filter(file => file.endsWith(".json.gz"));
assert.strictEqual(snapshots.length, 7, "Snapshot grezzi xG incompleti");
for (const snapshot of snapshots) assert(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(rawRoot, snapshot)))).dates.length >= 380, `${snapshot}: snapshot non valido`);
console.log(`OK Understat xG: ${dataset.matches.length} partite, ${dataset.seasons.length} stagioni complete`);
