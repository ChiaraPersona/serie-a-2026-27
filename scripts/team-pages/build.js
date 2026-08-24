const fs = require("fs");
const path = require("path");
const { STAT_FIELDS, nullObject, per90, rate, percentage } = require("./model");

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
const officialLineupByTeam = new Map(officialLineups.fixtures.flatMap(fixture => fixture.teams.map(team => [team.teamId, { ...team, matchId: fixture.matchId, fixtureLabel: fixture.label || fixture.teams.map(item => item.team).join(" - "), provider: fixture.provider || officialLineups.provider, sourceUrl: fixture.sourceUrl ?? officialLineups.sourceUrl, retrievedAt: fixture.retrievedAt || officialLineups.retrievedAt, matchday: fixture.matchday, date: fixture.date, kickoff: fixture.kickoff }])));
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
const currentSeasonMatches = read("data/normalized/matches.json")
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished" && match.score);
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
  const sum = (items, field, side = "own") => items.reduce((total, item) => total + (item[side]?.[field] ?? 0), 0);
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

function currentMatchStats(teamId) {
  const selected = currentSeasonMatches.filter(match => match.homeTeam === teamId || match.awayTeam === teamId).map(match => {
    const isHome = match.homeTeam === teamId;
    return {
      match,
      own: isHome ? match.teamStats?.home : match.teamStats?.away,
      opponent: isHome ? match.teamStats?.away : match.teamStats?.home,
      isHome,
      gf: isHome ? match.score.home : match.score.away,
      ga: isHome ? match.score.away : match.score.home
    };
  });
  const sum = (items, field, side = "own") => {
    if (!items.length) return 0;
    const values = items.map(item => item[side]?.[field]);
    return values.every(value => value !== null && value !== undefined) ? values.reduce((total, value) => total + value, 0) : null;
  };
  const split = items => ({
    played: items.length,
    won: items.filter(item => item.gf > item.ga).length,
    drawn: items.filter(item => item.gf === item.ga).length,
    lost: items.filter(item => item.gf < item.ga).length,
    goalsFor: items.reduce((total, item) => total + item.gf, 0),
    goalsAgainst: items.reduce((total, item) => total + item.ga, 0),
    yellowCards: sum(items, "yellowCards"),
    corners: sum(items, "corners")
  });
  return { selected, home: split(selected.filter(item => item.isHome)), away: split(selected.filter(item => !item.isHome)), sum };
}

function seasonStats({ season, competition, source, lastUpdated, matchData, row = null }) {
  const played = row?.played ?? matchData.selected.length;
  const won = row?.won ?? matchData.selected.filter(item => item.gf > item.ga).length;
  const drawn = row?.drawn ?? matchData.selected.filter(item => item.gf === item.ga).length;
  const lost = row?.lost ?? matchData.selected.filter(item => item.gf < item.ga).length;
  const points = row?.points ?? won * 3 + drawn;
  const goalsFor = row?.goalsFor ?? matchData.selected.reduce((total, item) => total + item.gf, 0);
  const goalsAgainst = row?.goalsAgainst ?? matchData.selected.reduce((total, item) => total + item.ga, 0);
  const results = {
    ...nullObject(STAT_FIELDS.results), ...(row || {}), played, won, drawn, lost, points, goalsFor, goalsAgainst,
    goalDifference: goalsFor - goalsAgainst, pointsPerGame: rate(points, played), goalsPerGame: rate(goalsFor, played),
    goalsAgainstPerGame: rate(goalsAgainst, played), cleanSheets: matchData.selected.filter(item => item.ga === 0).length,
    failedToScore: matchData.selected.filter(item => item.gf === 0).length, winPercentage: percentage(won, played),
    drawPercentage: percentage(drawn, played), lossPercentage: percentage(lost, played)
  };
  const fouls = matchData.sum(matchData.selected, "fouls");
  const foulsWon = matchData.sum(matchData.selected, "fouls", "opponent");
  const yellowCards = matchData.sum(matchData.selected, "yellowCards");
  const secondYellowCards = matchData.sum(matchData.selected, "secondYellowCards");
  const straightRedCards = matchData.sum(matchData.selected, "straightRedCards");
  const penaltiesWon = matchData.sum(matchData.selected, "penaltiesFor");
  const penaltiesConceded = matchData.sum(matchData.selected, "penaltiesAgainst");
  const discipline = {
    ...nullObject(STAT_FIELDS.discipline), foulsCommitted: fouls, foulsCommittedPerGame: rate(fouls, played),
    foulsWon, foulsWonPerGame: rate(foulsWon, played), yellowCards, yellowCardsPerGame: rate(yellowCards, played),
    secondYellowCards, straightRedCards, dismissals: secondYellowCards + straightRedCards, penaltiesConceded,
    penaltiesWon, disciplineIndex: rate(yellowCards + secondYellowCards * 2 + straightRedCards * 3, played)
  };
  return {
    season, competition, source, lastUpdated, results, attack: nullObject(STAT_FIELDS.attack),
    defence: { ...nullObject(STAT_FIELDS.defence), goalsAgainstPerGame: rate(goalsAgainst, played), cleanSheets: results.cleanSheets },
    discipline, possession: nullObject(STAT_FIELDS.possession), homeAway: { home: matchData.home, away: matchData.away }
  };
}

