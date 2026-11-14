"use strict";

// Descriptive calculations only. Missing observations are never estimated.
function nonNegative(value, field) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${field}: expected a finite non-negative number or null`);
  }
  return value;
}

function describeXgot({ xgot, shotsOnTarget, minutes } = {}) {
  const observed = nonNegative(xgot, "xgot");
  const shots = nonNegative(shotsOnTarget, "shotsOnTarget");
  const played = nonNegative(minutes, "minutes");
  if (shots !== null && !Number.isInteger(shots)) throw new TypeError("shotsOnTarget: expected an integer");
  if (observed !== null && shots !== null && observed > shots) {
    throw new RangeError("xgot cannot exceed shotsOnTarget for the same observation scope");
  }
  if (observed > 0 && played === 0) throw new RangeError("positive xgot requires playing time");
  return {
    xgot: observed,
    xgotPer90: observed !== null && played > 0 ? observed * 90 / played : null,
    xgotPerShotOnTarget: observed !== null && shots > 0 ? observed / shots : null
  };
}

module.exports = { describeXgot };
