"use strict";

const { evaluateFrozenMd06, evaluationRelative } = require("./prospective-md06");

try {
  const result = evaluateFrozenMd06();
  console.log(JSON.stringify({
    status: result.status,
    commonSample: result.commonSample.n,
    pendingMatches: result.pendingMatchIds.length,
    predictionRecalculation: result.predictionRecalculation,
    output: evaluationRelative,
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