const add = (left, right) => left == null || right == null ? null : left + right;
function totalStats(previous, current) {
  const results = Object.fromEntries(["played", "won", "drawn", "lost", "points", "goalsFor", "goalsAgainst", "cleanSheets", "failedToScore"]
    .map(field => [field, add(previous.results[field], current.results[field])]));
  results.goalDifference = add(previous.results.goalDifference, current.results.goalDifference);
  results.pointsPerGame = rate(results.points, results.played);
  results.goalsPerGame = rate(results.goalsFor, results.played);
  results.goalsAgainstPerGame = rate(results.goalsAgainst, results.played);
  results.winPercentage = percentage(results.won, results.played);
  results.drawPercentage = percentage(results.drawn, results.played);
  results.lossPercentage = percentage(results.lost, results.played);
  const discipline = Object.fromEntries(["foulsCommitted", "foulsWon", "yellowCards", "secondYellowCards", "straightRedCards", "dismissals", "penaltiesConceded", "penaltiesWon"]
    .map(field => [field, add(previous.discipline[field], current.discipline[field])]));
  discipline.foulsCommittedPerGame = rate(discipline.foulsCommitted, results.played);
  discipline.foulsWonPerGame = rate(discipline.foulsWon, results.played);
  discipline.yellowCardsPerGame = rate(discipline.yellowCards, results.played);
  discipline.disciplineIndex = rate(discipline.yellowCards + discipline.secondYellowCards * 2 + discipline.straightRedCards * 3, results.played);
  const split = side => Object.fromEntries(["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "yellowCards", "corners"]
    .map(field => [field, add(previous.homeAway[side][field], current.homeAway[side][field])]));
  return { season: "Totale", competition: previous.competition === current.competition ? current.competition : `${previous.competition} + ${current.competition}`, source: "Riepilogo calcolato", lastUpdated: current.lastUpdated, results, discipline, homeAway: { home: split("home"), away: split("away") } };
}

function buildTeam(team) {
  const details = teamDetails.teams[team.id];
  const projectedLineup = probableLineupByTeam.get(team.id);
  const projectedStarters = projectedLineup?.players?.filter(player => player.lineupStatus === "starter") || [];
  const officialLineup = officialLineupByTeam.get(team.id);
  const lineup = officialLineup || projectedLineup;
  const starters = officialLineup ? officialLineup.players : projectedStarters;
  const lineupSource = officialLineup ? { provider: officialLineup.provider || officialLineupSource.provider, scope: `Formazioni ufficiali ${officialLineup.fixtureLabel}, ${officialLineup.matchday}ª giornata`, url: officialLineup.sourceUrl || null, retrievedAt: officialLineup.retrievedAt || officialLineupSource.retrievedAt } : probableLineupSource;
  if (!details?.city || !details?.stadium || !details?.coach || !details?.preferredFormation) throw new Error(`${team.name}: anagrafica 2026/27 incompleta`);
  if (!lineup || !/^[1-9](?:-[1-9]){2,4}$/.test(lineup.formation) || starters.length !== 11) throw new Error(`${team.name}: probabile formazione editoriale incompleta`);
  const previousCompetition = aRows.some(row => row.team === team.id) ? "serie-a" : "serie-b";
  const competitionName = previousCompetition === "serie-a" ? "Serie A" : "Serie B";
  const table = previousCompetition === "serie-a" ? aRows : serieBTable;
  const row = table.find(item => item.team === team.id) || null;
  const matchData = matchStats(team.id, previousCompetition);
  const previousStats = seasonStats({ season: "2025/26", competition: competitionName, source: "ESPN", lastUpdated: "2026-07-18", matchData, row });
  const currentStats = seasonStats({ season: "2026/27", competition: "Serie A", source: "Risultati ufficiali e StatMuse", lastUpdated: "2026-08-24", matchData: currentMatchStats(team.id) });
  const combinedStats = totalStats(previousStats, currentStats);
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
  const teamLastUpdated = [generatedSquad?.rosterSource?.retrievedAt, teamDetails.lastUpdated, "2026-08-24"].filter(Boolean).sort().at(-1) || "2026-07-20";
  const sources = [
    { provider: "StatMuse", scope: "Serie A 2026/27 - risultati e statistiche delle partite concluse", url: "https://www.statmuse.com/fc/", retrievedAt: "2026-08-24" },
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
      substitutes: officialLineup?.substitutes?.map(player => player.currentName) || null,
      coach: officialLineup?.coach || details.coach,
      ...(officialLineup?.coachConfirmation ? { coachConfirmation: officialLineup.coachConfirmation } : {}),
      updatedAt: officialLineup ? lineupSource.retrievedAt : lineup.updatedAt,
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
    teamStats: { ...previousStats, seasons: { "2026/27": currentStats, "2025/26": previousStats }, total: combinedStats },
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
const previousLeaderboardRows = leaderboardPlayers.map(({ team, player, entry }) => ({
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
  values: Object.fromEntries(leaderboardMetrics.map(metric => [metric.field, leaderboardTotal(entry, metric)])),
  per90: Object.fromEntries(leaderboardMetrics.map(metric => [metric.field, entry.per90?.[metric.field] ?? null]))
}));
const currentLeaderboardMap = new Map();
const currentTeamById = new Map(builtTeams.map(team => [team.id, team]));
const ensureCurrentPlayer = (teamId, matchPlayer) => {
  const key = `${teamId}:${matchPlayer.playerId}`;
  if (!currentLeaderboardMap.has(key)) {
    const team = currentTeamById.get(teamId);
    const squadPlayer = team?.squad.find(player => player.id === matchPlayer.playerId);
    currentLeaderboardMap.set(key, {
      id: matchPlayer.playerId, name: squadPlayer?.name || matchPlayer.player, currentTeamId: teamId,
      currentTeam: team?.name || teamId, role: squadPlayer?.detailedRole || squadPlayer?.role || null,
      appearances: 0, minutes: 0, sums: { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsWon: 0 },
      coverage: { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsWon: 0 }, cards: 0
    });
  }
  return currentLeaderboardMap.get(key);
};
for (const match of currentSeasonMatches) {
  for (const side of ["home", "away"]) {
    const teamId = side === "home" ? match.homeTeam : match.awayTeam;
    for (const matchPlayer of match.playerStats?.[side] || []) {
      if (!matchPlayer.playerId) continue;
      const row = ensureCurrentPlayer(teamId, matchPlayer);
      row.appearances += 1;
      row.minutes += matchPlayer.minutes ?? 0;
      for (const field of ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon"]) {
        if (typeof matchPlayer[field] !== "number") continue;
        row.sums[field] += matchPlayer[field];
        row.coverage[field] += 1;
      }
    }
  }
  for (const booking of match.bookings || []) {
    if (!booking.playerId) continue;
    ensureCurrentPlayer(booking.team, booking).cards += 1;
  }
}
const currentLeaderboardRows = [...currentLeaderboardMap.values()].map(row => {
  const values = {
    goals: row.coverage.goals === row.appearances ? row.sums.goals : null,
    assists: row.coverage.assists === row.appearances ? row.sums.assists : null,
    shots: row.coverage.shots === row.appearances ? row.sums.shots : null,
    shotsOnTarget: row.coverage.shotsOnTarget === row.appearances ? row.sums.shotsOnTarget : null,
    cards: row.cards,
    foulsCommitted: row.coverage.foulsCommitted === row.appearances ? row.sums.foulsCommitted : null,
    foulsWon: row.coverage.foulsWon === row.appearances ? row.sums.foulsWon : null
  };
  return {
    id: row.id, name: row.name, currentTeamId: row.currentTeamId, currentTeam: row.currentTeam,
    role: row.role, previousTeam: null, sameClub: false, competition: "Serie A",
    appearances: row.appearances, minutes: row.minutes, values,
    per90: Object.fromEntries(leaderboardMetrics.map(metric => [metric.field, per90(values[metric.field], row.minutes)]))
  };
});
const currentLeaderboardByKey = new Map(currentLeaderboardRows.map(player => [`${player.currentTeamId}:${player.id}`, player]));
const totalLeaderboardRows = previousLeaderboardRows.map(previous => {
  const current = currentLeaderboardByKey.get(`${previous.currentTeamId}:${previous.id}`);
  const currentValues = current?.values || { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, cards: 0, foulsCommitted: null, foulsWon: null };
  const appearances = add(previous.appearances, current?.appearances ?? 0);
  const minutes = add(previous.minutes, current?.minutes ?? 0);
  const values = Object.fromEntries(leaderboardMetrics.map(metric => [metric.field, add(previous.values[metric.field], currentValues[metric.field])]));
  return { ...previous, appearances, minutes, values, per90: Object.fromEntries(leaderboardMetrics.map(metric => [metric.field, per90(values[metric.field], minutes)])) };
});
function buildLeaderboardRankings(rows, requireAppearance = false) {
  return Object.fromEntries(leaderboardMetrics.map(metric => {
    const players = rows.map(player => ({
    id: player.id,
    name: player.name,
    currentTeamId: player.currentTeamId,
    currentTeam: player.currentTeam,
    role: player.role,
    previousTeam: player.previousTeam,
    sameClub: player.sameClub,
    competition: player.competition,
    appearances: player.appearances,
    minutes: player.minutes,
    totalValue: player.values[metric.field],
    per90Value: metric.hasPer90 ? player.per90[metric.field] : null,
    tieValue: player.per90[metric.field] ?? player.minutes
  })).filter(player => (!requireAppearance || player.appearances > 0) && typeof player.totalValue === "number" && Number.isFinite(player.totalValue))
    .sort((left, right) => right.totalValue - left.totalValue || (right.tieValue ?? -1) - (left.tieValue ?? -1) || left.name.localeCompare(right.name, "it"));
    return [metric.id, { ...metric, availablePlayers: players.length, players: players.slice(0, 15).map(({ tieValue, ...player }) => player) }];
  }));
}
const periods = {
  "2026/27": { id: "2026/27", label: "2026/27", rankings: buildLeaderboardRankings(currentLeaderboardRows, true) },
  "2025/26": { id: "2025/26", label: "2025/26", rankings: buildLeaderboardRankings(previousLeaderboardRows) },
  total: { id: "total", label: "Totale 2025/26 + 2026/27", rankings: buildLeaderboardRankings(totalLeaderboardRows) }
};
write("data/teams/player-leaderboards.json", { schemaVersion: 2, currentSeason: "2026/27", previousSeason: "2025/26", generatedAt: today, periods });
write("data/schemas/team.schema.json", { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Serie A team", type: "object", required: ["id", "currentSeason", "city", "stadium", "coach", "preferredFormation", "probableLineup", "previousSeason", "teamStats", "squad", "sources", "lastUpdated"], properties: { city: { type: "string", minLength: 1 }, stadium: { type: "string", minLength: 1 }, coach: { type: "string", minLength: 1 }, preferredFormation: { type: "string", pattern: "^[1-9](?:-[1-9]){2,4}$" }, probableLineup: { type: "object", required: ["formation", "players", "context", "status", "source"], properties: { formation: { type: "string", pattern: "^[1-9](?:-[1-9]){2,4}$" }, players: { type: "array", minItems: 11, maxItems: 11, items: { type: "string", minLength: 1 } }, status: { enum: ["probable", "official"] } } }, squad: { type: "array", items: { $ref: "player.schema.json" } } } });
write("data/schemas/player.schema.json", { $schema: "https://json-schema.org/draft/2020-12/schema", title: "Serie A player", type: "object", required: ["id", "name", "currentTeam", "currentSeason", "role", "detailedRole", "status", "marketValue", "previousSeason", "sources", "dataQuality"], properties: { detailedRole: { type: "string", minLength: 1 }, status: { enum: ["confermato", "nuovo acquisto", "prestito", "rientro dal prestito", "primavera", "da verificare"] }, marketValue: { anyOf: [{ type: "null" }, { type: "object", required: ["amountEur", "currency", "provider", "retrievedAt", "sourceUrl"] }] }, photoAttribution: { anyOf: [{ type: "null" }, { type: "object", required: ["provider", "pageUrl", "artist", "license"] }] }, previousSeason: { type: "object", required: ["season", "entries", "totals", "totalsByCompetition"] } } });
console.log(`Generati dati per ${teams.length} club (${index.teams.filter(team => team.previousSeason.promoted).length} da Serie B).`);
