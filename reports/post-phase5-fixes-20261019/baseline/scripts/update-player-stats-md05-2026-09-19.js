"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const overlaysPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const overlays = JSON.parse(fs.readFileSync(overlaysPath, "utf8"));
const retrievedAt = "2026-09-19";

const slug = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const canonicalPlayerIds = new Map([
  ["Evan N'Dicka", "evan-ndicka"],
  ["Yann Aurel Bisseck", "yann-bisseck"]
]);
const canonicalPlayerNames = new Map([
  ["Josep Martinez", "Josep Martínez"],
  ["Yann Aurel Bisseck", "Yann Bisseck"],
  ["Matìas Soulé", "Matìas Soulè"],
  ["Francesco Esposito", "Pio Esposito"],
  ["Petar Sučić", "Petar Sucic"]
]);
const statmusePlayerNames = new Map(Array.from(canonicalPlayerNames, ([sourceName, canonicalName]) => [canonicalName, sourceName]));
const rows = values => values.map(([player, starter, minutes, rating, goals, assists, shots, shotsOnTarget, expectedGoals, foulsCommitted, foulsWon]) => ({
  playerId: canonicalPlayerIds.get(player) || slug(player), player: canonicalPlayerNames.get(player) || player, starter, minutes, rating, goals, assists, shots, shotsOnTarget, expectedGoals, foulsCommitted, foulsWon
}));

