#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
const tokens = value => normalize(value).split(/\s+/).filter(Boolean);
const teams = read("data/normalized/teams.json");
const missing = teams.flatMap(team => read(`data/generated/team-pages/${team.id}-squad.json`).players
  .filter(player => player.dataQuality?.status !== "complete")
  .map(player => ({ teamId: team.id, id: player.id, name: player.name, espnId: player.providerIds?.espn || null })));

const athletes = new Map();
for (const competition of ["serie-a", "serie-b"]) {
  const directory = path.join(root, `data/raw/team-pages/espn/2025-26/${competition}`);
  for (const filename of fs.readdirSync(directory).filter(name => name.endsWith(".json.gz"))) {
    const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(directory, filename))).toString("utf8"));
    for (const roster of raw.bundle?.summary?.rosters || []) {
      for (const row of roster.roster || []) {
        const id = String(row.athlete?.id || "");
        if (!id) continue;
        const existing = athletes.get(id) || { id, names: new Set(), teams: new Set(), appearances: 0 };
        for (const name of [row.athlete?.fullName, row.athlete?.displayName, row.athlete?.shortName]) if (name) existing.names.add(name);
        if (roster.team?.displayName) existing.teams.add(roster.team.displayName);
        if ((row.stats || []).some(stat => stat.name === "appearances" && Number(stat.value) > 0)) existing.appearances++;
        athletes.set(id, existing);
      }
    }
  }
}

const candidates = [...athletes.values()].map(athlete => ({
  ...athlete,
  names: [...athlete.names],
  teams: [...athlete.teams],
  normalizedNames: [...athlete.names].map(normalize),
  tokenSets: [...athlete.names].map(name => new Set(tokens(name)))
}));

for (const player of missing.filter(player => !player.espnId)) {
  const wanted = normalize(player.name);
  const wantedTokens = tokens(player.name);
  const matches = candidates.filter(candidate => candidate.normalizedNames.some(name =>
    name === wanted || name.endsWith(` ${wanted}`) || wanted.endsWith(` ${name}`) ||
    (wantedTokens.length && wantedTokens.every(token => name.split(" ").some(part => part === token || part.startsWith(token))))
  ));
  console.log(JSON.stringify({ ...player, matches: matches.map(match => ({ id: match.id, names: match.names, teams: match.teams, appearances: match.appearances })) }));
}

const rosterPlayers = teams.flatMap(team => read(`data/generated/team-pages/${team.id}-squad.json`).players);
console.log(JSON.stringify({
  players: rosterPlayers.length,
  complete: rosterPlayers.filter(player => player.dataQuality?.status === "complete").length,
  partial: rosterPlayers.filter(player => player.dataQuality?.status === "partial").length,
  unavailable: rosterPlayers.filter(player => player.dataQuality?.status === "unavailable").length
}));
