"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "data/sources/champions-pilot-match-stats-2025-27.json");
const rawRoot = path.join(root, "data/raw/champions-player-stats/espn/rosters");
const refresh = process.argv.includes("--refresh");
const source = JSON.parse(fs.readFileSync(configPath, "utf8"));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "serie-a-2026-27-champions-players/1.0" }, signal: controller.signal });
      if (!response.ok) throw new Error(`ESPN ${response.status}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function parallel(items, limit, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

async function main() {
  fs.mkdirSync(rawRoot, { recursive: true });
  let downloaded = 0;
  await parallel(source.teams, 8, async team => {
    const target = path.join(rawRoot, `${team.id}.json.gz`);
    if (!refresh && fs.existsSync(target)) return;
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${team.league}/teams/${team.espnTeamId}/roster`;
    const payload = await request(url);
    fs.writeFileSync(target, zlib.gzipSync(Buffer.from(JSON.stringify({ retrievedAt: new Date().toISOString(), url, team: team.name, teamId: team.espnTeamId, payload }))));
    downloaded += 1;
  });
  console.log(`Rose ESPN Champions: ${source.teams.length} cache · ${downloaded} scaricate`);
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
