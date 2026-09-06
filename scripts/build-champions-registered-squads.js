const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-registered-squads-2026-27.json");
const fragmentsDir = path.join(root, "data/sources/champions-squads");
const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-registered-squads-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const calendar = JSON.parse(fs.readFileSync(calendarPath, "utf8"));
const fragmentTeams = fs.readdirSync(fragmentsDir)
  .filter(file => file.endsWith(".json"))
  .sort()
  .flatMap(file => JSON.parse(fs.readFileSync(path.join(fragmentsDir, file), "utf8")).teams);
const sourceTeams = [...source.teams, ...fragmentTeams];
const duplicateTeams = sourceTeams.filter((team, index) => sourceTeams.findIndex(candidate => candidate.team === team.team) !== index);
if (duplicateTeams.length) throw new Error(`Squadre duplicate: ${duplicateTeams.map(team => team.team).join(", ")}`);
const teamByName = new Map(sourceTeams.map(team => [team.team, team]));
const missingTeams = calendar.teams.filter(team => !teamByName.has(team));
const extraTeams = sourceTeams.filter(team => !calendar.teams.includes(team.team));
if (missingTeams.length || extraTeams.length) throw new Error(`Copertura squadre non valida. Mancanti: ${missingTeams.join(", ") || "nessuna"}. Extra: ${extraTeams.map(team => team.team).join(", ") || "nessuna"}.`);
const validPositions = new Set(["goalkeeper", "defender", "midfielder", "forward", null]);
const slug = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const teams = calendar.teams.map(teamName => teamByName.get(teamName)).map(team => {
  const players = team.players.map(entry => {
    if (!Array.isArray(entry) || entry.length !== 3) throw new Error(`${team.team}: formato giocatore non valido`);
    const [name, position, registrationList] = entry;
    if (!name || typeof name !== "string") throw new Error(`${team.team}: nome giocatore mancante`);
    if (!validPositions.has(position)) throw new Error(`${team.team}: ruolo non valido per ${name}`);
    if (![null, "B"].includes(registrationList)) throw new Error(`${team.team}: lista non valida per ${name}`);
    return {
      id: slug(name),
      name,
      position,
      registrationList,
      registered: true,
      availability: { status: null, injury: null, suspension: null, updatedAt: null, source: null },
      probableLineup: { status: null, updatedAt: null, source: null },
      matchCallup: { status: null, fixtureId: null, updatedAt: null, source: null },
      officialLineup: { status: null, fixtureId: null, updatedAt: null, source: null },
      statistics: { season: "2026-27", competition: "UEFA Champions League", appearances: null, starts: null, minutes: null, goals: null, assists: null, shots: null, shotsOnTarget: null, yellowCards: null, redCards: null }
    };
  });
  const duplicatePlayers = players.filter((player, index) => players.findIndex(candidate => candidate.id === player.id) !== index);
  if (duplicatePlayers.length) throw new Error(`${team.team}: giocatori duplicati ${duplicatePlayers.map(player => player.name).join(", ")}`);
  const counts = players.reduce((result, player) => {
    result.total += 1;
    result[player.position || "unknown"] += 1;
    if (player.registrationList === "B") result.listB += 1;
    return result;
  }, { total: 0, goalkeeper: 0, defender: 0, midfielder: 0, forward: 0, unknown: 0, listB: 0 });
  return {
    id: slug(team.team),
    ...team,
    registration: { status: "registered", scope: "league-phase", updatedAt: source.snapshotDate },
    availability: { status: null, updatedAt: null, source: null },
    probableLineup: { status: null, fixtureId: null, updatedAt: null, source: null },
    matchCallup: { status: null, fixtureId: null, updatedAt: null, source: null },
    officialLineup: { status: null, fixtureId: null, updatedAt: null, source: null },
    players,
    counts
  };
});

const output = {
  schemaVersion: source.schemaVersion,
  competition: source.competition,
  season: source.season,
  scope: source.scope,
  snapshotDate: source.snapshotDate,
  statusNote: source.statusNote,
  positionLegend: source.positionLegend,
  summary: {
    teams: teams.length,
    players: teams.reduce((sum, team) => sum + team.counts.total, 0),
    teamsWithSourceDiscrepancy: teams.filter(team => team.sourceNote).length
  },
  teams
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Rose Champions: ${output.summary.teams} squadre, ${output.summary.players} giocatori.`);
