"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function gitSnapshotReader(revision) {
  assert.match(revision, /^[a-f0-9]{40}$/, "Historical revision must be an explicit full commit ID");
  const cache = new Map();
  const bytes = relative => {
    assert(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes(".."), "Invalid snapshot path");
    if (!cache.has(relative)) cache.set(relative, execFileSync("git", ["show", `${revision}:${relative}`], { cwd: root, maxBuffer: 128 * 1024 * 1024 }));
    return cache.get(relative);
  };
  return { bytes, read: relative => JSON.parse(bytes(relative).toString("utf8")), hash: relative => sha256(bytes(relative)).toUpperCase() };
}

// Only explicitly reviewed historical revisions may satisfy a dated guard.
// The recorded hash is never replaced with the current file's hash.
function assertHistoricalFile(item, revision) {
  const expected = item.sha256.toLowerCase();
  const current = fs.readFileSync(path.join(root, item.path));
  if (sha256(current) === expected) return "CURRENT_EQUALS_FROZEN";
  assert(revision, `HISTORICAL_EVIDENCE_MISSING: ${item.path}; recorded SHA-256 ${expected}. No verified historical revision; do not replace this hash with the live hash.`);
  const frozen = gitSnapshotReader(revision).bytes(item.path);
  assert.equal(sha256(frozen), expected, `${item.path}: historical content does not match the original manifest`);
  console.log(`HISTORICAL_GUARD ${item.path} @ ${revision}: original hash verified; current semantic checks are separate`);
  return "VERIFIED_GIT_SNAPSHOT";
}

module.exports = { gitSnapshotReader, assertHistoricalFile, sha256 };
