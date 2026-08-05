const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const standingsPath = path.join(root, "data", "normalized", "standings-2025-26.json");
const matchesPath = path.join(root, "data", "normalized", "referee-matches", "2025-26", "serie-a.json");
const aliases = { verona: "hellas-verona" };
const metricKeys = ["penaltiesFor", "penaltiesAgainst", "cardsFor", "cardsAgainst"];

const source = JSON.parse(fs.readFileSync(matchesPath, "utf8"));
if (source.provider !== "espn" || source.matches.length !== 380) {
  throw new Error(`Fonte disciplinare inattesa: ${source.provider}, ${source.matches.length} partite`);
}

const buckets = { rows: new Map(), homeRows: new Map(), awayRows: new Map() };
const rowFor = (bucket, team) => {
  if (!bucket.has(team)) bucket.set(team, { played: 0, penaltiesFor: 0, penaltiesAgainst: 0, cardsFor: 0, cardsAgainst: 0 });
  return bucket.get(team);
};
const cardTotal = stats => stats.yellowCards + stats.secondYellowCards + stats.straightRedCards;

for (const match of source.matches) {
  for (const side of ["home", "away"]) {
    const own = match.teamStats[side];
    const opponent = match.teamStats[side === "home" ? "away" : "home"];
    for (const key of ["penaltiesFor", "penaltiesAgainst", "yellowCards", "secondYellowCards", "straightRedCards"]) {
      if (!Number.isFinite(own[key])) throw new Error(`${match.id}: ${side}.${key} non disponibile`);
    }
    const team = aliases[own.teamSlug] || own.teamSlug;
    for (const bucket of [buckets.rows, buckets[`${side}Rows`]]) {
      const row = rowFor(bucket, team);
      row.played++;
      row.penaltiesFor += own.penaltiesFor;
      row.penaltiesAgainst += own.penaltiesAgainst;
      row.cardsFor += cardTotal(opponent);
      row.cardsAgainst += cardTotal(own);
    }
  }
}

const standings = JSON.parse(fs.readFileSync(standingsPath, "utf8"));
for (const section of Object.keys(buckets)) {
  for (const row of standings[section]) {
    const totals = buckets[section].get(row.team);
    if (!totals || totals.played !== row.played) throw new Error(`${section}/${row.team}: copertura ${totals?.played ?? 0}/${row.played}`);
    for (const key of metricKeys) row[key] = totals[key];
  }
}
standings.disciplineSource = {
  provider: source.provider,
  scope: "Rigori e cartellini aggregati dai 380 referti gara ESPN della Serie A 2025/26.",
  matches: source.matches.length,
  teamMatchRecords: source.matches.length * 2,
  completeCoverage: true,
  retrievedAt: source.retrievedAt,
  sourceUrlTemplate: "https://www.espn.com/soccer/match/_/gameId/{providerFixtureId}"
};

const compactArray = (items, indent) => `[\n${items.map(item => `${" ".repeat(indent)}${JSON.stringify(item)}`).join(",\n")}\n${" ".repeat(indent - 2)}]`;
const formatted = JSON.parse(JSON.stringify(standings));
const replacements = [
  ["__COMPACT_HISTORICAL_TEAMS__", compactArray(formatted.historicalTeams, 4)],
  ["__COMPACT_ROWS__", compactArray(formatted.rows, 4)],
  ["__COMPACT_HOME_ROWS__", compactArray(formatted.homeRows, 4)],
  ["__COMPACT_AWAY_ROWS__", compactArray(formatted.awayRows, 4)],
  ["__COMPACT_HIGHLIGHTS__", compactArray(formatted.summary.highlights, 6)]
];
formatted.historicalTeams = replacements[0][0];
formatted.rows = replacements[1][0];
formatted.homeRows = replacements[2][0];
formatted.awayRows = replacements[3][0];
formatted.summary.highlights = replacements[4][0];
let output = JSON.stringify(formatted, null, 2);
for (const [token, value] of replacements) output = output.replace(JSON.stringify(token), value);
fs.writeFileSync(standingsPath, `${output}\n`);
console.log(`Classifica 2025/26 arricchita: ${standings.rows.length} squadre, ${source.matches.length} partite, copertura completa.`);
