"use strict";

// Reuse the Phase 2C evidence matcher against the extended Phase 2D dataset.
const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "import-champions-referee-phase-2c-designations.js");
let source = fs.readFileSync(sourcePath, "utf8");
const replacements = [
  [
    'const rawRoot = path.join(root, "data/raw/champions-referee-phase-2c", snapshotDate);',
    'const rawRoot = path.join(root, "data/raw/champions-referee-phase-2d", snapshotDate);'
  ],
  [
    'const outputPath = path.join(root, "data/analysis/champions/referee-phase-2c/designation-evidence.json");',
    'const outputPath = path.join(root, "data/analysis/champions/referee-phase-2d/designation-evidence.json");'
  ],
  [
    'const matchesPath = path.join(root, "data/analysis/champions/referee-phase-2b/match-totals.json");',
    'const matchesPath = path.join(root, "data/analysis/champions/referee-phase-2d/dataset/match-totals.json");'
  ],
  [
    'const registryPath = path.join(root, "data/analysis/champions/referee-phase-2b/referee-registry.json");',
    'const registryPath = path.join(root, "data/analysis/champions/referee-phase-2d/dataset/referee-registry.json");'
  ],
  [
    'writeJson(path.join(rawRoot, "manifest.json"), manifest);',
    'writeJson(path.join(root, "data/analysis/champions/referee-phase-2d/designation-source-manifest.json"), manifest);'
  ],
  ['phase: "2C.2"', 'phase: "2D designation extension"']
];
for (const [needle, replacement] of replacements) {
  if (!source.includes(needle)) throw new Error(`Phase 2C source contract changed: ${needle}`);
  source = source.replace(needle, replacement);
}
const evidenceAnchor = "const officialEvidenceSources = [";
if (!source.includes(evidenceAnchor)) throw new Error("Phase 2C official-evidence contract changed");
source = source.replace(evidenceAnchor, `${evidenceAnchor}\n  {\n    id: "uefa-2021-22-final-appointment",\n    url: "https://www.uefa.com/news/0275-151e8ecbd274-6977b4d49988-1000--clement-turpin-to-referee-final/",\n    publishedDate: "2022-05-11", matchIds: ["ucl:2021-22:2034586"]\n  },`);
const execute = new Function("require", "__dirname", "__filename", source);
execute(require, __dirname, sourcePath);
