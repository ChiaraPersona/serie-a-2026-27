#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PLAYER_FIELDS, playerEntry, round } = require("./model");

const root = path.resolve(__dirname, "../..");
const generatedAt = "2026-07-22";
const config = JSON.parse(fs.readFileSync(path.join(root, "data/sources/team-pages/completed-teams-2026-27.json"), "utf8"));
const selectedArg = process.argv.find(argument => argument.startsWith("--teams="));
const selectedTeams = selectedArg ? selectedArg.slice(8).split(",").map(value => value.trim()).filter(Boolean) : Object.keys(config.teams);
const refreshRosters = process.argv.includes("--refresh") || process.argv.includes("--refresh-rosters");
const refreshEspn = process.argv.includes("--refresh") || process.argv.includes("--refresh-espn");

const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const readRaw = file => JSON.parse((file.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(file)) : fs.readFileSync(file)).toString("utf8"));
const writeGzip = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, zlib.gzipSync(Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"), { level: 9 }));
};
const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
const slug = value => normalize(value).replace(/\s+/g, "-");
const sumNullable = values => {
  const present = values.filter(value => value !== null && value !== undefined && Number.isFinite(Number(value)));
  return present.length ? present.reduce((total, value) => total + Number(value), 0) : null;
};
const statMap = stats => Object.fromEntries((stats || []).map(stat => [stat.name, num(stat.value)]));
const ageAt = birth => {
  if (!birth) return null;
  const born = new Date(`${birth}T00:00:00Z`), at = new Date(`${generatedAt}T00:00:00Z`);
  let age = at.getUTCFullYear() - born.getUTCFullYear();
  if (at.getUTCMonth() < born.getUTCMonth() || (at.getUTCMonth() === born.getUTCMonth() && at.getUTCDate() < born.getUTCDate())) age--;
  return age;
};
const countryNames = {
  Argentina: "Argentina", Austria: "Austria", Belgium: "Belgio", Brazil: "Brasile", Cameroon: "Camerun", Canada: "Canada",
  Colombia: "Colombia", Croatia: "Croazia", Denmark: "Danimarca", Ecuador: "Ecuador", England: "Inghilterra", France: "Francia",
  Germany: "Germania", Italy: "Italia", Netherlands: "Paesi Bassi", Nigeria: "Nigeria", Norway: "Norvegia", Poland: "Polonia",
  Portugal: "Portogallo", Serbia: "Serbia", Slovakia: "Slovacchia", Slovenia: "Slovenia", Spain: "Spagna", Sweden: "Svezia",
  Switzerland: "Svizzera", Turkey: "Turchia", Uruguay: "Uruguay", USA: "Stati Uniti"
};
const roleNames = { Goalkeeper: "Portiere", Defender: "Difensore", Midfielder: "Centrocampista", Forward: "Attaccante" };

function rosterCache(teamId) {
  return path.join(root, `data/raw/team-pages/${teamId}/espn-roster-2026-27.json.gz`);
}

async function refreshRoster(teamId, teamConfig) {
  const target = rosterCache(teamId);
  if (!refreshRosters && fs.existsSync(target)) return;
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/teams/${teamConfig.espnTeamId}/roster`;
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
  if (!response.ok) throw new Error(`${teamConfig.name}: rosa ESPN HTTP ${response.status}`);
  writeGzip(target, { provider: "ESPN", season: "2026/27", retrievedAt: new Date().toISOString(), sourceUrl: url, roster: await response.json() });
}

function existingSummary(fixtureId) {
  const generic = path.join(root, `data/raw/team-pages/espn/2025-26/serie-a/${fixtureId}.json.gz`);
  if (fs.existsSync(generic)) return generic;
  const milan = path.join(root, `data/raw/team-pages/milan/espn/serie-a/${fixtureId}.json.gz`);
  return fs.existsSync(milan) ? milan : null;
}

async function refreshEspnMatches() {
  const matches = read("data/normalized/referee-matches/2025-26/serie-a.json").matches;
  const targetDir = path.join(root, "data/raw/team-pages/espn/2025-26/serie-a");
  fs.mkdirSync(targetDir, { recursive: true });
  const jobs = [];
  let reused = 0;
  for (const match of matches) {
    const target = path.join(targetDir, `${match.providerFixtureId}.json.gz`);
    if (!refreshEspn && fs.existsSync(target)) continue;
    const reusable = existingSummary(match.providerFixtureId);
    if (reusable && reusable !== target) {
      fs.copyFileSync(reusable, target);
      reused++;
      continue;
    }
    jobs.push({ fixtureId: match.providerFixtureId, target });
  }
  for (let index = 0; index < jobs.length; index += 8) {
    await Promise.all(jobs.slice(index, index + 8).map(async job => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/summary?event=${job.fixtureId}`;
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
      if (!response.ok) throw new Error(`ESPN ${job.fixtureId}: HTTP ${response.status}`);
      writeGzip(job.target, { provider: "espn", competition: "serie-a", season: "2025-26", retrievedAt: new Date().toISOString(), sourceUrl: url, bundle: { summary: await response.json() } });
    }));
    console.log(`ESPN Serie A: ${Math.min(index + 8, jobs.length)}/${jobs.length} riepiloghi scaricati`);
  }
  console.log(`ESPN Serie A: cache completa (${matches.length} partite; ${reused} riepiloghi riutilizzati).`);
}

