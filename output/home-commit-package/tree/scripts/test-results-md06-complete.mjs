import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative => JSON.parse(fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"));
const matches = read("data/normalized/matches.json").filter(match => match.matchday === 6);
const sources = read("data/sources/match-results-2026-27.json");
const expectedScores = new Map(Object.entries({
  "genoa-fiorentina-2026-27-md-06": [2, 1],
  "inter-parma-2026-27-md-06": [3, 0],
  "napoli-frosinone-2026-27-md-06": [3, 0],
  "como-roma-2026-27-md-06": [0, 0],
  "lazio-monza-2026-27-md-06": [3, 1],
  "lecce-bologna-2026-27-md-06": [1, 2],
  "sassuolo-milan-2026-27-md-06": [1, 1],
  "cagliari-juventus-2026-27-md-06": [1, 1],
  "atalanta-venezia-2026-27-md-06": [3, 1],
  "torino-udinese-2026-27-md-06": [2, 1]
}));
const playerFields = ["minutes", "rating", "goals", "assists", "shots", "shotsOnTarget", "expectedGoals", "foulsCommitted", "foulsWon", "hitWoodwork"];
const teamFields = ["possessionPct", "expectedGoals", "expectedAssists", "shots", "shotsOnTarget", "shotsOffTarget", "shotsBlocked", "hitWoodwork", "bigChancesMissed", "corners", "passesCompleted", "passesAttempted", "passAccuracyPct", "keyPasses", "tackles", "tacklesWon", "interceptions", "clearances", "recoveries", "fouls", "yellowCards", "secondYellowCards", "straightRedCards", "penaltiesFor", "penaltiesAgainst", "duelsWon", "aerialsWon", "goalkeeperSaves"];
const finite = value => Number.isFinite(Number(value));

assert.equal(matches.length, 10);
assert.equal(new Set(matches.map(match => match.id)).size, 10);
const missing = [];
for (const match of matches) {
  assert.equal(match.status, "finished", `${match.id}: stato non finale`);
  assert.deepEqual([match.score.home, match.score.away], expectedScores.get(match.id), `${match.id}: risultato inatteso`);
  const matchPlayers = [];
  for (const side of ["home", "away"]) {
    const players = match.playerStats[side];
    assert.equal(players.length, 16, `${match.id} ${side}: impiegati ${players.length}/16`);
    assert.equal(players.filter(player => player.starter).length, 11, `${match.id} ${side}: titolari non 11`);
    assert.equal(new Set(players.map(player => player.playerId)).size, players.length, `${match.id} ${side}: identita duplicate`);
    for (const player of players) {
      assert(player.playerId, `${match.id}: playerId mancante per ${player.player}`);
      assert(player.minutes > 0 && player.minutes <= 90, `${match.id}: minuti anomali per ${player.player}`);
      assert(finite(player.shots) && finite(player.shotsOnTarget) && player.shotsOnTarget <= player.shots, `${match.id}: tiri anomali per ${player.player}`);
      assert(finite(player.foulsCommitted) && finite(player.foulsWon), `${match.id}: falli mancanti per ${player.player}`);
      for (const field of playerFields) if (player[field] === null || player[field] === undefined) missing.push({ matchId: match.id, scope: "player", subject: player.player, field });
    }
    const sum = field => players.reduce((total, player) => total + Number(player[field]), 0);
    assert.equal(sum("shots"), match.teamStats[side].shots, `${match.id} ${side}: tiri non riconciliati`);
    assert.equal(sum("shotsOnTarget"), match.teamStats[side].shotsOnTarget, `${match.id} ${side}: SOT non riconciliati`);
    assert.equal(sum("foulsCommitted"), match.teamStats[side].fouls, `${match.id} ${side}: falli non riconciliati`);
    for (const field of teamFields) {
      if (match.teamStats[side][field] === null || match.teamStats[side][field] === undefined) missing.push({ matchId: match.id, scope: "team", subject: side, field });
    }
    matchPlayers.push(...players);
  }
  assert.equal(new Set(matchPlayers.map(player => player.playerId)).size, matchPlayers.length, `${match.id}: identita duplicate fra squadre`);
  assert.equal(match.resultSource.provider, "StatMuse");
  assert.match(match.resultSource.url, /^https:\/\/www\.statmuse\.com\/fc\/match\//);
}

const players = matches.flatMap(match => [...match.playerStats.home, ...match.playerStats.away]);
const teams = matches.flatMap(match => [match.teamStats.home, match.teamStats.away]);
const available = players.length * playerFields.length + teams.length * teamFields.length - missing.length;
const total = players.length * playerFields.length + teams.length * teamFields.length;
const completenessPct = Number((available / total * 100).toFixed(2));
const officialMd6 = sources.sources.filter(source => source.provider === "Lega Serie A" && source.sourceType === "official-match-result" && source.retrievedAt === "2026-10-13");
assert.equal(officialMd6.length, 10, `fonti ufficiali MD6: ${officialMd6.length}/10`);
assert.equal(players.length, 320);
assert.equal(missing.filter(item => item.scope === "team").length, 0);
assert.equal(completenessPct, 99.68);

console.log(JSON.stringify({ matches: matches.length, players: players.length, completenessPct, missing }, null, 2));
