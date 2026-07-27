const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(process.argv[2] || path.join(root, ".tmp-fantasy-xlsx/output/all-players.json"));
const outputPath = path.join(root, "data/sources/fantacalcio-stats-2025-26.json");

const normalize = value => String(value || "")
  .replace(/[øØ]/g, "o")
  .replace(/[đĐðÐ]/g, "d")
  .replace(/[łŁ]/g, "l")
  .replace(/ß/g, "ss")
  .replace(/[æÆ]/g, "ae")
  .replace(/[œŒ]/g, "oe")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const teamAliases = { "hellas verona": "verona" };
const normalizeTeam = value => teamAliases[normalize(value)] || normalize(value);
const currentRole = role => {
  if (role === "Portiere") return "P";
  if (String(role).startsWith("Difensore") || String(role).startsWith("Terzino")) return "D";
  if (["Attaccante", "Centravanti", "Seconda punta", "Ala destra", "Ala sinistra"].includes(role)) return "A";
  return "C";
};

const teamIndex = JSON.parse(fs.readFileSync(path.join(root, "data/teams/index.json"), "utf8"));
const currentPlayers = teamIndex.teams.flatMap(team => {
  const data = JSON.parse(fs.readFileSync(path.join(root, `data/teams/${team.id}.json`), "utf8"));
  return (data.squad || []).map(player => ({
    id: player.id,
    name: player.name,
    normalizedName: normalize(player.name),
    teamId: team.id,
    team: team.name,
    normalizedTeam: normalizeTeam(team.name),
    role: currentRole(player.role)
  }));
});

const rows = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const headers = rows[1].map(value => String(value));
const keyMap = {
  Id: "sourceId", R: "role", Rm: "detailedRole", Nome: "name", Squadra: "team",
  Pv: "appearancesWithVote", Mv: "averageRating", Fm: "fantasyAverage",
  Gf: "goalsFor", Gs: "goalsAgainst", Rp: "penaltiesSaved", Rc: "penaltiesTaken",
  "R+": "penaltiesScored", "R-": "penaltiesMissed", Ass: "assists",
  Amm: "yellowCards", Esp: "redCards", Au: "ownGoals"
};
const stats = rows.slice(2).filter(row => row[0] !== null && row[0] !== undefined).map(row => {
  const record = {};
  headers.forEach((header, index) => {
    const key = keyMap[header];
    if (key) record[key] = row[index];
  });
  return record;
});

const sourceParts = name => {
  const parts = normalize(name).split(" ").filter(Boolean);
  const initials = parts.filter(part => part.length === 1);
  const words = parts.filter(part => part.length > 1);
  return { parts, initials, words };
};
const scoreCandidate = (stat, player) => {
  const source = sourceParts(stat.name);
  const playerParts = player.normalizedName.split(" ");
  const joinedPlayerName = playerParts.join("");
  if (!source.words.every(word => playerParts.includes(word) || joinedPlayerName.includes(word))) return -1;
  let score = source.words.length * 4;
  if (normalize(stat.name) === player.normalizedName) score += 8;
  if (normalizeTeam(stat.team) === player.normalizedTeam) score += 5;
  if (stat.role === player.role) score += 2;
  if (source.initials.some(initial => playerParts.some(part => part.startsWith(initial)))) score += 1;
  return score;
};

const assignments = [];
const usedPlayerIds = new Set();
for (const stat of stats) {
  const uniqueCandidates = new Map();
  currentPlayers
    .map(player => ({ player, score: scoreCandidate(stat, player) }))
    .filter(item => item.score >= 4)
    .forEach(item => {
      const current = uniqueCandidates.get(item.player.id);
      if (!current || item.score > current.score) uniqueCandidates.set(item.player.id, item);
    });
  const ranked = [...uniqueCandidates.values()]
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name, "it"));
  const best = ranked[0];
  const second = ranked[1];
  const confident = best && !usedPlayerIds.has(best.player.id) && best.score >= 6 && (!second || best.score - second.score >= 2);
  if (confident) {
    stat.playerId = best.player.id;
    stat.currentName = best.player.name;
    stat.currentTeamId = best.player.teamId;
    stat.matchConfidence = best.score >= 13 ? "exact" : "high";
    usedPlayerIds.add(best.player.id);
    assignments.push({ sourceId: stat.sourceId, sourceName: stat.name, playerId: best.player.id, currentName: best.player.name, score: best.score });
  } else {
    stat.playerId = null;
    stat.currentName = null;
    stat.currentTeamId = null;
    stat.matchConfidence = "unmatched";
  }
}

const payload = {
  schemaVersion: 1,
  season: "2025/26",
  provider: "Statistiche Fantacalcio Stagione 2025 26",
  sourceFile: "Statistiche_Fantacalcio_Stagione_2025_26.xlsx",
  importedAt: "2026-07-27",
  definitions: {
    appearancesWithVote: "PV · partite a voto",
    averageRating: "MV · media voto",
    fantasyAverage: "FM · fantamedia",
    goalsFor: "GF · gol fatti",
    goalsAgainst: "GS · gol subiti",
    penaltiesSaved: "RP · rigori parati, +3",
    penaltiesTaken: "RC · rigori calciati",
    penaltiesScored: "R+ · rigori segnati, già inclusi nei gol fatti",
    penaltiesMissed: "R- · rigori sbagliati, -3",
    assists: "Ass · assist, +1",
    yellowCards: "Amm · ammonizioni, -0,5",
    redCards: "Esp · espulsioni, -1",
    ownGoals: "Au · autogol, -3"
  },
  scoringRules: {
    goal: 3, assist: 1, yellowCard: -0.5, redCard: -1,
    penaltyMissed: -3, penaltySaved: 3, ownGoal: -3,
    didNotPlay: "SV"
  },
  coverage: {
    sourcePlayers: stats.length,
    matchedCurrentPlayers: assignments.length,
    unmatchedSourcePlayers: stats.length - assignments.length,
    currentPlayersWithoutSourceMatch: currentPlayers.length - assignments.length
  },
  players: stats
};
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.coverage));
