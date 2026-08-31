"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

(async () => {
  const expected = new Map([
    ["napoli-como-2026-27-md-02", { score: [1, 2], mvp: "Martin Baturina" }],
    ["cagliari-inter-2026-27-md-02", { score: [0, 1], mvp: "Hakan Çalhanoğlu" }],
    ["lazio-genoa-2026-27-md-02", { score: [1, 0], mvp: "Nuno Tavares" }]
  ]);
  const matches = read("data/normalized/matches.json");
  const matchById = new Map(matches.map(match => [match.id, match]));
  for (const [matchId, wanted] of expected) {
    const match = matchById.get(matchId);
    assert.strictEqual(match?.status, "finished", `${matchId}: stato finale mancante`);
    assert.deepStrictEqual([match.score.home, match.score.away], wanted.score, `${matchId}: risultato errato`);
    assert.strictEqual(match.mvp?.player, wanted.mvp, `${matchId}: MVP ufficiale errato`);
    assert.ok(match.teamStats?.home && match.teamStats?.away, `${matchId}: statistiche di squadra mancanti`);
    assert.ok(match.playerStats?.home?.length >= 15 && match.playerStats?.away?.length >= 15, `${matchId}: statistiche calciatori incomplete`);
  }
  const napoliComo = matchById.get("napoli-como-2026-27-md-02");
  assert(napoliComo.didNotPlay.away.some(player => player.playerId === "jesus-rodriguez"), "Jesús Rodriguez deve risultare non impiegato");

  const { settleLeg } = await import("../js/pages/betting-settlement.mjs");
  const schedina = read("data/normalized/schedina-md02.json");
  const settlements = schedina.slips.flatMap(slip => slip.legs)
    .filter(leg => expected.has(leg.matchId))
    .map(leg => settleLeg(leg, matchById.get(leg.matchId)).status);
  assert(settlements.every(status => ["won", "lost", "void"].includes(status)), "Le quote delle gare di domenica devono essere tutte liquidate");
  const counts = Object.fromEntries(["won", "lost", "void"].map(status => [status, settlements.filter(item => item === status).length]));
  assert.deepStrictEqual(counts, { won: 6, lost: 5, void: 1 });
  console.log(`Risultati domenica validi: ${counts.won} esatte, ${counts.lost} sbagliate, ${counts.void} annullata.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
