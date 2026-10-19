"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-team-strength-2026-27.json");
const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-team-strength-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const calendar = JSON.parse(fs.readFileSync(calendarPath, "utf8"));

const fail = message => { throw new Error(`Forza Champions: ${message}`); };
const round = value => Math.round(value * 10) / 10;
const recentScores = {
  "ucl-winner": 100,
  "ucl-final": 94,
  "ucl-semifinal": 88,
  "ucl-quarter": 80,
  "ucl-round-16": 70,
  "ucl-playoff": 60,
  "ucl-league": 48,
  "uel-winner": 78,
  "uel-quarter": 62,
  "uel-round-16": 54,
  "uel-playoff": 46,
  "uel-league": 38,
  "uecl-semifinal": 48,
  "uecl-quarter": 42,
  "uecl-league": 28
};

if (source.schemaVersion !== 1 || source.season !== "2026-27" || !Array.isArray(source.teams)) fail("fonte non valida");
if (!source.source?.url?.startsWith("https://www.uefa.com/")) fail("fonte UEFA ufficiale mancante");
if (source.teams.length !== 36) fail(`attese 36 squadre, trovate ${source.teams.length}`);

const calendarTeams = new Set(calendar.teams);
const names = new Set();
const ranks = new Set();
for (const team of source.teams) {
  if (!team.team || names.has(team.team)) fail(`squadra mancante o duplicata: ${team.team || "N/D"}`);
  names.add(team.team);
  if (!calendarTeams.has(team.team)) fail(`${team.team}: assente dal calendario ufficiale`);
  if (team.uefaRank != null) {
    if (!Number.isInteger(team.uefaRank) || team.uefaRank < 1 || ranks.has(team.uefaRank)) fail(`${team.team}: ranking UEFA non valido o duplicato`);
    ranks.add(team.uefaRank);
  }
  if (team.recentEuropeLevel != null && recentScores[team.recentEuropeLevel] == null) fail(`${team.team}: livello europeo sconosciuto`);
}
if (names.size !== calendarTeams.size || [...calendarTeams].some(team => !names.has(team))) fail("copertura squadre non allineata al calendario");

const ranked = source.teams.filter(team => team.uefaRank != null).sort((a, b) => a.uefaRank - b.uefaRank);
const coefficientScoreByTeam = new Map(ranked.map((team, index) => [team.team, round(100 - index * 100 / Math.max(1, ranked.length - 1))]));
const teams = source.teams.map(team => {
  const coefficientScore = coefficientScoreByTeam.get(team.team) ?? null;
  const recentEuropeScore = team.recentEuropeLevel ? recentScores[team.recentEuropeLevel] : null;
  const components = [
    coefficientScore == null ? null : { value: coefficientScore, weight: source.method.coefficientWeight },
    recentEuropeScore == null ? null : { value: recentEuropeScore, weight: source.method.recentEuropeWeight }
  ].filter(Boolean);
  const weight = components.reduce((sum, item) => sum + item.weight, 0);
  const europeanStrengthIndex = weight ? round(components.reduce((sum, item) => sum + item.value * item.weight, 0) / weight) : null;
  const trendDelta = coefficientScore != null && recentEuropeScore != null ? round(recentEuropeScore - coefficientScore) : null;
  const trend = trendDelta == null ? "N/D" : trendDelta >= 8 ? "sopra il profilo storico" : trendDelta <= -8 ? "sotto il profilo storico" : "allineato al profilo storico";
  const coverage = components.length / 2;
  return {
    ...team,
    coefficientScore,
    recentEuropeScore,
    europeanStrengthIndex,
    recentSignal: { label: trend, delta: trendDelta },
    dataCoveragePct: Math.round(coverage * 100),
    probabilityStatus: "N/D · storico risultati e backtest non ancora disponibili"
  };
}).sort((a, b) => (b.europeanStrengthIndex ?? -1) - (a.europeanStrengthIndex ?? -1) || a.team.localeCompare(b.team, "it"));

fs.writeFileSync(outputPath, JSON.stringify({
  schemaVersion: 1,
  season: source.season,
  generatedAt: source.source.retrievedAt,
  status: source.method.status,
  source: source.source,
  method: {
    ...source.method,
    components: [
      { id: "uefa-coefficient-rank", label: "Posizione nel ranking UEFA quinquennale", weight: source.method.coefficientWeight },
      { id: "recent-europe", label: "Percorso europeo 2025/26", weight: source.method.recentEuropeWeight }
    ],
    missingDataPolicy: "Le componenti mancanti non valgono zero: vengono escluse e il peso residuo viene rinormalizzato."
  },
  summary: { teams: teams.length, completeProfiles: teams.filter(team => team.dataCoveragePct === 100).length, partialProfiles: teams.filter(team => team.dataCoveragePct > 0 && team.dataCoveragePct < 100).length, unavailableProfiles: teams.filter(team => team.dataCoveragePct === 0).length },
  teams
}, null, 2));
console.log(`OK forza Champions: ${teams.length} squadre · ${teams.filter(team => team.dataCoveragePct === 100).length} complete · probabilità disattivate`);
