"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/match-results-2026-27.json");
const overlays = read("data/sources/statmuse-player-stats-2026-27.json");
const matches = read("data/normalized/matches.json");
const firstFive = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday <= 5 && match.status === "finished");
const byId = new Map(firstFive.map(match => [match.id, match]));

assert.equal(source.retrievedAt, "2026-09-27");
assert.equal(overlays.updatedAt, "2026-09-27");
assert.equal(source.matches.length, 50);
assert.equal(overlays.matches.length, 50);
assert.equal(firstFive.length, 50);

for (const match of firstFive) {
  for (const side of ["home", "away"]) {
    const rows = match.playerStats[side];
    const sum = field => rows.reduce((total, player) => total + player[field], 0);
    assert.equal(sum("shots"), match.teamStats[side].shots, `${match.id} ${side}: tiri non riconciliati`);
    assert.equal(sum("shotsOnTarget"), match.teamStats[side].shotsOnTarget, `${match.id} ${side}: tiri in porta non riconciliati`);
    assert.equal(sum("foulsCommitted"), match.teamStats[side].fouls, `${match.id} ${side}: falli non riconciliati`);
  }
}

const bolognaSassuolo = byId.get("bologna-sassuolo-2026-27-md-03");
assert.equal(bolognaSassuolo.teamStats.away.fouls, 8);
assert.equal(bolognaSassuolo.playerStats.away.find(player => player.playerId === "kristian-thorstvedt").foulsCommitted, 0);
assert.equal(bolognaSassuolo.playerStats.home.find(player => player.playerId === "lewis-ferguson").foulsWon, 2);

const parmaMonza = byId.get("parma-monza-2026-27-md-03");
assert.equal(parmaMonza.playerStats.home.find(player => player.playerId === "emanuele-valeri").foulsCommitted, 0);
assert.equal(parmaMonza.playerStats.home.find(player => player.playerId === "sascha-britschgi").foulsCommitted, 2);

const comoParma = byId.get("como-parma-2026-27-md-04");
assert.equal(comoParma.teamStats.home.shots, 29);
assert.equal(comoParma.playerStats.home.find(player => player.playerId === "marc-oliver-kempf").shots, 3);

const sassuoloJuventus = byId.get("sassuolo-juventus-2026-27-md-04");
assert.equal(sassuoloJuventus.teamStats.home.fouls, 8);
assert.equal(sassuoloJuventus.teamStats.away.shots, 19);
assert.equal(sassuoloJuventus.teamStats.away.corners, 10);
assert.equal(sassuoloJuventus.playerStats.home.find(player => player.playerId === "jay-idzes").foulsCommitted, 2);
const nicolasGonzalez = sassuoloJuventus.playerStats.away.find(player => player.playerId === "nicolas-gonzalez");
assert.equal(nicolasGonzalez.shots, 3);
assert.equal(nicolasGonzalez.foulsWon, 2);

const romaAtalanta = byId.get("roma-atalanta-2026-27-md-03");
assert.deepEqual(romaAtalanta.scorers.slice(-2).map(item => [item.player, item.minute, item.assist]), [
  ["Mario Hermoso", 90, "Matìas Soulé"],
  ["Matìas Soulé", "90+3", "Paulo Dybala"]
]);

console.log("Refresh StatMuse MD1-MD5 verificato: 50 referti aggiornati, revisioni sensibili e dettagli evento preservati.");
