#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const outputFile = path.join(root, "data/generated/team-pages/transfer-check.json");
const configFiles = ["completed-teams-2026-27.json", "remaining-teams-2026-27.json"];
const configuredTeams = Object.assign(
  {},
  ...configFiles.map(file =>
    JSON.parse(fs.readFileSync(path.join(root, "data/sources/team-pages", file), "utf8")).teams
  )
);
const teams = {
  milan: {
    name: "Milan",
    espnTeamId: "103",
    espnLeague: "ita.1",
    source: {
      provider: "AC Milan / ESPN",
      url: "https://www.acmilan.com/en/teams/men-first-team",
      scope: "Rosa ufficiale confrontata con la rosa corrente ESPN"
    }
  },
  ...configuredTeams
};

const selectedArg = process.argv.find(argument => argument.startsWith("--teams="));
const selectedTeams = selectedArg
  ? selectedArg.slice(8).split(",").map(value => value.trim()).filter(Boolean)
  : Object.keys(teams);
const writeReport = !process.argv.includes("--no-write");

const normalize = value =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

function playerView(player) {
  return {
    espnId: player.espnId || null,
    name: player.name,
    role: player.role || null,
    shirtNumber: player.shirtNumber ?? null
  };
}

function currentPlayers(teamId) {
  const file = path.join(root, `data/generated/team-pages/${teamId}-squad.json`);
  if (!fs.existsSync(file)) throw new Error(`${teams[teamId].name}: rosa generata assente`);
  return JSON.parse(fs.readFileSync(file, "utf8")).players.map(player => ({
    espnId: player.providerIds?.espn ? String(player.providerIds.espn) : null,
    name: player.name,
    role: player.role,
    shirtNumber: player.shirtNumber
  }));
}

async function livePlayers(teamId) {
  const team = teams[teamId];
  const league = team.espnLeague || "ita.1";
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${team.espnTeamId}/roster`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0", accept: "application/json" }
  });
  if (!response.ok) throw new Error(`${team.name}: ESPN HTTP ${response.status}`);
  const payload = await response.json();
  return {
    url,
    players: (payload.athletes || []).map(athlete => ({
      espnId: athlete.id ? String(athlete.id) : null,
      name: athlete.fullName || athlete.displayName,
      role: athlete.position?.displayName || athlete.position?.name || null,
      shirtNumber: athlete.jersey !== undefined && athlete.jersey !== null
        ? Number(athlete.jersey)
        : null
    }))
  };
}

function compare(current, live) {
  const currentById = new Map(current.filter(player => player.espnId).map(player => [player.espnId, player]));
  const liveById = new Map(live.filter(player => player.espnId).map(player => [player.espnId, player]));
  const currentNames = new Set(current.map(player => normalize(player.name)));
  const liveNames = new Set(live.map(player => normalize(player.name)));

  const possibleArrivals = live
    .filter(player => player.espnId ? !currentById.has(player.espnId) : !currentNames.has(normalize(player.name)))
    .map(playerView);
  const possibleDepartures = current
    .filter(player => player.espnId ? !liveById.has(player.espnId) : !liveNames.has(normalize(player.name)))
    .map(playerView);

  return { possibleArrivals, possibleDepartures };
}

async function checkTeam(teamId) {
  if (!teams[teamId]) throw new Error(`Squadra non configurata: ${teamId}`);
  const current = currentPlayers(teamId);
  const live = await livePlayers(teamId);
  const changes = compare(current, live.players);
  const notes = [];
  if (teamId === "napoli") {
    notes.push("La rosa pubblicata segue i convocati ufficiali del ritiro: le differenze ESPN richiedono conferma dal club.");
  }
  if (teamId === "milan") {
    notes.push("La rosa pubblicata usa AC Milan come fonte primaria: le differenze ESPN sono solo segnalazioni.");
  }
  return {
    teamId,
    team: teams[teamId].name,
    status: changes.possibleArrivals.length || changes.possibleDepartures.length ? "changes-detected" : "no-change",
    publishedPlayers: current.length,
    liveEspnPlayers: live.players.length,
    sourceUrl: live.url,
    ...changes,
    notes
  };
}

async function main() {
  const checkedAt = new Date().toISOString();
  const results = [];
  for (let index = 0; index < selectedTeams.length; index += 5) {
    const batch = selectedTeams.slice(index, index + 5);
    results.push(...await Promise.all(batch.map(checkTeam)));
  }
  results.sort((left, right) => left.team.localeCompare(right.team, "it"));
  const departuresById = new Map();
  for (const result of results) {
    for (const player of result.possibleDepartures) {
      if (player.espnId) departuresById.set(player.espnId, { teamId: result.teamId, team: result.team, player });
    }
  }
  const possibleInternalMoves = [];
  for (const result of results) {
    for (const player of result.possibleArrivals) {
      const departure = player.espnId ? departuresById.get(player.espnId) : null;
      if (!departure || departure.teamId === result.teamId) continue;
      possibleInternalMoves.push({
        espnId: player.espnId,
        player: player.name,
        fromTeamId: departure.teamId,
        fromTeam: departure.team,
        toTeamId: result.teamId,
        toTeam: result.team,
        confidence: "provider-cross-roster"
      });
    }
  }
  const report = {
    schemaVersion: 1,
    season: "2026/27",
    checkedAt,
    provider: "ESPN",
    method: "Confronto per ESPN player ID tra la rosa pubblicata e la rosa live del provider. Le differenze sono segnalazioni da verificare, non trasferimenti confermati.",
    summary: {
      teamsChecked: results.length,
      teamsWithChanges: results.filter(result => result.status === "changes-detected").length,
      possibleArrivals: results.reduce((total, result) => total + result.possibleArrivals.length, 0),
      possibleDepartures: results.reduce((total, result) => total + result.possibleDepartures.length, 0),
      possibleInternalMoves: possibleInternalMoves.length
    },
    possibleInternalMoves,
    teams: results
  };
  if (writeReport) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
