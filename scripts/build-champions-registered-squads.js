const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-registered-squads-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-registered-squads-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const validPositions = new Set(["goalkeeper", "defender", "midfielder", "forward", null]);

const teams = source.teams.map(team => {
  const seenNumbers = new Set();
  const players = team.players.map(entry => {
    if (!Array.isArray(entry) || entry.length !== 4) throw new Error(`${team.team}: formato giocatore non valido`);
    const [number, name, position, registrationList] = entry;
    if (!Number.isInteger(number) || number < 1 || number > 99) throw new Error(`${team.team}: numero non valido per ${name}`);
    if (seenNumbers.has(number)) throw new Error(`${team.team}: numero duplicato ${number}`);
    if (!name || typeof name !== "string") throw new Error(`${team.team}: nome giocatore mancante`);
    if (!validPositions.has(position)) throw new Error(`${team.team}: ruolo non valido per ${name}`);
    if (![null, "B"].includes(registrationList)) throw new Error(`${team.team}: lista non valida per ${name}`);
    seenNumbers.add(number);
    return {
      number,
      name,
      position,
      registrationList,
      registered: true,
      availability: null,
      matchCallup: null
    };
  });
  const counts = players.reduce((result, player) => {
    result.total += 1;
    result[player.position || "unknown"] += 1;
    if (player.registrationList === "B") result.listB += 1;
    return result;
  }, { total: 0, goalkeeper: 0, defender: 0, midfielder: 0, forward: 0, unknown: 0, listB: 0 });
  return { ...team, players, counts };
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
