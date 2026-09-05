import assert from "node:assert/strict";
import fs from "node:fs";
import { settleLeg } from "../js/pages/betting-settlement.mjs";

const matches = JSON.parse(fs.readFileSync(new URL("../data/normalized/matches.json", import.meta.url), "utf8"));
const schedina = JSON.parse(fs.readFileSync(new URL("../data/normalized/schedina-md03.json", import.meta.url), "utf8"));
const byId = new Map(matches.map(match => [match.id, match]));

const expected = new Map([
  ["genoa-como-2026-27-md-03", { score: [1, 4], half: [1, 3], mvp: "Assane Diao" }],
  ["fiorentina-torino-2026-27-md-03", { score: [1, 2], half: [0, 0], mvp: null }],
  ["inter-napoli-2026-27-md-03", { score: [3, 2], half: [0, 0], mvp: null }]
]);

for (const [matchId, wanted] of expected) {
  const match = byId.get(matchId);
  assert.ok(match, `${matchId}: partita assente`);
  assert.equal(match.status, "finished", `${matchId}: stato non finale`);
  assert.deepEqual([match.score.home, match.score.away], wanted.score, `${matchId}: risultato errato`);
  assert.deepEqual([match.halfTimeScore.home, match.halfTimeScore.away], wanted.half, `${matchId}: intervallo errato`);
  assert.equal(match.mvp?.player ?? null, wanted.mvp, `${matchId}: MVP errato`);
  assert.equal(match.playerStats.home.length, 16, `${matchId}: statistiche casa incomplete`);
  assert.equal(match.playerStats.away.length, 16, `${matchId}: statistiche ospite incomplete`);
}

const settled = schedina.slips.flatMap(slip => slip.legs.map(leg => ({
  matchId: leg.matchId,
  ...settleLeg(leg, byId.get(leg.matchId))
}))).filter(item => expected.has(item.matchId));
const totals = settled.reduce((out, item) => {
  out[item.status] = (out[item.status] || 0) + 1;
  return out;
}, {});

assert.deepEqual(totals, { won: 15, lost: 5 }, "Liquidazione parziale MD3 inattesa");
console.log("Risultati MD3 validi: Genoa-Como 1-4, Fiorentina-Torino 1-2, Inter-Napoli 3-2; Schedina 15 esatte e 5 sbagliate.");
