const fs = require("fs");
const path = require("path");
const { linkPlayer } = require("./import-gazzetta-lineups");

const root = path.resolve(__dirname, "..");
const inputFile = "data/raw/sky/sky-probable-lineups-md1-2026-27.json";
const outputFile = "data/sources/probable-lineups-md1-2026-27.json";
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const aliases = new Map([
  ["juventus:Perina", "Perin"],
  ["sassuolo:Odhental", "Odenthal"],
  ["lecce:Geubbel", "Geubbels"],
  ["venezia:Hainault", "Hainaut"],
  ["milan:Estupinian", "Pervis Estupinan"],
  ["milan:G.Ramos", "Goncalo Ramos"]
]);

function main() {
  const raw = read(inputFile);
  const teams = raw.teams.map(team => ({
    team: team.team,
    teamId: team.teamId,
    formation: team.formation,
    coach: null,
    updatedAt: raw.sourceUpdatedAt,
    players: team.players.map((sourceName, positionIndex) => {
      const resolvedName = aliases.get(`${team.teamId}:${sourceName}`) || sourceName;
      return {
        sourceId: null,
        sourceName,
        sourceRole: null,
        shirtNumber: null,
        probability: null,
        lineupStatus: "starter",
        team: team.team,
        teamId: team.teamId,
        ...linkPlayer(team.teamId, resolvedName, null, positionIndex)
      };
    })
  }));
  const players = teams.flatMap(team => team.players);
  const coverage = {
    teams: teams.length,
    players: players.length,
    starters: players.length,
    reserves: 0,
    linkedPlayers: players.filter(player => player.matchStatus === "linked-player").length,
    linkedListoneOnly: 0,
    ambiguous: players.filter(player => player.matchStatus === "ambiguous").length,
    unmatched: players.filter(player => player.matchStatus === "unmatched").length
  };
  const dataset = {
    schemaVersion: 1,
    provider: raw.provider,
    season: raw.season,
    matchday: raw.matchday,
    sourceUrl: raw.sourceUrl,
    importedAt: raw.capturedAt,
    sourceUpdatedAt: raw.sourceUpdatedAt,
    interpretation: raw.interpretation,
    sourceNotes: raw.sourceNotes,
    coverage,
    teams
  };
  const incomplete = teams.filter(team => !team.teamId || !/^[1-9](?:-[1-9]){2,4}$/.test(team.formation) || team.players.length !== 11);
  const ambiguous = players.filter(player => player.matchStatus === "ambiguous");
  if (teams.length !== 20 || players.length !== 220 || incomplete.length) throw new Error(`Copertura Sky inattesa: ${JSON.stringify(coverage)}`);
  if (ambiguous.length) throw new Error(`Nomi Sky ambigui: ${ambiguous.map(player => `${player.team}:${player.sourceName}`).join(", ")}`);
  fs.writeFileSync(path.join(root, outputFile), `${JSON.stringify(dataset, null, 2)}\n`);
  const unmatched = players.filter(player => player.matchStatus === "unmatched");
  if (unmatched.length) console.warn(`Nomi Sky non collegati: ${unmatched.map(player => `${player.team}:${player.sourceName}`).join(", ")}`);
  console.log(`Sky Sport: ${coverage.teams} squadre, ${coverage.starters} titolari, ${coverage.linkedPlayers} collegati alla rosa, ${coverage.unmatched} non collegati.`);
}

if (require.main === module) main();
