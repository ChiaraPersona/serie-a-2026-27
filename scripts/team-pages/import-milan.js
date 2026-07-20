#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PLAYER_FIELDS, playerEntry, round } = require("./model");

const root = path.resolve(__dirname, "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, data) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};
const readCompressedText = file => file.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(file)).toString("utf8") : fs.readFileSync(file, "utf8");
const readRawJson = file => JSON.parse(readCompressedText(file));
const source = read("data/sources/milan/roster-2026-27.json");
const external = read("data/sources/milan/espn-external-stats-2025-26.json");
const refresh = process.argv.includes("--refresh");
const refreshEspn = process.argv.includes("--refresh") || process.argv.includes("--refresh-espn");
const profileCache = path.join(root, "data/raw/team-pages/milan/official-profiles");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
const sumNullable = values => {
  const present = values.filter(value => value !== null && value !== undefined && Number.isFinite(Number(value)));
  return present.length ? present.reduce((total, value) => total + Number(value), 0) : null;
};
const statMap = stats => Object.fromEntries((stats || []).map(stat => [stat.name, num(stat.value)]));
const htmlText = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const isoDate = value => {
  const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (!match) return null;
  const shortYear = Number(match[3]);
  const year = shortYear > 26 ? 1900 + shortYear : 2000 + shortYear;
  return `${year}-${match[2]}-${match[1]}`;
};
const ageAt = (birth, at = "2026-07-20") => {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00Z`), d = new Date(`${at}T00:00:00Z`);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
};

async function profile(player) {
  const url = `https://www.acmilan.com/en/teams/men-first-team/players/${player.profileSlug}`;
  const file = path.join(profileCache, `${player.id}.html.gz`);
  const legacyFile = path.join(profileCache, `${player.id}.html`);
  let html = fs.existsSync(file) ? readCompressedText(file) : fs.existsSync(legacyFile) ? readCompressedText(legacyFile) : null;
  if (refresh || !html) {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", "accept-language": "en-US,en;q=0.9" } });
    if (!response.ok) throw new Error(`${player.name}: profilo AC Milan HTTP ${response.status}`);
    html = await response.text();
    fs.mkdirSync(profileCache, { recursive: true });
    fs.writeFileSync(file, zlib.gzipSync(Buffer.from(html, "utf8"), { level: 9 }));
  }
  const text = htmlText(html);
  const between = (label, next) => text.match(new RegExp(`${label}\\s+(.+?)\\s+${next}`, "i"))?.[1]?.trim() || null;
  const birthday = between("Birthday", "Birthplace");
  const heightRaw = between("Height", "Biography") || text.match(/Height\s+(\d[,.]\d{2}m)/i)?.[1] || null;
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i)?.[1] || null;
  return {
    sourceUrl: url,
    dateOfBirth: isoDate(birthday),
    birthplace: between("Birthplace", "At ACM since"),
    atMilanSince: between("At ACM since", "Weight"),
    weightKg: num(between("Weight", "Foot")?.replace(/kg/i, "")),
    preferredFoot: between("Foot", "Height"),
    heightCm: heightRaw ? Math.round(Number(heightRaw.replace("m", "").replace(",", ".")) * 100) : null,
    remoteImage: og
  };
}

