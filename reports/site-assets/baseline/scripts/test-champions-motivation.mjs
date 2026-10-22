import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const baseline=read("data/champions-2026-27/team-motivation-baseline.json");
const output=read("data/normalized/champions-motivation-md01-2026-27.json");
assert.equal(baseline.teams.length,36);
assert.equal(new Set(baseline.teams.map(team=>team.teamId)).size,36);
assert.equal(output.fixtures.length,18);
assert.equal(output.teams.length,36);
assert.equal(new Set(output.teams.map(team=>team.team)).size,36);
for(const side of output.teams){
  const m=side.motivation;
  for(const key of ["score","qualificationImportance","seasonalObjective","opponentPrestige","historicalEvent","psychologicalMomentum","pressure","narrativeFactor","homeFactor","urgency","rotationRisk"])assert.ok(m[key]>=0&&m[key]<=100,`${side.team}: ${key}`);
  assert.ok(m.confidence>=0&&m.confidence<=1);
  assert.ok(["low","medium","high","very_high","extreme"].includes(m.level));
  assert.ok(Math.abs(m.contextAdjustment.value)<=10);
  assert.ok(m.reasons.length<=5);
  assert.ok(Math.abs(m.modelAdjustments.motivationStrengthAdjustment)<=0.04);
}
for(const fixture of output.fixtures)assert.ok(fs.existsSync(`data/champions-2026-27/motivation/${fixture.matchId}.json`));
console.log("OK Motivation Champions: baseline 36 · MD1 18 gare/36 squadre · range e audit validi");
