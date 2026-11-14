"use strict";

const fs = require("fs");
const path = require("path");
const { importStatmuseResult } = require("./import-statmuse-result");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const overlaysPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const overlays = JSON.parse(fs.readFileSync(overlaysPath, "utf8"));
const retrievedAt = "2026-09-21";

const games = [
  { matchId: "monza-sassuolo-2026-27-md-05", file: "statmuse-complete-9-18-2026-mon-vs-sas-112126.html", url: "https://www.statmuse.com/fc/match/9-18-2026-mon-vs-sas-112126", home: { slug: "monza", abbr: "MON" }, away: { slug: "sassuolo", abbr: "SAS" } },
  { matchId: "bologna-torino-2026-27-md-05", file: "statmuse-complete-9-19-2026-bol-vs-tor-112123.html", url: "https://www.statmuse.com/fc/match/9-19-2026-bol-vs-tor-112123", home: { slug: "bologna", abbr: "BOL" }, away: { slug: "torino", abbr: "TOR" } },
  { matchId: "udinese-cagliari-2026-27-md-05", file: "statmuse-complete-9-20-2026-udi-vs-cag-112122.html", url: "https://www.statmuse.com/fc/match/9-20-2026-udi-vs-cag-112122", home: { slug: "udinese", abbr: "UDI" }, away: { slug: "cagliari", abbr: "CAG" } },
  { matchId: "roma-inter-2026-27-md-05", file: "statmuse-complete-9-19-2026-rom-vs-int-112119.html", url: "https://www.statmuse.com/fc/match/9-19-2026-rom-vs-int-112119", home: { slug: "roma", abbr: "ROM" }, away: { slug: "inter", abbr: "INT" } },
  { matchId: "venezia-lazio-2026-27-md-05", file: "statmuse-complete-9-20-2026-ven-vs-laz-112124.html", url: "https://www.statmuse.com/fc/match/9-20-2026-ven-vs-laz-112124", home: { slug: "venezia", abbr: "VEN" }, away: { slug: "lazio", abbr: "LAZ" } },
  { matchId: "fiorentina-napoli-2026-27-md-05", file: "statmuse-complete-9-20-2026-fio-vs-nap-112118.html", url: "https://www.statmuse.com/fc/match/9-20-2026-fio-vs-nap-112118", home: { slug: "fiorentina", abbr: "FIO" }, away: { slug: "napoli", abbr: "NAP" } },
  { matchId: "frosinone-como-2026-27-md-05", file: "statmuse-complete-9-20-2026-fro-vs-com-112125.html", url: "https://www.statmuse.com/fc/match/9-20-2026-fro-vs-com-112125", home: { slug: "frosinone", abbr: "FRO" }, away: { slug: "como", abbr: "COM" } },
  { matchId: "juventus-atalanta-2026-27-md-05", file: "statmuse-complete-9-20-2026-juv-vs-ata-112117.html", url: "https://www.statmuse.com/fc/match/9-20-2026-juv-vs-ata-112117", home: { slug: "juventus", abbr: "JUV" }, away: { slug: "atalanta", abbr: "ATA" } },
  { matchId: "milan-lecce-2026-27-md-05", file: "statmuse-complete-9-20-2026-mil-vs-lec-112120.html", url: "https://www.statmuse.com/fc/match/9-20-2026-mil-vs-lec-112120", home: { slug: "milan", abbr: "MIL" }, away: { slug: "lecce", abbr: "LEC" } },
  { matchId: "parma-genoa-2026-27-md-05", file: "statmuse-complete-9-20-2026-par-vs-gen-112121.html", url: "https://www.statmuse.com/fc/match/9-20-2026-par-vs-gen-112121", home: { slug: "parma", abbr: "PAR" }, away: { slug: "genoa", abbr: "GEN" } }
];

for (const config of games) {
  const { result, overlay } = importStatmuseResult({ root, config });
  const resultIndex = results.matches.findIndex(item => item.matchId === config.matchId);
  if (resultIndex >= 0) results.matches[resultIndex] = result; else results.matches.push(result);
  const overlayIndex = overlays.matches.findIndex(item => item[0] === config.url);
  if (overlayIndex >= 0) overlays.matches[overlayIndex] = overlay; else overlays.matches.push(overlay);
  const source = { provider: "StatMuse", sourceType: "match-report-stats", url: config.url, retrievedAt };
  const sourceIndex = results.sources.findIndex(item => item.provider === source.provider && item.url === source.url);
  if (sourceIndex >= 0) results.sources[sourceIndex] = source; else results.sources.push(source);
}

results.retrievedAt = retrievedAt;
overlays.updatedAt = retrievedAt;
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(overlaysPath, `${JSON.stringify(overlays)}\n`);
console.log(`Completati ${games.length} referti MD5 da StatMuse.`);