const updates = [
  {
    matchId: "monza-sassuolo-2026-27-md-05",
    url: "https://www.statmuse.com/fc/match/9-18-2026-mon-vs-sas-112126",
    homeAbbr: "MON",
    awayAbbr: "SAS",
    home: rows([
      ["Noel Törnqvist", true, 90, 8.0, 0, 0, 0, 0, 0, 0, 0],
      ["Andrea Carboni", true, 90, 6.7, 0, 0, 0, 0, 0, 1, 1],
      ["Lorenzo Lucchesi", true, 90, 6.9, 0, 0, 1, 1, 0.01, 1, 0],
      ["Eddy Kouadio", true, 90, 7.4, 0, 0, 1, 1, 0.17, 2, 0],
      ["Ricardo Mangas", true, 55, 5.9, 0, 0, 1, 0, 0.02, 1, 0],
      ["Ebenezer Akinsanmiro", true, 55, 6.6, 0, 0, 0, 0, 0, 1, 1],
      ["Michael Folorunsho", true, 90, 6.1, 0, 0, 1, 0, 0.02, 1, 1],
      ["Samuele Birindelli", true, 89, 6.5, 0, 1, 2, 1, 0.08, 2, 1],
      ["Jay Robinson", true, 81, 6.0, 0, 0, 2, 1, 0.16, 0, 0],
      ["Patrick Cutrone", true, 55, 5.4, 0, 0, 1, 0, 0.04, 1, 0],
      ["Gustavo Varela", true, 90, 9.0, 2, 0, 3, 2, 0.93, 1, 1],
      ["Dany Mota", false, 35, 6.7, 0, 0, 0, 0, 0, 0, 1],
      ["Adam Bakoune", false, 35, 6.8, 0, 0, 0, 0, 0, 0, 0],
      ["Manga Foe Ondoa", false, 35, 5.9, 0, 0, 2, 0, 0.04, 1, 0],
      ["Mathis Mout", false, 9, 6.5, 0, 0, 1, 0, 0.04, 1, 0],
      ["Yvan Maye", false, 1, null, 0, 0, 0, 0, 0, 0, 0]
    ]),
    away: rows([
      ["Arijanet Muric", true, 90, 6.8, 0, 0, 0, 0, 0, 0, 0],
      ["Josh Doig", true, 90, 6.9, 0, 0, 0, 0, 0, 1, 1],
      ["Fedde Leysen", true, 90, 6.5, 0, 0, 2, 0, 0.09, 1, 1],
      ["Duje Ćaleta-Car", true, 90, 6.6, 0, 0, 0, 0, 0, 1, 1],
      ["Simone Cinquegrano", true, 90, 6.4, 0, 0, 2, 1, 0.09, 0, 1],
      ["Darryl Bakola", true, 81, 8.0, 0, 0, 1, 1, 0.05, 0, 1],
      ["Nemanja Matic", true, 63, 7.5, 0, 0, 1, 0, 0.03, 0, 0],
      ["Kristian Thorstvedt", true, 63, 6.8, 0, 0, 3, 1, 0.31, 1, 3],
      ["Armand Laurienté", true, 90, 7.0, 0, 0, 3, 1, 0.09, 0, 2],
      ["Sebastiano Esposito", true, 71, 6.5, 0, 0, 2, 1, 0.07, 2, 0],
      ["Domenico Berardi", true, 71, 5.6, 0, 0, 2, 1, 0.35, 0, 1],
      ["Luca Lipani", false, 27, 6.7, 0, 0, 0, 0, 0, 0, 0],
      ["Kieron Bowie", false, 27, 7.7, 0, 0, 1, 0, 0.04, 0, 0],
      ["Benjamín Domínguez", false, 19, 6.7, 0, 0, 1, 1, 0.09, 0, 2],
      ["Vasilije Adzic", false, 19, 8.6, 1, 0, 2, 1, 0.26, 0, 0],
      ["Laurs Skjellerup", false, 9, 6.5, 0, 0, 0, 0, 0, 0, 0]
    ])
  },
  {
    matchId: "roma-inter-2026-27-md-05",
    url: "https://www.statmuse.com/fc/match/9-19-2026-rom-vs-int-112119",
    homeAbbr: "ROM",
    awayAbbr: "INT",
    home: rows([
      ["Mile Svilar", true, 90, 6.4, 0, 0, 0, 0, 0, 0, 1],
      ["Mario Hermoso", true, 80, 6.7, 0, 0, 0, 0, 0, 0, 1],
      ["Leonardo Balerdi", true, 65, 6.8, 0, 0, 0, 0, 0, 0, 1],
      ["Gianluca Mancini", true, 59, 6.2, 0, 1, 1, 0, 0.36, 1, 0],
      ["Nahuel Molina", true, 59, 7.0, 0, 1, 1, 0, 0.01, 0, 0],
      ["Manu Koné", true, 59, 9.2, 2, 0, 2, 2, 0.51, 1, 1],
      ["Bryan Cristante", true, 90, 6.6, 0, 0, 2, 0, 0.09, 3, 0],
      ["Wesley", true, 90, 6.3, 0, 0, 2, 0, 0.06, 2, 1],
      ["Matìas Soulé", true, 90, 7.3, 0, 0, 2, 1, 0.07, 0, 1],
      ["Paulo Dybala", true, 90, 6.7, 0, 0, 4, 0, 0.18, 0, 0],
      ["Donyell Malen", true, 90, 6.2, 0, 0, 3, 1, 0.34, 0, 1],
      ["Niccolò Pisilli", false, 31, 6.8, 0, 0, 1, 0, 0.08, 1, 0],
      ["Devyne Rensch", false, 31, 6.5, 0, 0, 0, 0, 0, 0, 0],
      ["Evan N'Dicka", false, 31, 6.5, 0, 0, 0, 0, 0, 1, 0],
      ["Daniele Ghilardi", false, 25, 5.9, 0, 0, 0, 0, 0, 1, 0],
      ["Konstantinos Koulierakis", false, 10, 6.5, 0, 0, 0, 0, 0, 3, 0]
    ]),
    away: rows([
      ["Josep Martinez", true, 90, null, 0, 0, 0, 0, 0, 0, 0],
      ["Manuel Akanji", true, 90, 6.6, 0, 0, 1, 0, 0.39, 1, 1],
      ["Yann Aurel Bisseck", true, 90, 7.0, 0, 0, 2, 1, 0.30, 1, 0],
      ["Alessandro Bastoni", true, 62, 6.5, 0, 0, 1, 0, 0.05, 1, 0],
      ["Federico Dimarco", true, 53, 6.7, 0, 0, 0, 0, 0, 0, 0],
      ["Curtis Jones", true, 53, 6.6, 0, 0, 0, 0, 0, 1, 2],
      ["Marcus Thuram", true, 89, 6.6, 0, 1, 3, 1, 0.28, 3, 4],
      ["Piotr Zieliński", true, 90, 7.3, 0, 0, 1, 0, 0.02, 0, 1],
      ["Nicolò Barella", true, 90, 7.5, 0, 0, 0, 0, 0, 0, 1],
      ["Lautaro Martínez", true, 89, 9.6, 2, 0, 6, 2, 1.48, 0, 0],
      ["Andy Diouf", true, 90, 6.9, 0, 0, 1, 1, 0.01, 0, 2],
      ["Petar Sučić", false, 37, 7.5, 0, 0, 0, 0, 0, 0, 1],
      ["Carlos Augusto", false, 37, 7.1, 0, 0, 0, 0, 0, 0, 0],
      ["Luis Henrique", false, 28, 6.8, 0, 0, 1, 0, 0.03, 0, 0],
      ["Francesco Esposito", false, 1, 6.8, 0, 0, 0, 0, 0, 0, 1],
      ["Ange-Yoan Bonny", false, 1, 6.8, 0, 0, 0, 0, 0, 0, 0]
    ])
  }
];

