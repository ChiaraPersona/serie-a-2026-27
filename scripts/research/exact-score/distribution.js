"use strict";

const sum = values => values.reduce((a, b) => a + b, 0);
const goal = value => Number.isInteger(value) && value >= 0;

// Start at the mode, then recur both ways: no factorial overflow or exp(-lambda) underflow.
function poissonMarginal(lambda, { minGoals = 6, tailTolerance = 1e-12, maxGoalsLimit = 512 } = {}) {
  if (!Number.isFinite(lambda) || lambda < 0) throw new Error("Invalid nonnegative lambda");
  if (!goal(minGoals) || !goal(maxGoalsLimit) || minGoals > maxGoalsLimit || !(tailTolerance > 0 && tailTolerance < 1)) throw new Error("Invalid matrix support options");
  const mode = Math.floor(lambda);
  if (mode > maxGoalsLimit) throw new Error("Lambda exceeds supported matrix resource limit");
  let logFactorial = 0;
  for (let i = 2; i <= mode; i++) logFactorial += Math.log(i);
  const probabilities = Array(mode + 1).fill(0);
  probabilities[mode] = lambda === 0 ? 1 : Math.exp(-lambda + mode * Math.log(lambda) - logFactorial);
  for (let i = mode; i > 0; i--) probabilities[i - 1] = probabilities[i] * i / lambda;
  let mass = sum(probabilities);
  // Bound the uncomputed upper tail by a geometric series, independent of CDF cancellation.
  let tailBound = 1;
  while (true) {
    const k = probabilities.length - 1;
    const next = lambda === 0 ? 0 : probabilities[k] * lambda / (k + 1);
    const ratio = lambda / (k + 2);
    tailBound = ratio < 1 ? next / (1 - ratio) : Infinity;
    if (k >= minGoals && tailBound <= tailTolerance / 2) break;
    if (k >= maxGoalsLimit) throw new Error("Uncontrolled score-matrix tail: increase maxGoalsLimit");
    probabilities.push(next);
    mass += next;
  }
  return { probabilities, mass, residualMass: Math.max(0, 1 - mass), tailBound };
}

function independentPoissonScoreMatrix(lambdaHome, lambdaAway, options = {}) {
  const home = poissonMarginal(lambdaHome, options), away = poissonMarginal(lambdaAway, options);
  const cells = home.probabilities.map(p => away.probabilities.map(q => p * q));
  const mass = sum(cells.flat());
  return { cells, lambdaHome, lambdaAway, distribution: "INDEPENDENT_POISSON", maxHomeGoals: cells.length - 1, maxAwayGoals: cells[0].length - 1,
    representedMass: mass, tailMass: Math.max(0, 1 - mass), tailBound: home.tailBound + away.tailBound,
    tailPolicy: "RAW_PMF_DYNAMIC_SUPPORT_NO_RENORMALIZATION", numericalMassError: Math.abs(1 - mass) };
}

function validateMatrix(matrix, tolerance = 1e-9) {
  const { cells } = matrix;
  if (!Array.isArray(cells) || !cells.length || !cells[0]?.length || cells.some(row => row.length !== cells[0].length)) throw new Error("Invalid rectangular score matrix");
  if (cells.flat().some(p => !Number.isFinite(p) || p < 0 || p > 1)) throw new Error("Invalid score probability");
  const mass = sum(cells.flat());
  if (Math.abs(mass - 1) > tolerance || (matrix.tailBound ?? 0) > tolerance) throw new Error("Score matrix is not normalized with a controlled tail");
  return { valid: true, representedMass: mass, tailMass: matrix.tailMass ?? Math.max(0, 1 - mass), tailBound: matrix.tailBound ?? null, tolerance };
}

function topScores(matrix, n = 3) {
  validateMatrix(matrix);
  if (!Number.isInteger(n) || n < 1) throw new Error("Invalid top-N");
  return matrix.cells.flatMap((row, h) => row.map((probability, a) => ({ homeGoals: h, awayGoals: a, score: `${h}-${a}`, probability })))
    .sort((a, b) => b.probability - a.probability || a.homeGoals - b.homeGoals || a.awayGoals - b.awayGoals)
    .slice(0, n).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function poissonProbability(lambda, k) {
  if (!goal(k)) throw new Error("Invalid actual goals");
  if (lambda === 0) return k === 0 ? 1 : 0;
  let logFactorial = 0;
  for (let i = 2; i <= k; i++) logFactorial += Math.log(i);
  return Math.exp(-lambda + k * Math.log(lambda) - logFactorial);
}

function scoreProbability(matrix, h, a) {
  if (!goal(h) || !goal(a)) throw new Error("Invalid actual score");
  if (matrix.cells[h]?.[a] !== undefined) return matrix.cells[h][a];
  // Exact analytic tail point, not a bucket, when the distribution is known.
  if (matrix.distribution === "INDEPENDENT_POISSON") return poissonProbability(matrix.lambdaHome, h) * poissonProbability(matrix.lambdaAway, a);
  return null;
}

function actualScoreRank(matrix, h, a) {
  const probability = scoreProbability(matrix, h, a);
  if (probability == null || h > matrix.maxHomeGoals || a > matrix.maxAwayGoals) return null;
  return topScores(matrix, matrix.cells.length * matrix.cells[0].length).find(row => row.homeGoals === h && row.awayGoals === a)?.rank ?? null;
}

function deriveMarkets(matrix, lines = [0.5, 1.5, 2.5, 3.5, 4.5]) {
  validateMatrix(matrix);
  if (lines.some(line => !Number.isFinite(line) || line < 0 || line % 1 !== 0.5)) throw new Error("Only half-goal lines are supported");
  const outcomes = { home: 0, draw: 0, away: 0 }, btts = { yes: 0, no: 0 };
  const overUnder = Object.fromEntries(lines.map(line => [line, { over: 0, under: 0 }]));
  const totalGoals = { "0": 0, "1": 0, "2": 0, "3": 0, "4+": 0 };
  matrix.cells.forEach((row, h) => row.forEach((p, a) => {
    outcomes[h > a ? "home" : h === a ? "draw" : "away"] += p;
    btts[h > 0 && a > 0 ? "yes" : "no"] += p;
    for (const line of lines) overUnder[line][h + a > line ? "over" : "under"] += p;
    totalGoals[h + a >= 4 ? "4+" : String(h + a)] += p;
  }));
  return { outcomes, btts, overUnder, totalGoals, aggregationErrorBound: matrix.tailBound ?? matrix.tailMass ?? 0 };
}

function distributionDiagnostics(matrix) {
  const top5 = topScores(matrix, 5);
  return { modalScore: top5[0].score, modalScoreProbability: top5[0].probability, top3: top5.slice(0, 3), top5,
    top3ProbabilityMass: sum(top5.slice(0, 3).map(row => row.probability)), top5ProbabilityMass: sum(top5.map(row => row.probability)),
    entropy: -sum(matrix.cells.flat().filter(p => p > 0).map(p => p * Math.log(p))), entropyScope: "REPRESENTED_MATRIX", modelConfidence: null };
}

module.exports = { independentPoissonScoreMatrix, validateMatrix, topScores, scoreProbability, actualScoreRank, deriveMarkets, distributionDiagnostics };
