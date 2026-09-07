"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const rawRoot = path.join(root, "data/raw/champions-pilot/espn");
const outputPath = path.join(root, "data/sources/champions-pilot-match-stats-2025-27.json");
const refresh = process.argv.includes("--refresh");
const teams = [
  { id: "aek-athens", name: "AEK Athens", espnTeamId: "887", league: "gre.1", leagueName: "Super League Greece", baselineKind: "domestic" },
  { id: "arsenal", name: "Arsenal", espnTeamId: "359", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "aston-villa", name: "Aston Villa", espnTeamId: "362", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "atletico-de-madrid", name: "Atlético de Madrid", espnTeamId: "1068", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "barcelona", name: "Barcelona", espnTeamId: "83", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "bayern-munchen", name: "Bayern München", espnTeamId: "132", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "bodo-glimt", name: "Bodø/Glimt", espnTeamId: "2980", league: "nor.1", leagueName: "Eliteserien", baselineKind: "domestic" },
  { id: "borussia-dortmund", name: "Borussia Dortmund", espnTeamId: "124", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "club-brugge", name: "Club Brugge", espnTeamId: "570", league: "bel.1", leagueName: "Pro League", baselineKind: "domestic" },
  { id: "como", name: "Como", espnTeamId: "2572", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "fenerbahce", name: "Fenerbahçe", espnTeamId: "436", league: "uefa.europa", leagueName: "UEFA Europa League", baselineKind: "uefa-fallback" },
  { id: "feyenoord", name: "Feyenoord", espnTeamId: "142", league: "ned.1", leagueName: "Eredivisie", baselineKind: "domestic" },
  { id: "galatasaray", name: "Galatasaray", espnTeamId: "432", league: "uefa.champions", leagueName: "UEFA Champions League", baselineKind: "uefa-fallback" },
  { id: "inter", name: "Inter", espnTeamId: "110", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "lask", name: "LASK", espnTeamId: "4411", league: "aut.1", leagueName: "Bundesliga austriaca", baselineKind: "domestic" },
  { id: "leipzig", name: "Leipzig", espnTeamId: "11420", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "lens", name: "Lens", espnTeamId: "175", league: "fra.1", leagueName: "Ligue 1", baselineKind: "domestic" },
  { id: "lille", name: "Lille", espnTeamId: "166", league: "fra.1", leagueName: "Ligue 1", baselineKind: "domestic" },
  { id: "liverpool", name: "Liverpool", espnTeamId: "364", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "manchester-city", name: "Manchester City", espnTeamId: "382", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "manchester-united", name: "Manchester United", espnTeamId: "360", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "napoli", name: "Napoli", espnTeamId: "114", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "paris-saint-germain", name: "Paris Saint-Germain", espnTeamId: "160", league: "fra.1", leagueName: "Ligue 1", baselineKind: "domestic" },
  { id: "porto", name: "Porto", espnTeamId: "437", league: "por.1", leagueName: "Primeira Liga", baselineKind: "domestic" },
  { id: "psv-eindhoven", name: "PSV Eindhoven", espnTeamId: "148", league: "ned.1", leagueName: "Eredivisie", baselineKind: "domestic" },
  { id: "real-betis", name: "Real Betis", espnTeamId: "244", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "real-madrid", name: "Real Madrid", espnTeamId: "86", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "roma", name: "Roma", espnTeamId: "104", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "sabah", name: "Sabah", espnTeamId: "21922", league: "uefa.europa.conf_qual", leagueName: "Qualificazioni UEFA Conference League", baselineKind: "uefa-fallback" },
  { id: "shakhtar-donetsk", name: "Shakhtar Donetsk", espnTeamId: "493", league: "uefa.europa.conf", leagueName: "UEFA Conference League", baselineKind: "uefa-fallback" },
  { id: "slavia-praha", name: "Slavia Praha", espnTeamId: "494", league: "uefa.champions", leagueName: "UEFA Champions League", baselineKind: "uefa-fallback" },
  { id: "slovan-bratislava", name: "Slovan Bratislava", espnTeamId: "521", league: "uefa.europa.conf", leagueName: "UEFA Conference League", baselineKind: "uefa-fallback" },
  { id: "sporting-cp", name: "Sporting CP", espnTeamId: "2250", league: "por.1", leagueName: "Primeira Liga", baselineKind: "domestic" },
  { id: "stuttgart", name: "Stuttgart", espnTeamId: "134", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "viking", name: "Viking", espnTeamId: "510", league: "nor.1", leagueName: "Eliteserien", baselineKind: "domestic" },
  { id: "villarreal", name: "Villarreal", espnTeamId: "102", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" }
];
const seasons = [
  { id: "2025-26", dates: "20250701-20260630" },
  { id: "2026-27", dates: "20260701-20260906" }
];
const requiredStats = ["totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted", "yellowCards"];

const ensure = file => fs.mkdirSync(path.dirname(file), { recursive: true });
const writeJson = (file, value) => { ensure(file); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const readGzip = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
const writeGzip = (file, value) => { ensure(file); fs.writeFileSync(file, zlib.gzipSync(Buffer.from(JSON.stringify(value)))); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "serie-a-2026-27-champions-pilot/1.0" }, signal: controller.signal });
      if (!response.ok) throw new Error(`ESPN ${response.status}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function cached(url, file) {
  if (!refresh && fs.existsSync(file)) return readGzip(file);
  const value = { retrievedAt: new Date().toISOString(), url, payload: await request(url) };
  writeGzip(file, value);
  return value;
}

const competition = event => event.competitions?.[0];
const competitors = event => competition(event)?.competitors || [];
const isFinished = event => ["STATUS_FINAL", "STATUS_FULL_TIME", "STATUS_FINAL_AET", "STATUS_FINAL_PEN"].includes(event.status?.type?.name);
const number = value => {
  const text = String(value ?? "").trim();
  if (!text || ["--", "-", "N/A", "null"].includes(text)) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const stats = row => Object.fromEntries((row?.statistics || []).map(item => [item.name, number(item.displayValue)]));
const cleanStats = values => {
  const output = Object.fromEntries(requiredStats.map(key => [key, values[key] ?? null]));
  const placeholder = ["totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted"].every(key => output[key] === 0);
  if (placeholder) for (const key of ["totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted"]) output[key] = null;
  return output;
};

async function parallel(items, limit, worker) {
  let next = 0;
  const output = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

async function main() {
  const jobs = [];
  const scoreboards = [];
  for (const season of seasons) {
    for (const league of [...new Set(teams.map(team => team.league))]) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${season.dates}&limit=1000`;
      const raw = await cached(url, path.join(rawRoot, "scoreboards", season.id, `${league}.json.gz`));
      scoreboards.push({ season: season.id, league, retrievedAt: raw.retrievedAt, url, events: raw.payload.events?.length || 0 });
      for (const event of raw.payload.events || []) {
        if (!isFinished(event)) continue;
        jobs.push({ season: season.id, league, event });
      }
    }
  }
  const uniqueJobs = [...new Map(jobs.map(job => [String(job.event.id), job])).values()];
  const imported = await parallel(uniqueJobs, 6, async job => {
    const eventId = String(job.event.id);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${job.league}/summary?event=${eventId}`;
    const raw = await cached(url, path.join(rawRoot, "summaries", job.season, job.league, `${eventId}.json.gz`));
    const boxscore = raw.payload.boxscore?.teams || [];
    const sides = ["home", "away"].map(homeAway => {
      const eventSide = competitors(job.event).find(item => item.homeAway === homeAway);
      const providerTeamId = String(eventSide?.team?.id || "");
      const boxSide = boxscore.find(item => String(item.team?.id || "") === providerTeamId);
      const values = cleanStats(stats(boxSide));
      return {
        homeAway,
        providerTeamId,
        name: eventSide?.team?.displayName || eventSide?.team?.name || null,
        score: number(eventSide?.score),
        statistics: values
      };
    });
    const missing = sides.flatMap(side => requiredStats.filter(key => side.statistics[key] == null).map(key => `${side.homeAway}.${key}`));
    return {
      eventId,
      season: job.season,
      league: job.league,
      date: job.event.date?.slice(0, 10) || null,
      home: sides[0],
      away: sides[1],
      coverage: missing.length ? "partial" : "complete",
      missing,
      source: { provider: "ESPN", url: `https://www.espn.com/soccer/match/_/gameId/${eventId}`, summaryUrl: url, retrievedAt: raw.retrievedAt }
    };
  });
  const matches = imported.filter(match => match.home.score != null && match.away.score != null).sort((a, b) => a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId));
  const teamCoverage = teams.map(team => {
    const rows = matches.filter(match => match.home.providerTeamId === team.espnTeamId || match.away.providerTeamId === team.espnTeamId);
    return { teamId: team.id, team: team.name, matches: rows.length, completeMatches: rows.filter(row => row.coverage === "complete").length, baselineKind: team.baselineKind };
  });
  const output = {
    schemaVersion: 1,
    scope: "Champions League 2026/27: profili quantitativi delle 36 partecipanti, con baseline domestica quando disponibile e fallback UEFA esplicito",
    retrievedAt: [...matches.map(match => match.source.retrievedAt)].sort().at(-1) || null,
    cutoffDate: "2026-09-06",
    teams,
    seasons,
    metrics: requiredStats,
    summary: { matches: matches.length, completeMatches: matches.filter(match => match.coverage === "complete").length, teams: teams.length },
    teamCoverage,
    scoreboards,
    matches
  };
  writeJson(outputPath, output);
  console.log(`OK statistiche pilot Champions: ${matches.length} gare · ${output.summary.completeMatches} complete · ${teams.length} squadre`);
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
