const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const teams = read("data/normalized/teams.json");
const quotations = read("data/sources/fantacalcio-quotations-2026-27.json");
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
    if (!Number.isFinite(appearances) || appearances <= 0) continue;
    entries.push({
      league,
      appearances,
      starts: numberFrom(stats, "starts"),
      minutes: numberFrom(stats, "minutes"),
      goals: numberFrom(stats, "totalGoals", "goals"),
      assists: numberFrom(stats, "goalAssists", "assists"),
      goalsConceded: numberFrom(stats, "goalsConceded"),
      yellowCards: numberFrom(stats, "yellowCards"),
      redCards: numberFrom(stats, "redCards", "totalRedCards"),
      sourceUrl: statsUrl
    });
  }
  if (!entries.length) return previousByPlayerId.get(target.playerId) || null;
  return {
    playerId: target.playerId,
    providerPlayerId: target.espnId,
    season: "2025/26",
    entries,
    totals: {
      appearances: sum(entries, "appearances"),
      starts: sum(entries, "starts"),
      minutes: sum(entries, "minutes"),
      goals: sum(entries, "goals"),
      assists: sum(entries, "assists"),
      goalsConceded: sum(entries, "goalsConceded"),
      yellowCards: sum(entries, "yellowCards"),
      redCards: sum(entries, "redCards")
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
  const goalkeepersOnly = process.argv.includes("--goalkeepers-only");
  const targets = quotations.players
    .filter(quote => !goalkeepersOnly || quote.role === "P")
    .filter(quote => quote.playerId)
    .map(quote => {
      const player = teamPlayers.get(quote.playerId);
      return player?.providerIds?.espn ? { playerId: quote.playerId, espnId: String(player.providerIds.espn) } : null;
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
