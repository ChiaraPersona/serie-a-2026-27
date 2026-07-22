const fs = require("fs");
const path = require("path");
const { STAT_FIELDS, nullObject, rate, percentage, round } = require("./model");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const slugAliases = { "hellas-verona": "verona" };
const today = "2026-07-22";
const teams = read("data/normalized/teams.json");
const serieAStandings = read("data/normalized/standings-2025-26.json");
const currentIds = new Set(teams.map(team => team.id));
const completedTeamIds = new Set(["milan", "inter", "juventus", "napoli"]);
const generatedSquads = new Map([...completedTeamIds].map(teamId => {
  const file = path.join(root, `data/generated/team-pages/${teamId}-squad.json`);
  return [teamId, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null];
}));

function competitionMatches(slug) {
  const file = slug === "serie-a" ? "serie-a.json" : "serie-b.json";
  return read(`data/normalized/referee-matches/2025-26/${file}`).matches;
}

function tableFromMatches(matches) {
  const rows = new Map();
  const get = team => {
    const id = slugAliases[team.slug] || team.slug;
    if (!rows.has(id)) rows.set(id, { team: id, teamName: team.name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    return rows.get(id);
  };
  for (const match of matches) {
    const home = get(match.homeTeam), away = get(match.awayTeam);
    home.played++; away.played++;
    home.goalsFor += match.score.home; home.goalsAgainst += match.score.away;
    away.goalsFor += match.score.away; away.goalsAgainst += match.score.home;
    if (match.score.home > match.score.away) { home.won++; home.points += 3; away.lost++; }
    else if (match.score.home < match.score.away) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  return [...rows.values()].map(row => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .map((row, index) => ({ position: index + 1, ...row }));
}

const serieBMatches = competitionMatches("serie-b");
const serieBTable = tableFromMatches(serieBMatches);
const aRows = serieAStandings.rows;

function matchStats(teamId, competition) {
  const matches = competitionMatches(competition);
  const selected = [];
  for (const match of matches) {
    const homeId = slugAliases[match.homeTeam.slug] || match.homeTeam.slug;
    const awayId = slugAliases[match.awayTeam.slug] || match.awayTeam.slug;
    if (homeId !== teamId && awayId !== teamId) continue;
    const isHome = homeId === teamId;
    selected.push({ match, own: isHome ? match.teamStats.home : match.teamStats.away, opponent: isHome ? match.teamStats.away : match.teamStats.home, isHome, gf: isHome ? match.score.home : match.score.away, ga: isHome ? match.score.away : match.score.home });
  }
  const sum = (items, field) => items.reduce((total, item) => total + (item.own[field] ?? 0), 0);
  const split = items => ({
    played: items.length,
    won: items.filter(x => x.gf > x.ga).length,
    drawn: items.filter(x => x.gf === x.ga).length,
    lost: items.filter(x => x.gf < x.ga).length,
    goalsFor: items.reduce((n, x) => n + x.gf, 0),
    goalsAgainst: items.reduce((n, x) => n + x.ga, 0),
    yellowCards: sum(items, "yellowCards"),
    corners: null
  });
  return { selected, home: split(selected.filter(x => x.isHome)), away: split(selected.filter(x => !x.isHome)), sum };
}

function buildTeam(team) {
  const previousCompetition = aRows.some(row => row.team === team.id) ? "serie-a" : "serie-b";
  const competitionName = previousCompetition === "serie-a" ? "Serie A" : "Serie B";
  const table = previousCompetition === "serie-a" ? aRows : serieBTable;
  const row = table.find(item => item.team === team.id) || null;
  const matchData = matchStats(team.id, previousCompetition);
  const played = row?.played ?? matchData.selected.length;
  const results = {
    ...nullObject(STAT_FIELDS.results),
    ...(row || {}),
    pointsPerGame: rate(row?.points, played),
    goalsPerGame: rate(row?.goalsFor, played),
    goalsAgainstPerGame: rate(row?.goalsAgainst, played),
    cleanSheets: matchData.selected.filter(item => item.ga === 0).length,
    failedToScore: matchData.selected.filter(item => item.gf === 0).length,
    winPercentage: percentage(row?.won, played),
    drawPercentage: percentage(row?.drawn, played),
    lossPercentage: percentage(row?.lost, played)
  };
  const fouls = matchData.sum(matchData.selected, "fouls");
  const yellow = matchData.sum(matchData.selected, "yellowCards");
  const secondYellow = matchData.sum(matchData.selected, "secondYellowCards");
  const straightRed = matchData.sum(matchData.selected, "straightRedCards");
  const penaltiesFor = matchData.sum(matchData.selected, "penaltiesFor");
  const penaltiesAgainst = matchData.sum(matchData.selected, "penaltiesAgainst");
  const discipline = {
    ...nullObject(STAT_FIELDS.discipline), foulsCommitted: fouls, foulsCommittedPerGame: rate(fouls, played),
    yellowCards: yellow, yellowCardsPerGame: rate(yellow, played), secondYellowCards: secondYellow,
    straightRedCards: straightRed, dismissals: secondYellow + straightRed, penaltiesConceded: penaltiesAgainst,
    penaltiesWon: penaltiesFor, disciplineIndex: round((yellow + secondYellow * 2 + straightRed * 3) / (played || 1))
  };
  const generatedSquad = generatedSquads.get(team.id);
  const squad = generatedSquad?.players || [];
  const teamLastUpdated = generatedSquad?.rosterSource?.retrievedAt || "2026-07-20";
  const sources = [
    { provider: "ESPN", scope: `${competitionName} 2025/26 - risultati e disciplina`, url: "https://www.espn.com/soccer/", retrievedAt: "2026-07-18" },
    { provider: previousCompetition === "serie-a" ? "Classifica fornita dall'utente" : "ESPN", scope: `${competitionName} 2025/26 - classifica calcolata dai risultati`, url: null, retrievedAt: "2026-07-18" },
    ...(generatedSquad?.rosterSource ? [generatedSquad.rosterSource] : [])
  ];
  return {
    schemaVersion: 1, id: team.id, name: team.name, officialName: team.officialName, shortName: team.shortName,
    slug: team.slug, logo: `../${team.logo}`, currentSeason: "2026/27", city: null, stadium: null, coach: generatedSquad?.coach || null,
    previousSeason: { season: "2025/26", competition: competitionName, competitionId: previousCompetition, promoted: previousCompetition === "serie-b", position: row?.position ?? null, points: row?.points ?? null },
    europeanCompetitions: [], lastUpdated: teamLastUpdated,
    teamStats: { season: "2025/26", competition: competitionName, source: "ESPN", lastUpdated: "2026-07-18", results, attack: nullObject(STAT_FIELDS.attack), defence: { ...nullObject(STAT_FIELDS.defence), goalsAgainstPerGame: rate(row?.goalsAgainst, played), cleanSheets: results.cleanSheets }, discipline, possession: nullObject(STAT_FIELDS.possession), homeAway: { home: matchData.home, away: matchData.away } },
    squad, sources,
    availability: squad.length
      ? { squad: "available", playerStats: squad.every(player => player.dataQuality.status === "complete") ? "complete" : "partial", note: "Rosa 2026/27 e statistiche ESPN 2025/26 separate per squadra e competizione; i dati non esposti restano N/D." }
      : { squad: "unavailable", playerStats: "unavailable", note: "Nessuna rosa 2026/27 verificata è presente nei dati del progetto. I valori mancanti restano null." }
  };
}

const index = { schemaVersion: 1, season: "2026/27", previousSeason: "2025/26", generatedAt: today, teams: teams.map(buildTeam).map(team => ({ id: team.id, name: team.name, officialName: team.officialName, shortName: team.shortName, logo: team.logo, coach: team.coach, previousSeason: team.previousSeason, playerCount: team.squad.length, lastUpdated: team.lastUpdated })) };
for (const team of teams.map(buildTeam)) write(`data/teams/${team.id}.json`, team);
write("data/teams/index.json", index);
write("data/schemas/team.schema.json", { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Serie A team", type: "object", required: ["id", "currentSeason", "previousSeason", "teamStats", "squad", "sources", "lastUpdated"], properties: { squad: { type: "array", items: { $ref: "player.schema.json" } } } });
write("data/schemas/player.schema.json", { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Serie A player", type: "object", required: ["id", "name", "currentTeam", "currentSeason", "role", "status", "previousSeason", "sources", "dataQuality"], properties: { status: { enum: ["confermato", "nuovo acquisto", "prestito", "rientro dal prestito", "primavera", "da verificare"] }, previousSeason: { type: "object", required: ["season", "entries", "totals", "totalsByCompetition"] } } });
console.log(`Generati dati per ${teams.length} club (${index.teams.filter(team => team.previousSeason.promoted).length} da Serie B).`);
