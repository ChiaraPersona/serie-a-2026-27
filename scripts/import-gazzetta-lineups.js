const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceUrl = "https://www.gazzetta.it/Calcio/prob_form/";
const outputFile = "data/sources/gazzetta-probable-lineups-md1-2026-27.json";
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

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
const normalize = value => decode(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[øØ]/g, "o").replace(/[łŁ]/g, "l").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const teams = read("data/normalized/teams.json");
const quotations = read("data/sources/fantacalcio-quotations-2026-27.json");
const teamIdByName = new Map(teams.flatMap(team => [[normalize(team.name), team.id], [normalize(team.shortName), team.id]]));
const quotationByPlayerId = new Map(quotations.players.filter(player => player.playerId).map(player => [player.playerId, player]));
const rosterByTeamId = new Map(teams.map(team => {
  const file = path.join(root, `data/generated/team-pages/${team.id}-squad.json`);
  const players = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).players || [] : [];
  return [team.id, players];
}));

function linkPlayer(teamId, sourceName, shirtNumber, positionIndex) {
  const roster = rosterByTeamId.get(teamId) || [];
  const source = normalize(sourceName);
  const sourceTokens = source.split(" ").filter(Boolean);
  let candidates = roster.filter(player => normalize(player.name) === source);
  if (candidates.length !== 1) {
    candidates = roster.filter(player => {
      const tokens = normalize(player.name).split(" ").filter(Boolean);
      const compactName = tokens.join("");
      const compactSource = sourceTokens.join("");
      const initialAndSurname = sourceTokens.length === 2 && sourceTokens[0].length === 1 && tokens[0]?.startsWith(sourceTokens[0]) && tokens.at(-1) === sourceTokens[1];
      return sourceTokens.every(token => tokens.includes(token)) || compactName.includes(compactSource) || initialAndSurname;
    });
  }
  if (candidates.length > 1 && Number.isFinite(shirtNumber)) {
    const numbered = candidates.filter(player => Number(player.shirtNumber) === shirtNumber);
    if (numbered.length === 1) candidates = numbered;
  }
  if (candidates.length > 1 && positionIndex === 0) {
    const goalkeepers = candidates.filter(player => player.role === "Portiere");
    if (goalkeepers.length === 1) candidates = goalkeepers;
  }
  if (candidates.length !== 1) return { playerId: null, currentName: null, sourceId: null, matchStatus: candidates.length ? "ambiguous" : "unmatched" };
  const player = candidates[0];
  const quotation = quotationByPlayerId.get(player.id);
  return { playerId: player.id, currentName: player.name, sourceId: quotation?.sourceId ?? null, matchStatus: "linked-player" };
}

function parsePlayers(block, team, teamId) {
  return [...block.matchAll(/<li class="lineup-team__player">([\s\S]*?)<\/li>/g)].map((match, positionIndex) => {
    const sourceName = decode(match[1].match(/<span class="lineup-team__name">([\s\S]*?)<\/span>/)?.[1] || "");
    const shirtNumber = Number(decode(match[1].match(/<span class="lineup-team__number">([\s\S]*?)<\/span>/)?.[1] || ""));
    return {
      sourceId: null,
      sourceName,
      sourceRole: null,
      shirtNumber: Number.isFinite(shirtNumber) ? shirtNumber : null,
      probability: null,
      lineupStatus: "starter",
      team,
      teamId,
      ...linkPlayer(teamId, sourceName, shirtNumber, positionIndex)
    };
  });
}

