const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceUrl = "https://www.fantacalcio.it/convocati-serie-a";
const callupsPath = path.join(root, "data/sources/fantacalcio-callups-md1-2026-27.json");
const quotationsPath = path.join(root, "data/sources/fantacalcio-quotations-2026-27.json");
const teamsPath = path.join(root, "data/normalized/teams.json");

const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const decode = value => String(value || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, " ")
  .trim();
const normalize = value => decode(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const roleCode = value => String(value || "").toUpperCase();
const statusCode = label => ({
  convocati: "called-up",
  squalificati: "suspended",
  diffidati: "one-booking-away",
  infortunati: "injured"
})[normalize(label)] || null;

async function fetchHtml() {
  const response = await fetch(sourceUrl, { headers: { "user-agent": "Mozilla/5.0 (compatible; SerieA-2026-27 data importer)" } });
  if (!response.ok) throw new Error(`${sourceUrl}: HTTP ${response.status}`);
  return response.text();
}

function parsePlayers(section, status) {
  return [...section.matchAll(/<li class="player-item">[\s\S]*?<span class="role" data-value="([pdca])"><\/span>[\s\S]*?href="([^"]+\/(\d+))"[^>]*>[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<\/li>/g)].map(match => ({
    sourceId: Number(match[3]),
    sourceName: decode(match[4]),
    role: roleCode(match[1]),
    status,
    profileUrl: match[2]
  }));
}

