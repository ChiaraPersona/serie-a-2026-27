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
const teams = read("data/normalized/teams.json");
const teamDetails = read("data/sources/team-pages/team-details-2026-27.json");
const probableLineups = read("data/sources/probable-lineups-md1-2026-27.json");
const probableLineupByTeam = new Map(probableLineups.teams.map(team => [team.teamId, team]));
const officialLineupsFile = path.join(root, "data/sources/official-lineups-2026-27.json");
const officialLineups = fs.existsSync(officialLineupsFile) ? JSON.parse(fs.readFileSync(officialLineupsFile, "utf8")) : { fixtures: [] };
const officialLineupByTeam = new Map(officialLineups.fixtures.flatMap(fixture => fixture.teams.map(team => [team.teamId, { ...team, matchId: fixture.matchId, fixtureLabel: fixture.label || fixture.teams.map(item => item.team).join(" - "), matchday: fixture.matchday, date: fixture.date, kickoff: fixture.kickoff }])));
const probableLineupSource = {
  provider: probableLineups.provider,
  scope: `Probabili formazioni della ${probableLineups.matchday}ª giornata`,
  url: probableLineups.sourceUrl,
  retrievedAt: String(probableLineups.importedAt).slice(0, 10)
};
const officialLineupSource = {
  provider: officialLineups.provider || "Fonte ufficiale",
  scope: "Formazioni ufficiali della 1ª giornata",
  url: officialLineups.sourceUrl || null,
  retrievedAt: officialLineups.retrievedAt || null
};
const marketValuesFile = path.join(root, "data/sources/team-pages/transfermarkt-market-values-2026-27.json");
const marketValues = fs.existsSync(marketValuesFile) ? JSON.parse(fs.readFileSync(marketValuesFile, "utf8")) : { players: [], retrievedAt: null };
const marketValueByPlayer = new Map(marketValues.players.map(player => [`${player.teamId}:${player.playerId}`, player]));
const playerDetailsFile = path.join(root, "data/sources/team-pages/transfermarkt-player-details-2026-27.json");
const playerDetails = fs.existsSync(playerDetailsFile) ? JSON.parse(fs.readFileSync(playerDetailsFile, "utf8")) : { players: [], retrievedAt: null };
const playerDetailsByPlayer = new Map(playerDetails.players.map(player => [`${player.teamId}:${player.playerId}`, player]));
const today = ["2026-08-03", marketValues.retrievedAt, playerDetails.retrievedAt, probableLineupSource.retrievedAt, officialLineupSource.retrievedAt].filter(Boolean).sort().at(-1);
const wikimediaPhotosFile = path.join(root, "data/sources/team-pages/wikimedia-player-photos.json");
const wikimediaPhotos = fs.existsSync(wikimediaPhotosFile) ? JSON.parse(fs.readFileSync(wikimediaPhotosFile, "utf8")) : { entries: [], retrievedAt: null };
const wikimediaPhotoByPlayer = new Map(wikimediaPhotos.entries.map(photo => [`${photo.teamId}:${photo.playerId}`, photo]));
const serieAStandings = read("data/normalized/standings-2025-26.json");
const currentIds = new Set(teams.map(team => team.id));
const generatedSquads = new Map(teams.map(team => {
  const teamId = team.id;
  const file = path.join(root, `data/generated/team-pages/${teamId}-squad.json`);
  return [teamId, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null];
}));
const ageAt = birthDate => {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${today}T00:00:00Z`);
  let age = at.getUTCFullYear() - born.getUTCFullYear();
  if (at.getUTCMonth() < born.getUTCMonth() || (at.getUTCMonth() === born.getUTCMonth() && at.getUTCDate() < born.getUTCDate())) age--;
  return age;
};

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
  const details = teamDetails.teams[team.id];
  const projectedLineup = probableLineupByTeam.get(team.id);
  const projectedStarters = projectedLineup?.players?.filter(player => player.lineupStatus === "starter") || [];
  const officialLineup = officialLineupByTeam.get(team.id);
  const lineup = officialLineup || projectedLineup;
  const starters = officialLineup ? officialLineup.players : projectedStarters;
  const lineupSource = officialLineup ? { ...officialLineupSource, scope: `Formazioni ufficiali ${officialLineup.fixtureLabel}, ${officialLineup.matchday}ª giornata` } : probableLineupSource;
  if (!details?.city || !details?.stadium || !details?.coach || !details?.preferredFormation) throw new Error(`${team.name}: anagrafica 2026/27 incompleta`);
  if (!lineup || !/^[1-9](?:-[1-9]){2,4}$/.test(lineup.formation) || starters.length !== 11) throw new Error(`${team.name}: probabile formazione editoriale incompleta`);
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
  const foulsWon = matchData.selected.reduce((total, item) => total + (item.opponent.fouls ?? 0), 0);
  const yellow = matchData.sum(matchData.selected, "yellowCards");
  const secondYellow = matchData.sum(matchData.selected, "secondYellowCards");
  const straightRed = matchData.sum(matchData.selected, "straightRedCards");
  const penaltiesFor = matchData.sum(matchData.selected, "penaltiesFor");
  const penaltiesAgainst = matchData.sum(matchData.selected, "penaltiesAgainst");
  const discipline = {
    ...nullObject(STAT_FIELDS.discipline), foulsCommitted: fouls, foulsCommittedPerGame: rate(fouls, played),
    foulsWon, foulsWonPerGame: rate(foulsWon, played),
    yellowCards: yellow, yellowCardsPerGame: rate(yellow, played), secondYellowCards: secondYellow,
    straightRedCards: straightRed, dismissals: secondYellow + straightRed, penaltiesConceded: penaltiesAgainst,
    penaltiesWon: penaltiesFor, disciplineIndex: round((yellow + secondYellow * 2 + straightRed * 3) / (played || 1))
  };
  const generatedSquad = generatedSquads.get(team.id);
  const squad = (generatedSquad?.players || []).map(player => {
    const market = marketValueByPlayer.get(`${team.id}:${player.id}`);
    const details = playerDetailsByPlayer.get(`${team.id}:${player.id}`);
    const wikimediaPhoto = wikimediaPhotoByPlayer.get(`${team.id}:${player.id}`);
    const photoSource = wikimediaPhoto ? {
      provider: "Wikimedia Commons",
      scope: `Foto di ${player.name}`,
      url: wikimediaPhoto.descriptionUrl,
      retrievedAt: wikimediaPhoto.retrievedAt
    } : null;
    return {
      ...player,
      dateOfBirth: player.dateOfBirth || details?.dateOfBirth || null,
      age: player.age ?? ageAt(details?.dateOfBirth),
      nationality: player.nationality || details?.nationality || null,
      heightCm: player.heightCm ?? details?.heightCm ?? null,
      preferredFoot: player.preferredFoot || details?.preferredFoot || null,
      birthplace: player.birthplace || details?.birthplace || null,
      atMilanSince: player.atMilanSince || details?.clubSince || null,
      arrivalDate: player.arrivalDate || details?.clubSince || null,
      providerIds: { ...(player.providerIds || {}), transfermarkt: market?.transfermarktId || null, wikidata: wikimediaPhoto?.wikidataId || null },
      marketValue: market ? { amountEur: market.marketValueEur, label: market.marketValueLabel, currency: "EUR", provider: marketValues.provider, retrievedAt: marketValues.retrievedAt, providerUpdatedAt: market.marketValueUpdatedAt || null, sourceUrl: market.profileUrl } : null,
      photo: wikimediaPhoto ? (wikimediaPhoto.localPath ? `../${wikimediaPhoto.localPath}` : wikimediaPhoto.thumbnailUrl) : player.photo,
      photoAttribution: wikimediaPhoto ? {
        provider: "Wikimedia Commons",
        pageUrl: wikimediaPhoto.descriptionUrl,
        artist: wikimediaPhoto.artist,
        credit: wikimediaPhoto.credit,
        license: wikimediaPhoto.license,
        licenseUrl: wikimediaPhoto.licenseUrl,
        originalUrl: wikimediaPhoto.originalUrl
      } : null,
      sources: [
        ...(player.sources || []),
        ...(details ? [{ provider: "Transfermarkt", scope: `Anagrafica di ${player.name}`, url: details.profileUrl, retrievedAt: playerDetails.retrievedAt }] : []),
        ...(photoSource ? [photoSource] : [])
      ]
    };
  });
  const teamLastUpdated = [generatedSquad?.rosterSource?.retrievedAt, teamDetails.lastUpdated].filter(Boolean).sort().at(-1) || "2026-07-20";
  const sources = [
    { provider: "ESPN", scope: `${competitionName} 2025/26 - risultati e disciplina`, url: "https://www.espn.com/soccer/", retrievedAt: "2026-07-18" },
    { provider: previousCompetition === "serie-a" ? "Classifica fornita dall'utente" : "ESPN", scope: `${competitionName} 2025/26 - classifica calcolata dai risultati`, url: null, retrievedAt: "2026-07-18" },
    ...(generatedSquad?.rosterSource ? [generatedSquad.rosterSource] : []),
    ...(marketValues.retrievedAt ? [{ provider: "Transfermarkt", scope: `Valori di mercato individuali 2026/27 (${squad.filter(player => player.marketValue).length}/${squad.length})`, url: marketValues.sourceUrl, retrievedAt: marketValues.retrievedAt }] : []),
    ...(wikimediaPhotos.retrievedAt ? [{ provider: "Wikimedia Commons", scope: `Foto locali con attribuzione (${squad.filter(player => player.photoAttribution).length}/${squad.length})`, url: wikimediaPhotos.sourceUrl, retrievedAt: wikimediaPhotos.retrievedAt }] : []),
    ...teamDetails.sources.filter(source => source.provider !== "Calciomercato.com"),
    lineupSource
  ];
  return {
    schemaVersion: 1, id: team.id, name: team.name, officialName: team.officialName, shortName: team.shortName,
    slug: team.slug, logo: `../${team.logo}`, monochromeLogo: `../assets/images/teams/monochrome/${team.id}-black.svg`, currentSeason: "2026/27", city: details.city, stadium: details.stadium, coach: details.coach, preferredFormation: details.preferredFormation,
    probableLineup: {
      formation: lineup.formation,
      players: starters.map(player => player.currentName || player.sourceName),
      context: officialLineup ? `Formazione ufficiale della ${officialLineup.matchday}ª giornata · ${officialLineup.fixtureLabel}` : `Proiezione della ${probableLineups.matchday}ª giornata`,
      status: officialLineup ? "official" : "probable",
      matchId: officialLineup?.matchId || null,
      fixtureLabel: officialLineup?.fixtureLabel || null,
      shirtNumbers: officialLineup ? starters.map(player => player.shirtNumber) : null,
      updatedAt: officialLineup ? officialLineupSource.retrievedAt : lineup.updatedAt,
      source: lineupSource
    },
    ...(officialLineup ? { projectedLineup: {
      formation: projectedLineup.formation,
      players: projectedStarters.map(player => player.currentName || player.sourceName),
      context: `Proiezione della ${probableLineups.matchday}ª giornata`,
      status: "probable",
      updatedAt: projectedLineup.updatedAt,
      source: probableLineupSource
    } } : {}),
    previousSeason: { season: "2025/26", competition: competitionName, competitionId: previousCompetition, promoted: previousCompetition === "serie-b", position: row?.position ?? null, points: row?.points ?? null },
    europeanCompetitions: [], lastUpdated: teamLastUpdated,
    teamStats: { season: "2025/26", competition: competitionName, source: "ESPN", lastUpdated: "2026-07-18", results, attack: nullObject(STAT_FIELDS.attack), defence: { ...nullObject(STAT_FIELDS.defence), goalsAgainstPerGame: rate(row?.goalsAgainst, played), cleanSheets: results.cleanSheets }, discipline, possession: nullObject(STAT_FIELDS.possession), homeAway: { home: matchData.home, away: matchData.away } },
    squad, sources,
    availability: squad.length
      ? { squad: "available", playerStats: squad.every(player => player.dataQuality.status === "complete") ? "complete" : "partial", note: "Rosa 2026/27 e statistiche ESPN 2025/26 separate per squadra e competizione; i dati non esposti restano N/D." }
      : { squad: "unavailable", playerStats: "unavailable", note: "Nessuna rosa 2026/27 verificata è presente nei dati del progetto. I valori mancanti restano null." }
  };
}

const builtTeams = teams.map(buildTeam);
const index = { schemaVersion: 1, season: "2026/27", previousSeason: "2025/26", generatedAt: today, teams: builtTeams.map(team => {
  const normalizedTeam = teams.find(item => item.id === team.id);
  return { id: team.id, name: team.name, officialName: team.officialName, shortName: team.shortName, logo: team.logo, monochromeLogo: team.monochromeLogo, colors: normalizedTeam.colors, city: team.city, stadium: team.stadium, coach: team.coach, preferredFormation: team.preferredFormation, probableLineup: team.probableLineup, ...(team.projectedLineup ? { projectedLineup: team.projectedLineup } : {}), previousSeason: team.previousSeason, playerCount: team.squad.length, lastUpdated: team.lastUpdated };
}) };
for (const team of builtTeams) write(`data/teams/${team.id}.json`, team);
write("data/teams/index.json", index);

const leaderboardMetrics = [
  { id: "goals", label: "Gol", field: "goals", hasPer90: true },
  { id: "assists", label: "Assist", field: "assists", hasPer90: true },
  { id: "shots", label: "Tiri totali", field: "shots", hasPer90: true },
  { id: "shotsOnTarget", label: "Tiri nello specchio", field: "shotsOnTarget", hasPer90: true },
  { id: "cards", label: "Cartellini", field: "cards", hasPer90: true },
  { id: "foulsCommitted", label: "Falli commessi", field: "foulsCommitted", hasPer90: true },
  { id: "foulsWon", label: "Falli subiti", field: "foulsWon", hasPer90: true }
];
const leaderboardTeamAliases = { Internazionale: "Inter", "AS Roma": "Roma" };
const leaderboardTeamName = name => leaderboardTeamAliases[name] || name;
const cardTotal = entry => {
  const values = [entry.yellowCards, entry.secondYellowCards, entry.straightRedCards];
  return values.every(value => value === null || value === undefined) ? null : values.reduce((sum, value) => sum + (value ?? 0), 0);
};
const domesticEntry = player => player.previousSeason?.entries?.find(entry => entry.competitionType === "domestic-league") || player.previousSeason?.entries?.[0] || null;
const leaderboardTotal = (entry, metric) => metric.field === "cards" ? cardTotal(entry) : entry[metric.field];
const leaderboardPlayers = builtTeams.flatMap(team => team.squad.map(player => {
  const entry = domesticEntry(player);
  return entry ? { team, player, entry } : null;
}).filter(Boolean));
const rankings = Object.fromEntries(leaderboardMetrics.map(metric => {
  const players = leaderboardPlayers.map(({ team, player, entry }) => ({
    id: player.id,
    name: player.name,
    currentTeamId: team.id,
    currentTeam: team.name,
    role: player.detailedRole || player.role,
    previousTeam: leaderboardTeamName(entry.team),
    sameClub: leaderboardTeamName(entry.team) === team.name,
    competition: entry.competition,
    appearances: entry.appearances,
    minutes: entry.minutes,
    totalValue: leaderboardTotal(entry, metric),
    per90Value: metric.hasPer90 ? entry.per90?.[metric.field] ?? null : null,
    tieValue: entry.per90?.[metric.field] ?? entry.minutes
  })).filter(player => typeof player.totalValue === "number" && Number.isFinite(player.totalValue))
    .sort((left, right) => right.totalValue - left.totalValue || (right.tieValue ?? -1) - (left.tieValue ?? -1) || left.name.localeCompare(right.name, "it"));
  return [metric.id, { ...metric, availablePlayers: players.length, players: players.slice(0, 15).map(({ tieValue, ...player }) => player) }];
}));
write("data/teams/player-leaderboards.json", { schemaVersion: 1, currentSeason: "2026/27", statisticsSeason: "2025/26", generatedAt: today, rankings });
write("data/schemas/team.schema.json", { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Serie A team", type: "object", required: ["id", "currentSeason", "city", "stadium", "coach", "preferredFormation", "probableLineup", "previousSeason", "teamStats", "squad", "sources", "lastUpdated"], properties: { city: { type: "string", minLength: 1 }, stadium: { type: "string", minLength: 1 }, coach: { type: "string", minLength: 1 }, preferredFormation: { type: "string", pattern: "^[1-9](?:-[1-9]){2,4}$" }, probableLineup: { type: "object", required: ["formation", "players", "context", "status", "source"], properties: { formation: { type: "string", pattern: "^[1-9](?:-[1-9]){2,4}$" }, players: { type: "array", minItems: 11, maxItems: 11, items: { type: "string", minLength: 1 } }, status: { enum: ["probable", "official"] } } }, squad: { type: "array", items: { $ref: "player.schema.json" } } } });
write("data/schemas/player.schema.json", { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Serie A player", type: "object", required: ["id", "name", "currentTeam", "currentSeason", "role", "detailedRole", "status", "marketValue", "previousSeason", "sources", "dataQuality"], properties: { detailedRole: { type: "string", minLength: 1 }, status: { enum: ["confermato", "nuovo acquisto", "prestito", "rientro dal prestito", "primavera", "da verificare"] }, marketValue: { anyOf: [{ type: "null" }, { type: "object", required: ["amountEur", "currency", "provider", "retrievedAt", "sourceUrl"] }] }, photoAttribution: { anyOf: [{ type: "null" }, { type: "object", required: ["provider", "pageUrl", "artist", "license"] }] }, previousSeason: { type: "object", required: ["season", "entries", "totals", "totalsByCompetition"] } } });
console.log(`Generati dati per ${teams.length} club (${index.teams.filter(team => team.previousSeason.promoted).length} da Serie B).`);
