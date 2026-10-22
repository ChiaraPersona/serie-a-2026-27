"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-13";
const rawRoot = path.join(root, "data/raw/champions-historical-recovery", asOf);
const identityAudit = JSON.parse(fs.readFileSync(path.join(root, "data/analysis/champions/player-identity-recovery-2026-10-09.json"), "utf8"));
const refresh = process.argv.includes("--refresh");

const matchReports = [
  ["ucl-2026-27-md01-01", "https://playerstats.football/fixture/aek-athens/lask-linz/2026-09-08"],
  ["ucl-2026-27-md01-02", "https://playerstats.football/fixture/club-brugge/aston-villa/2026-09-08"],
  ["ucl-2026-27-md01-03", "https://playerstats.football/fixture/borussia-dortmund/villarreal/2026-09-08"],
  ["ucl-2026-27-md01-04", "https://playerstats.football/fixture/porto/manchester-city/2026-09-08"],
  ["ucl-2026-27-md01-05", "https://playerstats.football/fixture/lille/real-betis/2026-09-08"],
  ["ucl-2026-27-md01-06", "https://playerstats.football/fixture/real-madrid/inter/2026-09-08"],
  ["ucl-2026-27-md01-07", "https://playerstats.football/fixture/fc-barcelona/feyenoord/2026-09-09"],
  ["ucl-2026-27-md01-08", "https://playerstats.football/fixture/vfb-stuttgart/viking/2026-09-09"],
  ["ucl-2026-27-md01-09", "https://playerstats.football/fixture/liverpool/atletico-madrid/2026-09-09"],
  ["ucl-2026-27-md01-12", "https://playerstats.football/fixture/napoli/arsenal/2026-09-09"],
  ["ucl-2026-27-md01-15", "https://playerstats.football/fixture/como/rb-leipzig/2026-09-10"],
  ["ucl-2026-27-md01-16", "https://playerstats.football/fixture/fc-bayern-munchen/bodo-glimt/2026-09-10"]
].map(([fixtureId, url]) => ({ fixtureId, url }));

function normalize(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value = "") { return normalize(value).replace(/ /g, "-"); }

function readGzip(file) {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
}

function profileUrl(caseRow) {
  const squadFile = path.join(root, "data/raw/champions-recovery/2026-10-09/uefa-squads", `${slug(caseRow.team)}.json.gz`);
  const snapshot = readGzip(squadFile);
  const escaped = String(caseRow.uefaPlayerId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`href="([^"]*?/players/${escaped}--[^"]+/)"`, "i").exec(snapshot.body || "");
  if (!match) throw new Error(`Profilo UEFA non trovato nel raw squadra: ${caseRow.team}/${caseRow.player}/${caseRow.uefaPlayerId}`);
  return new URL(match[1], "https://www.uefa.com").href;
}

const identityProfiles = identityAudit.cases
  .filter(item => item.resolutionMethod === "uefa_exact_name")
  .map(item => ({ teamId: item.teamId, playerId: item.playerId, player: item.player, uefaPlayerId: item.uefaPlayerId, url: profileUrl(item) }));
identityProfiles.push({
  teamId: "feyenoord",
  playerId: "mika-medina",
  player: "Mika Medina",
  uefaPlayerId: "250123956",
  url: "https://www.uefa.com/uefachampionsleague/clubs/players/250123956--mika-marmol/"
});

async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(url, {
        headers: { accept: "text/html", "user-agent": "serie-a-2026-27-champions-historical-recovery/1.0" },
        signal: controller.signal,
        redirect: "follow"
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${url}: ${body.slice(0, 160)}`);
      return {
        requestedUrl: url,
        url: response.url,
        status: response.status,
        retrievedAt: new Date().toISOString(),
        contentType: response.headers.get("content-type"),
        lastModified: response.headers.get("last-modified"),
        body
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 750));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function writeSnapshot(relative, payload) {
  const target = path.join(rawRoot, relative);
  if (fs.existsSync(target) && !refresh) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, zlib.gzipSync(Buffer.from(JSON.stringify(payload))));
  return true;
}

async function parallel(items, limit, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

function inventory(directory, base = directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? inventory(target, base) : [path.relative(base, target).split(path.sep).join("/")];
  });
}

async function main() {
  fs.mkdirSync(rawRoot, { recursive: true });
  const failures = [];
  let created = 0;

  await parallel(matchReports, 4, async item => {
    try {
      const snapshot = await request(item.url);
      if (writeSnapshot(`match-reports/${item.fixtureId}.json.gz`, { ...item, ...snapshot })) created += 1;
    } catch (error) {
      failures.push({ scope: "match-report", fixtureId: item.fixtureId, url: item.url, error: error.message });
    }
  });

  await parallel(identityProfiles, 5, async item => {
    try {
      const snapshot = await request(item.url);
      if (writeSnapshot(`uefa-profiles/${item.uefaPlayerId}.json.gz`, { ...item, ...snapshot })) created += 1;
    } catch (error) {
      failures.push({ scope: "uefa-profile", player: item.player, uefaPlayerId: item.uefaPlayerId, url: item.url, error: error.message });
    }
  });

  const files = inventory(rawRoot).filter(file => file.endsWith(".json.gz")).sort();
  const manifest = {
    schemaVersion: 1,
    phase: "9",
    asOf,
    generatedAt: new Date().toISOString(),
    noOverwriteDefault: !refresh,
    createdThisRun: created,
    snapshots: files,
    counts: {
      matchReports: files.filter(file => file.startsWith("match-reports/")).length,
      uefaProfiles: files.filter(file => file.startsWith("uefa-profiles/")).length
    },
    failures
  };
  fs.writeFileSync(path.join(rawRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Champions historical recovery: ${created} nuovi raw · ${files.length} totali · ${failures.length} errori`);
  if (failures.length) {
    console.error(failures.map(item => `${item.scope}: ${item.fixtureId || item.player} — ${item.error}`).join("\n"));
    process.exitCode = 1;
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
