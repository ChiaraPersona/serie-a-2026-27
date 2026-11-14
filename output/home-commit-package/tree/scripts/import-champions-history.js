"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "data/sources/champions-history-2023-26.json");
const competitionId = 1;
const seasons = [
  { season: "2023-24", seasonYear: 2024, expectedMatches: 125 },
  { season: "2024-25", seasonYear: 2025, expectedMatches: 189 },
  { season: "2025-26", seasonYear: 2026, expectedMatches: 189 }
];

const endpoint = seasonYear => `https://match.uefa.com/v5/matches?competitionId=${competitionId}&seasonYear=${seasonYear}&phase=TOURNAMENT&order=ASC&offset=0&limit=250`;
const fail = message => { throw new Error(`Import storico Champions: ${message}`); };
const team = value => ({
  id: String(value?.id || ""),
  name: value?.translations?.displayOfficialName?.EN || value?.internationalName || null,
  shortName: value?.internationalName || null,
  countryCode: value?.countryCode || null
});

async function fetchSeason(config) {
  const response = await fetch(endpoint(config.seasonYear), { headers: { accept: "application/json", "user-agent": "serie-a-2026-27-local-importer/1.0" } });
  if (!response.ok) fail(`${config.season}: UEFA HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== config.expectedMatches) fail(`${config.season}: attese ${config.expectedMatches} gare, trovate ${rows?.length || 0}`);
  return rows.map(row => {
    const regular = row.score?.regular;
    if (row.status !== "FINISHED" || !regular || !Number.isInteger(regular.home) || !Number.isInteger(regular.away)) fail(`${config.season}: gara ${row.id || "N/D"} incompleta`);
    return {
      id: String(row.id),
      season: config.season,
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
      winnerTeamId: row.winner?.team?.id ? String(row.winner.team.id) : row.winner?.id ? String(row.winner.id) : null,
      status: "finished"
    };
  });
}

async function main() {
  const imported = [];
  for (const config of seasons) imported.push(...await fetchSeason(config));
  const ids = new Set(imported.map(match => match.id));
  if (ids.size !== imported.length) fail("ID partita duplicati tra le stagioni");
  const source = {
    schemaVersion: 1,
    competition: "UEFA Champions League",
    competitionId,
    scope: "Fase principale, dalle gare iniziali del torneo alla finale; qualificazioni escluse",
    retrievedAt: "2026-09-01",
    provider: "UEFA match feed",
    sources: seasons.map(config => ({
      season: config.season,
      seasonYear: config.seasonYear,
      expectedMatches: config.expectedMatches,
      url: endpoint(config.seasonYear),
      publicPage: `https://www.uefa.com/uefachampionsleague/history/seasons/${config.seasonYear}/matches/`
    })),
    resultPolicy: "score90 usa il risultato dei tempi regolamentari; scoreTotal conserva l'eventuale risultato dopo i supplementari. I rigori non alterano score90.",
    matches: imported.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(source, null, 2)}\n`);
  console.log(`OK import storico Champions: ${imported.length} gare (${seasons.map(config => `${config.season} ${config.expectedMatches}`).join(" · ")})`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
