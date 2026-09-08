"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PLAYER_FIELDS, playerEntry, round } = require("./team-pages/model");

const root = path.resolve(__dirname, "..");
const rawRoot = path.join(root, "data/raw/champions-pilot/espn/summaries/2025-26");
const rosterRawRoot = path.join(root, "data/raw/champions-player-stats/espn/rosters");
const squadSourcePath = path.join(root, "data/sources/champions-registered-squads-2026-27.json");
const squadFragmentsPath = path.join(root, "data/sources/champions-squads");
const teamConfigPath = path.join(root, "data/sources/champions-pilot-match-stats-2025-27.json");
const outputPath = path.join(root, "data/normalized/champions-player-stats-2025-26.json");

const serieATeams = new Map([
  ["Inter", "inter"],
  ["Napoli", "napoli"],
  ["Roma", "roma"],
  ["Como", "como"]
]);
const competitionLabels = {
  "eng.1": "Premier League", "esp.1": "LaLiga", "ger.1": "Bundesliga", "ita.1": "Serie A",
  "fra.1": "Ligue 1", "por.1": "Primeira Liga", "ned.1": "Eredivisie", "bel.1": "Pro League",
  "aut.1": "Bundesliga austriaca", "gre.1": "Super League Greece", "nor.1": "Eliteserien",
  "uefa.champions": "UEFA Champions League", "uefa.europa": "UEFA Europa League",
  "uefa.europa.conf": "UEFA Conference League", "uefa.europa.conf_qual": "Qualificazioni UEFA Conference League"
};

const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const slug = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/đ/g, "d")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const sumNullable = values => {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) : null;
};
const statMap = stats => Object.fromEntries((stats || []).map(stat => [stat.name, number(stat.value ?? stat.displayValue)]));

function matchMinutes(entry) {
  const stats = statMap(entry.stats);
  if ((stats.appearances ?? 0) < 1) return null;
  const play = (entry.plays || []).find(item => item.substitution && item.clock?.displayValue);
  const minute = play ? Number(String(play.clock.displayValue).match(/\d+/)?.[0]) : null;
  if (entry.starter) return entry.subbedOut && minute !== null ? Math.min(90, minute) : 90;
  if (entry.subbedIn && minute !== null) return Math.max(0, 90 - Math.min(90, minute));
  return null;
}

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : entry.name.endsWith(".json.gz") ? [target] : [];
  });
}

function squadTeams() {
  const source = JSON.parse(fs.readFileSync(squadSourcePath, "utf8"));
  const fragments = fs.readdirSync(squadFragmentsPath)
    .filter(file => file.endsWith(".json"))
    .sort()
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(squadFragmentsPath, file), "utf8")).teams);
  return [...source.teams, ...fragments].map(team => ({
    team: team.team,
    id: slug(team.team),
    players: team.players.map(([name, position]) => ({ id: slug(name), name, position }))
  }));
}

function collectEspnRows() {
  const athletesByNormalizedName = new Map();
  const athletesByTeamAndName = new Map();
  const matchesByAthlete = new Map();
  let sourceMatches = 0;
  for (const file of files(rawRoot)) {
    const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
    const payload = raw.payload || raw.bundle?.summary || {};
    const league = path.basename(path.dirname(file));
    let counted = false;
    for (const roster of payload.rosters || []) {
      if (!Array.isArray(roster.roster) || !roster.roster.length) continue;
      counted = true;
      const providerTeamId = String(roster.team?.id || "");
      for (const row of roster.roster) {
        const providerPlayerId = String(row.athlete?.id || "");
        const name = row.athlete?.fullName || row.athlete?.displayName || null;
        if (!providerPlayerId || !name) continue;
        const nameKey = normalize(name);
        if (!athletesByNormalizedName.has(nameKey)) athletesByNormalizedName.set(nameKey, new Set());
        athletesByNormalizedName.get(nameKey).add(providerPlayerId);
        const teamNameKey = `${providerTeamId}|${nameKey}`;
        if (!athletesByTeamAndName.has(teamNameKey)) athletesByTeamAndName.set(teamNameKey, new Set());
        athletesByTeamAndName.get(teamNameKey).add(providerPlayerId);
        const stats = statMap(row.stats);
        if ((stats.appearances ?? 0) < 1) continue;
        if (!matchesByAthlete.has(providerPlayerId)) matchesByAthlete.set(providerPlayerId, []);
        matchesByAthlete.get(providerPlayerId).push({
          league,
          teamId: providerTeamId,
          team: roster.team?.displayName || roster.team?.name || "N/D",
          name,
          row,
          stats,
          minutes: matchMinutes(row),
          retrievedAt: raw.retrievedAt || null
        });
      }
    }
    if (counted) sourceMatches += 1;
  }
  return { athletesByNormalizedName, athletesByTeamAndName, matchesByAthlete, sourceMatches };
}

