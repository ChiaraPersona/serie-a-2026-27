"use strict";
const fs = require("node:fs"), path = require("node:path");
const { ROOT, read, save } = require("../../xgot-validation.cjs");
const { initialize, score } = require("./prospective.cjs");
const { sha256, canonicalMatchHash } = require("../../predictions/snapshot-core.js");
const { metrics, pairedCI } = require("./run.cjs");
function evaluate() {
  const protocol = initialize(), base = "data/predictions/xgot-prospective";
  const criteria = { minimumFixtures: protocol.configuration.prospectiveMinimumFixtures,
    minimumWeeks: protocol.configuration.prospectiveMinimumWeeks,
    logLoss95CIUpperBelow: 0, brierMustNotWorsen: true, eceMaximumWorsening: 0.01 };
  const hash = sha256(fs.readFileSync(__filename).toString("utf8").replace(/\r\n/g, "\n"));
  const methodFile = `${base}/evaluation-method.json`;
  if (!fs.existsSync(path.join(ROOT, methodFile))) {
    const body = { frozenAt: new Date().toISOString(), protocolHash: protocol.integrity.sha256, evaluatorHash: hash, criteria };
    body.integrity = { sha256: canonicalMatchHash(body) };
    fs.writeFileSync(path.join(ROOT, methodFile), JSON.stringify(body, null, 2) + "\n", { flag: "wx" });
  }
  const method = read(methodFile);
  if (method.integrity.sha256 !== canonicalMatchHash(method) || method.evaluatorHash !== hash || JSON.stringify(method.criteria) !== JSON.stringify(criteria)) throw Error("EVALUATION_METHOD_CHANGED_REVIEW_REQUIRED");
  const completed = new Map(read("data/normalized/matches.json").filter(m => m.status === "finished").map(m => [m.id, m.score]));
  for (const m of read("data/normalized/champions-league-2026-27.json").fixtures) {
    if (m.status === "finished" && (m.score90 || m.matchday <= 8 && m.score)) completed.set(m.id, m.score90 || m.score);
  }
  const directory = path.join(ROOT, `${base}/snapshots`), rows = [], pending = [];
  for (const file of fs.existsSync(directory) ? fs.readdirSync(directory) : []) {
    const s = read(`${base}/snapshots/${file}`);
    if (s.integrity.sha256 !== canonicalMatchHash(s) || s.protocolHash !== protocol.integrity.sha256 ||
      Date.parse(s.capturedAt) >= Date.parse(s.fixture.kickoffUtc)) throw Error("INVALID_PROSPECTIVE_SNAPSHOT");
    const actual = completed.get(s.fixture.id);
    if (!actual || ![actual.home, actual.away].every(v => Number.isInteger(v) && v >= 0)) { pending.push(s.fixture.id); continue; }
    rows.push({ fixtureId: s.fixture.id, competition: s.fixture.competition, date: s.fixture.date,
      baseline: score(s.baseline.p, actual), candidate: score(s.variants[protocol.configuration.primaryCandidate].p, actual) });
  }
  const competitions = ["serie-a", "champions-league"].map(competition => {
    const sample = rows.filter(r => r.competition === competition), baseline = metrics(sample.map(r => r.baseline)), candidate = metrics(sample.map(r => r.candidate));
    const interval = pairedCI(sample), weeks = new Set(sample.map(r => Math.floor((Date.parse(r.date) - 4 * 86400000) / (7 * 86400000)))).size;
    const gates = { sample: sample.length >= criteria.minimumFixtures, weeks: weeks >= criteria.minimumWeeks,
      logLoss: !!interval && interval.upper95 < 0, brier: !!baseline && candidate.brier <= baseline.brier,
      calibration: !!baseline && candidate.ece10 <= baseline.ece10 + criteria.eceMaximumWorsening };
    return { competition, n: sample.length, weeks, baseline, candidate, pairedLogLossCI: interval, gates,
      prospectiveResearchGatePassed: Object.values(gates).every(Boolean), predictiveUseApproved: false };
  });
  const result = { schemaVersion: 2, studyId: protocol.studyId, predictiveUseApproved: false, certifiedProviderSettlement: false,
    evaluatedFixtures: rows.length, pendingFixtures: pending, criteria, evaluationMethodHash: method.integrity.sha256,
    competitions, status: competitions.some(c => c.prospectiveResearchGatePassed) ? "research-signal-requires-review" :
      competitions.some(c => c.gates.sample && c.gates.weeks) ? "adequate-sample-no-clear-benefit" : "insufficient-prospective-evidence" };
  save("data/analysis/xgot/prospective/evaluation-latest.json", result);
  console.log(JSON.stringify({ evaluated: rows.length, pending: pending.length, status: result.status }));
  return result;
}
if (require.main === module) evaluate();
module.exports = { evaluate };
