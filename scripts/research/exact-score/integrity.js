"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), { execFileSync } = require("child_process");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const researchPath = file => file.startsWith("scripts/research/exact-score/") || file.startsWith("data/analysis/exact-score-research/") || file === "scripts/test-exact-score-research.js" || file === "docs/exact-score-research-framework.md" || file === "docs/exact-score-baselines-m1-m2.md";
function captureProduction(root) {
  const files = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], { cwd: root, maxBuffer: 32 * 1024 * 1024 }).toString().split("\0").filter(Boolean);
  return Object.fromEntries([...new Set(files)].filter(file => file !== "package.json" && !researchPath(file)).sort().map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
}
function assertProductionUnchanged(root, before) {
  const after = captureProduction(root);
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]);
  if (changed.length) throw new Error(`PRODUCTION_FREEZE_VIOLATION: ${changed.join(", ")}`);
  return { checkedFiles: Object.keys(before).length, changedFiles: [], md6FileSHA256: after["data/predictions/snapshots/2026-27/md-06.json"], manifestSHA256: after["data/predictions/snapshots/manifest.json"] };
}
module.exports = { hash, researchPath, captureProduction, assertProductionUnchanged };