function parseLineups(html, importedAt) {
  const matchday = Number(html.match(/(\d+)°\s*Giornata/i)?.[1]);
  const pageUpdatedAt = decode(html.match(/<h3[^>]*>\s*\d+°\s*Giornata\s*\/\s*Aggiornato:\s*([\s\S]*?)<\/h3>/i)?.[1] || "") || null;
  const markers = [...html.matchAll(/<div id="match-(\d+)" class="bck-box-match-details">/g)];
  const parsedTeams = [];
  const matches = [];
  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
    const chunk = html.slice(marker.index, markers[index + 1]?.index ?? html.length);
    const names = [...chunk.matchAll(/class="details-team__name"[\s\S]*?>([^<]+)<\/a/g)].map(match => decode(match[1]));
    const formations = [...chunk.matchAll(/<p><strong>Modulo:<\/strong>\s*([^<]+)<\/p>/g)].map(match => decode(match[1]));
    const coaches = [...chunk.matchAll(/<p><strong>Allenatore:<\/strong>\s*([^<]+)<\/p>/g)].map(match => decode(match[1]));
    const lineupBlocks = [...chunk.matchAll(/<div class="lineup-team is--(home|away)">([\s\S]*?)<\/ul>\s*<\/div>/g)];
    const updatedAt = decode(chunk.match(/<p class="lastUpdate">([\s\S]*?)<\/p>/)?.[1] || "").replace(/^Ultimo aggiornamento:\s*/i, "") || null;
    if (names.length !== 2 || formations.length !== 2 || lineupBlocks.length !== 2) continue;
    const teamEntries = names.map((team, side) => {
      const teamId = teamIdByName.get(normalize(team)) || null;
      const players = teamId ? parsePlayers(lineupBlocks.find(block => block[1] === (side === 0 ? "home" : "away"))?.[2] || "", team, teamId) : [];
      return { team, teamId, formation: formations[side], coach: coaches[side] || null, updatedAt, players };
    });
    parsedTeams.push(...teamEntries);
    matches.push({ sourceMatchId: marker[1], homeTeamId: teamEntries[0].teamId, awayTeamId: teamEntries[1].teamId, updatedAt });
  }
  const allPlayers = parsedTeams.flatMap(team => team.players);
  return {
    schemaVersion: 1,
    provider: "La Gazzetta dello Sport",
    season: "2026/27",
    matchday: Number.isFinite(matchday) ? matchday : 1,
    sourceUrl,
    importedAt,
    sourceUpdatedAt: pageUpdatedAt,
    interpretation: "Proiezione editoriale della formazione titolare; non è una formazione ufficiale. Gazzetta non assegna una percentuale a ogni titolare, quindi il campo probability resta null.",
    coverage: {
      teams: parsedTeams.length,
      players: allPlayers.length,
      starters: allPlayers.length,
      reserves: 0,
      linkedPlayers: allPlayers.filter(player => player.matchStatus === "linked-player").length,
      linkedListoneOnly: 0,
      ambiguous: allPlayers.filter(player => player.matchStatus === "ambiguous").length,
      unmatched: allPlayers.filter(player => player.matchStatus === "unmatched").length
    },
    matches,
    teams: parsedTeams
  };
}

async function fetchHtml() {
  const response = await fetch(sourceUrl, { headers: { "user-agent": "Mozilla/5.0 (compatible; SerieA-2026-27 data importer)" } });
  if (!response.ok) throw new Error(`${sourceUrl}: HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const importedAt = new Date().toISOString();
  const dataset = parseLineups(await fetchHtml(), importedAt);
  const incomplete = dataset.teams.filter(team => team.players.length !== 11 || !team.teamId).map(team => `${team.team}:${team.players.length}`);
  const unresolved = dataset.teams.flatMap(team => team.players.filter(player => player.matchStatus !== "linked-player").map(player => `${team.team}:${player.sourceName}:${player.matchStatus}`));
  if (incomplete.length) console.error(`Formazioni incomplete: ${incomplete.join(", ")}`);
  if (unresolved.length) console.error(`Nomi non collegati: ${unresolved.join(", ")}`);
  if (dataset.coverage.teams !== 20 || dataset.coverage.starters !== 220) throw new Error(`Copertura Gazzetta inattesa: ${JSON.stringify(dataset.coverage)}`);
  if (dataset.teams.some(team => !team.teamId || !/^[1-9](?:-[1-9]){2,4}$/.test(team.formation) || team.players.length !== 11)) throw new Error("Una formazione Gazzetta non ha squadra, modulo o undici titolari completi.");
  if (dataset.coverage.ambiguous) throw new Error(`${dataset.coverage.ambiguous} nomi Gazzetta sono ambigui: correggere il collegamento prima di aggiornare il sito.`);
  fs.writeFileSync(path.join(root, outputFile), `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`Gazzetta: ${dataset.coverage.teams} squadre, ${dataset.coverage.starters} titolari, ${dataset.coverage.linkedPlayers} collegati alla rosa, ${dataset.coverage.unmatched} non collegati.`);
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { parseLineups, linkPlayer };
