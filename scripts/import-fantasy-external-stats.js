const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const teams = read("data/normalized/teams.json");
const quotations = read("data/sources/fantacalcio-quotations-2026-27.json");
const providerIdOverrides = read("data/sources/fantasy-provider-id-overrides-2026-27.json").players;
const teamPlayers = new Map(teams.flatMap(team => read(`data/teams/${team.id}.json`).squad.map(player => [player.id, player])));
const outputFile = "data/sources/fantasy-external-stats-2025-26.json";
const previous = fs.existsSync(path.join(root, outputFile)) ? read(outputFile) : { players: [] };
const previousByPlayerId = new Map(previous.players.map(player => [player.playerId, player]));
const domesticLeaguePattern = /^[a-z]{3}\.[12]$/;
const headers = { "user-agent": "Mozilla/5.0", accept: "application/json" };

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function requestJson(url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    } catch (error) {
      if (attempt === attempts) throw error;
      await wait(attempt * 500);
    }
  }
}

const statMap = payload => new Map((payload?.splits?.categories || []).flatMap(category => category.stats || []).map(stat => [stat.name, stat.value]));
const numberFrom = (stats, ...names) => {
  for (const name of names) if (Number.isFinite(stats.get(name))) return stats.get(name);
  return null;
};
const sum = (entries, field) => {
  const values = entries.map(entry => entry[field]).filter(Number.isFinite);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
};
const percentageFrom = (stats, ...names) => {
  const value = numberFrom(stats, ...names);
  if (!Number.isFinite(value)) return null;
  return value <= 1 ? Number((value * 100).toFixed(1)) : Number(value.toFixed(1));
};

