"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const normalized = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/referee-matches/2025-26/serie-a.json"), "utf8"));
const rawDir = path.join(root, "data/raw/referee-stats/espn/2025-26/serie-a");
const outputArg = process.argv.indexOf("--output");
if (outputArg >= 0 && !process.argv[outputArg + 1]) throw new Error("--output richiede un percorso");
const outputPath = path.resolve(root, outputArg >= 0 ? process.argv[outputArg + 1] : "data/normalized/team-volume-profiles-2025-26.json");
// Prefer the original referee snapshot, then its relocated archive. No copies.
const rawDirs = [rawDir, path.join(root, "seria-a-2026-27-raw-archive-2026-08-24/data/raw/referee-stats/espn/2025-26/serie-a"), path.join(root, "data/raw/team-pages/espn/2025-26/serie-a")];
const inputs = new Map(normalized.matches.map(match => [match.providerFixtureId, rawDirs.flatMap(dir => [path.join(dir, `${match.providerFixtureId}.json`), path.join(dir, `${match.providerFixtureId}.json.gz`)]).find(file => fs.existsSync(file))]));
const missing = [...inputs].filter(([, file]) => !file).map(([id]) => id);
if (missing.length) throw new Error(`Referti realmente assenti (${missing.length}): ${missing.join(", ")}. Cercati in: ${rawDirs.join(", ")}`);
const metricNames = ["totalShots", "shotsOnTarget", "wonCorners"];
const emptyVenue = () => Object.fromEntries(metricNames.map(metric => [metric, { for: [], against: [] }]));
const rows = new Map();

const ensure = teamId => {
  if (!rows.has(teamId)) rows.set(teamId, { teamId, matches: [], venues: { overall: emptyVenue(), home: emptyVenue(), away: emptyVenue() } });
  return rows.get(teamId);
};
const number = value => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const statsObject = team => Object.fromEntries((team?.statistics || []).map(stat => [stat.name, number(stat.displayValue)]));
const quantile = (values, probability) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};
const summary = values => {
  if (!values.length) return { matches: 0, mean: null, sd: null, p20: null, median: null, p80: null, min: null, max: null, values: [] };
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return {
    matches: values.length,
    mean: Number(mean.toFixed(3)),
    sd: Number(Math.sqrt(variance).toFixed(3)),
    p20: Number(quantile(values, 0.2).toFixed(3)),
    median: Number(quantile(values, 0.5).toFixed(3)),
    p80: Number(quantile(values, 0.8).toFixed(3)),
    min: Math.min(...values),
    max: Math.max(...values),
    values
  };
};

let retrievedAt = null;
for (const match of normalized.matches) {
  const rawPath = inputs.get(match.providerFixtureId);
  const rawBuffer = fs.readFileSync(rawPath);
  const raw = JSON.parse((rawPath.endsWith(".gz") ? zlib.gunzipSync(rawBuffer) : rawBuffer).toString("utf8"));
  retrievedAt = [retrievedAt, raw.retrievedAt, raw.bundle?.source?.retrievedAt].filter(Boolean).sort().at(-1) || retrievedAt;
  const boxscore = raw.bundle?.summary?.boxscore?.teams || [];
  const homeStats = statsObject(boxscore.find(team => team.homeAway === "home"));
  const awayStats = statsObject(boxscore.find(team => team.homeAway === "away"));
  if (metricNames.some(metric => homeStats[metric] == null || awayStats[metric] == null)) throw new Error(`Volumi incompleti: ${match.id}`);
  const sides = [
    { teamId: match.homeTeam.slug, venue: "home", own: homeStats, opponent: awayStats },
    { teamId: match.awayTeam.slug, venue: "away", own: awayStats, opponent: homeStats }
  ];
  for (const side of sides) {
    const team = ensure(side.teamId);
    team.matches.push({ matchId: match.id, date: match.date, matchday: match.matchday, venue: side.venue, for: Object.fromEntries(metricNames.map(metric => [metric, side.own[metric]])), against: Object.fromEntries(metricNames.map(metric => [metric, side.opponent[metric]])) });
    for (const metric of metricNames) {
      team.venues.overall[metric].for.push(side.own[metric]);
      team.venues.overall[metric].against.push(side.opponent[metric]);
      team.venues[side.venue][metric].for.push(side.own[metric]);
      team.venues[side.venue][metric].against.push(side.opponent[metric]);
    }
  }
}

const profiles = [...rows.values()].map(team => {
  const venues = Object.fromEntries(Object.entries(team.venues).map(([venue, metrics]) => [venue, Object.fromEntries(metricNames.map(metric => [metric, { for: summary(metrics[metric].for), against: summary(metrics[metric].against) }]))]));
  const recentMatches = [...team.matches].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  const recent = Object.fromEntries(metricNames.map(metric => {
    let weightTotal = 0, produced = 0, conceded = 0;
    recentMatches.forEach((match, index) => {
      const weight = 0.82 ** index;
      weightTotal += weight;
      produced += match.for[metric] * weight;
      conceded += match.against[metric] * weight;
    });
    return [metric, {
      matches: recentMatches.length,
      decay: 0.82,
      for: { ...summary(recentMatches.map(match => match.for[metric])), weightedMean: weightTotal ? Number((produced / weightTotal).toFixed(3)) : null },
      against: { ...summary(recentMatches.map(match => match.against[metric])), weightedMean: weightTotal ? Number((conceded / weightTotal).toFixed(3)) : null }
    }];
  }));
  return { teamId: team.teamId, season: "2025-26", matches: team.matches.length, venues, recent };
}).sort((a, b) => a.teamId.localeCompare(b.teamId));

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2025-26",
  generatedAt: retrievedAt,
  metrics: metricNames,
  coverage: { matches: normalized.matches.length, teamPerformances: normalized.matches.length * 2, teams: profiles.length, completeMetrics: true },
  methodology: "Per ogni squadra: distribuzioni generale, casa e trasferta dei volumi prodotti e concessi; ultime otto gare con decadimento 0,82. Percentili lineari p20-p80 sul campione osservato.",
  source: { provider: "ESPN", rawDirectory: "data/raw/referee-stats/espn/2025-26/serie-a", retrievedAt },
  profiles
};
if (outputArg < 0 && fs.existsSync(outputPath) && JSON.stringify(JSON.parse(fs.readFileSync(outputPath,"utf8"))) !== JSON.stringify(output)) throw new Error("Output consolidato divergente: rigenerare con --output in una destinazione temporanea e confrontare prima della promozione.");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK profili volume: ${output.coverage.matches} gare · ${output.coverage.teamPerformances} prestazioni · ${profiles.length} squadre`);
