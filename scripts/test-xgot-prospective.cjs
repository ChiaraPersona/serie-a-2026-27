"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib");
const { ROOT } = require("./xgot-validation.cjs");
const { canonicalMatchHash, sha256 } = require("./predictions/snapshot-core.js");
const { earlier, predict } = require("./research/xgot/model-v2.cjs");
const base = "data/predictions/xgot-prospective";
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const protocol = read(`${base}/protocol.json`), identities = read(`${base}/identity-registry.json`);
const evaluationMethod = read(`${base}/evaluation-method.json`);
assert.equal(evaluationMethod.integrity.sha256, canonicalMatchHash(evaluationMethod));
const compatibility=read(`${base}/evaluation-compatibility.json`);
assert.equal(compatibility.integrity.sha256,canonicalMatchHash(compatibility));
assert.equal(compatibility.originalEvaluatorHash,evaluationMethod.evaluatorHash);
assert.equal(compatibility.currentEvaluatorHash, sha256(fs.readFileSync(path.join(ROOT, "scripts/research/xgot/evaluate-prospective.cjs")).toString("utf8").replace(/\r\n/g, "\n")));
assert.equal(protocol.integrity.sha256, canonicalMatchHash(protocol));
assert.equal(identities.integrity.sha256, canonicalMatchHash(identities));
assert.equal(identities.protocolHash, protocol.integrity.sha256);
for (const [file, hash] of Object.entries(protocol.methodHashes)) {
  const current=sha256(fs.readFileSync(path.join(ROOT,file),'utf8').replace(/\r\n/g,'\n'));
  if(current!==hash){assert.equal(file,'scripts/predictions/engine.js');assert.equal(sha256(fs.readFileSync(path.join(ROOT,base,'methods',file),'utf8').replace(/\r\n/g,'\n')),hash,file)}
}
const archiveCache = new Map();
const files = fs.readdirSync(path.join(ROOT, `${base}/snapshots`));
for (const file of files) {
  const s = read(`${base}/snapshots/${file}`);
  assert.equal(s.integrity.sha256, canonicalMatchHash(s));
  assert.equal(s.protocolHash, protocol.integrity.sha256);
  assert(Date.parse(s.capturedAt) < Date.parse(s.fixture.kickoffUtc));
  assert(Date.parse(s.baseline.generatedAt) <= Date.parse(s.capturedAt));
  assert(Date.parse(identities.frozenAt) < Date.parse(s.fixture.kickoffUtc));
  assert(Date.parse(evaluationMethod.frozenAt) < Date.parse(s.fixture.kickoffUtc));
  if (!archiveCache.has(s.sourceInputArchive)) {
    const text = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, s.sourceInputArchive))).toString("utf8");
    assert.equal(sha256(text), path.basename(s.sourceInputArchive, ".json.gz"));
    archiveCache.set(s.sourceInputArchive, JSON.parse(text));
  }
  const target = { competition: s.fixture.competition, date: s.fixture.date,
    teams: [s.fixture.homeTeam, s.fixture.awayTeam].map(id => ({ providerTeamId: identities.mappings[id] })) };
  assert(target.teams.every(t => t.providerTeamId));
  const history = earlier(archiveCache.get(s.sourceInputArchive), target, s.capturedAt);
  assert(history.every(m => m.date < target.date && Date.parse(m.availableAt) <= Date.parse(s.capturedAt)));
  for (const variant of ["execution", "quality"]) {
    const replay = predict({ home: s.baseline.goals[0], away: s.baseline.goals[1] }, target, history, variant);
    assert.deepEqual(replay.goals, s.variants[variant].goals);
    assert.deepEqual(replay.feature, s.variants[variant].feature);
  }
}
console.log(`OK xGOT prospective: ${files.length} immutable pre-kickoff paired snapshots; method, identity and input hashes, acquisition times and exact replay verified`);
