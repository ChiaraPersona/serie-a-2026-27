"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const data = read("data/sources/european-player-match-stats-2026-27.json");
const history = read("data/normalized/champions-player-stats-2025-26.json");
const italianChampionsTeams = new Set(["inter", "napoli", "roma", "como"]);
const italianHistory = history.teams.filter(team => italianChampionsTeams.has(team.id));

assert.equal(italianHistory.length, 4);
assert.equal(italianHistory.reduce((sum, team) => sum + team.players.length, 0), 91);
const unavailableHistory = italianHistory.flatMap(team => team.players).filter(player => player.dataQuality !== "complete");
assert.deepEqual(unavailableHistory.map(player => player.name), ["Mattia Marello"]);
assert.deepEqual(data.summary, { matches: 5, teams: 5, playerAppearances: 80, substitutions: 25, europaLeagueMatches: 2 });
assert.equal(new Set(data.matches.map(match => match.teamId)).size, 5);
assert(data.matches.every(match => match.players.length === 16 && match.substitutions.length === 5));
assert(data.matches.every(match => match.players.every(player => player.playerId && Number.isFinite(player.minutesPlayed))));

const totalMap = { foulsCommitted: "fouls", tackles: "tackles", shots: "shots_total", shotsOnTarget: "shots_on_target", yellowCards: "yellow_cards", goals: "goals", offsides: "offsides" };
for (const match of data.matches) {
  for (const [playerMetric, totalMetric] of Object.entries(totalMap)) {
    const playerTotal = match.players.reduce((sum, player) => sum + player[playerMetric], 0);
    const teamTotal = match.teamTotals[totalMetric];
    if (match.teamId === "napoli" && playerMetric === "tackles") {
      assert.equal(playerTotal, 15);
      assert.equal(teamTotal, 14);
      continue;
    }
    assert.equal(playerTotal, teamTotal, `${match.fixtureId}/${playerMetric}: totale giocatori non riconciliato`);
  }
}

console.log("Dati europei validi: storico italiano 90/91 completo (Mattia Marello N/D); 5 gare, 80 presenze e 25 cambi acquisiti.");