function currentRosterIds() {
  const byTeamAndName = new Map();
  if (!fs.existsSync(rosterRawRoot)) return byTeamAndName;
  for (const file of fs.readdirSync(rosterRawRoot).filter(name => name.endsWith(".json.gz"))) {
    const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(rosterRawRoot, file))).toString("utf8"));
    const teamId = String(raw.teamId || "");
    for (const athlete of raw.payload?.athletes || []) {
      const providerPlayerId = String(athlete.id || "");
      const name = athlete.fullName || athlete.displayName || null;
      if (!teamId || !providerPlayerId || !name) continue;
      const key = `${teamId}|${normalize(name)}`;
      if (!byTeamAndName.has(key)) byTeamAndName.set(key, new Set());
      byTeamAndName.get(key).add(providerPlayerId);
    }
  }
  return byTeamAndName;
}

function totals(entries) {
  if (!entries.length) return playerEntry({});
  const aggregate = {};
  for (const field of PLAYER_FIELDS) aggregate[field] = sumNullable(entries.map(entry => entry[field]));
  aggregate.minutesPerAppearance = aggregate.minutes !== null && aggregate.appearances ? round(aggregate.minutes / aggregate.appearances) : null;
  return playerEntry(aggregate);
}

function aggregateEntries(providerPlayerId, position, rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = `${row.league}|${row.teamId}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  return [...buckets].map(([key, matches]) => {
    const [league] = key.split("|");
    const total = field => sumNullable(matches.map(match => match.stats[field]));
    const minutes = sumNullable(matches.map(match => match.minutes));
    const isGoalkeeper = position === "goalkeeper";
    const saves = isGoalkeeper ? total("saves") : null;
    const shotsFaced = isGoalkeeper ? total("shotsFaced") : null;
    return playerEntry({
      playerId: null,
      providerPlayerId,
      team: matches[0].team,
      competition: competitionLabels[league] || league,
      competitionType: league.startsWith("uefa.") ? "uefa-competition" : "domestic-league",
      appearances: matches.length,
      starts: matches.filter(match => match.row.starter).length,
      substituteAppearances: matches.filter(match => match.row.subbedIn).length,
      minutes,
      minutesPerAppearance: minutes === null ? null : round(minutes / matches.length),
      completeMatches: matches.filter(match => match.row.starter && !match.row.subbedOut).length,
      substitutedOff: matches.filter(match => match.row.starter && match.row.subbedOut).length,
      goals: total("totalGoals"),
      assists: total("goalAssists"),
      shots: total("totalShots"),
      shotsOnTarget: total("shotsOnTarget"),
      offsides: total("offsides"),
      foulsCommitted: total("foulsCommitted"),
      foulsWon: total("foulsSuffered"),
      yellowCards: total("yellowCards"),
      secondYellowCards: null,
      straightRedCards: total("redCards"),
      goalsConceded: isGoalkeeper ? total("goalsConceded") : null,
      saves,
      savePercentage: saves !== null && shotsFaced ? round(saves * 100 / shotsFaced, 1) : null,
      source: "ESPN",
      sourceUrl: `https://www.espn.com/soccer/player/_/id/${providerPlayerId}`,
      lastUpdated: matches.map(match => match.retrievedAt).filter(Boolean).sort().at(-1)?.slice(0, 10) || null,
      fieldSources: { employment: "ESPN match rosters", attack: "ESPN match rosters", discipline: "ESPN match rosters", goalkeeping: "ESPN match rosters" }
    });
  }).sort((left, right) => (right.appearances ?? 0) - (left.appearances ?? 0) || left.competition.localeCompare(right.competition, "it"));
}

