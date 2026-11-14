"use strict";

const fs = require("fs");
const path = require("path");

function loadLatestProbableLineups(root) {
  const directory = path.join(root, "data/sources");
  const files = fs.readdirSync(directory)
    .filter(file => /^probable-lineups-md\d+-2026-27\.json$/.test(file))
    .sort((a, b) => Number(a.match(/md(\d+)/)[1]) - Number(b.match(/md(\d+)/)[1]));
  if (!files.length) throw new Error("Fonte probabili formazioni mancante");
  return JSON.parse(fs.readFileSync(path.join(directory, files.at(-1)), "utf8"));
}

module.exports = { loadLatestProbableLineups };
