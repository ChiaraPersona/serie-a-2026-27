"use strict";

const fs = require("fs");
const path = require("path");
const { importStatmuseResult } = require("./import-statmuse-result");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const overlaysPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const normalizedPath = path.join(root, "data/normalized/matches.json");
const tempDir = path.join(root, "tmp", "statmuse-refresh-md01-md05");
const retrievedAt = new Date().toISOString().slice(0, 10);

const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const overlays = JSON.parse(fs.readFileSync(overlaysPath, "utf8"));
const normalized = JSON.parse(fs.readFileSync(normalizedPath, "utf8"));
const normalizedById = new Map(normalized.map(match => [match.id, match]));
const overlayByUrl = new Map(overlays.matches.map(match => [match[0], match]));
const preservedById = new Map(results.matches.map(match => [match.matchId, match]));
const targets = results.matches.filter(match => {
  const normalizedMatch = normalizedById.get(match.matchId);
  return normalizedMatch?.competition === "serie-a"
    && normalizedMatch.season === "2026-27"
    && normalizedMatch.matchday >= 1
    && normalizedMatch.matchday <= 5
    && match.sourceUrl?.startsWith("https://www.statmuse.com/fc/match/");
});

if (targets.length !== 50) throw new Error(`Attesi 50 referti StatMuse MD1-MD5, trovati ${targets.length}`);

const safeFileName = matchId => `${matchId}.html`;

async function download(match) {
  const response = await fetch(match.sourceUrl, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${match.matchId}: download StatMuse HTTP ${response.status}`);
  const html = await response.text();
  if (!html.includes("game-state")) throw new Error(`${match.matchId}: payload game-state assente`);
  const file = safeFileName(match.matchId);
  fs.writeFileSync(path.join(tempDir, file), html);
  return file;
}

async function main() {
  fs.mkdirSync(tempDir, { recursive: true });
  try {
    for (let offset = 0; offset < targets.length; offset += 5) {
      const batch = targets.slice(offset, offset + 5);
      const files = await Promise.all(batch.map(download));
      for (let index = 0; index < batch.length; index += 1) {
        const previous = batch[index];
        const normalizedMatch = normalizedById.get(previous.matchId);
        const previousOverlay = overlayByUrl.get(previous.sourceUrl);
        if (!previousOverlay) throw new Error(`${previous.matchId}: overlay StatMuse precedente assente`);
        const config = {
          matchId: previous.matchId,
          file: path.join("statmuse-refresh-md01-md05", files[index]),
          url: previous.sourceUrl,
          home: { slug: normalizedMatch.homeTeam, abbr: previousOverlay[1] },
          away: { slug: normalizedMatch.awayTeam, abbr: previousOverlay[3] }
        };
        const { result, overlay } = importStatmuseResult({ root, config });
        const preserved = preservedById.get(previous.matchId) || previous;
        result.mvp = preserved.mvp ?? null;
        for (const field of ["halfTimeScore", "formations", "scorers", "bookings", "substitutions", "didNotPlay"]) {
          if (preserved[field] !== undefined) result[field] = preserved[field];
        }
        const resultIndex = results.matches.findIndex(item => item.matchId === previous.matchId);
        results.matches[resultIndex] = result;
        const overlayIndex = overlays.matches.findIndex(item => item[0] === previous.sourceUrl);
        overlays.matches[overlayIndex] = overlay;
        const source = { provider: "StatMuse", sourceType: "match-report-stats", url: previous.sourceUrl, retrievedAt };
        const sourceIndex = results.sources.findIndex(item => item.provider === source.provider && item.url === source.url);
        if (sourceIndex >= 0) results.sources[sourceIndex] = source; else results.sources.push(source);
      }
      console.log(`Aggiornati ${Math.min(offset + batch.length, targets.length)}/${targets.length} referti.`);
    }
    results.retrievedAt = retrievedAt;
    overlays.updatedAt = retrievedAt;
    fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
    fs.writeFileSync(overlaysPath, `${JSON.stringify(overlays)}\n`);
  } finally {
    for (const target of targets) {
      const filePath = path.join(tempDir, safeFileName(target.matchId));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) fs.rmdirSync(tempDir);
  }
  console.log(`Completato refresh StatMuse MD1-MD5: ${targets.length} referti, data ${retrievedAt}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
