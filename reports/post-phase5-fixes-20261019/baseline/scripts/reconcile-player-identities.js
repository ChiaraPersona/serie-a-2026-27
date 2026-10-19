"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { loadPlayerIdentities } = require("./player-identity");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const identities = loadPlayerIdentities(root);
const counts = { results: 0, officialLineups: 0, probableLineups: 0, predictionArchive: 0 };

function assign(entry, teamId, nameField = "player", idField = "playerId", counter = "results", updateName = false) {
  if (!entry || !teamId || !entry[nameField]) return false;
  const identity = identities.resolve(teamId, entry[nameField]);
  if (!identity) return false;
  const changed = entry[idField] !== identity.playerId;
  entry[idField] = identity.playerId;
  if (updateName) entry[nameField] = identity.canonicalName;
  if (changed) counts[counter] += 1;
  return changed;
}

const resultPath = "data/sources/match-results-2026-27.json";
const results = read(resultPath);
for (const match of results.matches) {
  const teamBySide = { home: match.homeTeam || match.teams?.home, away: match.awayTeam || match.teams?.away };
  if (!teamBySide.home || !teamBySide.away) {
    const normalized = read("data/normalized/matches.json").find(item => item.id === match.matchId);
    if (normalized) {
      teamBySide.home = normalized.homeTeam;
      teamBySide.away = normalized.awayTeam;
    }
  }
  for (const side of ["home", "away"]) {
    const teamId = teamBySide[side];
    for (const entry of match.playerStats?.[side] || []) assign(entry, teamId);
    for (const entry of match.didNotPlay?.[side] || []) assign(entry, teamId);
  }
  for (const entry of match.scorers || []) {
    assign(entry, entry.team);
    if (entry.assist) assign(entry, entry.team, "assist", "assistPlayerId");
  }
  for (const entry of match.bookings || []) assign(entry, entry.team);
  for (const entry of match.substitutions || []) {
    assign(entry, entry.team, "playerIn", "playerInId");
    assign(entry, entry.team, "playerOut", "playerOutId");
  }
  if (match.mvp?.player) assign(match.mvp, match.mvp.team, "player", "playerId");
}
write(resultPath, results);

const officialPath = "data/sources/official-lineups-2026-27.json";
const official = read(officialPath);
for (const fixture of official.fixtures) {
  for (const team of fixture.teams) {
    for (const field of ["players", "substitutes"]) {
      for (const entry of team[field] || []) {
        const identity = identities.resolve(team.teamId, entry.sourceName) || identities.resolve(team.teamId, entry.currentName);
        if (!identity) continue;
        if (entry.playerId !== identity.playerId) counts.officialLineups += 1;
        entry.playerId = identity.playerId;
        entry.currentName = identity.canonicalName;
      }
    }
  }
}
write(officialPath, official);

const probablePath = "data/sources/probable-lineups-md5-2026-27.json";
const probable = read(probablePath);
for (const team of probable.teams) {
  for (const entry of team.players || []) {
    const identity = identities.resolve(team.teamId, entry.sourceName) || identities.resolve(team.teamId, entry.currentName);
    if (!identity) continue;
    if (entry.playerId !== identity.playerId) counts.probableLineups += 1;
    entry.playerId = identity.playerId;
    entry.currentName = identity.canonicalName;
    if (entry.matchStatus === "unmatched") entry.matchStatus = "verified-alias";
    if (entry.associationMethod === "unmatched-source-player") entry.associationMethod = "verified-identity-alias";
  }
}
probable.coverage.unmatched = probable.teams.flatMap(team => team.players).filter(player => !player.playerId).length;
probable.coverage.linkedPlayers = probable.teams.flatMap(team => team.players).filter(player => player.playerId).length;
probable.coverage.verifiedAliases = probable.teams.flatMap(team => team.players).filter(player => player.matchStatus === "verified-alias").length;
write(probablePath, probable);

const archivePath = "data/sources/prediction-archive-md04-2026-27.json";
const archive = read(archivePath);
function reconcileArchive(value) {
  if (Array.isArray(value)) return value.forEach(reconcileArchive);
  if (!value || typeof value !== "object") return;
  if (value.teamId) {
    const nameField = value.name ? "name" : value.lineupName ? "lineupName" : null;
    if (nameField) assign(value, value.teamId, nameField, "playerId", "predictionArchive");
  }
  Object.values(value).forEach(reconcileArchive);
}
reconcileArchive(archive);
write(archivePath, archive);

const remainingOfficial = official.fixtures.flatMap(fixture => fixture.teams.flatMap(team => [
  ...(team.players || []).filter(player => !player.playerId),
  ...(team.substitutes || []).filter(player => !player.playerId)
]));
assert.equal(remainingOfficial.length, 0, `Formazioni ufficiali ancora scollegate: ${remainingOfficial.length}`);
assert.equal(probable.coverage.unmatched, 0, `Probabili MD5 ancora scollegate: ${probable.coverage.unmatched}`);

console.log(JSON.stringify(counts));
