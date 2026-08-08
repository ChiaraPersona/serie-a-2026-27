const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(process.argv[2] || path.join(root, "tmp/fantasy-quotations-2026-27.json"));
const outputPath = path.join(root, "data/sources/fantacalcio-quotations-2026-27.json");

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

const roleCode = role => {
  if (role === "Portiere") return "P";
  if (String(role).startsWith("Difensore") || String(role).startsWith("Terzino")) return "D";
  if (["Attaccante", "Centravanti", "Seconda punta", "Ala destra", "Ala sinistra"].includes(role)) return "A";
  return "C";
};

const existingPayload = !fs.existsSync(inputPath) && fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : null;
if (!fs.existsSync(inputPath) && !existingPayload) throw new Error(`Estrazione listone mancante: ${inputPath}`);
const extracted = fs.existsSync(inputPath) ? JSON.parse(fs.readFileSync(inputPath, "utf8")) : null;
const teamIndex = JSON.parse(fs.readFileSync(path.join(root, "data/teams/index.json"), "utf8"));
const teamIdByName = new Map(teamIndex.teams.map(team => [normalize(team.name), team.id]));
const currentPlayers = teamIndex.teams.flatMap(team => {
  const data = JSON.parse(fs.readFileSync(path.join(root, `data/teams/${team.id}.json`), "utf8"));
  return (data.squad || []).map(player => ({
    id: player.id,
    name: player.name,
    normalizedName: normalize(player.name),
    parts: normalize(player.name).split(" ").filter(Boolean),
    teamId: team.id,
    role: roleCode(player.role),
  }));
});

const keyMap = {
  Id: "sourceId", R: "role", RM: "mantraRole", Nome: "name", Squadra: "team",
  "Qt.A": "currentQuotation", "Qt.I": "initialQuotation", "Diff.": "quotationDifference",
  "Qt.A M": "currentMantraQuotation", "Qt.I M": "initialMantraQuotation", "Diff.M": "mantraQuotationDifference",
  FVM: "fvm", "FVM M": "mantraFvm",
};

function parseRows(rows, status) {
  const headers = rows[1].map(value => String(value || "").trim());
  return rows.slice(2).filter(row => row[0] !== null && row[0] !== undefined).map(row => {
    const record = { status };
    headers.forEach((header, index) => {
      const key = keyMap[header];
      if (key) record[key] = row[index];
    });
    record.teamId = teamIdByName.get(normalize(record.team)) || null;
    return record;
  });
}

const activePlayers = existingPayload ? existingPayload.players.map(player => ({ ...player })) : parseRows(extracted.sheets.Tutti, "active");
const departedPlayers = existingPayload ? existingPayload.departed.map(player => ({ ...player })) : parseRows(extracted.sheets.Ceduti, "departed");
const assignments = [];
const usedPlayerIds = new Set();

function candidateScore(source, player) {
  if (!source.teamId || source.teamId !== player.teamId) return -1;
  const sourceParts = normalize(source.name).split(" ").filter(Boolean);
  const words = sourceParts.filter(part => part.length > 1);
  const initials = sourceParts.filter(part => part.length === 1);
  const joinedName = player.parts.join("");
  if (!words.every(word => player.parts.includes(word) || joinedName.includes(word))) return -1;
  let score = 10 + words.length * 5;
  if (normalize(source.name) === player.normalizedName) score += 12;
  if (initials.length && initials.every(initial => player.parts.some(part => part.startsWith(initial)))) score += 4;
  if (player.role === source.role) score += 4;
  return score;
}

for (const source of activePlayers) {
  const ranked = currentPlayers
    .map(player => ({ player, score: candidateScore(source, player) }))
    .filter(item => item.score >= 0 && !usedPlayerIds.has(item.player.id))
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name, "it"));
  const best = ranked[0];
  const second = ranked[1];
  if (best && (!second || best.score > second.score)) {
    source.playerId = best.player.id;
    source.currentName = best.player.name;
    source.matchConfidence = normalize(source.name) === best.player.normalizedName ? "exact" : "high";
    usedPlayerIds.add(best.player.id);
    assignments.push({ sourceId: source.sourceId, sourceName: source.name, playerId: best.player.id, currentName: best.player.name, score: best.score });
  } else {
    source.playerId = null;
    source.currentName = null;
    source.matchConfidence = "unmatched";
  }
}

const byRole = Object.fromEntries(["P", "D", "C", "A"].map(role => [role, activePlayers.filter(player => player.role === role).length]));
const payload = {
  schemaVersion: 1,
  season: "2026/27",
  provider: "Quotazioni Fantacalcio Stagione 2026 27",
  sourceFile: extracted?.sourceFile || existingPayload?.sourceFile || "Quotazioni_Fantacalcio_Stagione_2026_27.xlsx",
  importedAt: existingPayload?.importedAt || "2026-08-08",
  definitions: {
    currentQuotation: "Qt.A · quotazione Classic attuale",
    initialQuotation: "Qt.I · quotazione Classic iniziale",
    currentMantraQuotation: "Qt.A M · quotazione Mantra attuale",
    initialMantraQuotation: "Qt.I M · quotazione Mantra iniziale",
    mantraRole: "RM · ruolo o ruoli Mantra",
    fvm: "FVM · valore Fantacalcio Classic",
    mantraFvm: "FVM M · valore Fantacalcio Mantra",
  },
  coverage: {
    activePlayers: activePlayers.length,
    departedPlayers: departedPlayers.length,
    matchedCurrentPlayers: assignments.length,
    unmatchedActivePlayers: activePlayers.length - assignments.length,
    currentRosterPlayersWithoutListoneMatch: currentPlayers.length - assignments.length,
    byRole,
  },
  players: activePlayers,
  departed: departedPlayers,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.coverage));
