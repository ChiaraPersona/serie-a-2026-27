"use strict";

const fs = require("fs");
const path = require("path");
const { evaluateSnapshots } = require("./champions/complete-forecast-snapshots");

const root = path.resolve(__dirname, "..");
const snapshotRoot = path.join(root, "data/predictions/champions/pre-match-snapshots");
const actualPath = process.argv.find(argument => argument.startsWith("--actuals="))?.slice("--actuals=".length);
if (!actualPath) throw new Error("Use --actuals=<JSON file>. Evaluation never reconstructs or fetches actuals implicitly.");

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : entry.name.endsWith(".json") ? [full] : [];
  });
}

const snapshots = files(snapshotRoot).map(file => JSON.parse(fs.readFileSync(file, "utf8")));
const actualDocument = JSON.parse(fs.readFileSync(path.resolve(root, actualPath), "utf8"));
const actuals = Array.isArray(actualDocument) ? actualDocument : actualDocument.rows;
if (!Array.isArray(actuals)) throw new Error("Actuals file must be an array or an object with a rows array");
const evaluation = evaluateSnapshots(snapshots, actuals);
console.log(JSON.stringify(evaluation, null, 2));
