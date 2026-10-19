"use strict";

// Reuse the validated Phase 2B parser without changing its source or outputs.
// The 2021/22 raw season was already captured as burn-in; Phase 2D promotes it
// to an analysis season and writes to a separate directory.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(__dirname, "import-champions-referee-phase-2b.js");
let source = fs.readFileSync(sourcePath, "utf8");

const replacements = [
  [
    'const outRoot = path.join(root, "data/analysis/champions/referee-phase-2b");',
    'const outRoot = path.join(root, "data/analysis/champions/referee-phase-2d/dataset");'
  ],
  [
    '{ season: "2021-22", seasonYear: 2022, espnStartYear: 2021, expected: 125, target: false }',
    '{ season: "2021-22", seasonYear: 2022, espnStartYear: 2021, expected: 125, target: true }'
  ],
  ['phase: "Champions referee integration 2B"', 'phase: "Champions referee integration 2D extended dataset"'],
  ['burnInSeasons: ["2021-22"]', 'burnInSeasons: []'],
  ['capturedForPhase: "2B"', 'capturedForPhase: "2D_REUSED_FROM_PHASE_2B_RAW"'],
  [
    'writeJson(path.join(rawRoot, "manifest.json"), manifest);',
    'writeJson(path.join(outRoot, "source-manifest.json"), manifest);'
  ],
  [
    'console.log(`Phase 2B imported: ${targetMatches.length} target matches, ${targetTeams.length} team rows, ${targetPlayers.length} player appearances, ${quality.coverage.refereesIdentified} referees`);',
    'console.log(`Phase 2D dataset: ${targetMatches.length} matches, ${targetTeams.length} team rows, ${targetPlayers.length} player appearances, ${quality.coverage.refereesIdentified} referees`);'
  ]
];

for (const [needle, replacement] of replacements) {
  if (!source.includes(needle)) throw new Error(`Phase 2B source contract changed: ${needle}`);
  source = source.replace(needle, replacement);
}

const execute = new Function("require", "__dirname", "__filename", source);
execute(require, __dirname, sourcePath);
