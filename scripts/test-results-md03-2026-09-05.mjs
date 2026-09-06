import assert from "node:assert/strict";
import fs from "node:fs";
import { settleLeg } from "../js/pages/betting-settlement.mjs";

const matches = JSON.parse(fs.readFileSync(new URL("../data/normalized/matches.json", import.meta.url), "utf8"));
const schedina = JSON.parse(fs.readFileSync(new URL("../data/normalized/schedina-md03.json", import.meta.url), "utf8"));
const byId = new Map(matches.map(match => [match.id, match]));

const expected = new Map([
  ["genoa-como-2026-27-md-03", { score: [1, 4], half: [1, 3], mvp: "Assane Diao" }],
  ["fiorentina-torino-2026-27-md-03", { score: [1, 2], half: [0, 0], mvp: null }],
  ["inter-napoli-2026-27-md-03", { score: [3, 2], half: [0, 0], mvp: null }],
  ["roma-atalanta-2026-27-md-03", { score: [2, 1], half: [0, 0], mvp: null }],
  ["frosinone-venezia-2026-27-md-03", { score: [3, 2], half: [2, 0], mvp: null }],
  ["parma-monza-2026-27-md-03", { score: [1, 1], half: [0, 1], mvp: null }],
  ["bologna-sassuolo-2026-27-md-03", { score: [2, 2], half: [0, 1], mvp: null }]
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

const romaAtalanta = byId.get("roma-atalanta-2026-27-md-03");
assert.deepEqual(romaAtalanta.scorers.map(item => [item.player, item.minute, item.assist]), [
  ["Éderson", 47, null],
  ["Mario Hermoso", 90, "Matìas Soulé"],
  ["Matìas Soulé", "90+3", "Paulo Dybala"]
], "Marcatori Roma-Atalanta non riconciliati con il referto ufficiale");
assert.deepEqual(romaAtalanta.bookings.map(item => [item.player, item.minute, item.card]), [
  ["Raoul Bellanova", 84, "yellow"],
  ["Gianluca Gaetano", "90+7", "redCard"]
], "Provvedimenti disciplinari Roma-Atalanta errati");
assert.deepEqual([
  romaAtalanta.teamStats.home.shots,
  romaAtalanta.teamStats.away.shots,
  romaAtalanta.teamStats.home.shotsOnTarget,
  romaAtalanta.teamStats.away.shotsOnTarget,
  romaAtalanta.teamStats.home.corners,
  romaAtalanta.teamStats.away.corners,
  romaAtalanta.teamStats.home.fouls,
  romaAtalanta.teamStats.away.fouls
], [39, 6, 10, 2, 14, 1, 9, 10], "Statistiche di squadra Roma-Atalanta errate");

const frosinoneVenezia = byId.get("frosinone-venezia-2026-27-md-03");
assert.deepEqual(frosinoneVenezia.scorers.map(item => [item.player, item.minute, item.assist]), [
  ["Antonio Raimondo", 21, "Anthony Oyono"],
  ["Antonio Raimondo", 39, "Patrizio Masini"],
  ["John Yeboah", 67, "Gianluca Busio"],
  ["Richie Sagrado", 74, "Antoine Hainaut"],
  ["Giorgi Kvernadze", 83, "Anthony Oyono"]
], "Marcatori Frosinone-Venezia non riconciliati con la cronaca ufficiale");

const parmaMonza = byId.get("parma-monza-2026-27-md-03");
assert.deepEqual(parmaMonza.scorers.map(item => [item.player, item.minute]), [
  ["Jay Robinson", 38],
  ["Simone Lontani", 60]
], "Marcatori Parma-Monza non riconciliati con la cronaca ufficiale");

const bolognaSassuolo = byId.get("bologna-sassuolo-2026-27-md-03");
assert.deepEqual(bolognaSassuolo.scorers.map(item => [item.player, item.minute]), [
  ["Josh Doig", 19],
  ["Roberto Piccoli", 50],
  ["Vasilije Adžić", 56],
  ["Artem Dovbyk", "90+1"]
], "Marcatori Bologna-Sassuolo errati");

const settled = schedina.slips.flatMap(slip => slip.legs.map(leg => ({
  matchId: leg.matchId,
  ...settleLeg(leg, byId.get(leg.matchId))
}))).filter(item => expected.has(item.matchId));
const totals = settled.reduce((out, item) => {
  out[item.status] = (out[item.status] || 0) + 1;
  return out;
}, {});

assert.deepEqual(totals, { won: 26, lost: 12 }, "Liquidazione parziale MD3 inattesa");
console.log("Risultati MD3 validi: 7 gare concluse e liquidazione parziale verificata.");