async function refreshEspnMatches() {
  const targets = [
    { competition: "serie-a", slugs: ["milan", "lazio", "lecce"] },
    { competition: "serie-b", slugs: ["catanzaro"] }
  ];
  const jobs = [];
  for (const target of targets) {
    const normalized = read(`data/normalized/referee-matches/2025-26/${target.competition}.json`);
    for (const match of normalized.matches) {
      if (!target.slugs.includes(match.homeTeam.slug) && !target.slugs.includes(match.awayTeam.slug)) continue;
      const file = path.join(root, `data/raw/team-pages/milan/espn/${target.competition}/${match.providerFixtureId}.json.gz`);
      const legacyFile = file.slice(0, -3);
      if (!refreshEspn && (fs.existsSync(file) || fs.existsSync(legacyFile))) continue;
      jobs.push({ competition: target.competition, fixtureId: match.providerFixtureId, file });
    }
  }
  const leagueCode = competition => competition === "serie-a" ? "ita.1" : "ita.2";
  for (let index = 0; index < jobs.length; index += 6) {
    await Promise.all(jobs.slice(index, index + 6).map(async job => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode(job.competition)}/summary?event=${job.fixtureId}`;
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
      if (!response.ok) throw new Error(`ESPN ${job.fixtureId}: HTTP ${response.status}`);
      const payload = await response.json();
      fs.mkdirSync(path.dirname(job.file), { recursive: true });
      const serialized = `${JSON.stringify({ provider: "espn", competition: job.competition, season: "2025-26", retrievedAt: new Date().toISOString(), sourceUrl: url, bundle: { summary: payload } }, null, 2)}\n`;
      fs.writeFileSync(job.file, zlib.gzipSync(Buffer.from(serialized, "utf8"), { level: 9 }));
    }));
  }
  if (jobs.length) console.log(`ESPN: scaricati ${jobs.length} riepiloghi partita per Milan e club precedenti.`);
}

function rawFiles() {
  const dedicated = path.join(root, "data/raw/team-pages/milan/espn");
  if (fs.existsSync(dedicated)) {
    const result = [];
    for (const competition of ["serie-a", "serie-b"]) {
      const dir = path.join(dedicated, competition);
      if (!fs.existsSync(dir)) continue;
      const selected = new Map();
      for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json") || name.endsWith(".json.gz"))) {
        const key = name.replace(/\.gz$/, "");
        if (!selected.has(key) || name.endsWith(".gz")) selected.set(key, name);
      }
      for (const name of selected.values()) result.push({ competition, file: path.join(dir, name) });
    }
    return result;
  }
  const base = path.join(root, "data/raw/referee-stats/espn/2025-26");
  const result = [];
  for (const competition of ["serie-a", "serie-b"]) {
    const dir = path.join(base, competition);
    for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) result.push({ competition, file: path.join(dir, name) });
  }
  return result;
}

function discoveredEspnIds(players) {
  const byName = new Map(players.map(player => [normalize(player.name), player]));
  const ids = {};
  for (const { file } of rawFiles()) {
    const raw = readRawJson(file);
    for (const roster of raw.bundle?.summary?.rosters || []) {
      for (const row of roster.roster || []) {
        const player = byName.get(normalize(row.athlete?.displayName));
        if (!player || !row.athlete?.id) continue;
        const rosterTeam = normalize(roster.team?.displayName);
        const teamMatches = ["milan", "ac milan", normalize(player.previousTeam)].includes(rosterTeam);
        const shirtMatches = player.shirtNumber == null || row.jersey == null || Number(player.shirtNumber) === Number(row.jersey);
        if (teamMatches && shirtMatches) ids[player.id] = String(row.athlete.id);
      }
    }
  }
  return ids;
}

async function downloadPhoto(playerId, espnId) {
  if (!espnId) return null;
  const relative = `assets/images/players/milan/${playerId}.png`;
  const target = path.join(root, relative);
  if (!refresh) return fs.existsSync(target) ? `../${relative}` : null;
  const url = `https://a.espncdn.com/i/headshots/soccer/players/full/${espnId}.png`;
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!response.ok || !String(response.headers.get("content-type") || "").startsWith("image/")) return null;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  return `../${relative}`;
}

function matchMinutes(entry) {
  const stats = statMap(entry.stats);
  if ((stats.appearances ?? 0) < 1) return null;
  const play = (entry.plays || []).find(item => item.substitution && item.clock?.displayValue);
  const minute = play ? Number(String(play.clock.displayValue).match(/\d+/)?.[0]) : null;
  if (entry.starter) return entry.subbedOut && minute !== null ? minute : 90;
  if (entry.subbedIn && minute !== null) return Math.max(0, 90 - minute);
  return null;
}

function localEntries(players) {
  const byPlayer = new Map(players.map(player => [player.espnId, player]).filter(([id]) => id));
  const byName = new Map(players.map(player => [normalize(player.name), player]));
  const buckets = new Map();
  for (const { competition, file } of rawFiles()) {
    const raw = readRawJson(file);
    for (const roster of raw.bundle?.summary?.rosters || []) {
      for (const row of roster.roster || []) {
        const player = byPlayer.get(String(row.athlete?.id)) || byName.get(normalize(row.athlete?.displayName));
        if (!player) continue;
        const stats = statMap(row.stats);
        if ((stats.appearances ?? 0) < 1) continue;
        const key = `${player.id}|${competition}|${roster.team?.id || roster.team?.displayName}`;
        if (!buckets.has(key)) buckets.set(key, { playerId: player.id, playerRole: player.role, providerPlayerId: String(row.athlete.id), team: roster.team.displayName === "AC Milan" ? "Milan" : roster.team.displayName, competition: competition === "serie-a" ? "Serie A" : "Serie B", competitionType: "domestic-league", matches: [] });
        buckets.get(key).matches.push({ row, stats, minutes: matchMinutes(row), retrievedAt: raw.retrievedAt || null });
      }
    }
  }
  return [...buckets.values()].map(bucket => {
    const m = bucket.matches, total = field => sumNullable(m.map(item => item.stats[field]));
    const minutes = sumNullable(m.map(item => item.minutes));
    const isGoalkeeper = bucket.playerRole === "Portiere";
    const saves = isGoalkeeper ? total("saves") : null, shotsFaced = isGoalkeeper ? total("shotsFaced") : null;
    const lastUpdated = m.map(item => item.retrievedAt).filter(Boolean).sort().at(-1)?.slice(0, 10) || null;
    return playerEntry({
      playerId: bucket.playerId, providerPlayerId: bucket.providerPlayerId, team: bucket.team, competition: bucket.competition, competitionType: bucket.competitionType,
      appearances: m.length, starts: m.filter(item => item.row.starter).length, substituteAppearances: m.filter(item => item.row.subbedIn).length,
      minutes, minutesPerAppearance: minutes === null ? null : round(minutes / m.length), completeMatches: m.filter(item => item.row.starter && !item.row.subbedOut).length,
      substitutedOff: m.filter(item => item.row.starter && item.row.subbedOut).length,
      goals: total("totalGoals"), assists: total("goalAssists"), shots: total("totalShots"), shotsOnTarget: total("shotsOnTarget"), offsides: total("offsides"),
      foulsCommitted: total("foulsCommitted"), foulsWon: total("foulsSuffered"), yellowCards: total("yellowCards"), secondYellowCards: null, straightRedCards: total("redCards"),
      goalsConceded: isGoalkeeper ? total("goalsConceded") : null, saves, savePercentage: saves !== null && shotsFaced ? round(saves * 100 / shotsFaced, 1) : null,
      source: "ESPN", sourceUrl: `https://www.espn.com/soccer/player/_/id/${bucket.providerPlayerId}`, lastUpdated,
      fieldSources: { employment: "ESPN match rosters", attack: "ESPN match rosters", discipline: "ESPN match rosters", goalkeeping: "ESPN match rosters" }
    });
  });
}

function totals(entries) {
  if (!entries.length) return playerEntry({});
  const aggregate = {};
  for (const field of PLAYER_FIELDS) aggregate[field] = sumNullable(entries.map(entry => entry[field]));
  aggregate.minutesPerAppearance = aggregate.minutes !== null && aggregate.appearances ? round(aggregate.minutes / aggregate.appearances) : null;
  return playerEntry(aggregate);
}

async function main() {
  await refreshEspnMatches();
  const profiles = {};
  for (const player of source.players) {
    try { profiles[player.id] = await profile(player); }
    catch (error) { profiles[player.id] = { sourceUrl: `https://www.acmilan.com/en/teams/men-first-team/players/${player.profileSlug}`, error: error.message, dateOfBirth: null, heightCm: null, preferredFoot: null, remoteImage: null }; }
  }
  const inferredIds = discoveredEspnIds(source.players);
  const linkedPlayers = source.players.map(player => ({ ...player, espnId: player.espnId || inferredIds[player.id] || null }));
  const local = localEntries(linkedPlayers);
  const externalByPlayer = new Map();
  for (const entry of external.entries) {
    if (!externalByPlayer.has(entry.playerId)) externalByPlayer.set(entry.playerId, []);
    externalByPlayer.get(entry.playerId).push(playerEntry(entry));
  }
  const squad = [];
  for (const seed of source.players) {
    let entries = local.filter(entry => entry.playerId === seed.id);
    if (!entries.length && externalByPlayer.has(seed.id)) entries = externalByPlayer.get(seed.id);
    const p = profiles[seed.id];
    const completeness = entries.length ? (entries.some(entry => entry.minutes != null) ? "complete" : "partial") : "unavailable";
    const espnId = seed.espnId || inferredIds[seed.id] || null;
    const associationMethod = seed.espnId ? "provider-id" : inferredIds[seed.id] ? "nome+squadra+numero-maglia" : null;
    const uncertainAssociation = false;
    const photo = await downloadPhoto(seed.id, espnId);
    const player = {
      schemaVersion: 1, id: seed.id, name: seed.name, providerIds: { espn: espnId }, currentTeam: "Milan", currentSeason: "2026/27",
      shirtNumber: seed.shirtNumber, role: seed.role, detailedRole: seed.detailedRole, dateOfBirth: p.dateOfBirth, age: ageAt(p.dateOfBirth), nationality: seed.nationality,
      heightCm: p.heightCm, weightKg: p.weightKg ?? null, preferredFoot: p.preferredFoot, birthplace: p.birthplace ?? null, atMilanSince: p.atMilanSince ?? null,
      photo, remotePhotoSource: photo ? `https://a.espncdn.com/i/headshots/soccer/players/full/${espnId}.png` : p.remoteImage, arrivalDate: seed.arrivalDate || null, status: seed.status,
      previousTeam: entries[0]?.team || seed.previousTeam || null, previousCompetition: entries[0]?.competition || seed.previousCompetition || null,
      previousSeason: { season: "2025/26", entries, totals: totals(entries), totalsByCompetition: entries.map(entry => ({ competition: entry.competition, team: entry.team, ...totals([entry]) })) },
      sources: [
        { provider: "AC Milan", scope: "Rosa e anagrafica", url: p.sourceUrl, retrievedAt: "2026-07-20" },
        ...entries.map(entry => ({ provider: entry.source, scope: `${entry.team} - ${entry.competition} 2025/26`, url: entry.sourceUrl, retrievedAt: entry.lastUpdated }))
      ],
      dataQuality: { status: completeness, uncertainAssociation, associationMethod, note: entries.length ? (entries.some(entry => entry.minutes == null) ? "Statistiche stagionali disponibili; minuti non esposti dalla fonte." : "Statistiche aggregate dai roster partita ESPN.") : "Nessuna statistica 2025/26 verificata nel perimetro dei provider disponibili." }
    };
    write(`data/players/milan/${player.id}.json`, player);
    squad.push(player);
  }
  write("data/generated/team-pages/milan-squad.json", { schemaVersion: 1, team: "Milan", season: "2026/27", previousSeason: "2025/26", generatedAt: new Date().toISOString(), rosterSource: source.source, players: squad });
  console.log(`Milan: ${squad.length} giocatori; complete=${squad.filter(p => p.dataQuality.status === "complete").length}; partial=${squad.filter(p => p.dataQuality.status === "partial").length}; unavailable=${squad.filter(p => p.dataQuality.status === "unavailable").length}`);
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
