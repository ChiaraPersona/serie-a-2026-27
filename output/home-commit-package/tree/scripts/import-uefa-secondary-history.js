"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "data/sources/uefa-secondary-history-2023-26.json");
const seasons = [
  { season: "2023-24", seasonYear: 2024 },
  { season: "2024-25", seasonYear: 2025 },
  { season: "2025-26", seasonYear: 2026 }
];
const competitions = [
  { id: 14, code: "uel", name: "UEFA Europa League", slug: "uefaeuropaleague", expected: { 2024: 141, 2025: 189, 2026: 189 } },
  { id: 2019, code: "uecl", name: "UEFA Conference League", slug: "uefaconferenceleague", expected: { 2024: 141, 2025: 153, 2026: 153 } }
];

const endpoint = (competitionId, seasonYear) => `https://match.uefa.com/v5/matches?competitionId=${competitionId}&seasonYear=${seasonYear}&phase=TOURNAMENT&order=ASC&offset=0&limit=250`;
const fail = message => { throw new Error(`Import storico UEFA: ${message}`); };
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
  return rows.map(row => {
    const regular = row.score?.regular;
    if (row.status !== "FINISHED" || !regular || !Number.isInteger(regular.home) || !Number.isInteger(regular.away)) fail(`${competition.name} ${season.season}: gara ${row.id || "N/D"} incompleta`);
    return {
      id: String(row.id),
      competitionId: competition.id,
      competitionCode: competition.code,
      competition: competition.name,
      season: season.season,
      date: row.kickOffTime?.date || null,
      kickoffUtc: row.kickOffTime?.dateTime || null,
      roundId: String(row.round?.id || ""),
      roundName: row.round?.translations?.name?.EN || row.round?.metaData?.name || null,
      roundType: row.round?.secondaryType || row.round?.modeDetail || null,
      matchday: row.matchday?.sequenceNumber == null ? null : Number(row.matchday.sequenceNumber),
      homeTeam: team(row.homeTeam),
      awayTeam: team(row.awayTeam),
      score90: { home: regular.home, away: regular.away },
      scoreTotal: row.score?.total && Number.isInteger(row.score.total.home) && Number.isInteger(row.score.total.away)
        ? { home: row.score.total.home, away: row.score.total.away }
        : null,
      status: "finished"
    };
  });
}

async function main() {
  const matches = [];
  for (const competition of competitions) {
    for (const season of seasons) matches.push(...await fetchCompetitionSeason(competition, season));
  }
  const ids = new Set(matches.map(match => match.id));
  if (ids.size !== matches.length) fail("ID partita duplicati tra competizioni o stagioni");
  const sources = competitions.flatMap(competition => seasons.map(season => ({
    competitionId: competition.id,
    competitionCode: competition.code,
    competition: competition.name,
    season: season.season,
    seasonYear: season.seasonYear,
    expectedMatches: competition.expected[season.seasonYear],
    url: endpoint(competition.id, season.seasonYear),
    publicPage: `https://www.uefa.com/${competition.slug}/history/seasons/${season.seasonYear}/matches/`
  })));
  fs.writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: 1,
    scope: "Fasi principali di Europa League e Conference League; qualificazioni escluse",
    retrievedAt: "2026-09-01",
    provider: "UEFA match feed",
    competitionCatalogUrl: "https://comp.uefa.com/v2/competitions?offset=0&limit=500",
    sources,
    resultPolicy: "score90 usa il risultato dei tempi regolamentari; scoreTotal conserva l'eventuale risultato dopo i supplementari. I rigori non alterano score90.",
    matches: matches.sort((a, b) => a.date.localeCompare(b.date) || a.competitionId - b.competitionId || a.id.localeCompare(b.id))
  }, null, 2)}\n`);
  console.log(`OK import storico UEFA: ${matches.length} gare · Europa League 519 · Conference League 447`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