function rawFiles() {
  const dir = path.join(root, "data/raw/team-pages/espn/2025-26/serie-a");
  return fs.readdirSync(dir).filter(name => name.endsWith(".json.gz")).map(name => path.join(dir, name));
}

function matchMinutes(entry) {
  const stats = statMap(entry.stats);
  if ((stats.appearances ?? 0) < 1) return null;
  const play = (entry.plays || []).find(item => item.substitution && item.clock?.displayValue);
  const minute = play ? Number(String(play.clock.displayValue).match(/\d+/)?.[0]) : null;
  if (entry.starter) return entry.subbedOut && minute !== null ? Math.min(90, minute) : 90;
  if (entry.subbedIn && minute !== null) return Math.max(0, 90 - Math.min(90, minute));
  return null;
}

function allEntries(playersByEspnId) {
  const buckets = new Map();
  for (const file of rawFiles()) {
    const raw = readRaw(file);
    for (const roster of raw.bundle?.summary?.rosters || []) {
      for (const row of roster.roster || []) {
        const player = playersByEspnId.get(String(row.athlete?.id));
        if (!player) continue;
        const stats = statMap(row.stats);
        if ((stats.appearances ?? 0) < 1) continue;
        const key = `${player.id}|${roster.team?.id || roster.team?.displayName}`;
        if (!buckets.has(key)) buckets.set(key, { playerId: player.id, playerRole: player.role, providerPlayerId: String(row.athlete.id), team: roster.team?.displayName || "N/D", matches: [] });
        buckets.get(key).matches.push({ row, stats, minutes: matchMinutes(row), retrievedAt: raw.retrievedAt || null });
      }
    }
  }
  return [...buckets.values()].map(bucket => {
    const matches = bucket.matches;
    const total = field => sumNullable(matches.map(item => item.stats[field]));
    const minutes = sumNullable(matches.map(item => item.minutes));
    const isGoalkeeper = bucket.playerRole === "Portiere";
    const saves = isGoalkeeper ? total("saves") : null;
    const shotsFaced = isGoalkeeper ? total("shotsFaced") : null;
    return playerEntry({
      playerId: bucket.playerId, providerPlayerId: bucket.providerPlayerId, team: bucket.team === "AC Milan" ? "Milan" : bucket.team,
      competition: "Serie A", competitionType: "domestic-league", appearances: matches.length,
      starts: matches.filter(item => item.row.starter).length, substituteAppearances: matches.filter(item => item.row.subbedIn).length,
      minutes, minutesPerAppearance: minutes === null ? null : round(minutes / matches.length),
      completeMatches: matches.filter(item => item.row.starter && !item.row.subbedOut).length,
      substitutedOff: matches.filter(item => item.row.starter && item.row.subbedOut).length,
      goals: total("totalGoals"), assists: total("goalAssists"), shots: total("totalShots"), shotsOnTarget: total("shotsOnTarget"),
      offsides: total("offsides"), foulsCommitted: total("foulsCommitted"), foulsWon: total("foulsSuffered"),
      yellowCards: total("yellowCards"), secondYellowCards: null, straightRedCards: total("redCards"),
      goalsConceded: isGoalkeeper ? total("goalsConceded") : null, saves,
      savePercentage: saves !== null && shotsFaced ? round(saves * 100 / shotsFaced, 1) : null,
      source: "ESPN", sourceUrl: `https://www.espn.com/soccer/player/_/id/${bucket.providerPlayerId}`,
      lastUpdated: matches.map(item => item.retrievedAt).filter(Boolean).sort().at(-1)?.slice(0, 10) || generatedAt,
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

function athleteDate(value) {
  const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function athleteCountry(athlete) {
  const raw = athlete.citizenshipCountry?.name || athlete.citizenship || athlete.country?.name || null;
  return countryNames[raw] || raw;
}

function athleteRole(athlete) {
  const raw = athlete.position?.name || athlete.position?.displayName || "";
  return roleNames[raw] || (raw.toLowerCase().includes("goalkeeper") ? "Portiere" : raw.toLowerCase().includes("defender") ? "Difensore" : raw.toLowerCase().includes("midfielder") ? "Centrocampista" : "Attaccante");
}

function rosterPlayers(teamId, teamConfig) {
  if (!fs.existsSync(rosterCache(teamId))) throw new Error(`${teamConfig.name}: cache rosa assente; esegui con --refresh-rosters`);
  const payload = readRaw(rosterCache(teamId)).roster;
  const athletes = payload.athletes || [];
  const included = new Set(teamConfig.includeEspnIds || []);
  const selected = teamConfig.rosterPolicy === "include" ? athletes.filter(athlete => included.has(String(athlete.id))) : athletes;
  const players = selected.map(athlete => {
    const espnId = String(athlete.id);
    const role = athleteRole(athlete);
    const birth = athleteDate(athlete.dateOfBirth);
    return {
      id: slug(athlete.fullName || athlete.displayName), name: athlete.fullName || athlete.displayName, espnId, role,
      detailedRole: roleNames[athlete.position?.name] || athlete.position?.displayName || role,
      nationality: athleteCountry(athlete), dateOfBirth: birth, shirtNumber: num(athlete.jersey),
      heightCm: athlete.height ? Math.round(Number(athlete.height) * 2.54) : null,
      weightKg: athlete.weight ? Math.round(Number(athlete.weight) * 0.453592) : null,
      status: teamConfig.statusOverrides?.[espnId] || (teamConfig.confirmedEspnIds || []).includes(espnId) ? (teamConfig.statusOverrides?.[espnId] || "confermato") : teamConfig.defaultStatus
    };
  });
  for (const supplemental of teamConfig.supplementalPlayers || []) {
    if (players.some(player => supplemental.espnId && player.espnId === String(supplemental.espnId))) continue;
    players.push({ id: slug(supplemental.name), shirtNumber: null, heightCm: null, weightKg: null, ...supplemental, espnId: supplemental.espnId ? String(supplemental.espnId) : null });
  }
  return players;
}

async function buildTeam(teamId, teamConfig, entries) {
  const seeds = rosterPlayers(teamId, teamConfig);
  const squad = seeds.map(seed => {
    const playerEntries = entries.filter(entry => entry.playerId === seed.id).sort((left, right) => (right.appearances ?? 0) - (left.appearances ?? 0));
    const completeness = playerEntries.length ? (playerEntries.some(entry => entry.minutes != null) ? "complete" : "partial") : "unavailable";
    const photoUrl = seed.espnId ? `https://a.espncdn.com/i/headshots/soccer/players/full/${seed.espnId}.png` : null;
    const player = {
      schemaVersion: 1, id: seed.id, name: seed.name, providerIds: { espn: seed.espnId }, currentTeam: teamConfig.name, currentSeason: "2026/27",
      shirtNumber: seed.shirtNumber ?? null, role: seed.role, detailedRole: seed.detailedRole || seed.role,
      dateOfBirth: seed.dateOfBirth || null, age: ageAt(seed.dateOfBirth), nationality: seed.nationality || null,
      heightCm: seed.heightCm ?? null, weightKg: seed.weightKg ?? null, preferredFoot: null, birthplace: null, atMilanSince: null,
      photo: photoUrl, remotePhotoSource: photoUrl, arrivalDate: null, status: seed.status || teamConfig.defaultStatus,
      previousTeam: playerEntries[0]?.team || null, previousCompetition: playerEntries[0]?.competition || null,
      previousSeason: { season: "2025/26", entries: playerEntries, totals: totals(playerEntries), totalsByCompetition: playerEntries.map(entry => ({ competition: entry.competition, team: entry.team, ...totals([entry]) })) },
      sources: [
        { ...teamConfig.source },
        ...playerEntries.map(entry => ({ provider: entry.source, scope: `${entry.team} - ${entry.competition} 2025/26`, url: entry.sourceUrl, retrievedAt: entry.lastUpdated }))
      ],
      dataQuality: {
        status: completeness, uncertainAssociation: false, associationMethod: seed.espnId ? "provider-id" : null,
        note: playerEntries.length ? "Statistiche aggregate dai roster partita ESPN." : "Nessuna statistica 2025/26 verificata nel perimetro Serie A ESPN; i valori restano N/D."
      }
    };
    write(`data/players/${teamId}/${player.id}.json`, player);
    return player;
  });
  write(`data/generated/team-pages/${teamId}-squad.json`, {
    schemaVersion: 1, team: teamConfig.name, season: "2026/27", previousSeason: "2025/26", generatedAt: new Date().toISOString(),
    coach: teamConfig.coach || null, rosterSource: teamConfig.source, players: squad
  });
  console.log(`${teamConfig.name}: ${squad.length} giocatori; complete=${squad.filter(player => player.dataQuality.status === "complete").length}; partial=${squad.filter(player => player.dataQuality.status === "partial").length}; unavailable=${squad.filter(player => player.dataQuality.status === "unavailable").length}`);
}

async function main() {
  for (const teamId of selectedTeams) {
    if (!config.teams[teamId]) throw new Error(`Squadra non configurata: ${teamId}`);
    await refreshRoster(teamId, config.teams[teamId]);
  }
  await refreshEspnMatches();
  const seedsByTeam = Object.fromEntries(selectedTeams.map(teamId => [teamId, rosterPlayers(teamId, config.teams[teamId])]));
  const byEspnId = new Map();
  for (const seeds of Object.values(seedsByTeam)) for (const seed of seeds) if (seed.espnId) byEspnId.set(seed.espnId, seed);
  const entries = allEntries(byEspnId);
  for (const teamId of selectedTeams) await buildTeam(teamId, config.teams[teamId], entries);
}

main().catch(error => { console.error(error.stack || error.message); process.exit(1); });