const serieAAliases = new Map([
  ["roma|emmanuel kone", "manu-kone"],
  ["como|nicolas paz", "nico-paz"],
  ["como|tasos douvikas", "anastasios-douvikas"],
  ["como|moise kean", "kean"]
]);

function copiedSerieAPlayer(teamId, player) {
  const team = read(`data/teams/${teamId}.json`);
  const aliasId = serieAAliases.get(`${teamId}|${normalize(player.name)}`);
  const candidates = team.squad.filter(candidate => candidate.id === player.id || candidate.id === aliasId || normalize(candidate.name) === normalize(player.name));
  if (candidates.length !== 1 || !candidates[0].previousSeason) return null;
  return {
    providerPlayerId: candidates[0].providerIds?.espn || null,
    previousSeason: candidates[0].previousSeason,
    sourceMode: "copied-serie-a",
    sourcePlayerId: candidates[0].id
  };
}

function seasonalHistory(player, providerPlayerId, source) {
  if (!source?.entries?.length) return null;
  const fields = {appearances:"appearances",starts:"starts",substituteAppearances:"subIns",minutes:"minutes",substitutedOff:"subOuts",goals:"totalGoals",assists:"goalAssists",shots:"totalShots",shotsOnTarget:"shotsOnTarget",penaltiesTaken:"penaltyKickShots",penaltiesScored:"penaltyKickGoals",offsides:"offsides",keyPasses:"shotAssists",crosses:"totalCrosses",foulsCommitted:"foulsCommitted",foulsWon:"foulsSuffered",yellowCards:"yellowCards",secondYellowCards:"secondYellowCards",straightRedCards:"redCards",tackles:"totalTackles",interceptions:"interceptions",clearances:"totalClearance",goalsConceded:"goalsConceded",cleanSheets:"cleanSheet",saves:"saves",penaltiesFaced:"penaltyKicksFaced",penaltiesSaved:"penaltyKicksSaved"};
  const entries=source.entries.map(item=>playerEntry({
    ...Object.fromEntries(Object.entries(fields).map(([field,key])=>[field,typeof item.stats[key]==="number"?item.stats[key]:null])),
    playerId:player.id,providerPlayerId,team:"N/D",competition:item.competition,
    competitionType:item.league.startsWith("uefa.")?"uefa-competition":"domestic-league",
    season:item.seasonLabel||"2025/26",sourceUrl:item.sourceUrl,retrievedAt:item.retrievedAt,
    sourceNote:"Totale stagionale ESPN per competizione; club storico non attribuito automaticamente."
  }));
  const aggregate=totals(entries);
  return {...player,providerPlayerId,previousSeason:{season:entries.every(entry=>entry.season==="2025")?"2025":"2025/26",entries,totals:aggregate,totalsByCompetition:entries},sourceMode:"espn-season-statistics",dataQuality:["appearances","minutes","goals","assists","shots","shotsOnTarget","yellowCards","foulsCommitted","foulsWon"].every(field=>aggregate[field]!==null)?"complete":"partial"};
}

