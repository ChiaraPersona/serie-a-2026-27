import assert from "node:assert/strict";
import fs from "node:fs";

const matches = JSON.parse(fs.readFileSync(new URL("../data/normalized/matches.json", import.meta.url), "utf8"));
const expected = new Map([
  ["roma-fiorentina-2026-27-md-01", { side: "home", committed: 15, won: 11 }],
  ["lecce-roma-2026-27-md-02", { side: "away", committed: 8, won: 9 }]
]);

for (const [matchId, wanted] of expected) {
  const match = matches.find(item => item.id === matchId);
  assert.ok(match, `${matchId}: partita assente`);
  const players = match.playerStats[wanted.side];
  assert.equal(match.teamStats[wanted.side].fouls, wanted.committed, `${matchId}: totale falli Roma errato`);
  assert.ok(players.every(player => Number.isInteger(player.foulsCommitted)), `${matchId}: falli commessi individuali incompleti`);
  assert.ok(players.every(player => Number.isInteger(player.foulsWon)), `${matchId}: falli subiti individuali incompleti`);
  assert.equal(players.reduce((sum, player) => sum + player.foulsCommitted, 0), wanted.committed, `${matchId}: somma falli commessi non riconciliata`);
  assert.equal(players.reduce((sum, player) => sum + player.foulsWon, 0), wanted.won, `${matchId}: somma falli subiti non riconciliata`);
}

console.log("Falli Roma verificati: 15 commessi/11 subiti con Fiorentina, 8/9 con Lecce; copertura individuale completa.");
