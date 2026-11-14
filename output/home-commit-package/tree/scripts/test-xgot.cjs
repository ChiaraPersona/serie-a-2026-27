"use strict";

const assert = require("node:assert/strict");
const { describeXgot } = require("./predictions/xgot.cjs");

assert.deepEqual(describeXgot(), { xgot: null, xgotPer90: null, xgotPerShotOnTarget: null });
assert.deepEqual(describeXgot({ xgot: 1.2, shotsOnTarget: 3, minutes: 180 }), {
  xgot: 1.2, xgotPer90: 0.6, xgotPerShotOnTarget: 1.2 / 3
});
assert.deepEqual(describeXgot({ xgot: 0, shotsOnTarget: 0, minutes: 90 }), {
  xgot: 0, xgotPer90: 0, xgotPerShotOnTarget: null
});
assert.equal(describeXgot({ xgot: 0, minutes: 0 }).xgotPer90, null);
assert.equal(describeXgot({ shotsOnTarget: 4, minutes: 90 }).xgot, null);
for (const value of ["1.2", "", NaN, Infinity, -1, false]) {
  assert.throws(() => describeXgot({ xgot: value }), TypeError);
}
assert.throws(() => describeXgot({ shotsOnTarget: 1.5 }), TypeError);
assert.throws(() => describeXgot({ xgot: 2, shotsOnTarget: 1 }), RangeError);
assert.throws(() => describeXgot({ xgot: 1, minutes: 0 }), RangeError);
console.log("OK xGOT: observed values, missing data, rates and scope consistency");
