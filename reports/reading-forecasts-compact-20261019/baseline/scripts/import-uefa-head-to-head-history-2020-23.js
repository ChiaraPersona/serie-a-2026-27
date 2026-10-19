"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "data/sources/uefa-head-to-head-history-2020-23.json");
const seasons = [
  { season: "2020-21", seasonYear: 2021 },
  { season: "2021-22", seasonYear: 2022 },
  { season: "2022-23", seasonYear: 2023 }
];
const competitions = [
  { id: 1, code: "ucl", name: "UEFA Champions League", slug: "uefachampionsleague", expected: { 2021: 125, 2022: 125, 2023: 125 } },
  { id: 14, code: "uel", name: "UEFA Europa League", slug: "uefaeuropaleague", expected: { 2021: 205, 2022: 141, 2023: 141 }, expectedFinished: { 2021: 204, 2022: 139, 2023: 141 } },
  { id: 2019, code: "uecl", name: "UEFA Conference League", slug: "uefaconferenceleague", expected: { 2022: 141, 2023: 141 }, expectedFinished: { 2022: 140, 2023: 141 } }
];

const endpoint = (competitionId, seasonYear) => `https://match.uefa.com/v5/matches?competitionId=${competitionId}&seasonYear=${seasonYear}&phase=TOURNAMENT&order=ASC&offset=0&limit=250`;
const fail = message => { throw new Error(`Import H2H UEFA 2020-23: ${message}`); };
const team = value => ({
  id: String(value?.id || ""),
  name: value?.translations?.displayOfficialName?.EN || value?.internationalName || null,
  shortName: value?.internationalName || null,
  countryCode: value?.countryCode || null
});

async function fetchCompetitionSeason(competition, season) {
  const url = endpoint(competition.id, season.seasonYear);
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "serie-a-2026-27-local-importer/1.0" } });
  if (!response.ok) fail(`${competition.name} ${season.season}: UEFA HTTP ${response.status}`);
  const rows = await response.json();
  const expected = competition.expected[season.seasonYear];
  if (!Array.isArray(rows) || rows.length !== expected) fail(`${competition.name} ${season.season}: attese ${expected} gare, trovate ${rows?.length || 0}`);
  const finishedRows = rows.filter(row => row.status === "FINISHED" && row.score?.regular && Number.isInteger(row.score.regular.home) && Number.isInteger(row.score.regular.away));
  const expectedFinished = competition.expectedFinished?.[season.seasonYear] ?? expected;
  if (finishedRows.length !== expectedFinished) fail(`${competition.name} ${season.season}: attese ${expectedFinished} gare concluse, trovate ${finishedRows.length}`);
  return { matches: finishedRows.map(row => {
    const regular = row.score?.regular;
    return {
      id: String(row.id),
      competitionId: competition.id,
      competitionCode: competition.code,
      competition: competition.name,
      season: season.season,
      date: row.kickOffTime?.date || null,
      kickoffUtc: row.kickOffTime?.dateTime || null,
      homeTeam: team(row.homeTeam),
      awayTeam: team(row.awayTeam),
      score90: { home: regular.home, away: regular.away },
      status: "finished"
    };
  }), excluded: rows.filter(row => !finishedRows.includes(row)).map(row => ({ id: String(row.id), status: row.status || null, reason: "Risultato nei tempi regolamentari non disponibile" })) };
}

async function main() {
  const matches = [];
  const sources = [];
  for (const competition of competitions) {
    for (const season of seasons) {
      const expected = competition.expected[season.seasonYear];
      if (!expected) continue;
      const imported = await fetchCompetitionSeason(competition, season);
      matches.push(...imported.matches);
      sources.push({
        competitionId: competition.id,
        competitionCode: competition.code,
        competition: competition.name,
        season: season.season,
        seasonYear: season.seasonYear,
        expectedMatches: expected,
        importedFinishedMatches: imported.matches.length,
        excludedMatches: imported.excluded,
        url: endpoint(competition.id, season.seasonYear),
        publicPage: `https://www.uefa.com/${competition.slug}/history/seasons/${season.seasonYear}/matches/`
      });
    }
  }
  const ids = new Set(matches.map(match => match.id));
  if (ids.size !== matches.length) fail("ID partita duplicati tra competizioni o stagioni");
  fs.writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: 1,
    scope: "Archivio aggiuntivo riservato agli scontri diretti; fasi principali UEFA, qualificazioni escluse",
    retrievedAt: "2026-09-02",
    provider: "UEFA match feed",
    seasons: seasons.map(item => item.season),
    sources,
    resultPolicy: "score90 usa il risultato dei tempi regolamentari.",
    matches: matches.sort((a, b) => a.date.localeCompare(b.date) || a.competitionId - b.competitionId || a.id.localeCompare(b.id))
  }, null, 2)}\n`);
  console.log(`OK import H2H UEFA 2020-23: ${matches.length} gare`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