function parseTeamCard(chunk, teamIdByName) {
  const teamMatch = chunk.match(/<span class="team-name">([^<]+)<\/span>/);
  if (!teamMatch) return null;
  const team = decode(teamMatch[1]);
  const teamId = teamIdByName.get(normalize(team)) || null;
  const officialListAvailable = !chunk.includes("Comunicato ufficiale non ancora disponibile");
  const headings = [...chunk.matchAll(/<strong class="label [^"]+">([^<]+)<\/strong>/g)];
  const players = [];
  for (let index = 0; index < headings.length; index += 1) {
    const status = statusCode(headings[index][1]);
    if (!status) continue;
    const start = headings[index].index + headings[index][0].length;
    const end = headings[index + 1]?.index ?? chunk.length;
    players.push(...parsePlayers(chunk.slice(start, end), status));
  }
  const unique = [...new Map(players.map(player => [String(player.sourceId), player])).values()];
  return { team, teamId, officialListAvailable, players: unique };
}

function parseCallups(html, importedAt) {
  const teams = read(teamsPath);
  const teamIdByName = new Map(teams.map(team => [normalize(team.name), team.id]));
  const chunks = [...html.matchAll(/<div id="team-\d+" class="card team-card">([\s\S]*?)(?=<div id="team-\d+" class="card team-card">|<section|<footer|$)/g)].map(match => match[1]);
  const teamCards = chunks.map(chunk => parseTeamCard(chunk, teamIdByName)).filter(Boolean);
  const players = teamCards.flatMap(team => team.players.map(player => ({ ...player, team: team.team, teamId: team.teamId })));
  const statusCounts = Object.fromEntries(["called-up", "suspended", "one-booking-away", "injured"].map(status => [status, players.filter(player => player.status === status).length]));
  return {
    schemaVersion: 1,
    provider: "Fantacalcio.it",
    season: "2026/27",
    matchday: 1,
    sourceUrl,
    importedAt,
    interpretation: "Elenco dei calciatori presenti nella pagina Convocati; comprende convocati, squalificati, diffidati e infortunati. Le squadre prive di comunicato ufficiale non vengono usate per eliminare calciatori.",
    coverage: {
      teams: teamCards.length,
      teamsWithOfficialList: teamCards.filter(team => team.officialListAvailable).length,
      incompleteTeams: teamCards.filter(team => !team.officialListAvailable).map(team => team.teamId),
      players: players.length,
      byStatus: statusCounts
    },
    teams: teamCards
  };
}

function syncQuotations(callups) {
  const quotations = read(quotationsPath);
  const knownBySourceId = new Map([...quotations.players, ...quotations.departed].map(player => [String(player.sourceId), player]));
  const completeTeamIds = new Set(callups.teams.filter(team => team.officialListAvailable).map(team => team.teamId));
  const retainedIncomplete = quotations.players
    .filter(player => !completeTeamIds.has(player.teamId))
    .map(({ callupStatus, ...player }) => player);
  const pagePlayers = callups.teams.flatMap(team => team.players.map(player => {
    const known = knownBySourceId.get(String(player.sourceId));
    const knownRecord = { ...(known || {
      currentQuotation: null,
      initialQuotation: null,
      quotationDifference: null,
      currentMantraQuotation: null,
      initialMantraQuotation: null,
      mantraQuotationDifference: null,
      fvm: null,
      mantraFvm: null,
      mantraRole: null,
      playerId: null,
      currentName: null,
      matchConfidence: "unmatched"
    }) };
    delete knownRecord.callupStatus;
    return {
      ...knownRecord,
      status: "active",
      sourceId: player.sourceId,
      role: player.role,
      name: player.sourceName,
      team: team.team,
      teamId: team.teamId
    };
  }));
  const roleRank = { P: 0, D: 1, C: 2, A: 3 };
  const players = [...new Map([...pagePlayers, ...retainedIncomplete].map(player => [String(player.sourceId), player])).values()]
    .sort((left, right) => (roleRank[left.role] - roleRank[right.role])
      || ((Number.isFinite(right.currentQuotation) ? right.currentQuotation : -1) - (Number.isFinite(left.currentQuotation) ? left.currentQuotation : -1))
      || left.team.localeCompare(right.team, "it")
      || left.name.localeCompare(right.name, "it"));
  const byRole = Object.fromEntries(["P", "D", "C", "A"].map(role => [role, players.filter(player => player.role === role).length]));
  const matchedCurrentPlayers = players.filter(player => player.playerId).length;
  const currentRosterPlayers = read(path.join(root, "data/teams/index.json")).teams.reduce((sum, team) => sum + (team.squadSize || 0), 0);
  const next = {
    ...quotations,
    importedAt: callups.importedAt.slice(0, 10),
    filteredBy: {
      provider: callups.provider,
      sourceUrl: callups.sourceUrl,
      matchday: callups.matchday,
      importedAt: callups.importedAt,
      incompleteTeams: callups.coverage.incompleteTeams
    },
    coverage: {
      activePlayers: players.length,
      departedPlayers: quotations.departed.length,
      matchedCurrentPlayers,
      unmatchedActivePlayers: players.length - matchedCurrentPlayers,
      currentRosterPlayersWithoutListoneMatch: Math.max(0, currentRosterPlayers - matchedCurrentPlayers),
      byRole
    },
    players
  };
  fs.writeFileSync(quotationsPath, `${JSON.stringify(next, null, 2)}\n`);
  return { before: quotations.players.length, after: players.length, newWithoutQuotation: players.filter(player => player.currentQuotation === null).length };
}

async function main() {
  const importedAt = new Date().toISOString();
  const callups = parseCallups(await fetchHtml(), importedAt);
  if (callups.coverage.teams !== 20) throw new Error(`Copertura squadre inattesa: ${JSON.stringify(callups.coverage)}`);
  if (callups.coverage.teamsWithOfficialList < 18) throw new Error(`Troppe liste ufficiali mancanti: ${JSON.stringify(callups.coverage)}`);
  if (callups.coverage.players < 440) throw new Error(`Copertura giocatori insufficiente: ${JSON.stringify(callups.coverage)}`);
  fs.writeFileSync(callupsPath, `${JSON.stringify(callups, null, 2)}\n`);
  const sync = syncQuotations(callups);
  console.log(JSON.stringify({ coverage: callups.coverage, quotations: sync }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