async function importPlayer(target) {
  const leagueIndexUrl = `https://sports.core.api.espn.com/v2/sports/soccer/athletes/${target.espnId}/leagues?lang=en&region=us&limit=100`;
  const leagueIndex = await requestJson(leagueIndexUrl);
  const leagues = (leagueIndex?.items || [])
    .map(item => item.$ref?.match(/\/leagues\/([^?]+)/)?.[1] || null)
    .filter(league => league && domesticLeaguePattern.test(league));
  const entries = [];
  for (const league of leagues) {
    const statsUrl = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${league}/seasons/2025/types/1/athletes/${target.espnId}/statistics/0?lang=en&region=us`;
    const payload = await requestJson(statsUrl);
    const stats = statMap(payload);
    const appearances = numberFrom(stats, "appearances");
    if (!Number.isFinite(appearances) || appearances < 0) continue;
    entries.push({
      league,
      appearances,
      starts: numberFrom(stats, "starts"),
      substituteAppearances: numberFrom(stats, "subIns"),
      minutes: numberFrom(stats, "minutes"),
      substitutedOff: numberFrom(stats, "subOuts"),
      goals: numberFrom(stats, "totalGoals", "goals"),
      assists: numberFrom(stats, "goalAssists", "assists"),
      shots: numberFrom(stats, "totalShots"),
      shotsOnTarget: numberFrom(stats, "shotsOnTarget"),
      penaltiesTaken: numberFrom(stats, "penaltyKickShots"),
      penaltiesScored: numberFrom(stats, "penaltyKickGoals"),
      offsides: numberFrom(stats, "offsides"),
      keyPasses: numberFrom(stats, "shotAssists"),
      passAccuracy: percentageFrom(stats, "passPct"),
      crosses: numberFrom(stats, "totalCrosses"),
      foulsCommitted: numberFrom(stats, "foulsCommitted"),
      foulsWon: numberFrom(stats, "foulsSuffered"),
      goalsConceded: numberFrom(stats, "goalsConceded"),
      cleanSheets: numberFrom(stats, "cleanSheet"),
      saves: numberFrom(stats, "saves"),
      penaltiesFaced: numberFrom(stats, "penaltyKicksFaced"),
      penaltiesSaved: numberFrom(stats, "penaltyKicksSaved"),
      yellowCards: numberFrom(stats, "yellowCards"),
      redCards: numberFrom(stats, "redCards", "totalRedCards"),
      tackles: numberFrom(stats, "totalTackles"),
      interceptions: numberFrom(stats, "interceptions"),
      clearances: numberFrom(stats, "totalClearance"),
      sourceUrl: statsUrl
    });
  }
  if (!entries.length) return previousByPlayerId.get(target.playerId) || null;
  return {
    playerId: target.playerId,
    providerPlayerId: target.espnId,
    role: target.role,
    season: "2025/26",
    entries,
    totals: {
      ...Object.fromEntries([
        "appearances", "starts", "substituteAppearances", "minutes", "substitutedOff", "goals", "assists", "shots",
        "shotsOnTarget", "penaltiesTaken", "penaltiesScored", "offsides", "keyPasses", "crosses", "foulsCommitted",
        "foulsWon", "goalsConceded", "cleanSheets", "saves", "penaltiesFaced", "penaltiesSaved", "yellowCards",
        "redCards", "tackles", "interceptions", "clearances"
      ].map(field => [field, sum(entries, field)])),
      passAccuracy: (() => {
        const attempted = sum(entries, "minutes");
        if (!attempted) return null;
        const weighted = entries.filter(entry => Number.isFinite(entry.passAccuracy) && Number.isFinite(entry.minutes));
        return weighted.length ? Number((weighted.reduce((total, entry) => total + entry.passAccuracy * entry.minutes, 0) / weighted.reduce((total, entry) => total + entry.minutes, 0)).toFixed(1)) : null;
      })()
    },
    provider: "ESPN Core",
    sourceUrl: `https://www.espn.com/soccer/player/stats/_/id/${target.espnId}`,
    retrievedAt: new Date().toISOString()
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        console.warn(`${items[index].playerId}: ${error.message}`);
        results[index] = previousByPlayerId.get(items[index].playerId) || null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function main() {
  const inspectArg = process.argv.find(argument => argument.startsWith("--inspect-espn="));
  if (inspectArg) {
    const espnId = inspectArg.slice("--inspect-espn=".length);
    const leagueIndex = await requestJson(`https://sports.core.api.espn.com/v2/sports/soccer/athletes/${espnId}/leagues?lang=en&region=us&limit=100`);
    const leagues = (leagueIndex?.items || [])
      .map(item => item.$ref?.match(/\/leagues\/([^?]+)/)?.[1] || null)
      .filter(league => league && domesticLeaguePattern.test(league));
    for (const league of leagues) {
      const statsUrl = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${league}/seasons/2025/types/1/athletes/${espnId}/statistics/0?lang=en&region=us`;
      const payload = await requestJson(statsUrl);
      console.log(JSON.stringify({ league, payload }, null, 2));
    }
    return;
  }
  const goalkeepersOnly = process.argv.includes("--goalkeepers-only");
  const targets = quotations.players
    .filter(quote => !goalkeepersOnly || quote.role === "P")
    .filter(quote => quote.playerId)
    .map(quote => {
      const player = teamPlayers.get(quote.playerId);
      const espnId = providerIdOverrides[quote.playerId]?.espn || player?.providerIds?.espn;
      return espnId ? { playerId: quote.playerId, espnId: String(espnId), role: quote.role } : null;
    })
    .filter(Boolean);
  const refreshed = (await mapLimit(targets, 6, importPlayer)).filter(Boolean);
  const refreshedByPlayerId = new Map(refreshed.map(player => [player.playerId, player]));
  const imported = goalkeepersOnly
    ? [...previous.players.map(player => refreshedByPlayerId.get(player.playerId) || player), ...refreshed.filter(player => !previousByPlayerId.has(player.playerId))]
    : refreshed;
  write(outputFile, {
    schemaVersion: 1,
    season: "2025/26",
    generatedAt: new Date().toISOString(),
    provider: "ESPN Core",
    scope: "Campionati nazionali 2025/26 associati tramite provider ID ESPN; coppe e nazionali escluse.",
    players: imported.sort((a, b) => a.playerId.localeCompare(b.playerId))
  });
  console.log(`Statistiche esterne Fantacalcio: ${refreshed.length}/${targets.length} profili aggiornati, ${imported.length} totali.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
