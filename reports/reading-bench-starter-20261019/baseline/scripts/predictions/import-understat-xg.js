"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..", "..");
const rawRoot = path.join(root, "data", "raw", "xg", "understat");
const outputPath = path.join(root, "data", "normalized", "understat-serie-a-xg.json");
const startYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        "User-Agent": "serie-a-2026-27 research importer",
        "Accept-Encoding": "identity",
        "X-Requested-With": "XMLHttpRequest",
        Referer: url.replace("/getLeagueData/", "/league/")
      }
    }, response => {
      const chunks = [];
      response.on("data", chunk => { chunks.push(chunk); });
      response.on("end", () => {
        if (response.statusCode !== 200) return reject(new Error(`${url}: HTTP ${response.statusCode}`));
        try {
          const compressed = Buffer.concat(chunks);
          const body = (response.headers["content-encoding"] === "gzip" || (compressed[0] === 0x1f && compressed[1] === 0x8b))
            ? zlib.gunzipSync(compressed).toString("utf8")
            : compressed.toString("utf8");
          resolve(JSON.parse(body));
        } catch (error) { reject(new Error(`${url}: JSON non valido (${error.message})`)); }
      });
    });
    request.setTimeout(20000, () => request.destroy(new Error(`${url}: timeout`)));
    request.on("error", reject);
  });
}

const seasonLabel = startYear => `${startYear}-${String(startYear + 1).slice(-2)}`;
const number = value => value === null || value === undefined || value === "" ? null : Number(value);

async function main() {
  fs.mkdirSync(rawRoot, { recursive: true });
  const matches = [];
  const seasons = [];
  for (const startYear of startYears) {
    const url = `https://understat.com/getLeagueData/Serie_A/${startYear}`;
    const payload = await getJson(url);
    fs.writeFileSync(path.join(rawRoot, `serie-a-${startYear}.json.gz`), zlib.gzipSync(`${JSON.stringify(payload)}\n`, { level: 9 }));
    const completed = (payload.dates || []).filter(match => match.isResult).map(match => ({
      providerMatchId: String(match.id),
      season: seasonLabel(startYear),
      date: `${match.datetime.replace(" ", "T")}Z`,
      homeTeam: { providerId: String(match.h.id), name: match.h.title },
      awayTeam: { providerId: String(match.a.id), name: match.a.title },
      score: { home: number(match.goals.h), away: number(match.goals.a) },
      xg: { home: number(match.xG.h), away: number(match.xG.a) },
      forecast: { home: number(match.forecast?.w), draw: number(match.forecast?.d), away: number(match.forecast?.l) },
      sourceUrl: `https://understat.com/match/${match.id}`
    }));
    if (completed.some(match => !Number.isFinite(match.xg.home) || !Number.isFinite(match.xg.away))) throw new Error(`${seasonLabel(startYear)}: xG mancanti`);
    matches.push(...completed);
    seasons.push({ season: seasonLabel(startYear), matches: completed.length });
  }
  const output = {
    schemaVersion: 1,
    provider: "Understat",
    competition: "Serie A",
    retrievedAt: new Date().toISOString(),
    source: "https://understat.com/league/Serie_A/2025",
    seasons,
    matches
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`OK Understat xG: ${matches.length} partite, ${seasons.length} stagioni`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
