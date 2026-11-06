const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataset = require("./probable-lineups").loadLatestProbableLineups(root);
const players = dataset.teams.flatMap(team => team.players);

const providerUrls={"Fantacalcio.it":"https://www.fantacalcio.it/probabili-formazioni-serie-a","SOS Fanta":"https://www.sosfanta.com/lista-formazioni/probabili-formazioni-serie-a/"};
assert.ok(providerUrls[dataset.provider]);
assert.equal(dataset.sourceUrl,providerUrls[dataset.provider]);
assert.equal(dataset.season, "2026/27");
assert.ok(Number.isInteger(dataset.matchday) && dataset.matchday >= 1 && dataset.matchday <= 38);
assert.equal(dataset.teams.length, 20);
assert.equal(new Set(dataset.teams.map(team => team.teamId)).size, 20);
assert.ok(players.length >= 220);
assert.equal(players.length,dataset.coverage.players);
assert.equal(dataset.coverage.starters, 220);
assert.ok(dataset.teams.every(team => /^[1-9](?:-[1-9]){2,4}$/.test(team.formation) && team.players.filter(player => player.lineupStatus === "starter").length === 11));
assert.ok(players.every(player => ["starter", "reserve"].includes(player.lineupStatus) && Number.isFinite(player.probability)));
assert.equal(dataset.coverage.linkedPlayers + dataset.coverage.linkedListoneOnly + dataset.coverage.unmatched, players.length);
assert.equal(dataset.coverage.omittedNonRoster, dataset.omittedNonRoster.length);
assert.ok(dataset.omittedNonRoster.every(player => !players.some(included => player.sourceId!=null?included.sourceId===player.sourceId:included.teamId===player.teamId&&included.sourceName===player.sourceName)));
assert.ok(players.filter(player => player.matchStatus === "unmatched").every(player => player.lineupStatus === "starter" && player.playerId === null));

console.log(`${dataset.provider} MD${dataset.matchday}: ${dataset.teams.length} squadre, ${dataset.coverage.starters} titolari, ${dataset.coverage.linkedPlayers} collegati, ${dataset.coverage.unmatched} non collegati.`);