const expectedTotals = {
  "monza-sassuolo-2026-27-md-05": { home: [15, 6, 13], away: [20, 8, 6] },
  "roma-inter-2026-27-md-05": { home: [18, 4, 13], away: [16, 5, 7] }
};
const totals = players => ["shots", "shotsOnTarget", "foulsCommitted"].map(field => players.reduce((sum, row) => sum + row[field], 0));

for (const update of updates) {
  const result = results.matches.find(item => item.matchId === update.matchId);
  if (!result) throw new Error(`Risultato non trovato: ${update.matchId}`);
  for (const side of ["home", "away"]) {
    const actual = totals(update[side]);
    const expected = expectedTotals[update.matchId][side];
    if (actual.some((value, index) => value !== expected[index])) {
      throw new Error(`Totali giocatore incoerenti per ${update.matchId} (${side}): ${actual.join("/")} invece di ${expected.join("/")}`);
    }
  }
  result.playerStats = { home: update.home, away: update.away };
  result.coverage = {
    ...(result.coverage || {}),
    playerStats: "complete",
    participation: "available",
    note: result.coverage?.bookings === "unavailable" || result.coverage?.substitutions === "unavailable"
      ? "Statistiche e impiego calciatori completi da StatMuse; cartellini o sostituzioni restano N/D dove non ancora consolidati."
      : "Statistiche e impiego calciatori completi da StatMuse."
  };
  result.sourceUrl = update.url;
  const source = { provider: "StatMuse", sourceType: "match-report-player-stats", url: update.url, retrievedAt };
  const sourceIndex = results.sources.findIndex(item => item.provider === source.provider && item.url === source.url);
  if (sourceIndex >= 0) results.sources[sourceIndex] = source; else results.sources.push(source);
  const overlay = [update.url, update.homeAbbr, update.home.map(row => [statmusePlayerNames.get(row.player) || row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon]), update.awayAbbr, update.away.map(row => [statmusePlayerNames.get(row.player) || row.player, row.shots, row.shotsOnTarget, row.foulsCommitted, row.foulsWon])];
  const overlayIndex = overlays.matches.findIndex(item => item[0] === update.url);
  if (overlayIndex >= 0) overlays.matches[overlayIndex] = overlay; else overlays.matches.push(overlay);
}

results.retrievedAt = retrievedAt;
overlays.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(overlaysPath, `${JSON.stringify(overlays)}\n`);
console.log(`Aggiornate statistiche giocatore MD5: ${updates.map(item => item.matchId).join(", ")}`);
