"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const git = process.env.CODEX_GIT_PATH || "git";
const historical = JSON.parse(execFileSync(git, ["show", "HEAD:data/normalized/predictions.json"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const predictions = historical.predictions.filter(prediction => prediction.matchId.endsWith("-md-04"));
if (predictions.length !== 9) throw new Error(`Snapshot MD4 incompleto in HEAD: ${predictions.length}/9`);
const output = {
  schemaVersion: 1,
  season: "2026/27",
  matchday: 4,
  frozenBecause: "Giornata conclusa: i pronostici e le MyCombo pubblicati devono restare invariati.",
  predictions
};
const target = path.join(root, "data/sources/prediction-archive-md04-2026-27.json");
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Archivio pronostici MD4 creato: ${predictions.length} gare.`);
