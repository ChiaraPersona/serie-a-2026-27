const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const probableUrl = "https://www.fantacalcio.it/probabili-formazioni-serie-a";
const injuriesUrl = "https://www.fantacalcio.it/infortunati-serie-a";
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const quotations = read("data/sources/fantacalcio-quotations-2026-27.json");
const teams = read("data/normalized/teams.json");

const decode = value => String(value || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&agrave;/gi, "à")
  .replace(/&egrave;/gi, "è")
  .replace(/&igrave;/gi, "ì")
  .replace(/&ograve;/gi, "ò")
  .replace(/&ugrave;/gi, "ù")
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, " ")
  .trim();
const normalize = value => decode(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const teamIdByName = new Map(teams.map(team => [normalize(team.name), team.id]));
const rosterByTeam = new Map(teams.map(team => {
  const file = path.join(root, "data", "teams", `${team.id}.json`);
  const roster = fs.existsSync(file) ? read(`data/teams/${team.id}.json`).squad || [] : [];
  return [team.id, roster];
}));
const quotationBySourceId = new Map(quotations.players.map(player => [String(player.sourceId), player]));
const quotationsByTeamAndName = new Map();
for (const player of quotations.players) {
  const key = `${player.teamId}|${normalize(player.name)}`;
  if (!quotationsByTeamAndName.has(key)) quotationsByTeamAndName.set(key, []);
  quotationsByTeamAndName.get(key).push(player);
}

function matchRosterPlayer(teamId, sourceName) {
  const source = normalize(sourceName);
  const tokens = source.split(" ").filter(Boolean);
  const abbreviated = tokens.length > 1 && tokens.at(-1).length <= 2;
  const surname = abbreviated ? tokens.slice(0, -1).join(" ") : source;
  const initial = abbreviated ? tokens.at(-1) : null;
  const candidates = (rosterByTeam.get(teamId) || []).filter(player => {
    const fullName = normalize(player.name);
    const fullTokens = fullName.split(" ").filter(Boolean);
    const lastName = fullTokens.at(-1) || "";
    const firstNames = fullTokens.slice(0, -1).join(" ");
    if (fullName === source) return true;
    if (abbreviated) return lastName === surname && firstNames.startsWith(initial);
    return lastName === surname || fullName.endsWith(` ${surname}`);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; SerieA-2026-27 data importer)" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

function parsePlayerList(html, listClass) {
  const list = html.match(new RegExp(`<ul class="player-list ${listClass}">([\\s\\S]*?)<\\/ul>`));
  if (!list) return [];
  return [...list[1].matchAll(/<li class="player-item[^>]*>[\s\S]*?<span class="role" data-value="([pdca])"><\/span>[\s\S]*?href="[^"]+\/(\d+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?aria-valuenow="(\d+)"/g)].map(match => ({
    sourceId: Number(match[2]),
    sourceName: decode(match[3]),
    sourceRole: match[1].toUpperCase(),
    probability: Number(match[4]),
    lineupStatus: listClass === "starters" ? "starter" : "reserve"
  }));
}

function parseProbableLineups(html, importedAt) {
  const marker = '<div class="card team-card dark col mt-4">';
  const chunks = html.split(marker).slice(1);
  const updates = [...html.matchAll(/Ultimo aggiornamento\s*<span class="date">([^<]+)<\/span>/g)].map(match => decode(match[1]));
  const teamCards = chunks.map((chunk, index) => {
    const nameMatch = chunk.match(/<h3 class="h6 team-name">([^<]+)<\/h3>/);
    const formationMatch = chunk.match(/<div class="h6 team-formation">([^<]+)<\/div>/);
    if (!nameMatch) return null;
    const team = decode(nameMatch[1]);
    const teamId = teamIdByName.get(normalize(team)) || null;
    const players = [...parsePlayerList(chunk, "starters"), ...parsePlayerList(chunk, "reserves")].map(player => {
      const quotation = quotationBySourceId.get(String(player.sourceId));
      const linkedQuotation = quotation && quotation.teamId === teamId ? quotation : null;
      const rosterPlayer = matchRosterPlayer(teamId, player.sourceName);
      const playerId = linkedQuotation?.playerId || rosterPlayer?.id || null;
      return {
        ...player,
        team,
        teamId,
        playerId,
        currentName: linkedQuotation?.currentName || rosterPlayer?.name || null,
        matchStatus: playerId ? "linked-player" : linkedQuotation ? "linked-listone" : "unmatched",
        associationMethod: linkedQuotation?.playerId ? "fantacalcio-source-id" : rosterPlayer ? "unique-team-roster-name" : linkedQuotation ? "listone-only" : null
      };
    });
    return { team, teamId, formation: formationMatch ? decode(formationMatch[1]) : null, updatedAt: updates[Math.floor(index / 2)] || null, players };
  }).filter(Boolean);
  const allPlayers = teamCards.flatMap(team => team.players);
  return {
    schemaVersion: 1,
    provider: "Fantacalcio.it",
    season: "2026/27",
    matchday: 2,
    sourceUrl: probableUrl,
    importedAt,
    interpretation: "Percentuale editoriale di probabilità di titolarità per la 2ª giornata; non è una formazione ufficiale.",
    coverage: {
      teams: teamCards.length,
      players: allPlayers.length,
      starters: allPlayers.filter(player => player.lineupStatus === "starter").length,
      reserves: allPlayers.filter(player => player.lineupStatus === "reserve").length,
      linkedPlayers: allPlayers.filter(player => player.matchStatus === "linked-player").length,
      linkedListoneOnly: allPlayers.filter(player => player.matchStatus === "linked-listone").length,
      unmatched: allPlayers.filter(player => player.matchStatus === "unmatched").length
    },
    teams: teamCards
  };
}

function parseInjuries(html, importedAt) {
  const chunks = html.split(/<div id="team-\d+" class="card team-card">/).slice(1);
  const teamCards = chunks.map(chunk => {
    const nameMatch = chunk.match(/<span class="team-name">([^<]+)<\/span>/);
    if (!nameMatch) return null;
    const team = decode(nameMatch[1]);
    const teamId = teamIdByName.get(normalize(team)) || null;
    const reports = [...chunk.matchAll(/<strong class="item-name">([^<]+)<\/strong>[\s\S]*?<div class="item-description">([\s\S]*?)<\/div>/g)].map(match => {
      const sourceName = decode(match[1]);
      const candidates = quotationsByTeamAndName.get(`${teamId}|${normalize(sourceName)}`) || [];
      const quotation = candidates.length === 1 ? candidates[0] : null;
      return {
        sourceName,
        description: decode(match[2]),
        team,
        teamId,
        sourceId: quotation?.sourceId || null,
        playerId: quotation?.playerId || null,
        currentName: quotation?.currentName || null,
        matchStatus: quotation ? (quotation.playerId ? "linked-player" : "linked-listone") : "unmatched"
      };
    });
    return { team, teamId, reports };
  }).filter(Boolean);
  const reports = teamCards.flatMap(team => team.reports);
  return {
    schemaVersion: 1,
    provider: "Fantacalcio.it",
    season: "2026/27",
    sourceUrl: injuriesUrl,
    importedAt,
    interpretation: "Segnalazioni redazionali con dettaglio e tempi indicativi di recupero; i casi da valutare non sono trasformati in assenze certe.",
    coverage: {
      teams: teamCards.length,
      reports: reports.length,
      linkedPlayers: reports.filter(report => report.matchStatus === "linked-player").length,
      linkedListoneOnly: reports.filter(report => report.matchStatus === "linked-listone").length,
      unmatched: reports.filter(report => report.matchStatus === "unmatched").length
    },
    teams: teamCards
  };
}

async function main() {
  const importedAt = new Date().toISOString();
  const probableHtml = await fetchHtml(probableUrl);
  const probable = parseProbableLineups(probableHtml, importedAt);
  if (probable.coverage.teams !== 20 || probable.coverage.starters !== 220) throw new Error(`Copertura probabili inattesa: ${JSON.stringify(probable.coverage)}`);
  fs.writeFileSync(path.join(root, "data/sources/probable-lineups-md2-2026-27.json"), `${JSON.stringify(probable, null, 2)}\n`);
  console.log(`Probabili: ${probable.coverage.players} calciatori, ${probable.coverage.linkedPlayers} collegati alla rosa, ${probable.coverage.unmatched} non collegati.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
