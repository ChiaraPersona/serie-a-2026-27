"use strict";
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib");
const { ROOT, read, save } = require("../../xgot-validation.cjs");
const { canonicalMatchHash, sha256, toKickoffUtc } = require("../../predictions/snapshot-core.js");
const { CONFIG, earlier, predict } = require("./model-v2.cjs");
const { metrics, pairedCI } = require("./run.cjs");
const BASE = "data/predictions/xgot-prospective";
const METHODS = ["docs/xgot-protocol-v2.json", "scripts/research/xgot/model-v2.cjs", "scripts/research/xgot/prospective.cjs",
  "scripts/research/xgot/run.cjs", "docs/xgot-validation-protocol.json", "scripts/predictions/engine.js", "scripts/predictions/snapshot-core.js"];
const methodHashes = () => Object.fromEntries(METHODS.map(file => [file, sha256(fs.readFileSync(path.join(ROOT, file)).toString("utf8").replace(/\r\n/g, "\n"))]));
function immutable(file, value) {
  const absolute = path.join(ROOT, file), text = JSON.stringify(value, null, 2) + "\n";
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  if (fs.existsSync(absolute)) {
    if (fs.readFileSync(absolute, "utf8") !== text) throw Error(`IMMUTABLE_CONTENT_CONFLICT ${file}`);
  } else fs.writeFileSync(absolute, text, { flag: "wx" });
}
function initialize() {
  const file = `${BASE}/protocol.json`;
  if (fs.existsSync(path.join(ROOT, file))) {
    const protocol = read(file);
    if (protocol.integrity?.sha256 !== canonicalMatchHash(protocol) || JSON.stringify(protocol.methodHashes) !== JSON.stringify(methodHashes())) throw Error("METHOD_OR_PROTOCOL_CHANGED_NEW_STUDY_REQUIRED");
    return protocol;
  }
  const protocol = { schemaVersion: 2, studyId: "xgot-prospective-v2", activatedAt: new Date().toISOString(),
    production: false, configuration: CONFIG, methodHashes: methodHashes(),
    clockPolicy: "LOCAL_SYSTEM_UTC; no external timestamp authority; no backdating or replacement" };
  protocol.integrity = { sha256: canonicalMatchHash(protocol), algorithm: "SHA-256" };
  immutable(file, protocol);
  return protocol;
}
function captureEligibility(fixture, baseline, capturedAt) {
  const now = Date.parse(capturedAt), kickoff = toKickoffUtc(fixture), generated = Date.parse(baseline?.generatedAt);
  if (!Number.isFinite(now) || !kickoff || kickoff <= now || fixture.status !== "scheduled") return "started-or-not-scheduled";
  if (!Number.isFinite(generated) || generated > now || now - generated > CONFIG.maximumBaselineAgeHours * 3600000) return "missing-future-or-stale-baseline";
  if (![baseline?.expectedGoals?.home, baseline?.expectedGoals?.away].every(v => typeof v === "number" && Number.isFinite(v) && v > 0)) return "missing-baseline-goals";
  return null;
}
function providerMaps() {
  const names = new Map();
  for (const dir of ["data/normalized/xgot-history-seasons", "data/normalized/xgot-extended-seasons"]) for (const file of fs.readdirSync(path.join(ROOT, dir))) {
    for (const m of read(`${dir}/${file}`).matches) for (const t of m.teams) {
      if (!names.has(t.name)) names.set(t.name, new Set()); names.get(t.name).add(t.providerTeamId);
    }
  }
  const result = new Map();
  for (const t of read("data/teams/index.json").teams) if (names.get(t.name)?.size === 1) result.set(t.id, [...names.get(t.name)][0]);
  const acquisition = read("data/analysis/champions/season-shots-2026-10-20/fotmob-match-acquisition.json");
  for (const t of acquisition.teams) result.set(t.teamId, String(t.providerTeamId));
  return result;
}
function pendingBaselines() {
  const predictions = read("data/normalized/predictions.json"), serie = read("data/normalized/matches.json");
  const pending = serie.filter(f => f.status === "scheduled").map(f => ({ fixture: f,
    baseline: predictions.predictions.find(p => p.matchId === f.id) }));
  const calendar = read("data/normalized/champions-league-2026-27.json");
  const scenarios = read("data/generated/champions-shared-scenarios.json");
  const teams = read("data/sources/champions-pilot-match-stats-2025-27.json").teams;
  const idFor = name => { const found = teams.filter(t => t.name === name); return found.length === 1 ? found[0].id : null; };
  for (const f of calendar.fixtures) {
    const p = scenarios.fixtures.find(p => p.fixtureId === f.id);
    if (!p) continue;
    pending.push({ fixture: { ...f, competition: "champions-league", status: f.status || "scheduled", homeTeam: idFor(f.homeTeam), awayTeam: idFor(f.awayTeam) },
      baseline: { ...p, generatedAt: p.generatedAt || scenarios.generatedAt,
        probabilities: { final: { "1": p.probabilities.home, X: p.probabilities.draw, "2": p.probabilities.away } } } });
  }
  return pending;
}
function capture() {
  const protocol = initialize(), capturedAt = new Date().toISOString();
  const research = read("data/normalized/xgot-team-research-v2.json").matches;
  const providerByTeam = providerMaps(), pending = pendingBaselines(), result = { capturedAt, captured: [], existing: [], abstentions: [] };
  let archivePath = null;
  for (const { fixture, baseline } of pending) {
    const reason = captureEligibility(fixture, baseline, capturedAt);
    if (reason) { if (toKickoffUtc(fixture) > Date.parse(capturedAt) && baseline) result.abstentions.push({ fixtureId: fixture.id, reason }); continue; }
    if (!/^[a-zA-Z0-9_-]+$/.test(fixture.id)) throw Error("Unsafe fixture ID");
    const file = `${BASE}/snapshots/${fixture.id}.json`;
    if (fs.existsSync(path.join(ROOT, file))) {
      const existing = read(file);
      if (existing.integrity?.sha256 !== canonicalMatchHash(existing)) throw Error(`Snapshot tampered ${file}`);
      result.existing.push(fixture.id); continue;
    }
    const providerIds = [fixture.homeTeam, fixture.awayTeam].map(id => providerByTeam.get(id));
    if (providerIds.some(id => !id)) { result.abstentions.push({ fixtureId: fixture.id, reason: "unresolved-provider-team" }); continue; }
    const target = { date: fixture.date, competition: fixture.competition || "serie-a", teams: providerIds.map(providerTeamId => ({ providerTeamId })) };
    const history = earlier(research, target, capturedAt);
    const variants = Object.fromEntries(["execution", "quality"].map(name => [name, predict(baseline.expectedGoals, target, history, name)]));
    if (Object.values(variants).some(v => !v.goals)) { result.abstentions.push({ fixtureId: fixture.id, reason: "insufficient-acquired-history" }); continue; }
    const published = baseline.probabilities?.final;
    const p = [published?.["1"], published?.X, published?.["2"]].map(v => v / 100);
    if (!p.every(v => Number.isFinite(v) && v > 0 && v < 1) || Math.abs(p.reduce((a, b) => a + b, 0) - 1) > 0.00001) {
      result.abstentions.push({ fixtureId: fixture.id, reason: "missing-published-probabilities" }); continue;
    }
    if (!archivePath) {
      const text = JSON.stringify(research), hash = sha256(text);
      archivePath = `${BASE}/inputs/${hash}.json.gz`;
      const filePath = path.join(ROOT, archivePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, zlib.gzipSync(text), { flag: "wx" });
      else if (sha256(zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8")) !== hash) throw Error("Historical input archive tampered");
    }
    const payload = { schemaVersion: 2, studyId: protocol.studyId, protocolHash: protocol.integrity.sha256,
      capturedAt, fixture: { id: fixture.id, competition: target.competition, season: "2026-27", matchday: fixture.matchday,
        date: fixture.date, kickoffUtc: new Date(toKickoffUtc(fixture)).toISOString(), homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam },
      production: false, primaryCandidate: CONFIG.primaryCandidate, sourceInputArchive: archivePath,
      baseline: { goals: [baseline.expectedGoals.home, baseline.expectedGoals.away], p, generatedAt: baseline.generatedAt,
        engineVersion: baseline.engineVersion || null, originalPrediction: baseline },
      variants: Object.fromEntries(Object.entries(variants).map(([name, v]) => {
        const exact = [v.matrix.filter(s => s.home > s.away), v.matrix.filter(s => s.home === s.away), v.matrix.filter(s => s.home < s.away)].map(ss => ss.reduce((n, s) => n + s.probability, 0));
        const first = Math.round(exact[0] * 1000) / 1000, draw = Math.round(exact[1] * 1000) / 1000;
        return [name, { goals: v.goals, p: [first, draw, 1 - first - draw], exactProbabilities: exact, feature: v.feature }];
      })) };
    payload.integrity = { sha256: canonicalMatchHash(payload), algorithm: "SHA-256" };
    immutable(file, payload); result.captured.push(fixture.id);
  }
  save("data/analysis/xgot/prospective/capture-latest.json", result);
  console.log(JSON.stringify({ capturedAt, captured: result.captured.length, existing: result.existing.length, abstentions: result.abstentions.length }));
  return result;
}
function score(p, actual) {
  const outcome = actual.home > actual.away ? 0 : actual.home === actual.away ? 1 : 2;
  return { p, outcome, logLoss: -Math.log(Math.max(p[outcome], 1e-12)), brier: p.reduce((n, v, i) => n + (v - Number(i === outcome)) ** 2, 0) };
}
function evaluatePending() {
  const protocol = initialize(), finished = new Map(read("data/normalized/matches.json").filter(m => m.status === "finished").map(m => [m.id, m]));
  const calendar = read("data/normalized/champions-league-2026-27.json");
  for (const m of calendar.fixtures) if (m.status === "finished" && (m.score90 || m.matchday <= 8 && m.score)) {
    finished.set(m.id, { ...m, score: m.score90 || m.score });
  }
  const dir = path.join(ROOT, `${BASE}/snapshots`), evaluated = [], pending = [];
  for (const file of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const snap = read(`${BASE}/snapshots/${file}`);
    if (snap.integrity?.sha256 !== canonicalMatchHash(snap) || snap.protocolHash !== protocol.integrity.sha256) throw Error("Snapshot integrity failed");
    const actual = finished.get(snap.fixture.id)?.score;
    if (!actual || ![actual.home, actual.away].every(v => Number.isInteger(v) && v >= 0)) { pending.push(snap.fixture.id); continue; }
    evaluated.push({ fixtureId: snap.fixture.id, date: snap.fixture.date, baseline: score(snap.baseline.p, actual), candidate: score(snap.variants[CONFIG.primaryCandidate].p, actual) });
  }
  const report = { schemaVersion: 2, studyId: protocol.studyId, predictiveUseApproved: false, certifiedProviderSettlement: false,
    evaluatedFixtures: evaluated.length, pendingFixtures: pending, baseline: metrics(evaluated.map(m => m.baseline)),
    candidate: metrics(evaluated.map(m => m.candidate)), pairedLogLossCI: pairedCI(evaluated),
    minimumFixtures: CONFIG.prospectiveMinimumFixtures, minimumWeeks: CONFIG.prospectiveMinimumWeeks,
    status: "research-only-insufficient-prospective-evidence" };
  save("data/analysis/xgot/prospective/evaluation-latest.json", report);
  console.log(JSON.stringify({ evaluated: evaluated.length, pending: pending.length, predictiveUseApproved: false }));
  return report;
}
if (require.main === module) {
  const command = process.argv[2];
  if (process.argv.some(a => ["--now", "--replace", "--retrospective"].includes(a))) throw Error("Backdating and replacement are not supported");
  if (command === "capture") capture();
  else if (command === "evaluate") evaluatePending();
  else if (command === "initialize") console.log(JSON.stringify(initialize()));
  else throw Error("Use capture, evaluate or initialize");
}
module.exports = { captureEligibility, capture, evaluatePending, initialize, score };
