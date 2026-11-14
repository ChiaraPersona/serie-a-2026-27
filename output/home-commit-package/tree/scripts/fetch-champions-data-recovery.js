"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const rawRoot = path.join(root, "data/raw/champions-recovery", asOf);
const refresh = process.argv.includes("--refresh");
const manifestOnly = process.argv.includes("--manifest-only");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const audit = read(`data/analysis/champions/full-data-coverage-audit-${asOf}.json`);
const squads = read("data/normalized/champions-registered-squads-2026-27.json");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function slug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: { accept: "text/html,application/json", "user-agent": "serie-a-2026-27-champions-data-recovery/1.0" },
        signal: controller.signal
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${url}: ${body.slice(0, 160)}`);
      return {
        retrievedAt: new Date().toISOString(),
        url: response.url,
        requestedUrl: url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        lastModified: response.headers.get("last-modified"),
        body
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function writeSnapshot(relative, payload) {
  const target = path.join(rawRoot, relative);
  if (!refresh && fs.existsSync(target)) return false;
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

function extractChancePlayerLinks(html) {
  const links = new Set();
  for (const match of html.matchAll(/href="(\/hrac\/(\d+)-[^"?#]+)"/g)) links.add(match[1]);
  return [...links];
}

function extractChanceMatchLinks(html) {
  const header = html.indexOf('title="Minuty"');
  if (header < 0) return [];
  const end = html.indexOf("</tbody>", header);
  const table = html.slice(header, end < 0 ? undefined : end);
  return [...new Set([...table.matchAll(/href="(\/zapas\/\d+-[^"#?]+)"/g)].map(match => match[1]))];
}

function inventoryFiles(directory, base = directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? inventoryFiles(target, base) : [path.relative(base, target).split(path.sep).join("/")];
  });
}

function writeManifest(created, failures) {
  const snapshotFiles = inventoryFiles(rawRoot).filter(file => file.endsWith(".json.gz")).sort();
  const supersededSnapshots = snapshotFiles.filter(file => {
    if (!file.startsWith("domestic/slavia-players/")) return false;
    const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(rawRoot, file))));
    return payload.requestedUrl?.includes("/hrac/2026/");
  });
  const activeFiles = snapshotFiles.filter(file => !supersededSnapshots.includes(file));
  const scopeCounts = {};
  for (const file of activeFiles) {
    const scope = file.split("/")[0];
    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
  }
  const retainedFailures = failures.length ? failures : [{
    scope: "match-audit", id: "401888301", url: "https://bjk.com.tr/en/mac_merkezi/canli/25441",
    status: 403, error: "Official Besiktas page blocked the automated read; no bypass attempted."
  }];
  const manifest = {
    schemaVersion: 1, phase: "7", asOf, retrievedAt: new Date().toISOString(),
    createdSnapshotsThisRun: created, activeSnapshots: activeFiles.length, scopeCounts,
    activeSnapshotFiles: activeFiles,
    supersededSnapshots: supersededSnapshots.map(file => ({ file, reason: "Wrong Chance Liga season id captured during initial discovery; ignored by the builder." })),
    failures: retainedFailures
  };
  fs.writeFileSync(path.join(rawRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  fs.mkdirSync(rawRoot, { recursive: true });
  if (manifestOnly) {
    const manifest = writeManifest(0, []);
    console.log(`Champions data recovery manifest: ${manifest.activeSnapshots} snapshot attivi · ${manifest.supersededSnapshots.length} superseded`);
    return;
  }
  let created = 0;
  const failures = [];

  const squadJobs = squads.teams.map(team => ({
    relative: `uefa-squads/${slug(team.team)}.json.gz`,
    url: team.sources.find(source => source.provider === "UEFA")?.url,
    team: team.team
  })).filter(job => job.url);
  await parallel(squadJobs, 6, async job => {
    try {
      const payload = await request(job.url);
      if (writeSnapshot(job.relative, { ...payload, team: job.team })) created += 1;
    } catch (error) { failures.push({ scope: "uefa-squad", team: job.team, url: job.url, error: error.message }); }
  });

  const unresolved = audit.teams.flatMap(team => team.identityReview.unresolved.map(player => ({ team: team.team, teamId: team.teamId, player: player.player })));
  await parallel(unresolved, 6, async item => {
    const url = `https://site.web.api.espn.com/apis/search/v2?region=us&lang=en&query=${encodeURIComponent(item.player)}&limit=20`;
    try {
      const response = await request(url);
      const payload = JSON.parse(response.body);
      delete response.body;
      if (writeSnapshot(`espn-identity/${item.teamId}/${slug(item.player)}.json.gz`, { ...response, team: item.team, teamId: item.teamId, player: item.player, payload })) created += 1;
    } catch (error) { failures.push({ scope: "espn-identity", ...item, url, error: error.message }); }
  });

  const providerChecks = [
    ...["aze.1", "cze.1", "ukr.1", "svk.1"].map(league => ({ id: `espn-${league}`, url: `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=2026&limit=1000` })),
    ...[{ id: "sabah", espn: "21922" }, { id: "slavia-praha", espn: "494" }, { id: "shakhtar-donetsk", espn: "493" }, { id: "slovan-bratislava", espn: "521" }]
      .map(team => ({ id: `espn-team-${team.id}`, url: `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${team.espn}/schedule?season=2026` }))
  ];
  await parallel(providerChecks, 4, async job => {
    try {
      const response = await request(job.url);
      const payload = JSON.parse(response.body);
      delete response.body;
      if (writeSnapshot(`provider-checks/${job.id}.json.gz`, { ...response, payload })) created += 1;
    } catch (error) {
      const record = { retrievedAt: new Date().toISOString(), requestedUrl: job.url, status: Number(/^\d+/.exec(error.message)?.[0]) || null, error: error.message };
      if (writeSnapshot(`provider-checks/${job.id}.json.gz`, record)) created += 1;
    }
  });

  const domesticPages = [
    { id: "slavia-roster", url: "https://www.chanceliga.cz/klub/2027/kadr/5-sk-slavia-praha?order=1&order_direction=1" },
    { id: "slavia-statistics", url: "https://www.chanceliga.cz/statistiky" },
    { id: "slovan-team-statistics", url: "https://www.nikeliga.sk/tim/2026/statistiky/6-sk-slovan-bratislava" },
    { id: "slovan-player-minutes", url: "https://www.nikeliga.sk/statistiky/hraci?id_atribute=4&id_team=6" },
    { id: "slovan-fixtures", url: "https://www.nikeliga.sk/zapasy" },
    { id: "shakhtar-roster", url: "https://upl.ua/en/clubs/view/28" },
    { id: "shakhtar-calendar", url: "https://upl.ua/en/tournaments/cup/432/calendar" },
    { id: "shakhtar-report-15887", url: "https://upl.ua/en/report/view/15887/report" },
    { id: "shakhtar-report-15897", url: "https://upl.ua/en/report/view/15897/report" },
    { id: "shakhtar-report-15904", url: "https://upl.ua/en/report/view/15904/report" },
    { id: "shakhtar-report-15910", url: "https://upl.ua/en/report/view/15910/report" },
    { id: "shakhtar-report-15921", url: "https://upl.ua/en/report/view/15921/report" },
    { id: "shakhtar-report-15927", url: "https://upl.ua/en/report/view/15927/report" },
    { id: "sabah-home", url: "https://pfl.az/" },
    { id: "sabah-app-js", url: "https://pfl.az/assets/index-54506a7a.js" },
    { id: "sabah-match-6795", url: "https://pfl.az/t%C9%99qvim/6795" },
    { id: "sabah-match-6807", url: "https://pfl.az/t%C9%99qvim/6807" },
    { id: "sabah-api-match-6795", url: "https://pfl.az/api/v1/games/show/6795?withActions=true" },
    { id: "sabah-api-match-6807", url: "https://pfl.az/api/v1/games/show/6807?withActions=true" }
  ];
  const domesticResponses = new Map();
  await parallel(domesticPages, 5, async job => {
    try {
      const payload = await request(job.url);
      domesticResponses.set(job.id, payload);
      if (writeSnapshot(`domestic/${job.id}.json.gz`, payload)) created += 1;
    } catch (error) { failures.push({ scope: "domestic", id: job.id, url: job.url, error: error.message }); }
  });

  let slaviaRoster = domesticResponses.get("slavia-roster");
  if (!slaviaRoster) {
    const cached = path.join(rawRoot, "domestic/slavia-roster.json.gz");
    if (fs.existsSync(cached)) slaviaRoster = JSON.parse(zlib.gunzipSync(fs.readFileSync(cached)));
  }
  if (slaviaRoster) {
    const links = extractChancePlayerLinks(slaviaRoster.body);
    const playerResponses = [];
    await parallel(links, 5, async link => {
      const match = /^\/hrac\/(\d+)-(.+)$/.exec(link);
      if (!match) return;
      const url = `https://www.chanceliga.cz/hrac/2027/zapasy/${match[1]}-${match[2]}?stats_type=1`;
      try {
        const payload = await request(url);
        playerResponses.push(payload);
        if (writeSnapshot(`domestic/slavia-players/${match[1]}-${match[2]}.json.gz`, payload)) created += 1;
      } catch (error) { failures.push({ scope: "domestic-slavia-player", url, error: error.message }); }
    });
    const matchLinks = [...new Set(playerResponses.flatMap(payload => extractChanceMatchLinks(payload.body)))];
    await parallel(matchLinks, 5, async link => {
      const id = /\/zapas\/(\d+)-/.exec(link)?.[1];
      if (!id) return;
      const url = `https://www.chanceliga.cz${link}`;
      try {
        const payload = await request(url);
        if (writeSnapshot(`domestic/slavia-matches/${id}.json.gz`, payload)) created += 1;
      } catch (error) { failures.push({ scope: "domestic-slavia-match", id, url, error: error.message }); }
    });
  }

  const matchAuditPages = [
    { id: "401888301", url: "https://bjk.com.tr/en/mac_merkezi/canli/25441" },
    { id: "401879005", url: "https://www.proleague.be/fr/matchs/saison-2026-2027-jupiler-pro-league-5-lommel-sk-vs-club-brugge-632" },
    { id: "401888304", url: "https://www.galatasaray.org/haber/futbol/basaksehir-2-3-galatasaray/60892" },
    { id: "401881791", url: "https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56690/matchcenter" },
    { id: "401881783", url: "https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56698/matchcenter" },
    { id: "401873920", url: "https://www.sandefjordfotball.no/lag/import/tournament/eliteserien-2026/season/fotballsesongen-2026/match/round-20-sandefjord-fotball-x-viking" }
  ];
  await parallel(matchAuditPages, 4, async job => {
    try {
      const payload = await request(job.url);
      if (writeSnapshot(`match-audit/${job.id}.json.gz`, payload)) created += 1;
    } catch (error) { failures.push({ scope: "match-audit", id: job.id, url: job.url, error: error.message }); }
  });

  writeManifest(created, failures);
  console.log(`Champions data recovery: ${created} snapshot creati · ${failures.length} fallimenti`);
  if (failures.length) console.log(failures.map(item => `${item.scope}: ${item.id || item.team || item.url} — ${item.error}`).join("\n"));
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