function main() {
  const teams = squadTeams();
  const configs = JSON.parse(fs.readFileSync(teamConfigPath, "utf8")).teams;
  const configByName = new Map(configs.map(team => [team.name, team]));
  const espn = collectEspnRows();
  const rosterIds = currentRosterIds();
  const identity = read("data/sources/champions-player-history-aliases.json");
  const aliases = identity.aliases;
  const seasonalPath="data/sources/champions-player-season-history-2025-26.json";
  const seasonal=fs.existsSync(path.join(root,seasonalPath))?read(seasonalPath):{players:[]};
  const seasonalByPlayer=new Map(seasonal.players.map(player=>[`${player.team}|${player.playerId}`,player]));
  const outputTeams = teams.map(team => {
    const serieATeamId = serieATeams.get(team.team);
    const config = configByName.get(team.team);
    if (!config) throw new Error(`${team.team}: configurazione ESPN mancante`);
    const players = team.players.map(player => {
      if (serieATeamId) {
        const copied = copiedSerieAPlayer(serieATeamId, player);
        if (copied && copied.previousSeason.entries.length) return { ...player, ...copied, dataQuality: "complete" };
      }
      const nameKey = normalize(aliases[`${team.team}|${player.name}`] || player.name);
      const rosterCandidates = [...(rosterIds.get(`${config.espnTeamId}|${nameKey}`) || [])];
      const teamCandidates = [...(espn.athletesByTeamAndName.get(`${config.espnTeamId}|${nameKey}`) || [])];
      const globalCandidates = [...(espn.athletesByNormalizedName.get(nameKey) || [])];
      const verifiedId=identity.providerIds?.[`${team.team}|${player.name}`]?.id;
      const candidates = verifiedId ? [verifiedId] : rosterCandidates.length === 1 ? rosterCandidates : teamCandidates.length === 1 ? teamCandidates : globalCandidates.length === 1 ? globalCandidates : [];
      if (candidates.length !== 1) return { ...player, providerPlayerId: null, previousSeason: null, sourceMode: "espn-match-rosters", dataQuality: "unavailable", unmatchedReason: globalCandidates.length > 1 ? "Nome omonimo non associato automaticamente" : "Nome non trovato nei roster partita importati" };
      const providerPlayerId = candidates[0];
      const entries = aggregateEntries(providerPlayerId, player.position, espn.matchesByAthlete.get(providerPlayerId) || []).map(entry => ({ ...entry, playerId: player.id }));
      if (!entries.length) {
        const recovered=seasonalHistory(player,providerPlayerId,seasonalByPlayer.get(`${team.team}|${player.id}`));
        if(recovered)return recovered;
      }
      if (!entries.length) return { ...player, providerPlayerId, previousSeason: null, sourceMode: "espn-match-rosters", dataQuality: "unavailable", unmatchedReason: "Nessuna presenza 2025/26 nel campione importato" };
      const aggregate = totals(entries);
      return {
        ...player,
        providerPlayerId,
        previousSeason: { season: "2025/26", entries, totals: aggregate, totalsByCompetition: entries },
        sourceMode: "espn-match-rosters",
        dataQuality: entries.some(entry => entry.minutes !== null) ? "complete" : "partial"
      };
    });
    return {
      team: team.team,
      id: team.id,
      sourceMode: serieATeamId ? "copied-serie-a" : "espn-match-rosters",
      players,
      summary: {
        players: players.length,
        complete: players.filter(player => player.dataQuality === "complete").length,
        partial: players.filter(player => player.dataQuality === "partial").length,
        unavailable: players.filter(player => player.dataQuality === "unavailable").length
      }
    };
  });
  const allPlayers = outputTeams.flatMap(team => team.players);
  const output = {
    schemaVersion: 1,
    season: "2025/26",
    scope: "Statistiche storiche dei giocatori registrati alla Champions League 2026/27, con lo stesso schema delle schede Serie A",
    generatedAt: JSON.parse(fs.readFileSync(teamConfigPath, "utf8")).retrievedAt,
    source: {
      provider: "ESPN e dataset Serie A locale",
      note: "Le quattro squadre di Serie A copiano i profili canonici del progetto; i profili mancanti usano i roster partita e le statistiche stagionali ESPN 2025/26. Le associazioni ambigue restano N/D."
    },
    summary: {
      teams: outputTeams.length,
      players: allPlayers.length,
      complete: allPlayers.filter(player => player.dataQuality === "complete").length,
      partial: allPlayers.filter(player => player.dataQuality === "partial").length,
      unavailable: allPlayers.filter(player => player.dataQuality === "unavailable").length,
      sourceMatchesWithRosters: espn.sourceMatches,
      copiedSerieATeams: serieATeams.size
    },
    teams: outputTeams
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Statistiche giocatori Champions: ${output.summary.complete} complete · ${output.summary.partial} parziali · ${output.summary.unavailable} N/D su ${output.summary.players}`);
}

main();
