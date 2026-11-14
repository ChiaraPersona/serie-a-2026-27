"use strict";

const { freezeMd06, snapshotRelative, manifestRelative } = require("./prospective-md06");

const args = process.argv.slice(2);
const value = name => {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1] ?? true;
};

try {
  const result = freezeMd06({
    replacePrekickoff: Boolean(value("--replace-prekickoff")),
    reason: value("--reason"),
  });
  console.log(JSON.stringify({
    status: result.snapshot.status,
    protocol: result.snapshot.researchProtocol,
    matchesFrozen: result.snapshot.matchCount,
    predictionsFrozen: result.snapshot.predictionCount,
    createdAt: result.snapshot.createdAt,
    snapshot: snapshotRelative,
    manifest: manifestRelative,
    containerHash: result.snapshot.integrity.sha256,
    productionIntegrity: result.snapshot.productionIntegrity.status,
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
