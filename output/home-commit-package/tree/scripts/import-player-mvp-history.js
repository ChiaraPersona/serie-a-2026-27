"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "data/sources/player-mvp-history-2025-26.json");
const season = "2025/2026";
const sourceUrl = "https://www.legaseriea.it/serie-a/awards/player-of-the-match";
const apiUrl = "https://dapi.legaseriea.it/v2/content/it-IT/mvp?$limit=25&$sort=contentDate&$skip=0";

const cleanName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const teamAliases = new Map(Object.entries({
  atalanta: "atalanta", bologna: "bologna", cagliari: "cagliari", como: "como", cremonese: "cremonese",
  fiorentina: "fiorentina", frosinone: "frosinone", genoa: "genoa", inter: "inter", juventus: "juventus",
  lazio: "lazio", lecce: "lecce", milan: "milan", monza: "monza", napoli: "napoli", parma: "parma",
  pisa: "pisa", roma: "roma", sassuolo: "sassuolo", torino: "torino", udinese: "udinese",
  venezia: "venezia", verona: "verona", "hellas verona": "verona"
}));
const teamId = name => teamAliases.get(cleanName(name)) || cleanName(name).replace(/ /g, "-") || null;

async function requestJson(url, attempt = 1) {
  try {
    const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Serie-A-2026-27 data importer" }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    return requestJson(url, attempt + 1);
  }
}

function seasonTitle(item) {
  return item.tags?.find(tag => tag.externalSourceName === "sdpseason")?.title || null;
}

function eventFrom(item) {
  const match = item.tags?.find(tag => tag.externalSourceName === "sdpmatch");
  const matchday = Number(String(match?.extraData?.matchDayName || "").match(/\d+/)?.[0]) || null;
  const firstName = String(item.fields?.playerFirstName || "").trim();
  const lastName = String(item.fields?.playerLastName || "").trim();
  const name = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim() || String(item.title || "").split(" - ")[0].trim();
  const homeTeamName = match?.extraData?.homeTeamName || null;
  const awayTeamName = match?.extraData?.awayTeamName || null;
  return {
    awardId: item._entityId,
    playerId: item.fields?.sdpPlayerId || null,
    playerName: name,
    normalizedName: cleanName(name),
    matchId: match?.extraData?.matchId || null,
    providerMatchId: match?.extraData?.providerId || null,
    matchday,
    date: String(item.contentDate || "").slice(0, 10) || null,
    homeTeamId: teamId(homeTeamName),
    homeTeamName,
    awayTeamId: teamId(awayTeamName),
    awayTeamName
  };
}

async function main() {
  const all = [];
  const seen = new Set();
  let nextUrl = apiUrl;
  let generatedAt = null;
  let foundTargetSeason = false;
  for (let page = 0; nextUrl && page < 30; page += 1) {
    const payload = await requestJson(nextUrl);
    generatedAt ||= payload.meta?.generatedAt || null;
    const items = payload.items || [];
    const targetItems = items.filter(item => seasonTitle(item) === season);
    foundTargetSeason ||= targetItems.length > 0;
    for (const item of targetItems) {
      if (!item._entityId || seen.has(item._entityId)) continue;
      seen.add(item._entityId);
      all.push(eventFrom(item));
    }
    if (foundTargetSeason && items.length && !targetItems.length) break;
    nextUrl = payload.pagination?.nextUrl || null;
  }

  all.sort((a, b) => (a.matchday || 99) - (b.matchday || 99) || String(a.date).localeCompare(String(b.date)) || a.playerName.localeCompare(b.playerName, "it"));
  const grouped = new Map();
  for (const event of all) {
    if (!event.normalizedName) continue;
    const player = grouped.get(event.normalizedName) || { name: event.playerName, normalizedName: event.normalizedName, playerIds: new Set(), matches: [] };
    if (event.playerId) player.playerIds.add(event.playerId);
    player.matches.push({ awardId: event.awardId, matchId: event.matchId, matchday: event.matchday, date: event.date, homeTeamId: event.homeTeamId, awayTeamId: event.awayTeamId });
    grouped.set(event.normalizedName, player);
  }
  const players = [...grouped.values()].map(player => ({
    name: player.name,
    normalizedName: player.normalizedName,
    playerIds: [...player.playerIds],
    awards: player.matches.length,
    recentAwards: player.matches.filter(match => match.matchday >= 29).length,
    matchdays: player.matches.map(match => match.matchday).filter(Number.isFinite),
    matches: player.matches
  })).sort((a, b) => b.awards - a.awards || a.name.localeCompare(b.name, "it"));
  const matchdays = [...new Set(all.map(event => event.matchday).filter(Number.isFinite))].sort((a, b) => a - b);
  const output = {
    schemaVersion: 1,
    competition: "serie-a",
    season: "2025-26",
    provider: "Lega Serie A",
    award: "Panini Player of the Match",
    sourceUrl,
    apiUrl,
    retrievedAt: generatedAt || new Date().toISOString(),
    methodology: "Premi ufficiali per singola gara aggregati per calciatore. Le frequenze per presenza e per 1.000 minuti sono calcolate dal motore solo quando lo storico di impiego e disponibile.",
    coverage: {
      awards: all.length,
      uniquePlayers: players.length,
      matchdays,
      expectedLeagueMatches: 380,
      completionPct: Number((all.length / 380 * 100).toFixed(1))
    },
    players,
    events: all
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`OK storico MVP ufficiale: ${all.length}/380 premi · ${players.length} calciatori · ${matchdays.length} giornate`);
}

main().catch(error => {
  console.error(`Import storico MVP fallito: ${error.message}`);
  process.exitCode = 1;
});
